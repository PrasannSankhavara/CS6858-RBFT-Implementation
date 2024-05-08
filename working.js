// server.js

const fs = require('fs');
const path = require('path');
const net = require('net');

const MessageType = {
  REPAIR: 'REPAIR',
  PREPARE: 'PREPARE',
  COMMIT: 'COMMIT'
};

const phaseCounts = {
  repair: [0, 0, 0], // Initialize count arrays for each phase
  prepare: [0, 0, 0],
  commit: [0, 0, 0]
};

let phase = 0; // Initialize the phase counter

const connections = new Map(); // Map to store connections for each peer

function connectToPeer(peerInfo, messageType, myName) {
  // Check if a connection already exists for the peer
  if (connections.has(peerInfo.name)) {
    const client = connections.get(peerInfo.name);
    client.write(`${myName}: ${messageType}`);
  } else {
    const client = new net.Socket();
    client.connect(peerInfo.port, peerInfo.host, () => {
      console.log(`Connected to ${peerInfo.name} at ${peerInfo.host}:${peerInfo.port}`);
      client.write(`${myName}: ${messageType}`);
    });

    // client.on('data', data => {
    //   const receivedMessage = data.toString();
    //   if (receivedMessage.includes(MessageType.REPAIR)) {
    //     phaseCounts.repair[phase]++; // Increment the repair count for the current phase
    //     console.log(`Received from ${peerInfo.name}: ${receivedMessage} (Total REPAIR messages for phase ${phase}: ${phaseCounts.repair[phase]})`);
    //     if (phaseCounts.repair[phase] === 2) {
    //       // Start "PREPARE" phase when repairCount reaches 2
    //       console.log(`Starting PREPARE phase`);
    //       connectToPeers(peers.filter(p => p.name !== myName), MessageType.PREPARE, myName);
    //     }
    //   } else if (receivedMessage.includes(MessageType.PREPARE)) {
    //     phaseCounts.prepare[phase]++; // Increment the prepare count for the current phase
    //     console.log(`Received from ${peerInfo.name}: ${receivedMessage} (Total PREPARE messages for phase ${phase}: ${phaseCounts.prepare[phase]})`);
    //     if (phaseCounts.prepare[phase] === 2) {
    //       // Start "COMMIT" phase when prepareCount reaches 2
    //       console.log(`Starting COMMIT phase`);
    //       connectToPeers(peers.filter(p => p.name !== myName), MessageType.COMMIT, myName);
    //     }
    //   } else if (receivedMessage.includes(MessageType.COMMIT)) {
    //     phaseCounts.commit[phase]++; // Increment the commit count for the current phase
    //     console.log(`Received from ${peerInfo.name}: ${receivedMessage} (Total COMMIT messages for phase ${phase}: ${phaseCounts.commit[phase]})`);
    //     if (phaseCounts.commit[phase] === 2) {
    //       // Move to the next phase when commitCount reaches 2
    //       phase++;
    //       console.log(`Moving to phase ${phase}`);
    //       if (phase < 3) {
    //         // Start the repair phase for the next phase
    //         console.log(`Starting REPAIR phase for phase ${phase}`);
    //         connectToPeers(peers.filter(p => p.name !== myName), MessageType.REPAIR, myName);
    //       } else {
    //         console.log(`All phases completed.`);
    //         // Optionally, you can close connections and perform cleanup here
    //       }
    //     }
    //   } else {
    //     console.log(`Received from ${peerInfo.name}: ${receivedMessage}`);
    //   }
    // });

    client.on('error', err => {
      console.error(`Error connecting to ${peerInfo.name}: ${err.message}`);
      client.destroy();
    });

    client.on('close', () => {
      console.log(`Connection closed to ${peerInfo.name}`);
    });

    // Store the connection for future use
    connections.set(peerInfo.name, client);
  }
}

function connectToPeers(peers, messageType, myName) {
  peers.forEach(peer => {
    connectToPeer(peer, messageType, myName);
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

module.exports = { connectToPeer, connectToPeers, readEnvFile, MessageType };

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
      console.log('Received:', data.toString());

      if (data.toString().trim() === 'start_phase' && socket.remoteAddress === '127.0.0.1') {
        console.log(`Starting connection phase as ${currentPeer.name} at ${currentPeer.host}:${currentPeer.port}`);
        const otherPeers = peers.filter(peer => peer.name !== currentPeer.name);
        connectToPeers(otherPeers, MessageType.REPAIR, currentPeer.name);
      } else {
        const receivedMessage = data.toString();
        if (receivedMessage.includes(MessageType.REPAIR)) {
          phaseCounts.repair[phase]++; // Increment the counter if message contains "REPAIR"
          console.log(`Received from ${currentPeer.name}: ${receivedMessage} (Total REPAIR messages for phase ${phase}: ${phaseCounts.repair[phase]})`);
          if (phaseCounts.repair[phase] === 2) {
            // Send "PREPARE" message when repairCount reaches 2
            console.log(`Sending PREPARE to all peers`);
            connectToPeers(peers.filter(p => p.name !== currentPeer.name), MessageType.PREPARE, currentPeer.name);
          }
        } else if (receivedMessage.includes(MessageType.PREPARE)) {
          phaseCounts.prepare[phase]++; // Increment the counter if message contains "PREPARE"
          console.log(`Received from ${currentPeer.name}: ${receivedMessage} (Total PREPARE messages for phase ${phase}: ${phaseCounts.prepare[phase]})`);
          if (phaseCounts.prepare[phase] === 2) {
            // Send "COMMIT" message when prepareCount reaches 2
            console.log(`Sending COMMIT to all peers`);
            connectToPeers(peers.filter(p => p.name !== currentPeer.name), MessageType.COMMIT, currentPeer.name);
          }
        } else if (receivedMessage.includes(MessageType.COMMIT)) {
          phaseCounts.commit[phase]++; // Increment the counter if message contains "COMMIT"
          console.log(`Received from ${currentPeer.name}: ${receivedMessage} (Total COMMIT messages for phase ${phase}: ${phaseCounts.commit[phase]})`);
          if (phaseCounts.commit[phase] === 2) {
            // Move to the next phase when commitCount reaches 2
            phase++;
            console.log(`Moving to phase ${phase}`);
            if (phase < 3) {
              // Start the repair phase for the next phase
              console.log(`Starting REPAIR phase for phase ${phase}`);
              connectToPeers(peers.filter(p => p.name !== currentPeer.name), MessageType.REPAIR, currentPeer.name);
            } else {
              console.log(`All phases completed.`);
              // Optionally, you can close connections and perform cleanup here
            }
          }
        } else {
          console.log(`Received from ${currentPeer.name}: ${receivedMessage}`);
        }
      }

      // Close the server after processing the message
      // server.close(() => {
      //   console.log('Server closed.');
      // });
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
