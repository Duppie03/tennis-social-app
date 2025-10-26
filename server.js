const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const fetch = require('node-fetch');

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
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

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

    ws.on('close', () => {
        console.log('🔌 Client disconnected');
        clients.delete(ws);
    });

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
        newState.lastUpdated = new Date().toISOString();
        await fs.writeFile(DATA_FILE, JSON.stringify(newState, null, 2));
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

// --- UPDATED LIGHT CONTROL ENDPOINT WITH CLOUD + LOCAL FALLBACK ---
// POST /api/lights/control - Control Shelly devices with cloud-first approach and local fallback
app.post('/api/lights/control', async (req, res) => {
    const { 
        // Cloud API parameters
        shellyCloudUrl,
        authKey, 
        deviceId,
        toggleAfter,
        // Local API parameters
        shellyIp,
        // Common parameters
        state,
        method = 'cloud-first' // 'cloud-first', 'local-first', 'cloud-only', 'local-only'
    } = req.body;

    // Validate we have at least one method configured
    const hasCloudConfig = !!(shellyCloudUrl && authKey && deviceId);
    const hasLocalConfig = !!shellyIp;

    if (!hasCloudConfig && !hasLocalConfig) {
        return res.status(400).json({
            success: false,
            error: 'No control method configured. Need either cloud API config (URL, auth key, device ID) or local IP.'
        });
    }

    if (typeof state !== 'boolean') {
        return res.status(400).json({
            success: false,
            error: 'Invalid state parameter: must be boolean (true/false)'
        });
    }

    console.log(`\n[Light Control] Request received:`, {
        method,
        state,
        hasCloudConfig,
        hasLocalConfig,
        deviceId: deviceId || 'N/A',
        shellyIp: shellyIp || 'N/A'
    });

    // Helper function to try cloud API
    async function tryCloudAPI() {
        if (!hasCloudConfig) {
            throw new Error('Cloud API not configured');
        }

        // Shelly Cloud API format (matches working Postman request)
        // URL includes auth_key as query parameter
        const cloudUrl = `${shellyCloudUrl}?null=null&auth_key=${authKey}`;
        
        // JSON payload format
        // Only include toggle_after if explicitly set (for gate pulse controls)
        const cloudPayload = {
            id: deviceId,
            channel: 0,
            on: state
        };
        
        // Add toggle_after only if it's a pulse control (toggleAfter will be 1 for gates)
        // If toggleAfter is 0 or undefined, don't include it (permanent on/off for lights)
        if (toggleAfter && toggleAfter > 0) {
            cloudPayload.toggle_after = toggleAfter;
        }

        console.log(`[Cloud API] Sending to: ${shellyCloudUrl}`);
        console.log(`[Cloud API] Full URL: ${cloudUrl.replace(authKey, '***HIDDEN***')}`);
        console.log(`[Cloud API] Payload:`, cloudPayload);

        try {
            const cloudResponse = await fetch(cloudUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive'
                },
                body: JSON.stringify(cloudPayload)
            });

            console.log(`[Cloud API] Response status: ${cloudResponse.status}`);
            console.log(`[Cloud API] Response headers:`, Object.fromEntries(cloudResponse.headers.entries()));

            // Get response text first to debug
            const responseText = await cloudResponse.text();
            console.log(`[Cloud API] Raw response length: ${responseText.length}`);
            console.log(`[Cloud API] Raw response:`, responseText || '(empty)');

            // Handle empty response
            if (!responseText || responseText.trim() === '') {
                // Sometimes Shelly returns 200 with empty body on success
                if (cloudResponse.ok) {
                    console.log(`[Cloud API] Empty response but 200 OK - assuming success`);
                    return { success: true, data: { isok: true }, method: 'cloud' };
                }
                throw new Error('Cloud API returned empty response with non-OK status');
            }

            // Try to parse JSON
            let responseData;
            try {
                responseData = JSON.parse(responseText);
            } catch (parseError) {
                console.error(`[Cloud API] Failed to parse JSON:`, parseError);
                // If we got 200 OK but can't parse, maybe it succeeded anyway
                if (cloudResponse.ok) {
                    console.log(`[Cloud API] Can't parse but 200 OK - assuming success`);
                    return { success: true, data: { isok: true }, method: 'cloud' };
                }
                throw new Error(`Cloud API returned invalid JSON: ${responseText.substring(0, 100)}`);
            }

            console.log(`[Cloud API] Parsed response:`, responseData);

            if (!cloudResponse.ok) {
                throw new Error(`Cloud API HTTP ${cloudResponse.status}: ${JSON.stringify(responseData)}`);
            }

            // Check if the response indicates success
            // Shelly Cloud API returns {"isok": true} for success
            if (responseData.isok === true) {
                return { success: true, data: responseData, method: 'cloud' };
            } else if (responseData.isok === false) {
                const errorMsg = responseData.errors ? JSON.stringify(responseData.errors) : 'Unknown error';
                throw new Error(`Cloud API error: ${errorMsg}`);
            } else {
                // Got 200 OK but no explicit isok field - assume success
                return { success: true, data: responseData, method: 'cloud', warning: 'Response format unexpected' };
            }
        } catch (error) {
            console.error(`[Cloud API] Error:`, error.message);
            throw error;
        }
    }

    // Helper function to try local API (supports both Gen 1 and Gen 2)
    async function tryLocalAPI() {
        if (!hasLocalConfig) {
            throw new Error('Local API not configured');
        }

        // First, try Gen 2/Plus API (RPC)
        const gen2Url = `http://${shellyIp}/rpc`;
        const gen2Payload = {
            id: Date.now(),
            method: "Switch.Set",
            params: {
                id: 0,
                on: state
            }
        };

        console.log(`[Local API] Trying Gen 2 format: ${gen2Url}`);

        try {
            const gen2Response = await fetch(gen2Url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(gen2Payload),
                timeout: 5000
            });

            if (gen2Response.ok) {
                const responseData = await gen2Response.json();
                console.log(`[Local API] Gen 2 Response:`, responseData);

                if (responseData && (responseData.result || responseData.hasOwnProperty('result'))) {
                    return { success: true, data: responseData, method: 'local-gen2' };
                } else if (responseData && responseData.error) {
                    throw new Error(`Gen 2 RPC error: ${responseData.error.message}`);
                }
            } else if (gen2Response.status === 404) {
                console.log(`[Local API] Gen 2 not supported (404), trying Gen 1...`);
                // Fall through to Gen 1 attempt
            } else {
                let errorText = await gen2Response.text().catch(() => gen2Response.statusText);
                throw new Error(`Gen 2 API HTTP ${gen2Response.status}: ${errorText}`);
            }
        } catch (error) {
            // If it's a 404, try Gen 1. Otherwise, throw the error.
            if (!error.message.includes('404')) {
                console.error(`[Local API] Gen 2 Error:`, error.message);
                throw error;
            }
        }

        // Try Gen 1 API (HTTP GET with query parameters)
        const gen1Url = `http://${shellyIp}/relay/0?turn=${state ? 'on' : 'off'}`;
        
        console.log(`[Local API] Trying Gen 1 format: ${gen1Url}`);

        try {
            const gen1Response = await fetch(gen1Url, {
                method: 'GET',
                timeout: 5000
            });

            if (!gen1Response.ok) {
                let errorText = await gen1Response.text().catch(() => gen1Response.statusText);
                throw new Error(`Gen 1 API HTTP ${gen1Response.status}: ${errorText}`);
            }

            const responseData = await gen1Response.json();
            console.log(`[Local API] Gen 1 Response:`, responseData);

            // Gen 1 response format: {"ison":true,"has_timer":false,"timer_started":0,...}
            if (responseData && responseData.hasOwnProperty('ison')) {
                return { success: true, data: responseData, method: 'local-gen1' };
            } else {
                return { success: true, data: responseData, method: 'local-gen1', warning: 'Response format unexpected' };
            }
        } catch (error) {
            console.error(`[Local API] Gen 1 Error:`, error.message);
            throw error;
        }
    }

    // Execute control based on method preference
    try {
        let result;
        let errors = [];

        switch (method) {
            case 'cloud-only':
                result = await tryCloudAPI();
                break;

            case 'local-only':
                result = await tryLocalAPI();
                break;

            case 'cloud-first':
                try {
                    result = await tryCloudAPI();
                    console.log('✅ Cloud API succeeded');
                } catch (cloudError) {
                    console.log('⚠️ Cloud API failed, trying local fallback...');
                    errors.push(`Cloud: ${cloudError.message}`);
                    if (hasLocalConfig) {
                        try {
                            result = await tryLocalAPI();
                            console.log('✅ Local fallback succeeded');
                        } catch (localError) {
                            errors.push(`Local: ${localError.message}`);
                            throw new Error(`Both methods failed. ${errors.join('; ')}`);
                        }
                    } else {
                        throw cloudError;
                    }
                }
                break;

            case 'local-first':
                try {
                    result = await tryLocalAPI();
                    console.log('✅ Local API succeeded');
                } catch (localError) {
                    console.log('⚠️ Local API failed, trying cloud fallback...');
                    errors.push(`Local: ${localError.message}`);
                    if (hasCloudConfig) {
                        try {
                            result = await tryCloudAPI();
                            console.log('✅ Cloud fallback succeeded');
                        } catch (cloudError) {
                            errors.push(`Cloud: ${cloudError.message}`);
                            throw new Error(`Both methods failed. ${errors.join('; ')}`);
                        }
                    } else {
                        throw localError;
                    }
                }
                break;

            default:
                return res.status(400).json({
                    success: false,
                    error: `Invalid method: ${method}. Must be cloud-first, local-first, cloud-only, or local-only`
                });
        }

        // Success!
        console.log(`✅ Light control successful via ${result.method}`);
        return res.json({
            success: true,
            method: result.method,
            data: result.data,
            warning: result.warning,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error(`❌ Light control failed:`, error.message);
        
        // Determine appropriate error code
        let statusCode = 500;
        if (error.message.includes('not configured')) {
            statusCode = 400;
        } else if (error.message.includes('timeout') || error.code === 'ETIMEDOUT') {
            statusCode = 504;
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            statusCode = 502;
        }

        return res.status(statusCode).json({
            success: false,
            error: 'Failed to control light',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
// --- END UPDATED LIGHT CONTROL ENDPOINT ---

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
╔═══════════════════════════════════════════╗
║  Tennis Club Social Day Manager Server    ║
║  Running on port ${PORT}                     ║
║  http://localhost:${PORT}                    ║
║  WebSocket: ENABLED ✅                       ║
║  Light Control: Cloud + Local ✅            ║
╚═══════════════════════════════════════════╝
            `);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();