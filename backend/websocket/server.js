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

        const ALLOWED_ROOMS = new Set(['XRP', 'BTC', 'ETH', 'SOL', 'XLM', 'ALGO', 'HBAR', 'IOTA']);

        // Subscribe to specific crypto
        socket.on('subscribe', (crypto) => {
            if (typeof crypto !== 'string' || !ALLOWED_ROOMS.has(crypto)) return;
            socket.join(crypto);
        });

        // Unsubscribe from specific crypto
        socket.on('unsubscribe', (crypto) => {
            if (typeof crypto !== 'string' || !ALLOWED_ROOMS.has(crypto)) return;
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
