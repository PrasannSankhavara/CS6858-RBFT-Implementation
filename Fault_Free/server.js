const fs = require('fs');
const path = require('path');
const net = require('net');
const Message = require('./message');
const Repair_Message = require('./repair_message');
const Phase_Message = require('./phase_message');
const Propagate_Message = require('./propagate_message');
const Reply_Message=require('./reply_message');
// Enum for message types
const MessageType = {
  REPAIR: 'REPAIR',
  PREPARE: 'PREPARE',
  COMMIT: 'COMMIT',
  REQUEST: 'REQUEST',
  PROPAGATE: 'PROPAGATE',
  VIEW_CHANGE: 'VIEW_CHANGE',
  REPLY: 'REPLY'
};

// Maps to store message counts for each phase
const phaseCounts = {
  repair: new Map(),
  prepare: new Map(),
  commit: new Map(),
  propagate: new Map(),
  view: new Map()
};

// Map to store connections for each peer
const connections = new Map();
let scriptDirectory;
const requestkey_requestTimestamps = new Map();
const requestkey_data = new Map();
const prepareKey_requestKey = new Map();
// Variables for view and phase
let view = 1;
let phase = 1;
let f=1;
let n=4;

// Map to store commit counts for each instance
let instanceCommitCounts = new Map();
instanceCommitCounts.set(0, 0);
instanceCommitCounts.set(1, 0);
instanceCommitCounts.set(2, 0);
instanceCommitCounts.set(3, 0);
instanceCommitCounts.set(4, 0);
instanceCommitCounts.set(5, 0);
instanceCommitCounts.set(6, 0);
instanceCommitCounts.set(7, 0);

function extractIPAndPort(str) {
  const [num, ipPort] = str.split('-');
  const [ip, port] = ipPort.split(':');
  
  return { num: num.trim(), ip: ip.trim(), port: port.trim() };
}

// Example usage:

// Function to connect to a Client
function REPLY(reply_message) {
  
  const client = new net.Socket();
  const result = extractIPAndPort(reply_message.rid);
  reply_message.rid=result.num;
  client.connect(result.port, result.ip, () => {
    console.log(`Connected to client finallyyyyyyyyyyyyyyyyyyyy`);
    client.write(JSON.stringify(reply_message));
  });

  client.on('error', err => {
    console.error(`Error connecting fffffffffffff`);
    client.destroy();
  });

  client.on('close', () => {
    console.log(`Connection closed to ffffff`);
  });
}

// Function to connect to a peer
function connectToPeer(peerInfo, message, currentPeer) {
  
  const client = new net.Socket();
  client.connect(peerInfo.port, peerInfo.host, () => {
    console.log(`Connected to ${peerInfo.name} at ${peerInfo.host}:${peerInfo.port}`);
    client.write(JSON.stringify(message));
  });

  client.on('error', err => {
    console.error(`Error connecting to ${peerInfo.name}: ${err.message}`);
    client.destroy();
  });

  client.on('close', () => {
    console.log(`Connection closed to ${peerInfo.name}`);
  });

  connections.set(peerInfo.name, client);
}

// Function to connect to multiple peers
function connectToPeers(peers, message, currentPeer) {
  peers.forEach(peer => {
    connectToPeer(peer, message, currentPeer);
  });
}

// Function to read environment file and parse peers
function readEnvFile(envFilePath, peerName) {
  const envData = fs.readFileSync(envFilePath, 'utf8');
  const lines = envData.split('\n');
  const peers = [];

  lines.forEach((line, index) => {
    const [name, host, port, leaderOf] = line.trim().split(',');
    if (name && host && port && leaderOf) {
      peers.push({ name, host, port: parseInt(port), leaderOf: parseInt(leaderOf), id: index + 1 });
    }
  });

  return peers;
}

