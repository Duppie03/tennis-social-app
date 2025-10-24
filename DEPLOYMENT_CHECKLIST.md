# Deployment Checklist for Render.com

## Pre-Deployment Checklist

- [ ] Tested locally with `npm start`
- [ ] Verified multiple tabs can see the same data
- [ ] Checked that `package.json` exists
- [ ] Checked that `server.js` exists
- [ ] All your source images/assets are in `public/source/` folder
- [ ] Created GitHub repository
- [ ] Committed all files to Git

---

## GitHub Setup

### 1. Create Repository
```bash
# In your project folder
git init
git add .
git commit -m "Initial commit with backend server"
```

### 2. Push to GitHub
```bash
# Create a new repository on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

---

## Render.com Deployment Steps

### 1. Sign in to Render
- Go to https://render.com
- Sign in with GitHub

### 2. Create New Web Service
- Click **"New +"** button (top right)
- Select **"Web Service"** (NOT Static Site!)

### 3. Connect Repository
- Find your GitHub repository in the list
- Click **"Connect"**

### 4. Configure Service

Fill in these settings:

| Setting | Value |
|---------|-------|
| **Name** | `tennis-club-manager` (or your choice) |
| **Region** | Choose closest to South Africa |
| **Branch** | `main` |
| **Root Directory** | *(leave empty)* |
| **Environment** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` *(or paid if you need faster)* |

### 5. Advanced Settings (Optional)

Click "Advanced" and add these if needed:

**Environment Variables:**
- `NODE_ENV` = `production`
- `PORT` = `3000` *(usually auto-set by Render)*

**Auto-Deploy:**
- ✅ Enable (deploys automatically when you push to GitHub)

### 6. Create Web Service
- Click **"Create Web Service"**
- Wait 2-5 minutes for first deployment
- Watch the logs for any errors

---

## Post-Deployment Verification

### 1. Check Service Status
- In Render dashboard, status should show **"Live"** (green)
- If it shows "Build failed" or "Deploy failed", check the logs

### 2. Test Your Live URL
Your app will be at: `https://your-app-name.onrender.com`

**Test these:**
- [ ] Main page loads
- [ ] Can check in a player
- [ ] Refresh page - player still there
- [ ] Open in another browser/device - same data appears

### 3. Test API Endpoints
```bash
# Replace with your actual URL
curl https://your-app-name.onrender.com/api/health
```

Should return:
```json
{"status":"OK","timestamp":"...","uptime":...}
```

---

## Important Notes for Free Tier

⚠️ **Free Tier Limitations:**
1. **Spins down after 15 minutes** of inactivity
   - First load after inactivity will be SLOW (30-60 seconds)
   - Subsequent loads will be fast
   
2. **750 hours/month free**
   - More than enough for most use cases
   - Resets monthly

3. **Data persistence:**
   - `data/state.json` persists between restarts
   - **BUT:** May be lost on redeployments
   - Solution: Upgrade to database in Phase 3

---

## Troubleshooting Deployment

### Issue: "Build Failed"
**Check:** 
- Is `package.json` in the root folder?
- Are all dependencies listed?
- Check build logs for specific errors

**Fix:**
```json
// Make sure package.json has:
{
  "engines": {
    "node": ">=16.0.0"
  }
}
```

### Issue: "Deploy Failed" or "Service Unhealthy"
**Check:**
- Server logs for errors
- Make sure PORT is correct
- Check that `npm start` works locally

**Fix:**
- Ensure server.js uses: `process.env.PORT || 3000`
- Check logs: Dashboard → Your Service → Logs tab

### Issue: Can't Access the Site
**Check:**
- Is the service showing "Live"?
- Is the URL correct?
- Try in incognito mode (clear cache)

### Issue: Data Not Persisting
**Problem:** Render free tier may reset filesystem
**Solution:** 
- For now, this is expected behavior on free tier
- Phase 3 will add proper database
- Paid tier has better disk persistence

---

## Updating Your Deployment

When you make changes:

```bash
# Make your code changes
git add .
git commit -m "Your change description"
git push origin main
```

Render will automatically redeploy! Watch the dashboard for:
- "Building..."
- "Deploying..."
- "Live" ✅

---

## Monitoring Your App

### Render Dashboard Shows:
- ✅ Service status (Live/Down)
- 📊 CPU & Memory usage
- 📝 Real-time logs
- 🔄 Deployment history

### Things to Monitor:
- Response times
- Error logs
- Memory usage
- Request counts

---

## Success Criteria

Your deployment is successful when:

- ✅ Status shows "Live"
- ✅ Main page loads correctly
- ✅ Players can be checked in
- ✅ Data persists across refreshes
- ✅ Multiple devices see same data
- ✅ No errors in Render logs
- ✅ All features from local testing work

---

## Next Steps After Deployment

1. **Share the URL** with your tennis club
2. **Test with real users** on different devices
3. **Monitor the logs** for any issues
4. **Consider Phase 2** for real-time sync (no refresh needed)
5. **Consider Phase 3** for database upgrade (better persistence)

---

## Need Help?

**Render Support:**
- Documentation: https://render.com/docs
- Community: https://community.render.com
- Status: https://status.render.com

**Common Support Issues:**
- Check Render status page first
- Review deployment logs
- Test API endpoints directly
- Check browser console for errors

---

**🚀 You're ready to deploy! Good luck!**
