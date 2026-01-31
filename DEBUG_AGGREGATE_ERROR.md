# Debugging "Failed to connect to Gemini: AggregateError"

## The Problem

The error `Failed to connect to Gemini: AggregateError` means the WebSocket connection to Google's Gemini API is failing. This could be due to:

1. **Invalid or expired API key**
2. **Network connectivity issues**
3. **SSL/TLS certificate validation problems**
4. **Gemini API endpoint unreachable**
5. **Incorrect API key format**

## Quick Diagnostics

### Step 1: Check API Key Configuration

Visit: `http://localhost:3000/api/test-gemini`

You should see:

```json
{
  "status": "configured",
  "apiKeyExists": true,
  "apiKeyPrefix": "AIzaSyCPjJPAi..."
}
```

**If it says `apiKeyExists: false`:**

- Your `.env` file doesn't have `GEMINI_API_KEY`
- Add it to `.env`: `GEMINI_API_KEY=your_key_here`
- Restart the dev server

### Step 2: Test WebSocket Connection

Run this script to test if WebSocket can reach Gemini:

```bash
node debug-gemini.js
```

**Expected success output:**

```
✓ WebSocket connected!
✓ Setup sent, closing...
```

**If you see errors:**

- "Connection timeout" → Network issue
- "AggregateError" → Multiple connection failures
- Check your internet connection

### Step 3: Check Server Logs

Watch the terminal where you ran `npm run dev`:

```
=== POST /api/gemini-audio ===
✓ Received request for session: session-XXXX
✓ Audio data size: XXXX bytes
Connecting to Gemini...
❌ ERROR in gemini-audio API: Failed to connect to Gemini: AggregateError
```

The detailed error message will show what's wrong.

## Common Fixes

### Fix 1: Verify API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Find your Gemini API key
3. Check it's valid (starts with `AIzaSy`)
4. Add to `.env`: `GEMINI_API_KEY=AIzaSyC...`
5. Restart server

### Fix 2: Check Network

```bash
# Test if you can reach Google
ping google.com

# Test if WebSocket works
node debug-gemini.js
```

If debug script fails, your network might block WebSocket connections.

### Fix 3: Try Different Network

- Tether to your phone's hotspot
- Use a different WiFi network
- Use a VPN if behind corporate firewall

### Fix 4: Regenerate API Key

1. Google Cloud Console → APIs & Services → Credentials
2. Delete the old key
3. Create a new API key
4. Update `.env` file
5. Restart dev server

## What I Changed

I added much better logging so you can see exactly what's failing:

1. **Enhanced error messages** - Shows the actual error, not just "AggregateError"
2. **Detailed server logs** - Every step is logged with ✓ or ❌
3. **Health check endpoint** - `/api/test-gemini` to verify API key
4. **Debug script** - `node debug-gemini.js` to test connection
5. **Better error handling** - Catches and logs AggregateError details

## Files Modified

- `/src/app/api/gemini-audio/route.ts` - Better logging and error handling
- `/debug-gemini.js` - New debug script
- `/src/app/api/test-gemini/route.ts` - New health check endpoint
