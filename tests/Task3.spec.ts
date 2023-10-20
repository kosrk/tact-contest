import {
    Blockchain,
    BlockchainTransaction,
    prettyLogTransactions,
    printTransactionFees,
    SandboxContract
} from '@ton-community/sandbox';
import {Address, beginCell, toNano} from 'ton-core';
import { Task3 } from '../wrappers/Task3';
import '@ton-community/test-utils';
import {randomAddress} from "@ton-community/test-utils";

function sumGas(txs: BlockchainTransaction[]) {
    let x: bigint = 0n;
    for (let entry of txs) {
        x += entry.totalFees.coins;
    }
    return x;
}

describe('Task3', () => {
    let blockchain: Blockchain;
    let task3: SandboxContract<Task3>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        const admin = await blockchain.treasury('user1');
        const walletA = await blockchain.treasury('JettonWalletA');
        const walletB = await blockchain.treasury('JettonWalletB');

        task3 = blockchain.openContract(await Task3.fromInit(admin.address, walletA.address, walletB.address));
        const deployer = await blockchain.treasury('deployer');
        const deployResult = await task3.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );
        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: task3.address,
            deploy: true,
            success: true,
        });
    });

    it("should get price and amount for empty pool", async () => {
        const walletA = await blockchain.treasury('JettonWalletA');
        const walletB = await blockchain.treasury('JettonWalletB');

        // expect(await task3.getPrice(walletA.address)).toEqual(0n);
        // expect(await task3.getPrice(walletB.address)).toEqual(0n);
        expect(await task3.getBalance(walletA.address)).toEqual(0n);
        expect(await task3.getBalance(walletB.address)).toEqual(0n);
    });

    it("should get price and amount for not empty pool", async () => {
        const admin = await blockchain.treasury('user1');
        const walletA = await blockchain.treasury('JettonWalletA');
        const walletB = await blockchain.treasury('JettonWalletB');

        let totalFees: bigint = 0n;

        const r1 = await task3.send(
            walletA.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'TokenNotification',
                queryId: 111n,
                amount: 10n,
                from: admin.address,
                forwardPayload: beginCell().endCell()
            }
        );

        // printTransactionFees(r1.transactions);
        // prettyLogTransactions(r1.transactions);
        totalFees += sumGas(r1.transactions);

        const r2 = await task3.send(
            walletB.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'TokenNotification',
                queryId: 222n,
                amount: 2n,
                from: admin.address,
                forwardPayload: beginCell().endCell()
            }
        );

        // printTransactionFees(r2.transactions);
        // prettyLogTransactions(r2.transactions);
        totalFees += sumGas(r2.transactions);

        expect(await task3.getPrice(walletA.address)).toEqual(200_000_000n);
        expect(await task3.getPrice(walletB.address)).toEqual(5_000_000_000n);
        expect(await task3.getBalance(walletA.address)).toEqual(10n);
        expect(await task3.getBalance(walletB.address)).toEqual(2n);

        // Can not process tokens
        const user2 = await blockchain.treasury('user2');
        const returnResult1 = await task3.send(
            walletB.getSender(),
            {
                value: toNano('0.1'),
            },
            {
                $$type: 'TokenNotification',
                queryId: 333n,
                amount: 3n,
                from: user2.address,
                forwardPayload: beginCell().endCell()
            }
        );

        totalFees += sumGas(returnResult1.transactions);

        expect(await task3.getBalance(walletA.address)).toEqual(10n);
        expect(await task3.getBalance(walletB.address)).toEqual(2n);

        // console.log(returnResult1.transactions[1].outMessages.values())

        expect(returnResult1.transactions).toHaveTransaction({
            from: task3.address,
            to: walletB.address,
            success: true,
            op: 0xf8a7ea5 // transfer message
        });

        // Receive some tokens from user
        const returnResult2 = await task3.send(
            walletB.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'TokenNotification',
                queryId: 333n,
                amount: 1n,
                from: user2.address,
                forwardPayload: beginCell().endCell()
            }
        );

        printTransactionFees(returnResult2.transactions);
        // prettyLogTransactions(r2.transactions);

        totalFees += sumGas(returnResult2.transactions);

        expect(await task3.getBalance(walletA.address)).toEqual(5n);
        expect(await task3.getBalance(walletB.address)).toEqual(3n);

        // send message to wallet A
        expect(returnResult2.transactions).toHaveTransaction({
            from: task3.address,
            to: walletA.address,
            success: true,
            op: 0xf8a7ea5 // transfer message
        });

        console.log("Total fees: ", totalFees)

    });

});

