import "@stdlib/deploy";

/*
  TASK 5 - NFT random swap
  The smart contract contains a bunch of different NFTs.
  A user brings his NFT (sends it to the smart contract), with 2.1 TON (2 for admin's profit, 0.1 for gas) in attachment (as fee for swap).
  The smart contract randomly chooses some NFT from the available NFTs (including the newly incoming one) and gives it to the user in exchange for the brought NFT (but occasionally just returns user's NFT in some cases).
  Admin can deposit NFTs without swap logic. Any NFT received from the admin is considered deposited. Admin can't swap.
  Admin can withdraw all NFTs at once, and also all TONs collected from users as fees.
  Implement getter that will return NFT addresses held by the smart contract.
  Implement getter that will return the amount of admin`s profit collected.

  In details, the smart contract (later: SC) should have this logic:
  Messages
  * AdminWithdrawalProfit
   - SC should check that sender is the admin / otherwise throw "Insufficient privelegies"
   - SC should send all collected fees to admin except 0.1 TON (use AdminFetchProfit message as body)
     In other words: after each such operation, the contract's balance should be equal to 0.1 TON (which are reserved for storage) and the rest should be sent to the admin
  * AdminWithdrawalAllNFTs
   - SC should check that incoming tx TON value is enough for NFT withdrawal. Specifically, at least: (1 + totalNftsHeld * 0.08) TONs. Otherwise throw "Insufficent funds"
   - SC should check that sender is the admin, throw "Invalid sender" otherwise
   - If all checks pass, SC should send NFTs one by one to the admin
   - SC should be able to withdraw all NFTs by a single message from admin
  * OwnershipAssigned
   - if prevOwner is the owner's (admin) address, then add NFT to the collection
   - if value of TON attached is less then 2.1 TON then stop execution and return NFT back,
     but only in case that TON attached is enough to process refund without losing TONs on the SC's balance
   - randomly select NFT to send from all the NFTs that smart contract has
   - send the selected NFT to the sender with all remaining balance (except for admin profit = fees collected from this and other swaps)
     In other words: the contract's balance should increase by exactly 2 TON, some incoming TONs will be consumed for gas and the remainings of the incoming TONs should be refunded to the sender

  Getters
  * profit
   - returns how much collected fees is available to withdraw for the admin (all fees minus 0.1 TON)
  * nfts
   - returns dict of held NFTs with NFT indexes (sequential numbers from 0, 1, 2 ... and up to 'totalNftsHeld-1') as keys and NFT address as values
     the order of NFTs in this dictionary doesn't matter
*/

const eSlice: Cell = cell("te6ccgEBAQEAAgAAAA==");

message AdminWithdrawalProfit {
  queryId: Int as uint64;
}

message AdminWithdrawalAllNFTs {
  queryId: Int as uint64;
}

message AdminFetchProfit {
  queryId: Int as uint64;
}

message(0x05138d91) OwnershipAssigned {
    queryId: Int as uint64;
    prevOwner: Address;
    forwardPayload: Slice as remaining;
}

message(0x5fcc3d14) Transfer {
    queryId: Int as uint64;
    newOwner: Address;
    responseDestination: Address;
    customPayload: Cell?;
    forwardAmount: Int as coins;
    forwardPayload: Slice as remaining;
}

