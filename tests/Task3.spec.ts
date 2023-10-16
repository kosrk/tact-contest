import { Blockchain, SandboxContract } from '@ton-community/sandbox';
import {Address, beginCell, toNano} from 'ton-core';
import { Task3 } from '../wrappers/Task3';
import '@ton-community/test-utils';
import {randomAddress} from "@ton-community/test-utils";

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

        await task3.send(
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

        await task3.send(
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

        expect(await task3.getPrice(walletA.address)).toEqual(200_000_000n);
        expect(await task3.getPrice(walletB.address)).toEqual(5_000_000_000n);
        expect(await task3.getBalance(walletA.address)).toEqual(10n);
        expect(await task3.getBalance(walletB.address)).toEqual(2n);

        // Receive some tokens from user
        await task3.send(
            walletB.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'TokenNotification',
                queryId: 333n,
                amount: 1n,
                from: randomAddress(),
                forwardPayload: beginCell().endCell()
            }
        );

        expect(await task3.getBalance(walletA.address)).toEqual(5n);
        expect(await task3.getBalance(walletB.address)).toEqual(3n);

    });

});