// ┌─────────┬──────────────┬───────────────┬───────────────┬────────────────┬────────────────┬────────────────┬────────────┬────────────────┬──────────┬────────────┐
// │ (index) │      op      │    valueIn    │   valueOut    │   totalFees    │  inForwardFee  │ outForwardFee  │ outActions │   computeFee   │ exitCode │ actionCode │
// ├─────────┼──────────────┼───────────────┼───────────────┼────────────────┼────────────────┼────────────────┼────────────┼────────────────┼──────────┼────────────┤
// │    0    │    'N/A'     │     'N/A'     │  '0.05 TON'   │ '0.004436 TON' │     'N/A'      │ '0.001475 TON' │     1      │ '0.001937 TON' │    0     │     0      │
// │    1    │ '0x7362d09c' │  '0.05 TON'   │ '0.03359 TON' │ '0.01523 TON'  │ '0.000984 TON' │ '0.001771 TON' │     1      │ '0.014639 TON' │    0     │     0      │
// │    2    │ '0xf8a7ea5'  │ '0.03359 TON' │    '0 TON'    │ '0.000309 TON' │ '0.001181 TON' │     'N/A'      │     0      │ '0.000309 TON' │    0     │     0      │
// └─────────┴──────────────┴───────────────┴───────────────┴────────────────┴────────────────┴────────────────┴────────────┴────────────────┴──────────┴────────────┘
// ┌─────────┬──────────────┬────────────────┬────────────────┬────────────────┬────────────────┬────────────────┬────────────┬────────────────┬──────────┬────────────┐
// │ (index) │      op      │    valueIn     │    valueOut    │   totalFees    │  inForwardFee  │ outForwardFee  │ outActions │   computeFee   │ exitCode │ actionCode │
// ├─────────┼──────────────┼────────────────┼────────────────┼────────────────┼────────────────┼────────────────┼────────────┼────────────────┼──────────┼────────────┤
// │    0    │    'N/A'     │     'N/A'      │   '0.05 TON'   │ '0.004436 TON' │     'N/A'      │ '0.001475 TON' │     1      │ '0.001937 TON' │    0     │     0      │
// │    1    │ '0x7362d09c' │   '0.05 TON'   │ '0.033626 TON' │ '0.015194 TON' │ '0.000984 TON' │ '0.001771 TON' │     1      │ '0.014603 TON' │    0     │     0      │
// │    2    │ '0xf8a7ea5'  │ '0.033626 TON' │    '0 TON'     │ '0.000309 TON' │ '0.001181 TON' │     'N/A'      │     0      │ '0.000309 TON' │    0     │     0      │
// └─────────┴──────────────┴────────────────┴────────────────┴────────────────┴────────────────┴────────────────┴────────────┴────────────────┴──────────┴────────────┘
// ┌─────────┬──────────────┬────────────────┬────────────────┬────────────────┬────────────────┬────────────────┬────────────┬────────────────┬──────────┬────────────┐
// │ (index) │      op      │    valueIn     │    valueOut    │   totalFees    │  inForwardFee  │ outForwardFee  │ outActions │   computeFee   │ exitCode │ actionCode │
// ├─────────┼──────────────┼────────────────┼────────────────┼────────────────┼────────────────┼────────────────┼────────────┼────────────────┼──────────┼────────────┤
// │    0    │    'N/A'     │     'N/A'      │   '0.05 TON'   │ '0.004436 TON' │     'N/A'      │ '0.001475 TON' │     1      │ '0.001937 TON' │    0     │     0      │
// │    1    │ '0x7362d09c' │   '0.05 TON'   │ '0.033482 TON' │ '0.015338 TON' │ '0.000984 TON' │ '0.001771 TON' │     1      │ '0.014747 TON' │    0     │     0      │
// │    2    │ '0xf8a7ea5'  │ '0.033482 TON' │    '0 TON'     │ '0.000309 TON' │ '0.001181 TON' │     'N/A'      │     0      │ '0.000309 TON' │    0     │     0      │
// └─────────┴──────────────┴────────────────┴────────────────┴────────────────┴────────────────┴────────────────┴────────────┴────────────────┴──────────┴────────────┘
// ┌─────────┬──────────────┬────────────────┬────────────────┬────────────────┬────────────────┬────────────────┬────────────┬────────────────┬──────────┬────────────┐
// │ (index) │      op      │    valueIn     │    valueOut    │   totalFees    │  inForwardFee  │ outForwardFee  │ outActions │   computeFee   │ exitCode │ actionCode │
// ├─────────┼──────────────┼────────────────┼────────────────┼────────────────┼────────────────┼────────────────┼────────────┼────────────────┼──────────┼────────────┤
// │    0    │    'N/A'     │     'N/A'      │   '0.05 TON'   │ '0.004436 TON' │     'N/A'      │ '0.001475 TON' │     1      │ '0.001937 TON' │    0     │     0      │
// │    1    │ '0x7362d09c' │   '0.05 TON'   │ '0.033794 TON' │ '0.014871 TON' │ '0.000984 TON' │ '0.002003 TON' │     1      │ '0.014203 TON' │    0     │     0      │
// │    2    │ '0xf8a7ea5'  │ '0.033794 TON' │    '0 TON'     │ '0.000309 TON' │ '0.001336 TON' │     'N/A'      │     0      │ '0.000309 TON' │    0     │     0      │
// └─────────┴──────────────┴────────────────┴────────────────┴────────────────┴────────────────┴────────────────┴────────────┴────────────────┴──────────┴────────────┘
// ┌─────────┬──────────────┬────────────────┬────────────────┬────────────────┬────────────────┬────────────────┬────────────┬────────────────┬──────────┬────────────┐
// │ (index) │      op      │    valueIn     │    valueOut    │   totalFees    │  inForwardFee  │ outForwardFee  │ outActions │   computeFee   │ exitCode │ actionCode │
// ├─────────┼──────────────┼────────────────┼────────────────┼────────────────┼────────────────┼────────────────┼────────────┼────────────────┼──────────┼────────────┤
// │    0    │    'N/A'     │     'N/A'      │   '0.05 TON'   │ '0.004436 TON' │     'N/A'      │ '0.001475 TON' │     1      │ '0.001937 TON' │    0     │     0      │
// │    1    │ '0x7362d09c' │   '0.05 TON'   │ '0.036025 TON' │ '0.012795 TON' │ '0.000984 TON' │ '0.001771 TON' │     1      │ '0.012204 TON' │    0     │     0      │
// │    2    │ '0xf8a7ea5'  │ '0.036025 TON' │    '0 TON'     │ '0.000309 TON' │ '0.001181 TON' │     'N/A'      │     0      │ '0.000309 TON' │    0     │     0      │
// └─────────┴──────────────┴────────────────┴────────────────┴────────────────┴────────────────┴────────────────┴────────────┴────────────────┴──────────┴────────────┘