// Function to handle incoming messages
function handleMessage(data, currentPeer, peers) {
  console.log('Received:', data.toString());

  const receivedMessage = JSON.parse(data.toString());

  switch (receivedMessage.messageType) {
    case MessageType.REQUEST:
      handleRequestMessage(receivedMessage, currentPeer, peers);
      break;

    case MessageType.PROPAGATE:
      handlePropagateMessage(receivedMessage, currentPeer, peers);
      break;

    case MessageType.REPAIR:
      handleRepairMessage(receivedMessage, currentPeer, peers);
      break;

    case MessageType.PREPARE:
      handlePrepareMessage(receivedMessage, currentPeer, peers);
      break;

    case MessageType.COMMIT:
      handleCommitMessage(receivedMessage, currentPeer, peers);
      break;

    case MessageType.VIEW_CHANGE:
      handleViewChangeMessage(receivedMessage, currentPeer, peers);
      break;

    default:
      console.log(`Invalid message type received from ${currentPeer.name}: ${receivedMessage.messageType}`);
  }
}
//Funstion to handle REQUEST messages
function handleRequestMessage(receivedMessage, currentPeer, peers){
  console.log(`${currentPeer.name} received REQUEST. Broadcasting PROPAGATE.`);
  connectToPeers(peers.filter(p => p.name !== currentPeer.name), new Propagate_Message(MessageType.PROPAGATE, receivedMessage.data, receivedMessage.Request_ID, receivedMessage.Client_Name, currentPeer.name), currentPeer);
  const propagateKey = `${receivedMessage.Request_ID}-${receivedMessage.Client_Name}`;
  if (!phaseCounts.propagate.has(propagateKey)) {
    phaseCounts.propagate.set(propagateKey, new Set());
    phaseCounts.propagate.get(propagateKey).add(currentPeer.name);
    requestkey_data.set(propagateKey, receivedMessage.data);
  }
}

// Function to handle PROPAGATE messages
function handlePropagateMessage(receivedMessage, currentPeer, peers) {
  const propagateKey = `${receivedMessage.Request_ID}-${receivedMessage.Client_Name}`;
  if (!phaseCounts.propagate.has(propagateKey)) {
    connectToPeers(peers.filter(p => p.name !== currentPeer.name), new Propagate_Message(MessageType.PROPAGATE, receivedMessage.data, receivedMessage.Request_ID, receivedMessage.Client_Name, currentPeer.name), currentPeer);
    phaseCounts.propagate.set(propagateKey, new Set());
    phaseCounts.propagate.get(propagateKey).add(currentPeer.name);
    requestkey_data.set(propagateKey, receivedMessage.data);
  }
  if (!phaseCounts.propagate.has(propagateKey)) {
    phaseCounts.propagate.set(propagateKey, new Set());
  }
  const propagateSet = phaseCounts.propagate.get(propagateKey);
  if (!propagateSet.has(receivedMessage.sender)) {
    propagateSet.add(receivedMessage.sender);
    console.log(`Received PROPAGATE from ${receivedMessage.sender} (Total PROPAGATE messages for request id ${receivedMessage.Request_ID}, from client: ${receivedMessage.Client_Name}: ${propagateSet.size})`);
    if (currentPeer.leaderOf != -1 && propagateSet.size === 2*f+1) {
      console.log(`Sending REPAIR to all peers`);
      connectToPeers(peers.filter(p => p.name !== currentPeer.name), new Repair_Message(MessageType.REPAIR, currentPeer.leaderOf, phase++, receivedMessage.Request_ID, view, receivedMessage.Client_Name, currentPeer.name, receivedMessage.data), currentPeer);
      // Increment repair count
      const newKey = `${currentPeer.leaderOf}-${phase - 1}-${view}`;
      if (!phaseCounts.repair.has(newKey)) {
        phaseCounts.repair.set(newKey, new Set());
      }
      phaseCounts.repair.get(newKey).add(currentPeer.name);
      const myKey = `${receivedMessage.Request_ID}-${receivedMessage.Client_Name}`;
      prepareKey_requestKey.set(newKey, myKey);
    }
  } else {
    console.log(`Duplicate PROPAGATE message received from ${receivedMessage.sender} for request id ${receivedMessage.Request_ID}, from client: ${receivedMessage.Client_Name}, Ignoring...`);
  }
}

