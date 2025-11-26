require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const apiRoutes = require('./routes/api');
const initializeWebSocket = require('./websocket/server');
const { startDataCollectionJobs } = require('./jobs/dataCollector');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize WebSocket
const io = initializeWebSocket(server);

// Start data collection jobs
if (process.env.NODE_ENV !== 'test') {
    startDataCollectionJobs();
}

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`WebSocket server ready`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { app, server, io };
