import {Blockchain, printTransactionFees, SandboxContract} from '@ton-community/sandbox';
import { toNano } from 'ton-core';
import { Task2 } from '../wrappers/Task2';
import '@ton-community/test-utils';
import {randomAddress} from "@ton-community/test-utils";

describe('Task2', () => {
    let blockchain: Blockchain;
    let task2: SandboxContract<Task2>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        const deployer = await blockchain.treasury('deployer');
        task2 = blockchain.openContract(await Task2.fromInit(deployer.address));
        const deployResult = await task2.send(
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
            to: task2.address,
            deploy: true,
            success: true,
        });
    });

    it('test', async () => {
        const deployer = await blockchain.treasury('deployer');
        const r1 = await task2.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Refund',
                queryId: 0n,
                sender: randomAddress()
            }
        );
        printTransactionFees(r1.transactions);
    });
});

// ┌─────────┬──────────────┬────────────────┬────────────────┬────────────────┬────────────────┬────────────────┬────────────┬────────────────┬──────────┬────────────┐
// │ (index) │      op      │    valueIn     │    valueOut    │   totalFees    │  inForwardFee  │ outForwardFee  │ outActions │   computeFee   │ exitCode │ actionCode │
// ├─────────┼──────────────┼────────────────┼────────────────┼────────────────┼────────────────┼────────────────┼────────────┼────────────────┼──────────┼────────────┤
// │    0    │    'N/A'     │     'N/A'      │   '0.05 TON'   │ '0.00442 TON'  │     'N/A'      │ '0.001463 TON' │     1      │ '0.001937 TON' │    0     │     0      │
// │    1    │    '0x44'    │   '0.05 TON'   │ '0.042043 TON' │ '0.007291 TON' │ '0.000976 TON' │  '0.001 TON'   │     1      │ '0.006957 TON' │    0     │     0      │
// │    2    │  'no body'   │ '0.042043 TON' │ '0.041043 TON' │ '0.000334 TON' │ '0.000667 TON' │     'N/A'      │   'N/A'    │     'N/A'      │  'N/A'   │   'N/A'    │
// │    3    │ '0xffffffff' │ '0.041043 TON' │    '0 TON'     │ '0.00333 TON'  │ '0.000667 TON' │     'N/A'      │     0      │ '0.00333 TON'  │    0     │     0      │
// └─────────┴──────────────┴──────────────
// ┌─────────┬──────────────┬────────────────┬────────────────┬────────────────┬────────────────┬────────────────┬────────────┬────────────────┬──────────┬────────────┐
// │ (index) │      op      │    valueIn     │    valueOut    │   totalFees    │  inForwardFee  │ outForwardFee  │ outActions │   computeFee   │ exitCode │ actionCode │
// ├─────────┼──────────────┼────────────────┼────────────────┼────────────────┼────────────────┼────────────────┼────────────┼────────────────┼──────────┼────────────┤
// │    0    │    'N/A'     │     'N/A'      │   '0.05 TON'   │ '0.00442 TON'  │     'N/A'      │ '0.001463 TON' │     1      │ '0.001937 TON' │    0     │     0      │
// │    1    │    '0x44'    │   '0.05 TON'   │ '0.042651 TON' │ '0.006683 TON' │ '0.000976 TON' │  '0.001 TON'   │     1      │ '0.006349 TON' │    0     │     0      │
// │    2    │  'no body'   │ '0.042651 TON' │ '0.041651 TON' │ '0.000334 TON' │ '0.000667 TON' │     'N/A'      │   'N/A'    │     'N/A'      │  'N/A'   │   'N/A'    │
// │    3    │ '0xffffffff' │ '0.041651 TON' │    '0 TON'     │ '0.00333 TON'  │ '0.000667 TON' │     'N/A'      │     0      │ '0.00333 TON'  │    0     │     0      │
// └─────────┴──────────────┴────────────────┴────────────────┴────────────────┴────────────────┴────────────────┴────────────┴────────────────┴──────────┴────────────┘
// ┌─────────┬──────────────┬────────────────┬────────────────┬────────────────┬────────────────┬────────────────┬────────────┬────────────────┬──────────┬────────────┐
// │ (index) │      op      │    valueIn     │    valueOut    │   totalFees    │  inForwardFee  │ outForwardFee  │ outActions │   computeFee   │ exitCode │ actionCode │
// ├─────────┼──────────────┼────────────────┼────────────────┼────────────────┼────────────────┼────────────────┼────────────┼────────────────┼──────────┼────────────┤
// │    0    │    'N/A'     │     'N/A'      │   '0.05 TON'   │ '0.00442 TON'  │     'N/A'      │ '0.001463 TON' │     1      │ '0.001937 TON' │    0     │     0      │
// │    1    │    '0x44'    │   '0.05 TON'   │ '0.042935 TON' │ '0.006399 TON' │ '0.000976 TON' │  '0.001 TON'   │     1      │ '0.006065 TON' │    0     │     0      │
// │    2    │  'no body'   │ '0.042935 TON' │ '0.041935 TON' │ '0.000334 TON' │ '0.000667 TON' │     'N/A'      │   'N/A'    │     'N/A'      │  'N/A'   │   'N/A'    │
// │    3    │ '0xffffffff' │ '0.041935 TON' │    '0 TON'     │ '0.00333 TON'  │ '0.000667 TON' │     'N/A'      │     0      │ '0.00333 TON'  │    0     │     0      │
// └─────────┴──────────────┴────────────────┴────────────────┴────────────────┴────────────────┴────────────────┴────────────┴────────────────┴──────────┴────────────┘
