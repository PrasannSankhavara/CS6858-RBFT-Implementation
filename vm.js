const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

// Constants
const PORT = process.argv[2];
const PEERS = process.argv.slice(3);

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Initialize node state
let currentState = 'NEW_ROUND';

// Handle incoming connections
io.on('connection', (socket) => {
  console.log(`Node connected: ${socket.id}`);

  // Handle message reception
  socket.on('message', (data) => {
    console.log(`Message received by ${socket.id}: ${data}`);
    handleMessage(data);
  });
});

// Function to handle incoming messages
function handleMessage(message) {
  console.log(`Handling message in state ${currentState}: ${message}`);
  // Here you would implement the logic to handle messages in different states
}

// Function to broadcast a message to all connected nodes
function broadcastMessage(type, content) {
  io.emit('message', { type, content });
}

// Connect to peers
PEERS.forEach(peer => {
  const socket = socketIO(`http://localhost:${peer}`);
  socket.on('connect', () => {
    console.log(`Connected to peer: ${peer}`);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
