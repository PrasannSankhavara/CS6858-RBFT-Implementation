class Propagate_Message {
    constructor(messageType, data, Request_ID, Client_Name, sender) {
      this.messageType = messageType;
      this.data = data;
      this.Request_ID = Request_ID;
      this.Client_Name = Client_Name;
      this.sender = sender;
    }
  }
  
  module.exports = Propagate_Message;
  