// Function to handle REPAIR messages
function handleRepairMessage(receivedMessage, currentPeer, peers) {
  if(view>receivedMessage.viewNumber){
    return;
  }
  const repairKey = `${receivedMessage.instanceNumber}-${receivedMessage.phaseNumber}-${receivedMessage.viewNumber}`;
  const myKey = `${receivedMessage.Request_ID}-${receivedMessage.Client_Name}`;
  if (!phaseCounts.repair.has(repairKey)) {
    phaseCounts.repair.set(repairKey, new Set());
  }
  const repairSet = phaseCounts.repair.get(repairKey);
  if (!repairSet.has(receivedMessage.sender)) {
    repairSet.add(receivedMessage.sender);
    console.log(`Received REPAIR from ${receivedMessage.sender} (Total REPAIR messages for instance ${receivedMessage.instanceNumber}, phase ${receivedMessage.phaseNumber}: ${repairSet.size})`);
    if (repairSet.size === 1) {
      prepareKey_requestKey.set(repairKey, myKey);
      console.log(`Sending PREPARE to all peers`);
      connectToPeers(peers.filter(p => p.name !== currentPeer.name), new Phase_Message(MessageType.PREPARE, receivedMessage.instanceNumber, receivedMessage.phaseNumber, receivedMessage.viewNumber, currentPeer.name), currentPeer);
      // Increment prepare count
      if (!phaseCounts.prepare.has(repairKey)) {
        phaseCounts.prepare.set(repairKey, new Set());
      }
      phaseCounts.prepare.get(repairKey).add(currentPeer.name);
    }
  } else {
    console.log(`Duplicate REPAIR message received from ${receivedMessage.sender} for instance ${receivedMessage.instanceNumber}, phase ${receivedMessage.phaseNumber}. Ignoring...`);
  }
}

// Function to handle PREPARE messages
function handlePrepareMessage(receivedMessage, currentPeer, peers) {
  if(view>receivedMessage.viewNumber){
    return;
  }
  const prepareKey = `${receivedMessage.instanceNumber}-${receivedMessage.phaseNumber}-${receivedMessage.viewNumber}`;
  if (!phaseCounts.prepare.has(prepareKey)) {
    phaseCounts.prepare.set(prepareKey, new Set());
  }
  const prepareSet = phaseCounts.prepare.get(prepareKey);
  if (!prepareSet.has(receivedMessage.sender)) {
    prepareSet.add(receivedMessage.sender);
    console.log(`Received PREPARE from ${receivedMessage.sender} (Total PREPARE messages for instance ${receivedMessage.instanceNumber}, phase ${receivedMessage.phaseNumber}: ${prepareSet.size})`);
    const repairSet = phaseCounts.repair.get(prepareKey);
    if (prepareSet.size === 2*f) {
      console.log(`Sending COMMIT to all peers`);
      connectToPeers(peers.filter(p => p.name !== currentPeer.name), new Phase_Message(MessageType.COMMIT, receivedMessage.instanceNumber, receivedMessage.phaseNumber, receivedMessage.viewNumber, currentPeer.name), currentPeer);
      // Increment commit count
      if (!phaseCounts.commit.has(prepareKey)) {
        phaseCounts.commit.set(prepareKey, new Set());
      }
      phaseCounts.commit.get(prepareKey).add(currentPeer.name);
    }
  } else {
    console.log(`Duplicate PREPARE message received from ${receivedMessage.sender} for instance ${receivedMessage.instanceNumber}, phase ${receivedMessage.phaseNumber}. Ignoring...`);
  }
}

