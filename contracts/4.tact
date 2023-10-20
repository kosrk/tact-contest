import "@stdlib/deploy";

/*
  TASK 4 - NFT locker
  Implement a smart contract that will lock NFT for a period of time specified by the owner.
  Smart conrtact should contain logic to process following messages and getters: 

  Messages: 
  * OwnershipAssigned
   - Recives nft + time (in a forwardPayload message as uint32) for which this nft will be locked + address of the sender of the nft (prevOwner).
   - If the smart contract already holds an nft then return the incoming nft back to the sender
  * NftWithdrawal
   - Request withdrawal of the locked nft
   - If sender is not the owner (that came from OwnershipAssigned as prevOwner address) then throw "Invalid sender" 
   - If time has not passed then send message back to the sender with the comment "NFT is still locked" according to the TON's "message with text comment" standard 
   - Otherwise (all good) send the locked nft back to the owner with all the remaining TON balance
   Note that the order of checks is important
   (in case: "sender is not the owner" and "time has not passed" at the same time, "Invalid sender" error takes priority)

  Getters:
  * time
   - get how much lock time is left
  * nft
   - get the address of the locked nft 
  * owner
   - get the owner of the locked nft (that came from OwnershipAssigned as prevOwner)
*/

const eSlice: Cell = cell("te6ccgEBAQEAAgAAAA==");

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

message NftWithdrawal {
  queryId: Int as uint64;
  nftAddress: Address;
}

contract Task4 with Deployable {
  seed: Int as uint128;

  time: Int as uint32;
  owner: Address?;
  nft: Address?;
  
  init(seed: Int) {
    self.seed = seed; // needed to deploy multiple smart contracts copies from one admin address
    self.time = 0;
    self.owner = null;
    self.nft = null;
  }

  receive(msg: OwnershipAssigned) {
    if (self.nft != null) { // send back

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
            //.storeInt(0, 8)                                // null customPayload
                                                           // + 0 forwardTonAmount
            //.storeRef(eSlice)                                               // + forward_payload ref
            .endCell(),
            SendRemainingValue + SendIgnoreErrors
        );


    } else {
        self.owner = msg.prevOwner;
        self.nft = sender();
        self.time = now() + msg.forwardPayload.loadUint(32);
    }
  }

  receive(msg: NftWithdrawal) {
    //require(self.nft != null, "no NFT");
    //require(self.nft == msg.nftAddress, "not valid NFT");
    //require(self.owner != null, "no NFT");
    require(sender() == self.owner, "Invalid sender");
    if (self.time > now()) {
        self.reply("NFT is still locked".asComment());
    } else {

/*
        send(SendParameters{
            to: self.nft!!,
            value: 0,
            mode: SendRemainingValue + SendIgnoreErrors,
            body: Transfer{
                    queryId: msg.queryId,
                    newOwner: self.owner!!,
                    responseDestination: self.owner!!,
                    customPayload: null,
                    forwardAmount: 0,
                    forwardPayload: eSlice.asSlice()
                    }.toCell()
        });
*/


        nativeSendMessage(
            beginCell()
            .storeInt(24, 6) // internal_message + ihd_disabled + bounce + bounced + from
            .storeAddress(self.nft!!) // To
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
            .storeAddress(self.owner!!)                    // newOwner
            .storeAddress(self.owner!!)                    // responseDestination
            .storeInt(0, 5)                                // null customPayload
                                                           // + 0 forwardTonAmount
                                                           // + forward_payload ref
            .endCell(),
            SendRemainingValue + SendIgnoreErrors
        );


        self.owner = null;
        self.nft = null;
        self.time = 0;
    }
  }

  get fun time(): Int {
    let remain: Int =  self.time - now();
    if (remain < 0) {
        return 0;
    }
    return remain;
  }

  get fun nft(): Address? {
    return self.nft;
  }

  get fun owner(): Address? {
    return self.owner;
  }
}