contract Task5 with Deployable {
  seed: Int as uint128;
  owner: Address;
  nfts: map<Int as uint16, Address>;
  qty: Int as uint16;

  init(seed: Int, owner: Address) {
    self.owner = owner;
    self.seed = seed; // needed to deploy multiple smart contracts copies from one admin address
    self.qty = 0;
  }

  receive(msg: OwnershipAssigned) {

    if (msg.prevOwner == self.owner) { // add NFT by admin
        // TODO: check for NFT in array?
        self.nfts.set(self.qty, sender());
        self.qty = self.qty + 1;
        return;
    }

    if (context().value < 2100000000) {
        if (context().value < 80000000) { return; } // TODO: check min value
        /*
        send(SendParameters{
            to: sender(),
            value: 0,
            mode: SendRemainingValue + SendIgnoreErrors,
            body: Transfer{
                    queryId: msg.queryId,
                    newOwner: msg.prevOwner,
                    responseDestination: msg.prevOwner,
                    customPayload: null,
                    forwardAmount: 0,
                    forwardPayload: eSlice.asSlice()
            }.toCell()
        });
        */

        nativeSendMessage(
            beginCell()
            .storeInt(24, 6) // internal_message + ihd_disabled + bounce + bounced + from
            .storeAddress(sender()) // To
            .storeInt(0x5fcc3d14, 4 + 1 + 4 + 4 + 64 + 32 + 1 + 1 + 32)
                                                           // value +
                                                           // currency_collection +
                                                           // IHR fees +
                                                           // Fwd fees +
                                                           // CreatedLT +
                                                           // CreatedAt +
                                                           // No state init +
                                                           // body either 0
                                                           // op
            .storeUint(msg.queryId, 64)                    // queryId
            .storeAddress(msg.prevOwner)                   // newOwner
            .storeAddress(msg.prevOwner)                   // responseDestination
            .storeInt(0, 5)                                // null customPayload
                                                           // + 0 forwardTonAmount
                                                           // + forward_payload ref
            .endCell(),
            SendRemainingValue + SendIgnoreErrors
        );

        return;
    }

    let randomIndex: Int = random(0, self.qty); // random index include new nft at the end

    let nft: Address = sender(); // new NFT as default for swap

    if (randomIndex != self.qty) { // last number for new NFT
        nft = self.nfts.get(randomIndex)!!;
        self.nfts.set(randomIndex, sender()); // replace old nft with new
    } // not add to dict if swap new to new

    /*
    send(SendParameters{
        to: nft,
        value: context().value - 2000000000,
        mode: SendIgnoreErrors,
        body: Transfer{
                queryId: msg.queryId,
                newOwner: msg.prevOwner,
                responseDestination: msg.prevOwner,
                customPayload: null,
                forwardAmount: 0,
                forwardPayload: eSlice.asSlice()
        }.toCell()
    });
    */

    nativeSendMessage(
        beginCell()
        .storeInt(24, 6) // internal_message + ihd_disabled + bounce + bounced + from
        .storeAddress(nft) // To
        .storeCoins(context().value - 2000000000)      // value
        .storeInt(1, 1 + 4 + 4 + 64 + 32 + 1 + 1)
                                                       // currency_collection +
                                                       // IHR fees +
                                                       // Fwd fees +
                                                       // CreatedLT +
                                                       // CreatedAt +
                                                       // No state init +
                                                       // body either 1
        .storeRef(                                     // body cell
            beginCell()
            .storeInt(0x5fcc3d14, 32)
            .storeUint(msg.queryId, 64)                 // queryId
            .storeAddress(msg.prevOwner)                // newOwner
            .storeAddress(msg.prevOwner)                // responseDestination
            .storeInt(0, 5)                             // null customPayload
            .endCell()
        )
        .endCell(),
        SendIgnoreErrors
    );

  }

  receive(msg: AdminWithdrawalProfit) {
    require(sender() == self.owner, "Insufficient privelegies"); // TODO: maybe fix typo
/*
    send(SendParameters{
        to: sender(),
        value: myBalance() - 100000000,
        mode: SendIgnoreErrors,
        body: AdminFetchProfit{
                queryId: msg.queryId
        }.toCell()
    });
*/

    nativeSendMessage(
        beginCell()
        .storeInt(24, 6) // internal_message + ihd_disabled + bounce + bounced + from
        .storeAddress(sender()) // To
        .storeCoins(myBalance() - 100000000) // value
        .storeInt(0xFDA48B79, 1 + 4 + 4 + 64 + 32 + 1 + 1 + 32)
                                                       // currency_collection +
                                                       // IHR fees +
                                                       // Fwd fees +
                                                       // CreatedLT +
                                                       // CreatedAt +
                                                       // No state init +
                                                       // body either 0
                                                       // op
        .storeUint(msg.queryId, 64)                    // queryId
        .endCell(),
        SendIgnoreErrors
    );
  }

  receive(msg: AdminWithdrawalAllNFTs) {
    require((context().value >= 1000000000 + self.qty * 80000000) || (sender() == myAddress()), "Insufficent funds");
    require(sender() == self.owner || sender() == myAddress(), "Invalid sender");
    let n: Int = 0;

    let templateStart1: Builder = beginCell().storeInt(24, 6); // internal_message + ihd_disabled + bounce + bounced + from;
    let template2: Slice =  beginCell()
                            .storeInt(0x202625A00000000000000000000000000000 + 1, 143)
                                                                           // value 80000000 +
                                                                           // currency_collection +
                                                                           // IHR fees +
                                                                           // Fwd fees +
                                                                           // CreatedLT +
                                                                           // CreatedAt +
                                                                           // No state init +
                                                                           // body either 1 +
                            .storeRef(                                     // body cell
                                    beginCell()
                                    .storeInt(0x5fcc3d14, 32)   // op
                                    .storeUint(msg.queryId, 64) // queryId
                                    .storeAddress(self.owner)   // newOwner
                                    .storeAddress(self.owner)   // responseDestination
                                    .storeInt(0, 5)             // null customPayload
                                    .endCell()
                            ).endCell().asSlice();

    while (self.qty > 0 && n < 170) {
        self.qty = self.qty - 1;

        /*send(SendParameters{
            to: self.nfts.get(self.qty)!!,
            value: 80000000,
            mode: SendIgnoreErrors,
            body: Transfer{
                    queryId: msg.queryId,
                    newOwner: self.owner,
                    responseDestination: self.owner,
                    customPayload: null,
                    forwardAmount: 0,
                    forwardPayload: eSlice.asSlice()
            }.toCell()
        });
        */

        nativeSendMessage(
            templateStart1
            .storeAddress(self.nfts.get(self.qty)!!) // To
            .storeSlice(template2)
            .endCell(),
            SendIgnoreErrors
        );

        n = n + 1;
    }
    if (self.qty > 0) {
        /*
        send(SendParameters{
            to: myAddress(),
            value: context().value - (self.qty * 80000000),
            mode: SendIgnoreErrors + SendPayGasSeparately,
            body: AdminWithdrawalAllNFTs{
                    queryId: msg.queryId
            }.toCell()
        });
        */

        nativeSendMessage(
            beginCell()
            .storeInt(24, 6) // internal_message + ihd_disabled + bounce + bounced + from
            .storeAddress(myAddress()) // To
            .storeCoins(context().value - (self.qty * 80000000)) // value
            .storeInt(0x6339421F, 1 + 4 + 4 + 64 + 32 + 1 + 1 + 32)
                                                           // currency_collection +
                                                           // IHR fees +
                                                           // Fwd fees +
                                                           // CreatedLT +
                                                           // CreatedAt +
                                                           // No state init +
                                                           // body either 0
                                                           // op
            .storeUint(msg.queryId, 64)                    // queryId
            .endCell(),
            SendIgnoreErrors + SendPayGasSeparately
        );

    } else {
        self.nfts = emptyMap();
    }
  }

  get fun profit(): Int {
    let profit: Int = myBalance() - 100000000;
    if (profit > 0) {return profit;}
    return 0;
  }

  get fun nfts(): map<Int as uint16, Address> {
    return self.nfts;
  }
}