// Function to handle COMMIT messages
function handleCommitMessage(receivedMessage, currentPeer, peers) {
  if(view>receivedMessage.viewNumber){
    return;
  }
  const commitKey = `${receivedMessage.instanceNumber}-${receivedMessage.phaseNumber}-${receivedMessage.viewNumber}`;
  if (!phaseCounts.commit.has(commitKey)) {
    phaseCounts.commit.set(commitKey, new Set());
  }
  const commitSet = phaseCounts.commit.get(commitKey);
  if (!commitSet.has(receivedMessage.sender)) {
    commitSet.add(receivedMessage.sender);
    console.log(`Received COMMIT from ${receivedMessage.sender} (Total COMMIT messages for instance ${receivedMessage.instanceNumber}, phase ${receivedMessage.phaseNumber}: ${commitSet.size})`);
    if (commitSet.size === 2*f+1&&phaseCounts.repair.has(commitKey)) {
      const key1=prepareKey_requestKey.get(commitKey);
      console.log(`----key1::${key1}--------`);
      const key2=requestkey_data.get(key1);
      console.log(`----key2::${key2}--------`);
      const data_to_commit = requestkey_data.get(prepareKey_requestKey.get(commitKey));
      console.log(`----------------Instance ${receivedMessage.instanceNumber}, Phase ${receivedMessage.phaseNumber} completed.------------------`);
      console.log(`${instanceCommitCounts.get(receivedMessage.instanceNumber)}-- ${instanceCommitCounts.get(0)}`);
      console.log(`${data_to_commit}`);
      console.log(`----------------Instance ${receivedMessage.instanceNumber}, Phase ${receivedMessage.phaseNumber} completed.------------------`);
      const reqKey=prepareKey_requestKey.get(commitKey);
      if (receivedMessage.instanceNumber == 0) {
        const logFilePath = path.join(scriptDirectory, 'commit_status.log');
        const logMessage = `Peer: ${currentPeer.name}, View: ${receivedMessage.viewNumber}, Phase ${receivedMessage.phaseNumber}:${data_to_commit}`;
        fs.appendFileSync(logFilePath, logMessage + '\n');
        console.log(`Commit status written to log file: ${logMessage}`);
        REPLY(new Reply_Message(MessageType.REPLY,reqKey,currentPeer.name));
      }

      instanceCommitCounts.set(receivedMessage.instanceNumber, (instanceCommitCounts.get(receivedMessage.instanceNumber) || 0) + 1);
      if (instanceCommitCounts.get(receivedMessage.instanceNumber) - instanceCommitCounts.get(0) >= 10) {
        //send view_change_command message, write this part
        console.log(`Sending View Change to all peers`);
        console.log(`Sending View Change to all peers`);
        connectToPeers(peers, new Message(MessageType.VIEW_CHANGE, receivedMessage.instanceNumber, receivedMessage.phaseNumber, "INSTANCE_CHANGE", receivedMessage.viewNumber, currentPeer.name), currentPeer);
      }
      // phaseCounts.commit.delete(commitKey);
      // phaseCounts.prepare.delete(commitKey);
      // phaseCounts.repair.delete(commitKey);
      // phaseCounts.propagate.delete(reqKey);
      // requestkey_data.delete(reqKey);
      // prepareKey_requestKey.delete(prepareKey_requestKey);
    }
  } else {
    console.log(`Duplicate COMMIT message received from ${receivedMessage.sender} for instance ${receivedMessage.instanceNumber}, phase ${receivedMessage.phaseNumber}. Ignoring...`);
  }
}

// Function to handle VIEW_CHANGE messages
function handleViewChangeMessage(receivedMessage, currentPeer, peers) {
  if(view>receivedMessage.viewNumber){
    return;
  }
  const viewKey = `${receivedMessage.viewNumber}`;
  if (!phaseCounts.view.has(viewKey)) {
    phaseCounts.view.set(viewKey, new Set());
  }
  const viewSet = phaseCounts.view.get(viewKey);
  if (!viewSet.has(receivedMessage.sender)) {
    viewSet.add(receivedMessage.sender);
    console.log(`Received view from ${receivedMessage.sender} (Total view_change messages ${viewSet.size})`);
    if (viewSet.size === 2*f+1) {
      console.log(`${currentPeer.name}: Doing view change `);
      view=receivedMessage.viewNumber+1;
      let view_mod=view%n;
      if ((currentPeer.id-view_mod+n)% n>f) {
        currentPeer.leaderOf = -1;
      } else {
        currentPeer.leaderOf=(currentPeer.id-view_mod+n)%n;
      }
      instanceCommitCounts = new Map();
      instanceCommitCounts.set(0, 0);
      instanceCommitCounts.set(1, 0);
      instanceCommitCounts.set(2, 0);
      instanceCommitCounts.set(3, 0);
      instanceCommitCounts.set(4, 0);
      instanceCommitCounts.set(5, 0);
      instanceCommitCounts.set(6, 0);
      instanceCommitCounts.set(7, 0);
      phase = 1;
    }
  }
}

// Main function
if (require.main === module) {
  // const scriptDirectory = __dirname
  scriptDirectory = path.dirname(process.argv[1]);
  const envFilePath = path.join(scriptDirectory, 'me.env');
  const peerName = process.argv[2];

  if (!fs.existsSync(envFilePath)) {
    console.error(`Error: Environment file not found at ${envFilePath}`);
    process.exit(1);
  }

  const peers = readEnvFile(envFilePath);
  const currentPeer = peers.find(peer => peer.name === peerName);

  if (!currentPeer) {
    console.error(`Error: Peer with name '${peerName}' not found in the environment file.`);
    process.exit(1);
  }

  const server = net.createServer(socket => {
    console.log('Client connected.');

    socket.on('data', data => {
      handleMessage(data, currentPeer, peers);
    });

    socket.on('end', () => {
      console.log('Client disconnected.');
    });
  });

  server.listen(currentPeer.port, currentPeer.host, () => {
    console.log(`Server ${currentPeer.name} listening on ${currentPeer.host}:${currentPeer.port}`);
  });

  server.on('error', err => {
    console.error('Server error:', err.message);
  });
}
