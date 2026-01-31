# Gemini Live API Voice Chat Integration

This guide explains the new real-time voice chat implementation using Google's Gemini Live API with Twilio voice support.

## Features

✅ **Real-time Bidirectional Conversation**

- No need to wait for AI responses before speaking
- Natural conversation flow with interruption support
- Continuous audio streaming

✅ **Twilio Voice Integration**

- Browser-native voice capture with advanced audio processing
- Echo cancellation and noise suppression
- 24kHz PCM audio format compatible with Gemini Live API

✅ **Direct WebSocket Connection**

- Client-side connection to Gemini Live API
- No middleware required for audio streaming
- Reduced latency

## Setup

### 1. Get Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Add to your `.env.local`:

```bash
GEMINI_API_KEY=your_api_key_here
NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here
```

### 2. Install Dependencies

```bash
npm install
# or
pnpm install
```

The required dependencies are already in `package.json`:

- `framer-motion` - UI animations
- `socket.io-client` - Real-time communication (optional, for future enhancements)

### 3. Run the Application

```bash
npm run dev
# or
pnpm dev
```

Visit `http://localhost:3000` and click the microphone button to start voice chatting!

## Architecture

### Components

```
VoiceChatInterface.tsx
├── useTwilioVoice Hook
│   ├── Audio Capture (getUserMedia)
│   ├── ScriptProcessor for PCM conversion
│   └── Web Audio API playback
├── Gemini WebSocket Connection
│   ├── Setup configuration
│   ├── Real-time audio streaming
│   └── Response handling
└── UI Components
    ├── VoiceActivityBar (visualization)
    ├── Message Display
    └── Voice Control Button
```

### Data Flow

```
User Speaks → Twilio Voice Capture → PCM Conversion → Base64 Encoding
                                           ↓
                                  Gemini Live API (WebSocket)
                                           ↓
AI Response (Text + Audio) → Base64 Decoding → Web Audio Playback
```

## API Reference

### Gemini Setup Message

```json
{
  "setup": {
    "model": "models/gemini-2.0-flash-exp",
    "generationConfig": {
      "responseModalities": ["AUDIO"],
      "speechConfig": {
        "voiceConfig": {
          "prebuiltVoiceConfig": {
            "voiceName": "Aoede"
          }
        }
      }
    },
    "systemInstruction": {
      "parts": [
        {
          "text": "Your custom system prompt"
        }
      ]
    }
  }
}
```

### Audio Streaming

```json
{
  "clientContent": {
    "turns": [
      {
        "role": "user",
        "parts": [
          {
            "inlineData": {
              "mimeType": "audio/pcm",
              "data": "base64_encoded_audio"
            }
          }
        ]
      }
    ],
    "turnComplete": false
  }
}
```

### Turn Completion

```json
{
  "clientContent": {
    "turns": [],
    "turnComplete": true
  }
}
```

## Environment Variables

Required:

- `GEMINI_API_KEY` - Your Google API key for Gemini
- `NEXT_PUBLIC_GEMINI_API_KEY` - Public API key (same as above)

Optional (for future Twilio integration):

- `NEXT_PUBLIC_TWILIO_ACCOUNT_SID` - Twilio account SID
- `NEXT_PUBLIC_TWILIO_AUTH_TOKEN` - Twilio auth token
- `NEXT_PUBLIC_TWILIO_PHONE_NUMBER` - Your Twilio phone number

## Key Features

### 1. Real-time Audio Processing

The `useTwilioVoice` hook handles:

- Microphone access with proper permissions
- Audio context creation with 24kHz sample rate
- ScriptProcessor for capturing raw audio
- PCM conversion (Float32 → Int16)
- Base64 encoding for transmission

### 2. Gemini Live API Integration

- Direct WebSocket connection to Google's Gemini API
- Automatic reconnection handling
- Message streaming support
- Audio chunk queuing and playback

### 3. User Experience

- Visual voice activity indicators
- Message history display
- Error handling and user feedback
- Auto-initialization on component mount
- Graceful disconnection handling

## Usage

### Basic Example

```tsx
import VoiceChatInterface from "@/components/VoiceChatInterface";
import { useState } from "react";

export default function ChatPage() {
  const [venues] = useState([
    /* your venue data */
  ]);

  return <VoiceChatInterface currentVenues={venues} />;
}
```

### Custom Voice Configuration

Edit the setup message in `VoiceChatInterface.tsx`:

```tsx
const setupMessage = {
  setup: {
    model: "models/gemini-2.0-flash-exp",
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: "Aoede", // Try: "Phoebe", "Charon", "Fenrir", "Kore"
          },
        },
      },
    },
  },
};
```

## Voice Names Available

- `Aoede` - Female voice
- `Phoebe` - Female voice
- `Charon` - Male voice
- `Fenrir` - Male voice
- `Kore` - Female voice

## Troubleshooting

### "API key not configured"

- Add `GEMINI_API_KEY` and `NEXT_PUBLIC_GEMINI_API_KEY` to `.env.local`

### "Microphone permission denied"

- Check browser microphone permissions
- Try again with permissions granted

### No audio playback

- Check browser audio output device
- Ensure volume is not muted
- Check console for audio context errors

### Connection fails

- Verify API key is valid
- Check network connectivity
- Try refreshing the page

## Advanced Configuration

### System Instruction

Modify the AI's behavior with custom instructions:

```tsx
systemInstruction: {
  parts: [
    {
      text: `You are an expert travel consultant. 
             Be concise, friendly, and helpful.
             Recommend venues based on user preferences.`,
    },
  ];
}
```

### Response Modalities

Currently configured for:

- `AUDIO` - Voice responses

Add `TEXT` to also receive text responses:

```tsx
responseModalities: ["AUDIO", "TEXT"];
```

## Security Considerations

⚠️ **Important**: The `NEXT_PUBLIC_GEMINI_API_KEY` is visible in client-side code. For production:

1. Use the backend endpoint `/api/gemini-token` to get a session token
2. The token endpoint should validate requests and rate-limit
3. Implement authentication for your API routes
4. Consider using Gemini's OAuth flow for user authentication

## Performance Tips

1. **Audio Buffering**: Adjust the buffer size in `useTwilioVoice`:

   ```tsx
   const processor = audioContext.createScriptProcessor(4096, 1, 1);
   // Try: 2048, 4096, or 8192 depending on latency needs
   ```

2. **Sample Rate**: Currently set to 24kHz (optimal for Gemini)

3. **Network Optimization**: The WebSocket connection is optimized for low-latency streaming

## Future Enhancements

- [ ] Actual Twilio phone integration
- [ ] Video support
- [ ] Custom voice fine-tuning
- [ ] Multi-language support
- [ ] Conversation history export
- [ ] Session recording
- [ ] Multiple concurrent conversations

## References

- [Google Gemini Live API Docs](https://ai.google.dev/api/rest)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Twilio Voice Concepts](https://www.twilio.com/docs/voice)

## License

This implementation is part of the Gemini Hackathon project.
