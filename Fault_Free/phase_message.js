class Phase_Message {
    constructor(messageType, instanceNumber, phaseNumber, viewNumber, sender) {
      this.messageType = messageType;
      this.instanceNumber = instanceNumber;
      this.phaseNumber = phaseNumber;
      this.viewNumber = viewNumber;
      this.sender = sender;
    }
  }
  
  module.exports = Phase_Message;
  