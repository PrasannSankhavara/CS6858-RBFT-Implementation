const net = require('net');

// Create a TCP client
const client = new net.Socket();

// Connect to the server (using the IP address of the server)
client.connect(2001, '127.0.0.1', () => { // Change '127.0.0.1' to the server IP
    console.log('Connected to server');

    // Send a JSON object to the server
    const jsonData = {
        message: "Hello from the client!",
        timestamp: new Date().toISOString()
    };
    client.write(JSON.stringify(jsonData));
});

// Handle data received from the server
client.on('data', (data) => {
    const receivedJson = JSON.parse(data.toString());
    console.log('Received from server:', receivedJson);

    // Close the connection after receiving data
    client.end();
});

// Handle connection close
client.on('close', () => {
    console.log('Connection closed');
});

// Handle errors
client.on('error', (err) => {
    console.error('Client error:', err);
});
