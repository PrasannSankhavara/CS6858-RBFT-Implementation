class Message {
  constructor(messageType, instanceNumber, phaseNumber, data, viewNumber, sender) {
    this.messageType = messageType;
    this.instanceNumber = instanceNumber;
    this.phaseNumber = phaseNumber;
    this.data = data;
    this.viewNumber = viewNumber;
    this.sender = sender;
  }
}

module.exports = Message;
