# Gemini Live API Proxy - Appwrite Function

This Appwrite Function acts as a WebSocket proxy between your frontend and the Gemini Live API, handling OAuth authentication securely.

## Quick Setup (Manual Upload)

### 1. Prepare the Function Package

The function files are already in the correct structure:
```
appwrite-functions/gemini-live-proxy/
├── package.json
└── src/
    └── main.js
```

### 2. Deploy via Appwrite Console

1. **Go to Appwrite Console** → **Functions** → **Create Function**
2. **Configuration:**
   - Name: `Gemini Live Proxy`
   - Runtime: **Node.js 18.0**
   - Entrypoint: `src/main.js`
   - Execute Access: **Any**

3. **Upload Code:**
   - Click **Manual** deployment
   - Create a `.tar.gz` file of the `gemini-live-proxy` folder:
     ```bash
     cd appwrite-functions
     tar -czf gemini-live-proxy.tar.gz gemini-live-proxy/
     ```
   - Upload `gemini-live-proxy.tar.gz` to Appwrite

4. **Set Environment Variable:**
   - In Function Settings → Variables
   - Add: `GEMINI_API_KEY` = `your_gemini_api_key`

5. **Deploy** and wait for build to complete

### 3. Update Frontend

Add to `.env.local`:
```env
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io
NEXT_PUBLIC_GEMINI_PROXY_FUNCTION_ID=your_function_id_from_console
```

### 4. Test

1. Restart your Next.js dev server
2. Open the voice chat
3. Tap the microphone
4. Speak - audio should stream through Appwrite to Gemini!

## Troubleshooting

**Build fails with "package.json not found":**
- Make sure you're uploading the `gemini-live-proxy` folder itself, not its parent
- The `.tar.gz` should contain `package.json` and `src/` at the root level

**WebSocket connection fails:**
- Check Function logs in Appwrite Console
- Verify `GEMINI_API_KEY` is set correctly
- Ensure Function ID in `.env.local` matches the deployed function

**No audio output:**
- Check browser console for errors
- Verify microphone permissions are granted
- Check Appwrite Function execution logs
