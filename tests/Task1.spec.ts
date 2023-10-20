import {Blockchain, printTransactionFees, SandboxContract} from '@ton-community/sandbox';
import { toNano } from 'ton-core';
import { Task1 } from '../wrappers/Task1';
import '@ton-community/test-utils';

describe('Task1', () => {
    let blockchain: Blockchain;
    let task1: SandboxContract<Task1>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        task1 = blockchain.openContract(await Task1.fromInit());
        const deployer = await blockchain.treasury('deployer');
        const deployResult = await task1.send(
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
            to: task1.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and fireworks are ready to use
    });

    it("should get counter value", async () => {
        const value = await task1.getCounter();
        expect(value).toEqual(0n);
    });

    it("should increment the counter value", async () =>  {
        const deployer = await blockchain.treasury('deployer');
        await task1.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Add',
                queryId: 0n,
                number: 1n,
            }
        );
        const value = await task1.getCounter();
        expect(value).toEqual(1n);
    })

    it("should decrease the counter value", async () =>  {
        const deployer = await blockchain.treasury('deployer');
        const res1 = await task1.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Subtract',
                queryId: 0n,
                number: 1n,
            }
        );
        const value = await task1.getCounter();
        expect(value).toEqual(-1n);
        printTransactionFees(res1.transactions);
    })

    it("should slice", async () =>  {
        const deployer = await blockchain.treasury('deployer');
        const res1 = await task1.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Subtract',
                queryId: 0n,
                number: 1n,
            }
        );
        const value = await task1.getCounter();
        expect(value).toEqual(-1n);
        printTransactionFees(res1.transactions);
    })



});

// /─────────┬──────────────┬────────────┬────────────┬────────────────┬────────────────┬───────────────┬────────────┬────────────────┬──────────┬────────────┐
// │ (index) │      op      │  valueIn   │  valueOut  │   totalFees    │  inForwardFee  │ outForwardFee │ outActions │   computeFee   │ exitCode │ actionCode │
// ├─────────┼──────────────┼────────────┼────────────┼────────────────┼────────────────┼───────────────┼────────────┼────────────────┼──────────┼────────────┤
// │    0    │    'N/A'     │   'N/A'    │ '0.05 TON' │ '0.004031 TON' │     'N/A'      │  '0.001 TON'  │     1      │ '0.001937 TON' │    0     │     0      │
// │    1    │ '0x8596c9ee' │ '0.05 TON' │  '0 TON'   │ '0.003268 TON' │ '0.000667 TON' │     'N/A'     │     0      │ '0.003268 TON' │    0     │     0      │
// └─────────┴──────────────┴────────────┴────────────┴────────────────┴────────────────┴───────────────┴────────────┴────────────────┴──────────┴────────────┘
