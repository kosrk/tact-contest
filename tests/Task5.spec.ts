import { Blockchain, SandboxContract } from '@ton-community/sandbox';
import {beginCell, toNano} from 'ton-core';
import { Task5 } from '../wrappers/Task5';
import '@ton-community/test-utils';
import {randomAddress} from "@ton-community/test-utils";

describe('Task5', () => {
    let blockchain: Blockchain;
    let task5: SandboxContract<Task5>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        const admin = await blockchain.treasury('user1');
        task5 = blockchain.openContract(await Task5.fromInit(0n, admin.address));
        const deployer = await blockchain.treasury('deployer');
        const deployResult = await task5.send(
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
            to: task5.address,
            deploy: true,
            success: true,
        });
    });

    it('test', async () => {
        const admin = await blockchain.treasury('user1');
        const adminsNft1 = await blockchain.treasury('nft1');
        const adminsNft2 = await blockchain.treasury('nft2');
        const usersNft = await blockchain.treasury('nft3');

        console.log("NFT 1: ", adminsNft1.address)
        console.log("NFT 2: ", adminsNft2.address)
        console.log("Users NFT: ", usersNft.address)

        // send adminsNft1
        await task5.send(
            adminsNft1.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'OwnershipAssigned',
                queryId: 0n,
                prevOwner: admin.address,
                forwardPayload: beginCell().endCell()
            }
        );

        // send adminsNft2
        await task5.send(
            adminsNft2.getSender(),
            {
                value: toNano('1.05'),
            },
            {
                $$type: 'OwnershipAssigned',
                queryId: 0n,
                prevOwner: admin.address,
                forwardPayload: beginCell().endCell()
            }
        );

        console.log("NFTs after admins filling: ", await task5.getNfts())

        // user failed swap
        const returnResult1 = await task5.send(
            usersNft.getSender(),
            {
                value: toNano('0.1'),
            },
            {
                $$type: 'OwnershipAssigned',
                queryId: 0n,
                prevOwner: randomAddress(),
                forwardPayload: beginCell().endCell()
            }
        );

        expect(returnResult1.transactions).toHaveTransaction({
            from: task5.address,
            to: usersNft.address,
            success: true,
            op: 0x5fcc3d14 // transfer message
        });

        console.log("NFTs after failed swap: ", await task5.getNfts())
        console.log("Profit after failed swap: ", await task5.getProfit())

        // user success swap
        const returnResult2 = await task5.send(
            usersNft.getSender(),
            {
                value: toNano('2.1'),
            },
            {
                $$type: 'OwnershipAssigned',
                queryId: 0n,
                prevOwner: randomAddress(),
                forwardPayload: beginCell().endCell()
            }
        );

        console.log("NFTs after success swap: ", await task5.getNfts())
        console.log("Profit after success swap: ", await task5.getProfit())

        // withdraw all NFTs
        const returnResult3 = await task5.send(
            admin.getSender(),
            {
                value: toNano('4'),
            },
            {
                $$type: 'AdminWithdrawalAllNFTs',
                queryId: 0n
            }
        );

        console.log("NFTs after withdrawal: ", await task5.getNfts())

    });
});


