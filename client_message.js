class Client_Message {
    constructor(messageType, data, Request_ID ,Client_Name) {
      this.messageType = messageType;
      this.data = data;
      this.Request_ID = Request_ID;
      this.Client_Name = Client_Name;
    }
  }
  
  module.exports = Client_Message;
  