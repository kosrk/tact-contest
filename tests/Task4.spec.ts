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

    it("should get now time", async () => {
        const value = await task4.getTime();
        console.log("Time:", value)
    });

    it("should get empty NFT", async () => {
        const value = await task4.getNft();
        expect(value).toEqual(null);
    });

    it("should return owner, NFT address and time", async () =>  {
        const nft = await blockchain.treasury('nft');
        const ownerAddr = randomAddress();
        const res = await task4.send(
            nft.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'OwnershipAssigned',
                queryId: 0n,
                prevOwner: ownerAddr,
                forwardPayload: beginCell().storeUint(100000n, 32).endCell()
            }
        );

        const addr = await task4.getOwner();
        expect(addr).toEqualAddress(ownerAddr);
        const nftAddr = await task4.getNft();
        expect(nftAddr).toEqualAddress(nft.address);
        console.log("Time:", await task4.getTime());
    })

    it("should return NFT back", async () =>  {
        const nft = await blockchain.treasury('nft');
        const owner = await blockchain.treasury('owner');

        console.log("NFT addr: ", nft.address)
        console.log("Locker addr: ", task4.address)
        console.log("Owner addr: ", owner.address)

        await task4.send(
            nft.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'OwnershipAssigned',
                queryId: 10n,
                prevOwner: owner.address,
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
                prevOwner: owner.address,
                forwardPayload: beginCell().storeUint(100n, 32).endCell()
            }
        );
        expect(returnResult.transactions).toHaveTransaction({
            from: task4.address,
            to: nft.address,
            success: true,
            op: 0x5fcc3d14, // transfer message
        });

        const a = returnResult.transactions[1].outMessages.get(0);
        if (a != undefined) {
            console.log("", a.body.toString())
        }

    })

    it("should withdraw NFT", async () =>  {
        const nft = await blockchain.treasury('nft');
        const owner = await blockchain.treasury('user1');
        const ownerAddr = owner.address;

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
                forwardPayload: beginCell().storeUint(0n, 32).endCell()
            }
        );

        const returnResult = await task4.send(
            owner.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'NftWithdrawal',
                queryId: 333n,
                nftAddress: nft.address,
            }
        );

        console.log("Locked NFT:", await task4.getNft());

        expect(returnResult.transactions).toHaveTransaction({
            from: task4.address,
            to: nft.address,
            success: true,
            op: 0x5fcc3d14 // transfer message
        });

        const a = returnResult.transactions[1].outMessages.get(0);
        if (a != undefined) {
            console.log("", a)
        }

        console.log("Time:", await task4.getTime());
        console.log("NFT:", await task4.getNft());
        console.log("Owner:", await task4.getOwner());

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

        console.log("Time:", await task4.getTime());
        console.log("NFT:", await task4.getNft());
        console.log("Owner:", await task4.getOwner());
    })

});

