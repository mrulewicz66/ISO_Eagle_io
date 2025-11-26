const socketIO = require('socket.io');
const DataAggregator = require('../services/dataAggregator');

function initializeWebSocket(server) {
    const io = socketIO(server, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:3000",
            methods: ["GET", "POST"]
        }
    });

    const aggregator = new DataAggregator();

    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        // Send initial data
        socket.emit('initial-data', { message: 'Connected to real-time feed' });

        // Subscribe to specific crypto
        socket.on('subscribe', (crypto) => {
            console.log(`Client subscribed to ${crypto}`);
            socket.join(crypto);
        });

        // Unsubscribe from specific crypto
        socket.on('unsubscribe', (crypto) => {
            console.log(`Client unsubscribed from ${crypto}`);
            socket.leave(crypto);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });

    // Broadcast updates every minute
    setInterval(async () => {
        try {
            const summary = await aggregator.aggregateAllData();
            io.emit('data-update', summary);
        } catch (error) {
            console.error('WebSocket update error:', error);
        }
    }, 60000);

    return io;
}

module.exports = initializeWebSocket;
