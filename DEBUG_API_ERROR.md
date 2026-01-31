# Debugging API 500 Error

## What I Fixed

The API was returning 500 errors due to several issues:

### 1. **Connection Timeout**

- Added 10-second timeout when connecting to Gemini API
- The connection was hanging indefinitely
- Now it fails fast with a clear error message

### 2. **Better Error Messages**

- Added detailed console logging throughout the API
- Client now reads error response from API and displays it
- Check browser console and server logs for exact error

### 3. **Stream Management**

- Improved ReadableStream creation and cleanup
- Added error event handlers to the WebSocket
- Properly removes event listeners to prevent memory leaks

### 4. **Request Validation**

- Validates sessionId and audioData are present
- Returns 400 errors for missing required fields
- Returns 500 with specific error message for server errors

## How to Debug

### Server Logs (Terminal)

When you send audio, you should see:

```
Received audio for session: session-XXXX...
Connected to Gemini for session: session-XXXX...
Sending audio to Gemini...
Sending response to client, turnComplete: false
...
Turn complete, closing stream
```

### Browser Console

- Check for the full error message in the error callback
- It will now show the actual error from the API, not just "Internal Server Error"

### Common Issues & Solutions

**Issue: "GEMINI_API_KEY not configured"**

- Check `.env` file has `GEMINI_API_KEY` set
- Restart dev server after changing .env

**Issue: "Gemini connection timeout"**

- Check internet connection
- Verify API key is valid
- Try increasing timeout in route.ts (line 37)

**Issue: "turnComplete never comes"**

- Gemini may not be sending turnComplete flag
- Check if response format matches expected structure
- Increase timeout from 30s to 60s

## Testing Steps

1. Open browser DevTools (F12)
2. Go to Console tab
3. Click microphone button
4. Speak something
5. Check logs for errors
6. If error, note the exact message
7. Check server terminal for full stack trace

## Key Files

- Server: `/src/app/api/gemini-audio/route.ts` (lines to check: 20-80, 115-165)
- Client: `/src/components/VoiceChatInterface.tsx` (lines: 150-230)
