// API Configuration
const API_BASE_URL = window.location.origin;
const WS_URL = window.location.origin.replace(/^http/, 'ws'); // Convert http:// to ws://

const API_ENDPOINTS = {
    getState: `${API_BASE_URL}/api/state`,
    saveState: `${API_BASE_URL}/api/state`,
    health: `${API_BASE_URL}/api/health`,
    controlLight: `${API_BASE_URL}/api/lights/control` // <-- ADD THIS LINE
};

// WebSocket connection
let ws = null;
let reconnectInterval = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000; // 3 seconds

// Callback for when state is updated from server
let onStateUpdateCallback = null;

// Initialize WebSocket connection
function initWebSocket() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        return; // Already connected
    }
    
    console.log('🔌 Connecting to WebSocket...');
    ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
        console.log('✅ WebSocket connected - Real-time sync enabled!');
        reconnectAttempts = 0;
        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }
    };
    
    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'state_update' || data.type === 'initial_state') {
                console.log('📨 Received state update from server');
                
                // Call the callback if it's set
                if (onStateUpdateCallback && typeof onStateUpdateCallback === 'function') {
                    onStateUpdateCallback(data.state);
                }
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    };
    
    ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
    };
    
    ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        
        // Attempt to reconnect
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            console.log(`⏳ Reconnecting... (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
            
            if (!reconnectInterval) {
                reconnectInterval = setTimeout(() => {
                    initWebSocket();
                }, RECONNECT_DELAY);
            }
        } else {
            console.log('⚠️ Max reconnection attempts reached. Please refresh the page.');
        }
    };
}

// API Helper Functions
const API = {
    // Load state from server
    async loadState() {
        try {
            const response = await fetch(API_ENDPOINTS.getState);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.success) {
                return data.state;
            } else {
                throw new Error(data.error || 'Failed to load state');
            }
        } catch (error) {
            console.error('Error loading state from API:', error);
            return null;
        }
    },

    // Save state to server (this will trigger WebSocket broadcast to other clients)
    async saveState(state) {
        try {
            const response = await fetch(API_ENDPOINTS.saveState, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(state)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Failed to save state');
            }
            
            return true;
        } catch (error) {
            console.error('Error saving state to API:', error);
            return false;
        }
    },

    // Check if server is available
    async checkHealth() {
        try {
            const response = await fetch(API_ENDPOINTS.health);
            if (!response.ok) {
                return false;
            }
            const data = await response.json();
            return data.status === 'OK';
        } catch (error) {
            console.error('Health check failed:', error);
            return false;
        }
    },
    
    // Set callback for when state updates are received
    onStateUpdate(callback) {
        onStateUpdateCallback = callback;
    },
    
    // Initialize WebSocket connection
    connect() {
        initWebSocket();
    },
    
    // Close WebSocket connection
    disconnect() {
        if (ws) {
            ws.close();
            ws = null;
        }
        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }
    }
};

// Auto-connect when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        API.connect();
    });
} else {
    API.connect();
}

// Export for use in main script
window.API = API;