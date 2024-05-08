const net = require('net');
const allowedIP = '::ffff:127.0.0.1'; // IP address allowed to connect

// JSON data to be sent to the client
const jsonData = {
    message: "Hello from the server!",
    timestamp: new Date().toISOString()
};

// Create a TCP server
const server = net.createServer((socket) => {
    const clientIP = socket.remoteAddress;

    if (clientIP !== allowedIP) {
        console.log(`Connection from ${clientIP} rejected.`);
        socket.end(); // Close the connection
    } else {
        console.log(`Client connected from ${clientIP}`);

        // Send JSON data to the client
        socket.write(JSON.stringify(jsonData));

        // Handle data received from the client
        socket.on('data', (data) => {
            const receivedJson =JSON.parse(data.toString());
            console.log('Received from client:', receivedJson);
            console.log('Message: ',receivedJson.message);
        });

        // Handle client disconnecting
        socket.on('end', () => {
            console.log('Client disconnected');
        });
    }
});

// Bind the server to port 2000 and start listening
server.listen(2001, () => {
    console.log('Server listening on port 2001');
});
