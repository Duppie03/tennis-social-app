const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const fetch = require('node-fetch'); // Ensure node-fetch is v2.x if using require

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
app.use(express.json({ limit: '50mb' })); // Increased limit for potentially large state

// --- START ENVIRONMENT VARIABLE LOGIC ---
// Check the NODE_ENV environment variable. If it's 'development', serve from 'public'.
// Otherwise (including when packaged by pkg, where NODE_ENV is usually undefined), serve from 'dist'.
const isDevelopment = process.env.NODE_ENV === 'development';
const staticDir = isDevelopment ? 'public' : 'dist';
const staticPath = path.join(__dirname, staticDir);
const indexPath = path.join(staticPath, 'index.html');

console.log(`Node Environment: ${process.env.NODE_ENV || 'production (default)'}`);
console.log(`Serving static files from: ${staticPath}`); // Log the full path being served

// Serve static files (HTML, CSS, JS, images) from the determined directory
app.use(express.static(staticPath));
// --- END ENVIRONMENT VARIABLE LOGIC ---

// Path to our data storage file
const DATA_FILE = path.join(__dirname, 'data', 'state.json');

// Ensure data directory exists
async function ensureDataDirectory() {
    const dataDir = path.join(__dirname, 'data');
    try {
        await fs.access(dataDir);
    } catch {
        console.log(`Creating data directory: ${dataDir}`);
        await fs.mkdir(dataDir, { recursive: true });
    }
}

// Initialize with empty state if file doesn't exist
async function initializeState() {
    try {
        await fs.access(DATA_FILE);
    } catch {
        const initialState = {
            // Define a more complete initial state if necessary
            availablePlayers: [],
            courts: [],
            gameHistory: [],
            clubMembers: [], // Or load from a default source?
            // ... add any other essential top-level state properties
            lastUpdated: new Date().toISOString()
        };
        await fs.writeFile(DATA_FILE, JSON.stringify(initialState, null, 2));
        console.log(`Initialized ${DATA_FILE} with default state`);
    }
}

// Broadcast state update to all connected clients
function broadcastStateUpdate(state) {
    // Basic validation to prevent broadcasting undefined/null state
    if (!state) {
        console.error("Attempted to broadcast invalid state (null or undefined)");
        return;
    }
    const message = JSON.stringify({
        type: 'state_update',
        state: state,
        timestamp: new Date().toISOString()
    });

    let broadcastCount = 0;
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(message);
                broadcastCount++;
            } catch (error) {
                console.error('Error sending state update to a client:', error);
                // Optionally remove the problematic client
                // clients.delete(client);
            }
        }
    });

    // Only log if there were clients to broadcast to
    if (broadcastCount > 0) {
        console.log(`📡 Broadcasted state update to ${broadcastCount} client(s)`);
    }
}

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('🔌 New client connected');
    clients.add(ws);

    // Send initial state immediately upon connection
    fs.readFile(DATA_FILE, 'utf8')
        .then(data => {
            try {
                const state = JSON.parse(data);
                ws.send(JSON.stringify({
                    type: 'initial_state',
                    state: state,
                    timestamp: new Date().toISOString()
                }));
                 console.log('📤 Sent initial state to new client.');
            } catch (parseError) {
                 console.error('Error parsing state.json for initial send:', parseError);
                 ws.close(); // Close connection if initial state is corrupt
            }
        })
        .catch(err => {
            console.error('Error reading state.json for initial send:', err);
            // Consider sending an error message to the client or closing
            ws.close();
        });

    ws.on('message', (message) => {
        // You could handle messages from clients here if needed (e.g., specific actions)
        console.log('Received message from client (not processed):', message);
    });

    ws.on('close', () => {
        console.log('🔌 Client disconnected');
        clients.delete(ws);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        // Ensure client is removed on error
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
        // Basic validation: Ensure it's an object
        if (typeof newState !== 'object' || newState === null) {
            throw new Error("Invalid state data received. Expected an object.");
        }
        newState.lastUpdated = new Date().toISOString(); // Add/update timestamp
        await fs.writeFile(DATA_FILE, JSON.stringify(newState, null, 2));
        broadcastStateUpdate(newState); // Broadcast after successful save

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
    // Add more checks here if needed (e.g., disk space, state file readability)
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(), // Server uptime in seconds
        connectedClients: clients.size
    });
});

