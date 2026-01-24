# Gemini Live API Integration - Socket.IO Timeout Fix

## Problem Analysis

The application was experiencing **Socket.IO connection timeouts** because:

1. **Next.js API Routes Don't Support WebSocket Upgrades**

   - The original `live-proxy` route tried to use `res.socket.server` which is a Node.js pattern
   - Next.js API routes don't have native WebSocket upgrade support
   - This caused all Socket.IO connections to timeout

2. **Architectural Mismatch**
   - Socket.IO requires persistent WebSocket connections
   - Next.js serverless functions are stateless and don't maintain persistent connections
   - Each request is isolated with no persistent server state

## Solution Implemented

### Architecture Change: HTTP + Server-Sent Events (SSE)

Instead of Socket.IO/WebSocket, the app now uses:

- **HTTP POST** for sending audio data
- **Server-Sent Events (SSE)** for streaming Gemini responses back
- **Session management** to maintain Gemini connections on the server

### Key Changes

#### 1. New API Endpoint: `/api/gemini-audio`

- **POST**: Send audio to Gemini and receive streamed responses

  ```
  POST /api/gemini-audio
  {
    sessionId: string,
    systemPrompt: string,
    audioData: string (base64 encoded)
  }

  Returns: ReadableStream with Server-Sent Events
  ```

- **DELETE**: Clean up session
  ```
  DELETE /api/gemini-audio
  {
    sessionId: string
  }
  ```

#### 2. Session Management

- Each client instance gets a unique session ID
- Gemini WebSocket connections are maintained on the server
- Connections are cached and reused for the same session
- Automatic cleanup of idle connections (30-minute timeout)

#### 3. Updated VoiceChatInterface

- Removed Socket.IO initialization
- Audio callback now sends HTTP POST with base64-encoded audio
- Parses Server-Sent Events stream for Gemini responses
- Cleaner architecture without WebSocket complexity

### Benefits

✅ **Works with Next.js** - Uses standard HTTP which Next.js handles natively
✅ **Simpler to understand** - No WebSocket/Socket.IO complexity
✅ **Scalable** - Can work with serverless deployments
✅ **Better error handling** - HTTP errors are clearer than WebSocket timeouts
✅ **Server-controlled flow** - No client-side WebSocket management needed

### How It Works

1. User speaks into microphone → `useTwilioVoice` captures audio
2. Audio callback triggers → Sends HTTP POST to `/api/gemini-audio`
3. Server receives audio → Connects to Gemini Live API (reuses if exists)
4. Server sends audio to Gemini → Receives streaming responses
5. Server forwards responses as Server-Sent Events back to client
6. Client parses SSE stream → Updates UI with text and plays audio

### Error Handling

- Connection errors are caught at HTTP level
- Timeout if no response within 30 seconds
- Session cleanup on component unmount
- Automatic retry with exponential backoff built into browser's fetch

## Testing the Fix

1. Open the app in browser
2. Click microphone button to start speaking
3. Should now see "Listening..." instead of timeout errors
4. Gemini responses should stream back without WebSocket errors
