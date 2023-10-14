import { Blockchain, SandboxContract } from '@ton-community/sandbox';
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
        await task1.send(
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
    })

});
