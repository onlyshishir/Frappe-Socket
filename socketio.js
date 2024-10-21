'use strict';

const path = require('path');
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
// const { get_redis_subscriber } = require('../frappe/node_utils');
// const subscriber = get_redis_subscriber();
const { get_fsocket_conf } = require('./node_utils');
const { fsocketio_port } = get_fsocket_conf();

app.use('/test', express.static(path.join(__dirname, './client')));

server.listen(fsocketio_port, function () {
    console.log('Listening on port:', fsocketio_port);
});

const Redis = require('ioredis');
const subscriber = new Redis({
    host: 'kenolocalhost-redis-queue',  // Make sure this matches the Redis container name
    port: 6379     // Match this with the port configured for Redis in Docker
});

// Subscribe to the Redis channelc
subscriber.subscribe('events');
console.log('Subscribed to Redis channel: events', subscriber);

// Listen to events emitted by frappe.publish_realtime
subscriber.on('message', function (channel, message) {
    console.log(`Received message on channel ${channel}:`, message);

    try {
        message = JSON.parse(message);
        console.log('Parsed message:', message);

        if (message.room) {
            console.log('Emitting message to room:', message.room);
            io.to(message.room).emit(message.event, message.message);
        } else {
            console.log('Emitting broadcast message:', message.event);
            io.emit(message.event, message.message);
        }
    } catch (error) {
        console.error('Error parsing or emitting message:', error);
    }
});

// subscriber.on('subscribe', (channel, count) => {
//     console.log(`Subscribed successfully to ${channel} channel. Currently subscribed to ${count} channel(s).`);
// });

// Listen to events emitted by clients
io.on('connection', function (socket) {
    console.log('A client connected:', socket.id);

	socket.on("joinRoom", (orderId) => {
        socket.join(orderId);
        console.log(` 🔴 User Joined room ${orderId}`);
      });

    socket.on('msgprint', function (message) {
        console.log('Message from client:', message);
    });
});
