import { Blockchain, SandboxContract } from '@ton-community/sandbox';
import {beginCell, toNano} from 'ton-core';
import { Task4 } from '../wrappers/Task4';
import '@ton-community/test-utils';
import {randomAddress} from "@ton-community/test-utils";

describe('Task4', () => {
    let blockchain: Blockchain;
    let task4: SandboxContract<Task4>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        task4 = blockchain.openContract(await Task4.fromInit(0n));

        // await blockchain.setVerbosityForAddress(task4.address, {
        //     blockchainLogs: false,
        //     vmLogs: 'vm_logs_full',
        // });

        const deployer = await blockchain.treasury('deployer');
        const deployResult = await task4.send(
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
            to: task4.address,
            deploy: true,
            success: true,
        });
    });

    it("should get zero time", async () => {
        const value = await task4.getTime();
        expect(value).toEqual(0n);
    });

    it("should get empty NFT", async () => {
        const value = await task4.getNft();
        expect(value).toEqual(null);
    });

    it("should return owner, NFT address and time", async () =>  {
        const nft = await blockchain.treasury('nft');
        const ownerAddr = randomAddress();
        await task4.send(
            nft.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'OwnershipAssigned',
                queryId: 0n,
                prevOwner: ownerAddr,
                forwardPayload: beginCell().storeUint(100n, 32).endCell()
            }
        );
        const addr = await task4.getOwner();
        expect(addr).toEqualAddress(ownerAddr);
        const nftAddr = await task4.getNft();
        expect(nftAddr).toEqualAddress(nft.address);
        expect(await task4.getTime()).toEqual(-100n); // now == 0
    })

    it("should return NFT back", async () =>  {
        const nft = await blockchain.treasury('nft');
        const ownerAddr = randomAddress();

        console.log("NFT addr: ", nft.address)
        console.log("Locker addr: ", task4.address)

        await task4.send(
            nft.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'OwnershipAssigned',
                queryId: 0n,
                prevOwner: ownerAddr,
                forwardPayload: beginCell().storeUint(100n, 32).endCell()
            }
        );
        const returnResult = await task4.send(
            nft.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'OwnershipAssigned',
                queryId: 0n,
                prevOwner: ownerAddr,
                forwardPayload: beginCell().storeUint(100n, 32).endCell()
            }
        );
        expect(returnResult.transactions).toHaveTransaction({
            from: task4.address,
            to: nft.address,
            success: true,
            op: 0x5fcc3d14 // transfer message
        });

        console.log("", returnResult.transactions[1].outMessages.get(0))
    })

});


