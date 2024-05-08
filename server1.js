// server1.js

const net = require('net');

const PORT = 3000; // Port to listen on
const HOST = '127.0.0.1'; // Localhost

const server = net.createServer(socket => {
  console.log('Client connected to server 1.');

  socket.on('data', data => {
    console.log('Received from client 3:', data.toString());
  });

  socket.on('end', () => {
    console.log('Client disconnected from server 1.');
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Server 1 listening on ${HOST}:${PORT}`);
});
