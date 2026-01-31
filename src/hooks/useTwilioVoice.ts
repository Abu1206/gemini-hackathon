import { useCallback, useRef, useEffect, useState } from "react";

interface UseTwilioVoiceReturn {
  isListening: boolean;
  startListening: () => Promise<void>;
  stopListening: () => void;
  playAudio: (audioData: ArrayBuffer) => Promise<void>;
  error: string | null;
}

export function useTwilioVoice(
  onAudioData: (data: ArrayBuffer) => void
): UseTwilioVoiceReturn {
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioOutputRef = useRef<AudioContext | null>(null);
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);

  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize audio context for playback
  const initAudioOutput = useCallback(async () => {
    if (!audioOutputRef.current) {
      audioOutputRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
    return audioOutputRef.current;
  }, []);

  // Start listening to microphone using improved audio capture (Twilio-compatible format)
  const startListening = useCallback(async () => {
    try {
      setError(null);

      // Get user media with enhanced settings for better quality
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000,
          channelCount: 1,
          // Additional constraints for better quality
          latency: 0.01,
          googEchoCancellation: true,
          googNoiseSuppression: true,
          googAutoGainControl: true,
          googHighpassFilter: true,
          googTypingNoiseDetection: true,
        } as any,
      });

      mediaStreamRef.current = stream;

      // Create audio context with optimal settings
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)({
        sampleRate: 24000,
        latencyHint: "interactive",
      });
      audioContextRef.current = audioContext;

      // Create source from media stream
      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      // Try to use AudioWorkletNode (modern API) if available, otherwise fall back to ScriptProcessorNode
      try {
        // Use ScriptProcessorNode for compatibility (AudioWorklet requires separate file)
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        // Handle audio data with improved processing
        processor.onaudioprocess = (event: AudioProcessingEvent) => {
          const inputData = event.inputBuffer.getChannelData(0);
          
          // Convert Float32Array to Int16 PCM format (Twilio/Gemini compatible)
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            // Clamp and convert to 16-bit PCM
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }

          // Send audio data immediately for real-time streaming
          onAudioData(pcmData.buffer);
        };

        source.connect(processor);
        // Don't connect processor to destination to avoid feedback
        // processor.connect(audioContext.destination);
      } catch (workletError) {
        console.warn("AudioWorklet not available, using ScriptProcessor:", workletError);
        // Fallback already handled above
      }

      setIsListening(true);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to start listening";
      setError(errorMsg);
      console.error("Error starting voice capture:", err);
    }
  }, [onAudioData]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      mediaStreamRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }

    if (audioWorkletNodeRef.current) {
      audioWorkletNodeRef.current.disconnect();
      audioWorkletNodeRef.current = null;
    }

    // Close audio context if it's running
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {
        // Ignore close errors
      });
    }
    audioContextRef.current = null;

    setIsListening(false);
  }, []);

  // Play audio using Web Audio API
  const playAudio = useCallback(async (audioData: ArrayBuffer) => {
    try {
      const ctx = await initAudioOutput();

      // Handle both PCM and raw audio data
      let audioBuffer: AudioBuffer;

      // Assume 16-bit PCM at 24kHz
      const pcmData = new Int16Array(audioData);
      const float32Data = new Float32Array(pcmData.length);

      for (let i = 0; i < pcmData.length; i++) {
        float32Data[i] = pcmData[i] / 32768.0;
      }

      audioBuffer = ctx.createBuffer(
        1,
        float32Data.length,
        24000
      );
      const channelData = audioBuffer.getChannelData(0);
      channelData.set(float32Data);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();
    } catch (err) {
      console.error("Error playing audio:", err);
      setError(err instanceof Error ? err.message : "Failed to play audio");
    }
  }, [initAudioOutput]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopListening();
      
      // Close recording context if still open
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {
          // Ignore close errors
        });
      }
      
      // Close output context if still open
      if (audioOutputRef.current && audioOutputRef.current.state !== "closed") {
        audioOutputRef.current.close().catch(() => {
          // Ignore close errors
        });
      }
    };
  }, [stopListening]);

  return {
    isListening,
    startListening,
    stopListening,
    playAudio,
    error,
  };
}
