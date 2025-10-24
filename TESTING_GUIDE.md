# Quick Testing Guide

## Local Testing (Before Deploying)

### Step 1: Install Dependencies
```bash
cd tennis-club-manager
npm install
```

### Step 2: Start the Server
```bash
npm start
```

You should see:
```
╔════════════════════════════════════════════╗
║  Tennis Club Social Day Manager Server    ║
║  Running on port 3000                     ║
║  http://localhost:3000                    ║
╚════════════════════════════════════════════╝
```

### Step 3: Open Multiple Browser Windows
1. Open `http://localhost:3000` in Tab 1
2. Open `http://localhost:3000` in Tab 2

### Step 4: Test Shared State
**In Tab 1:**
- Check in a player
- Assign them to a court
- Look at the browser console (F12) - you should see:
  ```
  State saved to server
  ```

**In Tab 2:**
- Refresh the page
- The player you checked in should now appear!
- If they don't, check the console for errors

### Step 5: Check the Data File
The state is saved in:
```
data/state.json
```

You can open this file to see all your app data in JSON format.

---

## Testing the API Directly

### Health Check:
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2025-10-24T...",
  "uptime": 123.45
}
```

### Get Current State:
```bash
curl http://localhost:3000/api/state
```

### Save State (from command line):
```bash
curl -X POST http://localhost:3000/api/state \
  -H "Content-Type: application/json" \
  -d '{"availablePlayers":[],"courts":[],"gameHistory":[]}'
```

---

## Common Issues & Solutions

### Issue 1: "Cannot GET /api/state"
**Problem:** Server not running
**Solution:** Make sure you ran `npm start`

### Issue 2: "Failed to save state"
**Problem:** Server crashed or network issue
**Solution:** 
- Check server terminal for errors
- Restart the server
- Check browser console for details

### Issue 3: State not loading
**Problem:** API call failing
**Solution:**
- Open browser DevTools (F12) → Network tab
- Refresh page
- Look for `/api/state` request
- Check if it returns 200 OK or an error

### Issue 4: "npm: command not found"
**Problem:** Node.js not installed
**Solution:** Install Node.js from https://nodejs.org

---

## What to Look For

### ✅ Good Signs:
- Browser console shows: "State saved to server"
- Browser console shows: "State loaded from server successfully"
- Multiple tabs show the same data after refresh
- `data/state.json` file exists and contains your data

### ❌ Problem Signs:
- Console errors in red
- "Failed to load state" messages
- Different data in different tabs
- No `data/` folder created

---

## Next Steps

Once local testing works perfectly:
1. Commit your code to GitHub
2. Deploy to Render.com (see PHASE1_COMPLETE.md)
3. Test with the live URL
4. Share the URL with others to test multi-device!

---

**💡 Tip:** Keep the terminal window with `npm start` visible while testing so you can see server logs in real-time.
