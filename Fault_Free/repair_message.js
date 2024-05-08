class Repair_Message {
    constructor(messageType, instanceNumber, phaseNumber, Request_ID, viewNumber,Client_Name, sender,data) {
      this.messageType = messageType;
      this.instanceNumber = instanceNumber;
      this.phaseNumber = phaseNumber;
      this.Request_ID = Request_ID;
      this.viewNumber = viewNumber;
      this.Client_Name=Client_Name;
      this.sender = sender;
      this.data=data;
    }
  }
  
  module.exports = Repair_Message;
  