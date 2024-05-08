#!/bin/bash

# Run the server instances
node server.js Server1 &
node server.js Server2 &
node server.js Server3 &
node server.js Server4 &

# Wait for the server instances to start
sleep 5

# Run the client script
node client2.js 127.0.0.1 9000
