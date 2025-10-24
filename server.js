const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Set();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for larger state objects
app.use(express.static('public')); // Serve static files from 'public' folder

// Path to our data storage file
const DATA_FILE = path.join(__dirname, 'data', 'state.json');

// Ensure data directory exists
async function ensureDataDirectory() {
    const dataDir = path.join(__dirname, 'data');
    try {
        await fs.access(dataDir);
    } catch {
        await fs.mkdir(dataDir, { recursive: true });
    }
}

// Initialize with empty state if file doesn't exist
async function initializeState() {
    try {
        await fs.access(DATA_FILE);
    } catch {
        // File doesn't exist, create it with empty state
        const initialState = {
            availablePlayers: [],
            courts: [],
            gameHistory: [],
            lastUpdated: new Date().toISOString()
        };
        await fs.writeFile(DATA_FILE, JSON.stringify(initialState, null, 2));
        console.log('Initialized state.json with empty state');
    }
}

// Broadcast state update to all connected clients
function broadcastStateUpdate(state) {
    const message = JSON.stringify({
        type: 'state_update',
        state: state,
        timestamp: new Date().toISOString()
    });
    
    let broadcastCount = 0;
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
            broadcastCount++;
        }
    });
    
    console.log(`📡 Broadcasted state update to ${broadcastCount} client(s)`);
}

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('🔌 New client connected');
    clients.add(ws);
    
    // Send current state to new client
    fs.readFile(DATA_FILE, 'utf8')
        .then(data => {
            const state = JSON.parse(data);
            ws.send(JSON.stringify({
                type: 'initial_state',
                state: state,
                timestamp: new Date().toISOString()
            }));
        })
        .catch(err => {
            console.error('Error sending initial state:', err);
        });
    
    // Handle client disconnect
    ws.on('close', () => {
        console.log('🔌 Client disconnected');
        clients.delete(ws);
    });
    
    // Handle errors
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        clients.delete(ws);
    });
});

// API Routes

// GET /api/state - Load the current state
app.get('/api/state', async (req, res) => {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const state = JSON.parse(data);
        res.json({
            success: true,
            state: state,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error reading state:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load state',
            message: error.message
        });
    }
});

// POST /api/state - Save the entire state
app.post('/api/state', async (req, res) => {
    try {
        const newState = req.body;
        
        // Add timestamp
        newState.lastUpdated = new Date().toISOString();
        
        // Save to file
        await fs.writeFile(DATA_FILE, JSON.stringify(newState, null, 2));
        
        // Broadcast to all connected clients
        broadcastStateUpdate(newState);
        
        res.json({
            success: true,
            message: 'State saved successfully',
            timestamp: newState.lastUpdated
        });
    } catch (error) {
        console.error('Error saving state:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save state',
            message: error.message
        });
    }
});

// GET /api/health - Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        connectedClients: clients.size
    });
});

// Serve the main app
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
async function startServer() {
    try {
        await ensureDataDirectory();
        await initializeState();
        
        server.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════════════╗
║  Tennis Club Social Day Manager Server    ║
║  Running on port ${PORT}                     ║
║  http://localhost:${PORT}                    ║
║  WebSocket: ENABLED ✅                       ║
╚════════════════════════════════════════════╝
            `);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();