// POST /api/lights/control - Control Shelly devices (Unchanged logic)
app.post('/api/lights/control', async (req, res) => {
    const {
        shellyCloudUrl, authKey, deviceId, toggleAfter,
        shellyIp,
        state, method = 'cloud-first'
    } = req.body;

    const hasCloudConfig = !!(shellyCloudUrl && authKey && deviceId);
    const hasLocalConfig = !!shellyIp;

    if (!hasCloudConfig && !hasLocalConfig) {
        return res.status(400).json({ success: false, error: 'No control method configured.' });
    }
    if (typeof state !== 'boolean') {
        return res.status(400).json({ success: false, error: 'Invalid state parameter.' });
    }

    console.log(`\n[Light Control] Request:`, { method, state, deviceId: deviceId || 'N/A', shellyIp: shellyIp || 'N/A' });

    async function tryCloudAPI() {
        if (!hasCloudConfig) throw new Error('Cloud API not configured');
        const cloudUrl = `${shellyCloudUrl}?null=null&auth_key=${authKey}`;
        const cloudPayload = { id: deviceId, channel: 0, on: state };
        if (toggleAfter && toggleAfter > 0) cloudPayload.toggle_after = toggleAfter;
        console.log(`[Cloud API] Sending to: ${shellyCloudUrl}, Payload:`, cloudPayload);
        const cloudResponse = await fetch(cloudUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' /* ... other headers ... */ },
            body: JSON.stringify(cloudPayload)
        });
        const responseText = await cloudResponse.text();
        console.log(`[Cloud API] Raw response:`, responseText || '(empty)');
        if (!cloudResponse.ok && (!responseText || responseText.trim() === '')) {
             throw new Error(`Cloud API HTTP ${cloudResponse.status}: Empty response`);
        }
        if (!responseText || responseText.trim() === '') {
             if (cloudResponse.ok) return { success: true, data: { isok: true }, method: 'cloud' };
             throw new Error('Cloud API returned empty response with non-OK status');
        }
        let responseData;
        try { responseData = JSON.parse(responseText); } catch (parseError) {
             if (cloudResponse.ok) return { success: true, data: {}, method: 'cloud', warning: 'Could not parse JSON but got 200 OK' };
             throw new Error(`Cloud API invalid JSON: ${responseText.substring(0, 100)}`);
        }
        console.log(`[Cloud API] Parsed:`, responseData);
        if (!cloudResponse.ok) throw new Error(`Cloud API HTTP ${cloudResponse.status}: ${JSON.stringify(responseData)}`);
        if (responseData.isok === true) return { success: true, data: responseData, method: 'cloud' };
        if (responseData.isok === false) throw new Error(`Cloud API error: ${JSON.stringify(responseData.errors || 'Unknown')}`);
        return { success: true, data: responseData, method: 'cloud', warning: 'Response format unexpected' };
    }

    async function tryLocalAPI() {
        if (!hasLocalConfig) throw new Error('Local API not configured');
        // Try Gen 2/Plus API (RPC) first
        const gen2Url = `http://${shellyIp}/rpc`;
        const gen2Payload = { id: Date.now(), method: "Switch.Set", params: { id: 0, on: state } };
        try {
            console.log(`[Local API] Trying Gen 2: ${gen2Url}`);
            const gen2Response = await fetch(gen2Url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(gen2Payload), timeout: 5000 });
            if (gen2Response.ok) {
                const responseData = await gen2Response.json();
                console.log(`[Local API] Gen 2 OK:`, responseData);
                if (responseData && (responseData.result || responseData.hasOwnProperty('result'))) return { success: true, data: responseData, method: 'local-gen2' };
                if (responseData && responseData.error) throw new Error(`Gen 2 RPC error: ${responseData.error.message}`);
                // If OK but unexpected format, fall through to Gen 1 (might be older firmware)
            } else if (gen2Response.status === 404) {
                 console.log(`[Local API] Gen 2 not found (404), trying Gen 1...`);
                 // Fall through
            } else {
                 throw new Error(`Gen 2 API HTTP ${gen2Response.status}: ${await gen2Response.text().catch(()=>gen2Response.statusText)}`);
            }
        } catch (error) {
            // Only fall through to Gen 1 if Gen 2 attempt clearly failed due to not being supported (404, maybe timeout/refused?)
            const fallThroughErrors = ['404', 'timeout', 'ECONNREFUSED', 'ENOTFOUND'];
            if (!fallThroughErrors.some(e => error.message.includes(e)) && !(error.code && fallThroughErrors.includes(error.code))) {
                 console.error(`[Local API] Gen 2 Error, not falling back:`, error.message);
                 throw error; // Re-throw if it wasn't a connection/404 type error
            }
             console.log(`[Local API] Gen 2 Error (${error.message}), trying Gen 1...`);
        }
        // Try Gen 1 API
        const gen1Url = `http://${shellyIp}/relay/0?turn=${state ? 'on' : 'off'}`;
        console.log(`[Local API] Trying Gen 1: ${gen1Url}`);
        try {
            const gen1Response = await fetch(gen1Url, { method: 'GET', timeout: 5000 });
            if (!gen1Response.ok) throw new Error(`Gen 1 API HTTP ${gen1Response.status}: ${await gen1Response.text().catch(()=>gen1Response.statusText)}`);
            const responseData = await gen1Response.json();
            console.log(`[Local API] Gen 1 OK:`, responseData);
            if (responseData && responseData.hasOwnProperty('ison')) return { success: true, data: responseData, method: 'local-gen1' };
            return { success: true, data: responseData, method: 'local-gen1', warning: 'Response format unexpected' };
        } catch(error) {
             console.error(`[Local API] Gen 1 Error:`, error.message);
             throw error; // If Gen 1 fails after Gen 2, it's a definite failure
        }
    }

    try {
        let result;
        let errors = [];
        switch (method) {
            case 'cloud-only': result = await tryCloudAPI(); break;
            case 'local-only': result = await tryLocalAPI(); break;
            case 'cloud-first':
                try { result = await tryCloudAPI(); } catch (cloudError) {
                    console.log('⚠️ Cloud failed, trying local...'); errors.push(`Cloud: ${cloudError.message}`);
                    if (hasLocalConfig) { try { result = await tryLocalAPI(); } catch (localError) { errors.push(`Local: ${localError.message}`); throw new Error(`Both failed: ${errors.join('; ')}`); } } else { throw cloudError; }
                } break;
            case 'local-first':
                try { result = await tryLocalAPI(); } catch (localError) {
                    console.log('⚠️ Local failed, trying cloud...'); errors.push(`Local: ${localError.message}`);
                    if (hasCloudConfig) { try { result = await tryCloudAPI(); } catch (cloudError) { errors.push(`Cloud: ${cloudError.message}`); throw new Error(`Both failed: ${errors.join('; ')}`); } } else { throw localError; }
                } break;
            default: return res.status(400).json({ success: false, error: `Invalid method: ${method}` });
        }
        console.log(`✅ Light control successful via ${result.method}`);
        return res.json({ success: true, method: result.method, data: result.data, warning: result.warning, timestamp: new Date().toISOString() });
    } catch (error) {
        console.error(`❌ Light control failed:`, error.message);
        let statusCode = 500;
        if (error.message.includes('configured')) statusCode = 400;
        else if (error.message.includes('timeout') || error.code === 'ETIMEDOUT') statusCode = 504;
        else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') statusCode = 502;
        return res.status(statusCode).json({ success: false, error: 'Failed to control light', message: error.message, timestamp: new Date().toISOString() });
    }
});

