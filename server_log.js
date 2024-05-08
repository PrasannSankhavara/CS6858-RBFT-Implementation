// server.js
const fs = require('fs');
const path = require('path');
const net = require('net');
const Message = require('./message');

const MessageType = {
  REPAIR: 'REPAIR',
  PREPARE: 'PREPARE',
  COMMIT: 'COMMIT',
  START_PHASE: 'START_PHASE'
};

// Initialize count maps for each phase
const phaseCounts = {
  repair: new Map(),
  prepare: new Map(),
  commit: new Map()
};

let phase = 0; // Initialize the phase counter

const connections = new Map(); // Map to store connections for each peer

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

function connectToPeers(peers, message, currentPeer) {
  peers.forEach(peer => {
    connectToPeer(peer, message, currentPeer);
  });
}

function readEnvFile(envFilePath) {
  const envData = fs.readFileSync(envFilePath, 'utf8');
  const lines = envData.split('\n');
  const peers = [];

  lines.forEach(line => {
    const [name, host, port] = line.trim().split(',');
    if (name && host && port) {
      peers.push({ name, host, port: parseInt(port) });
    }
  });

  return peers;
}

function handleMessage(data, currentPeer, peers) {
  console.log('Received:', data.toString());

  const receivedMessage = JSON.parse(data.toString());

  switch (receivedMessage.messageType) {
    case MessageType.REPAIR:
      phaseCounts.repair.set(receivedMessage.phaseNumber, (phaseCounts.repair.get(receivedMessage.phaseNumber) || 0) + 1);
      console.log(`Received from ${currentPeer.name}: ${receivedMessage.data} (Total REPAIR messages for phase ${receivedMessage.phaseNumber}: ${phaseCounts.repair.get(receivedMessage.phaseNumber)})`);
      if (phaseCounts.repair.get(receivedMessage.phaseNumber) === 1) {
        console.log(`Sending PREPARE to all peers`);
        connectToPeers(peers.filter(p => p.name !== currentPeer.name), new Message(MessageType.PREPARE, receivedMessage.phaseNumber, receivedMessage.data), currentPeer);
        // Increment prepare count
        phaseCounts.prepare.set(receivedMessage.phaseNumber, (phaseCounts.prepare.get(receivedMessage.phaseNumber) || 0) + 1);
      }
      break;

    case MessageType.PREPARE:
      phaseCounts.prepare.set(receivedMessage.phaseNumber, (phaseCounts.prepare.get(receivedMessage.phaseNumber) || 0) + 1);
      console.log(`Received from ${currentPeer.name}: ${receivedMessage.data} (Total PREPARE messages for phase ${receivedMessage.phaseNumber}: ${phaseCounts.prepare.get(receivedMessage.phaseNumber)})`);
      if (phaseCounts.prepare.get(receivedMessage.phaseNumber) === 2) {
        console.log(`Sending COMMIT to all peers`);
        connectToPeers(peers.filter(p => p.name !== currentPeer.name), new Message(MessageType.COMMIT, receivedMessage.phaseNumber, receivedMessage.data), currentPeer);
        // Increment commit count
        phaseCounts.commit.set(receivedMessage.phaseNumber, (phaseCounts.commit.get(receivedMessage.phaseNumber) || 0) + 1);
      }
      break;

    case MessageType.COMMIT:
      phaseCounts.commit.set(receivedMessage.phaseNumber, (phaseCounts.commit.get(receivedMessage.phaseNumber) || 0) + 1);
      console.log(`Received from ${currentPeer.name}: ${receivedMessage.data} (Total COMMIT messages for phase ${receivedMessage.phaseNumber}: ${phaseCounts.commit.get(receivedMessage.phaseNumber)})`);
      if (phaseCounts.commit.get(receivedMessage.phaseNumber) === 3) {
        console.log(`----------------${receivedMessage.phaseNumber} completed.------------------`);
        console.log(`${receivedMessage.data}`);
        console.log(`----------------${receivedMessage.phaseNumber} completed.------------------`);
      }
      break;

    case MessageType.START_PHASE:
      console.log(`Starting connection phase as ${currentPeer.name} at ${currentPeer.host}:${currentPeer.port}`);
      const otherPeers = peers.filter(peer => peer.name !== currentPeer.name);
      connectToPeers(otherPeers, new Message(MessageType.REPAIR, receivedMessage.phaseNumber, receivedMessage.data), currentPeer);
      break;

    default:
      console.log(`of Received from ${currentPeer.name}: ${receivedMessage.data}`);
  }
}


if (require.main === module) {
  const scriptDirectory = path.dirname(process.argv[1]);
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
    console.log(`Server listening on ${currentPeer.host}:${currentPeer.port}`);
  });

  server.on('error', err => {
    console.error('Server error:', err.message);
  });
}
