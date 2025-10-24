const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

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
        uptime: process.uptime()
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
        
        app.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════════════╗
║  Tennis Club Social Day Manager Server    ║
║  Running on port ${PORT}                     ║
║  http://localhost:${PORT}                    ║
╚════════════════════════════════════════════╝
            `);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();