import "@stdlib/deploy";

/*
  TASK 2 - Proxy 
  Create a contract that forwards all received TONs
  to the admin contract (whose address is set in init_store).
  Message from this proxy contract to the admin contract should contain:
    - Address of user who sent original message (should be stored in the outcoming body's data/bits)
    - Original message that proxy smart contract received from user (should be stored in the outcoming body's first ref)
  Also, if admin contract decides to reject message (if it sends to the proxy "Refund" message with opcode=0x44),
  proxy contract needs to forward all TONs (attached to Refund message) back to the user.
  User address will be provided in Refund message body as "sender".
  In refund transaction, it is important to have a check that the refund message came from the admin address
*/

message(0x44) Refund {
  queryId: Int as uint64;
  sender: Address;
}

message ProxyMessage {
    greeting: String;
}

contract Task2 with Deployable {
  admin: Address;
  template: Builder;

  init(admin: Address) {
    self.admin = admin;
    self.template = beginCell()
                            .storeInt(24, 6) // internal_message + ihd_disabled + bounce + bounced + from
                            .storeAddress(self.admin) // To
                            .storeInt(0, 4 + 1 + 4 + 4 + 64 + 32 + 1 + 1); // value +
                                                                          // currency_collection +
                                                                          // IHR fees +
                                                                          // Fwd fees +
                                                                          // CreatedLT +
                                                                          // CreatedAt +
                                                                          // No state init +
                                                                          // body either 0
  }

  receive(msg: Refund) {

    require(sender() == self.admin, "Not admin!");

    //send(SendParameters{
    //    to: msg.sender,
    //    value: 0,
    //    mode: SendRemainingValue + SendIgnoreErrors
    //});

    nativeSendMessage(
        beginCell()
        .storeInt(24, 6) // internal_message + ihd_disabled + bounce + bounced + from
        .storeAddress(msg.sender) // To
        .storeInt(0, 4 + 1 + 4 + 4 + 64 + 32 + 1 + 1) // value +
                                                      // currency_collection +
                                                      // IHR fees +
                                                      // Fwd fees +
                                                      // CreatedLT +
                                                      // CreatedAt +
                                                      // No state init +
                                                      // body either 0
        .endCell(),
        SendRemainingValue + SendIgnoreErrors
    );
  }

  receive(msg: Slice) {

    // send(SendParameters{
    //    to: self.admin,
    //    value: 0,
    //    mode: SendRemainingValue + SendIgnoreErrors,
    //    body: beginCell().storeAddress(sender()).storeRef(msg.asCell()).endCell()
    // });

    nativeSendMessage(
        self.template
        .storeAddress(sender()) // Sender address in body
        .storeRef(msg.asCell()) // forward msg body
        .endCell(),
        SendRemainingValue + SendIgnoreErrors
    );
  }
}
