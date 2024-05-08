const fs = require('fs');
const path = require('path');
const net = require('net');
const Client_Message = require('./client_message');

const MessageType = {
  REPAIR: 'REPAIR',
  PREPARE: 'PREPARE',
  COMMIT: 'COMMIT',
  REQUEST: 'REQUEST',
  PROPAGATE: 'PROPAGATE'
};

const phaseCounts = {
  repair: new Map(),
  prepare: new Map(),
  commit: new Map(),
  propagate: new Map()
};

const connections = new Map();

function connectToServer(serverInfo, message) {
  const client = new net.Socket();

  client.connect(serverInfo.port, serverInfo.host, () => {
    console.log(`Connected to server ${serverInfo.name} at ${serverInfo.host}:${serverInfo.port}`);
    client.write(JSON.stringify(message));
  });

  client.on('data', data => {
    console.log(`Received from server ${serverInfo.name} at ${serverInfo.host}:${serverInfo.port}: ${data.toString()}`);
    client.end();
  });

  client.on('error', err => {
    console.error(`Error connecting to server ${serverInfo.name} at ${serverInfo.host}:${serverInfo.port}: ${err.message}`);
    client.destroy();
  });

  client.on('close', () => {
    console.log(`Connection closed to server ${serverInfo.name} at ${serverInfo.host}:${serverInfo.port}`);
  });
}

function readEnvFile(envFilePath) {
  const envData = fs.readFileSync(envFilePath, 'utf8');
  const lines = envData.split('\n');
  const servers = [];

  lines.forEach(line => {
    const [name, host, port] = line.trim().split(',');
    if (name && host && port) {
      servers.push({ name, host, port: parseInt(port) });
    }
  });

  return servers;
}

module.exports = { connectToServer, readEnvFile };

if (require.main === module) {
    const scriptDirectory = path.dirname(process.argv[1]);
    const envFilePath = path.join(scriptDirectory, 'me.env');
  
    if (!fs.existsSync(envFilePath)) {
      console.error(`Error: Environment file not found at ${envFilePath}`);
      process.exit(1);
    }
  
    const servers = readEnvFile(envFilePath);
    const server2 = servers.find(server => server.name === 'Server2'); // Find Server 2
  
    if (!server2) {
      console.error('Error: Server 2 not found in the environment file.');
      process.exit(1);
    }
  
    const startPhaseMessage1 = new Client_Message(MessageType.REQUEST, 'I am good', 1, 'master_client');
    connectToServer(server2, startPhaseMessage1);
  
    const startPhaseMessage2 = new Client_Message(MessageType.REQUEST, 'I am better', 2, 'master_client');
    connectToServer(server2, startPhaseMessage2);
  
    const startPhaseMessage3 = new Client_Message(MessageType.REQUEST, 'I am the best', 3, 'master_client');
    connectToServer(server2, startPhaseMessage3);
  
    const startPhaseMessage4 = new Client_Message(MessageType.REQUEST, 'I exist', 4, 'master_client');
    connectToServer(server2, startPhaseMessage4);
  }
  