// --- MODIFIED CATCH-ALL ROUTE ---
// Serve index.html for any route not handled by API or static files.
// Crucial for SPA routing (e.g., handling browser refreshes on routes like /history).
app.get('*', (req, res) => {
  // Simple check: if path looks like a file extension or starts with /api/, let it 404 naturally.
  // Otherwise, assume it's an SPA route and serve index.html.
  if (path.extname(req.path).length > 0 || req.path.startsWith('/api/')) {
    // Let the default 404 handler take care of it
    // Or send 404 explicitly: res.status(404).send('Resource not found');
    // For now, letting it fall through is often okay unless you need specific handling.
  } else {
    console.log(`Serving index.html for SPA route: ${req.path}`);
    res.sendFile(indexPath);
  }
});
// --- END MODIFIED CATCH-ALL ROUTE ---

// Start server
async function startServer() {
    try {
        await ensureDataDirectory();
        await initializeState();

        server.listen(PORT, () => {
            console.log(`
╔═══════════════════════════════════════════╗
║        Mzansi Court Q Server              ║
║  Running on port ${PORT}                     ║
║  http://localhost:${PORT}                    ║
║  WebSocket: ENABLED ✅                       ║
║  Environment: ${process.env.NODE_ENV || 'production (default)'}            ║
║  Static Files: ${staticDir}                  ║
╚═══════════════════════════════════════════╝
            `);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1); // Exit if server fails to start
    }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    // Close WebSocket connections
    wss.close(() => {
        console.log('WebSocket server closed');
        process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
     wss.close(() => {
        console.log('WebSocket server closed');
        process.exit(0);
    });
  });
});

startServer();