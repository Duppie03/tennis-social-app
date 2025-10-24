// API Configuration
const API_BASE_URL = window.location.origin; // Use same origin as the page
const API_ENDPOINTS = {
    getState: `${API_BASE_URL}/api/state`,
    saveState: `${API_BASE_URL}/api/state`,
    health: `${API_BASE_URL}/api/health`
};

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
            // Return null so the app can use default state
            return null;
        }
    },

    // Save state to server
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
    }
};

// Export for use in main script
window.API = API;
