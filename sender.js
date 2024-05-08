const io = require('socket.io-client');

// Define the ports of all VMs
const vms = [3001, 3002];

// Define the message to be sent
const message = 'Hello from VM1!';

// Connect to each VM and send the message
vms.forEach((port) => {
  const socket = io.connect(`http://localhost:${port}`);
  socket.emit('message', message);
});
