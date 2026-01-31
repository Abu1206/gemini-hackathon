# Gemini Live Direct WebSocket Implementation

This document describes the new implementation that uses **direct Gemini Live WebSocket connections** for real-time, continuous voice conversations without pauses.

## Key Features

✅ **Direct Gemini Live WebSocket Connection**
- Client connects directly to Gemini Live API via WebSocket
- No HTTP POST requests - true real-time bidirectional streaming
- Continuous audio streaming without waiting for responses
- Natural conversation flow with interruption support

✅ **Improved Audio Capture**
- Enhanced browser audio capture with better quality settings
- Optimized for 24kHz PCM format (Gemini compatible)
- Real-time audio processing and streaming

✅ **No Pause Required**
- AI can respond while you're speaking
- Natural back-and-forth conversation
- Voice Activity Detection (VAD) support
- Session memory maintained throughout conversation

## Architecture

### Components

```
VoiceChatInterface.tsx
├── useGeminiLive Hook (NEW)
│   ├── Direct WebSocket connection to Gemini Live API
│   ├── Real-time audio streaming
│   ├── Text and audio response handling
│   └── Session management
├── useTwilioVoice Hook (IMPROVED)
│   ├── Enhanced browser audio capture
│   ├── Improved audio quality settings
│   ├── PCM conversion (24kHz, Int16)
│   └── Web Audio API playback
└── UI Components
    ├── VoiceActivityBar
    ├── Message Display
    └── Voice Control Button
```

### Data Flow

```
User Speaks → Browser Audio Capture → PCM Conversion
                                      ↓
                    Direct WebSocket to Gemini Live API
                                      ↓
AI Response (Text + Audio) → Real-time Playback
```

## Implementation Details

### 1. useGeminiLive Hook (`src/hooks/useGeminiLive.ts`)

- **Direct WebSocket Connection**: Connects to `wss://generativelanguage.googleapis.com/ws/...`
- **Setup Message**: Sends model configuration and system prompt on connection
- **Real-time Streaming**: Sends audio chunks immediately as they arrive
- **Response Handling**: Processes text and audio responses in real-time
- **Session Management**: Maintains connection state and handles reconnection

### 2. useTwilioVoice Hook (`src/hooks/useTwilioVoice.ts`)

- **Enhanced Audio Capture**: Improved getUserMedia settings for better quality
- **PCM Conversion**: Converts Float32 to Int16 PCM format
- **Real-time Processing**: Processes and sends audio chunks immediately
- **Audio Playback**: Plays Gemini audio responses using Web Audio API

### 3. VoiceChatInterface (`src/components/VoiceChatInterface.tsx`)

- **Direct WebSocket Integration**: Uses `useGeminiLive` for real-time communication
- **Continuous Streaming**: Sends audio chunks as they're captured
- **Real-time Responses**: Displays text and plays audio as they arrive
- **Connection Management**: Handles connection state and errors

## Setup

### Environment Variables

Add to your `.env.local`:

```bash
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

### Dependencies

All required dependencies are already in `package.json`:
- `ws` - WebSocket support (for server-side if needed)
- `twilio` - Twilio SDK (for future phone call integration)

No additional packages needed for browser-based voice!

## Usage

1. **Start the application**:
   ```bash
   npm run dev
   ```

2. **Click the microphone button** to start voice chat

3. **Speak naturally** - no need to pause for AI responses!

4. **AI responds in real-time** with both text and audio

## Key Differences from Previous Implementation

### Before (HTTP POST + SSE)
- ❌ HTTP POST requests for each audio chunk
- ❌ Server-Sent Events (SSE) for responses
- ❌ Required pausing between user and AI
- ❌ Higher latency
- ❌ Server-side WebSocket proxy needed

### After (Direct WebSocket)
- ✅ Direct WebSocket connection from client
- ✅ Real-time bidirectional streaming
- ✅ No pausing required - natural conversation
- ✅ Lower latency
- ✅ No server proxy needed (direct connection)

## Twilio Integration

The current implementation uses **improved browser audio capture** for web-based voice chat. For actual **Twilio phone call integration**, you would need:

1. **Twilio Voice SDK** (`@twilio/voice-sdk` npm package)
2. **Twilio Account** with phone number
3. **Server-side WebSocket handler** for Twilio Media Streams
4. **Bridge between Twilio and Gemini Live API**

The current implementation is optimized for browser-based voice chat with direct Gemini Live connection, which provides the best experience for web applications.

## Troubleshooting

### Connection Issues
- Verify `NEXT_PUBLIC_GEMINI_API_KEY` is set correctly
- Check browser console for WebSocket connection errors
- Ensure Gemini API key has Live API access

### Audio Issues
- Grant microphone permissions when prompted
- Check browser audio settings
- Verify audio context is initialized

### Performance
- Audio chunks are processed in real-time
- Large audio buffers may cause latency
- Adjust chunk size in `useTwilioVoice` if needed

## Future Enhancements

- [ ] Add Twilio Voice SDK for phone call support
- [ ] Implement voice activity detection (VAD) on client
- [ ] Add connection retry logic
- [ ] Implement audio quality monitoring
- [ ] Add support for multiple voice options

