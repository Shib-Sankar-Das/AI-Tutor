'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface VoiceControlProps {
  onTranscript: (transcript: string) => void;
  isListening: boolean;
  setIsListening: (listening: boolean) => void;
}

// Extend Window interface for Speech Recognition
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export function VoiceControl({
  onTranscript,
  isListening,
  setIsListening,
}: VoiceControlProps) {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const { settings, updateSettings, isSpeaking } = useAppStore();

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = settings.language === 'en' ? 'en-US' : settings.language;

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        onTranscript(finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setIsSupported(false);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      if (isListening) {
        // Restart if still supposed to be listening
        try {
          recognition.start();
        } catch (e) {
          setIsListening(false);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [settings.language, isListening, onTranscript, setIsListening]);

  const toggleListening = () => {
    if (!isSupported || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Failed to start recognition:', error);
      }
    }
  };

  const toggleVoice = () => {
    updateSettings({ voiceEnabled: !settings.voiceEnabled });
    if (isSpeaking) {
      window.speechSynthesis.cancel();
    }
  };

  if (!isSupported) {
    return (
      <div className="text-xs text-gray-400">
        Voice not supported in this browser
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Voice Output Toggle */}
      <button
        onClick={toggleVoice}
        className={`p-2 rounded-lg transition-colors ${
          settings.voiceEnabled
            ? 'bg-accent-100 text-accent-600'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
        }`}
        title={settings.voiceEnabled ? 'Disable voice output' : 'Enable voice output'}
      >
        {settings.voiceEnabled ? (
          <Volume2 className="w-5 h-5" />
        ) : (
          <VolumeX className="w-5 h-5" />
        )}
      </button>

      {/* Microphone Toggle */}
      <button
        onClick={toggleListening}
        className={`p-2 rounded-lg transition-colors ${
          isListening
            ? 'bg-red-100 text-red-600 animate-pulse'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
        }`}
        title={isListening ? 'Stop listening' : 'Start voice input'}
      >
        {isListening ? (
          <MicOff className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>

      {/* Voice Wave Animation */}
      {isListening && (
        <div className="voice-wave text-red-500">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
      )}
    </div>
  );
}
