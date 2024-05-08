const fs = require('fs');
const path = require('path');
const net = require('net');
const Client_Message = require('./client_message');
const Reply_Message = require('./reply_message');
const f = 1;

const MessageType = {
  REPAIR: 'REPAIR',
  PREPARE: 'PREPARE',
  COMMIT: 'COMMIT',
  REQUEST: 'REQUEST',
  PROPAGATE: 'PROPAGATE',
  REPLY: 'REPLY'
};

const phaseCounts = {
  repair: new Map(),
  prepare: new Map(),
  commit: new Map(),
  propagate: new Map()
};

const connections = new Map();
const reply = new Map();
const timers = new Map();

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

function handleMessage(data) {
  console.log('Received:', data.toString());

  const receivedMessage = JSON.parse(data.toString());

  if (receivedMessage.messageType === MessageType.REPLY) {
    if (!reply.has(receivedMessage.rid)) {
      reply.set(receivedMessage.rid, new Set());
    }
    mySet = reply.get(receivedMessage.rid);
    mySet.add(receivedMessage.sender);
    if (mySet.size == f + 1) {
      console.log(`---------------------------------------------------------------`);
      console.log(`Execution of ${receivedMessage.rid} completed`);
      const receivingTime = new Date();
      const sendingTime = timers.get(JSON.parse(data.toString()).rid);
      const duration = receivingTime - sendingTime;
      console.log(`Time taken for rid ${JSON.parse(data.toString()).rid}: ${duration} milliseconds`);
      console.log(`---------------------------------------------------------------`);

      // After writing the timer information to timer.log, also write it to timer.csv
      fs.appendFileSync('timer.csv', `${JSON.parse(data.toString()).rid},${duration}\n`);
    }
  } else {
    console.log("INVALID MESSAGE TYPE");
  }
}

module.exports = { connectToServer, readEnvFile };

if (require.main === module) {
  const scriptDirectory = path.dirname(process.argv[1]);
  const envFilePath = path.join(scriptDirectory, 'me.env');
  const messageFilePath = path.join(scriptDirectory, 'message.txt');

  if (!fs.existsSync(envFilePath)) {
    console.error(`Error: Environment file not found at ${envFilePath}`);
    process.exit(1);
  }

  if (!fs.existsSync(messageFilePath)) {
    console.error(`Error: Message file not found at ${messageFilePath}`);
    process.exit(1);
  }

  if (process.argv.length < 5) {
    console.error('Usage: node your_script.js <IP_ADDRESS> <PORT> <TIMEOUT>');
    process.exit(1);
  }

  const ip = process.argv[2];
  const port = parseInt(process.argv[3]);
  const timeout = parseInt(process.argv[4]);

  const messageContent = fs.readFileSync(messageFilePath, 'utf8').trim();

  const client_server = net.createServer(socket => {
    console.log('Client connected.');

    socket.on('data', data => {
      handleMessage(data);
    });

    socket.on('end', () => {
      console.log('Client disconnected.');
    });
  });

  client_server.listen(port, ip, () => {
    console.log(`Server listening on ${ip}:${port}`);
  });

  client_server.on('error', err => {
    console.error('Server error:', err.message);
  });

  const servers = readEnvFile(envFilePath);
  
  function sendRequestsWithDelay() {
    let phaseNumber = 0;

    function sendRequest() {
      if (phaseNumber <= 100) {
        const startPhaseMessage = new Client_Message(MessageType.REQUEST, messageContent+phaseNumber, phaseNumber, `${ip}:${port}`);
        // Send the message to every server
        timers.set(`${phaseNumber}`,new Date());
        servers.forEach(server => {
          connectToServer(server, startPhaseMessage);
        });

        phaseNumber++;

        // Sleep for specified timeout milliseconds before sending the next request
        setTimeout(sendRequest, timeout);
      }
    }

    sendRequest();
  }

  sendRequestsWithDelay(); // Loop with delay between requests
}
