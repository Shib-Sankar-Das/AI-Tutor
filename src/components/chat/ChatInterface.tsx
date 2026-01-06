'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Paperclip, Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useAppStore, Message } from '@/lib/store';
import { ChatMessage } from './ChatMessage';
import { VoiceControl } from './VoiceControl';
import { FileUpload } from './FileUpload';

interface ChatInterfaceProps {
  sessionId: string;
  onOpenWorkspace: () => void;
}

export function ChatInterface({ sessionId, onOpenWorkspace }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [showFileUpload, setShowFileUpload] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    addMessage,
    isLoading,
    setIsLoading,
    isListening,
    setIsListening,
    isSpeaking,
    settings,
    sessions,
    addSession,
    updateSession,
    user,
    _hasHydrated,
  } = useAppStore();

  const sessionMessages = messages[sessionId] || [];

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessionMessages]);

  // Initialize session if new (only after hydration to avoid duplicates)
  useEffect(() => {
    if (!_hasHydrated) return; // Wait for hydration
    
    const existingSession = sessions.find((s) => s.id === sessionId);
    if (!existingSession) {
      addSession({
        id: sessionId,
        title: 'New Chat',
        lastMessage: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }, [sessionId, _hasHydrated, sessions, addSession]);

  // Consolidate memories when leaving session
  useEffect(() => {
    const consolidateOnLeave = async () => {
      if (user?.id && sessionMessages.length > 2) {
        try {
          await fetch(`/api/memory/consolidate/${user.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId }),
          });
        } catch (error) {
          console.error('Failed to consolidate memories:', error);
        }
      }
    };

    // Consolidate when component unmounts or session changes
    return () => {
      consolidateOnLeave();
    };
  }, [sessionId, user?.id]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    addMessage(sessionId, userMessage);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          thread_id: sessionId,
          language: settings.language,
          user_id: user?.id,  // Pass user ID for memory system
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let assistantMessageId = (Date.now() + 1).toString();

      // Add placeholder message
      addMessage(sessionId, {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      });

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              // Handle error responses from the API
              if (data.error) {
                // Check if it's a rate limit error
                const isRateLimitError = data.error.includes('429') || 
                                         data.error.includes('RESOURCE_EXHAUSTED') ||
                                         data.error.includes('quota');
                
                const errorMessage = isRateLimitError
                  ? "⚠️ **Rate Limit Exceeded**\n\nThe AI service has reached its usage limit. Please wait a moment and try again.\n\nThis typically resets within a few seconds to a minute."
                  : `Sorry, I encountered an error: ${data.error.substring(0, 200)}...`;
                
                assistantContent = errorMessage;
                const store = useAppStore.getState();
                store.updateMessage(sessionId, assistantMessageId, {
                  content: assistantContent,
                });
                break; // Stop processing after error
              }
              
              if (data.token) {
                assistantContent += data.token;
                // Update the message content
                const store = useAppStore.getState();
                store.updateMessage(sessionId, assistantMessageId, {
                  content: assistantContent,
                });
              }
              if (data.metadata) {
                const store = useAppStore.getState();
                store.updateMessage(sessionId, assistantMessageId, {
                  metadata: data.metadata,
                });
              }
            } catch (e) {
              // Skip non-JSON lines
            }
          }
        }
      }

      // Handle case where no content was received
      if (!assistantContent.trim()) {
        assistantContent = "I apologize, but I couldn't generate a response. Please try again.";
        const store = useAppStore.getState();
        store.updateMessage(sessionId, assistantMessageId, {
          content: assistantContent,
        });
      }

      // Detect topic from conversation for session context
      const detectedTopic = detectTopicFromMessage(userMessage.content);

      // Update session
      updateSession(sessionId, {
        lastMessage: assistantContent.slice(0, 50) + '...',
        title: sessionMessages.length === 0 
          ? userMessage.content.slice(0, 30) + '...'
          : sessions.find(s => s.id === sessionId)?.title || 'Chat',
        topic: detectedTopic || sessions.find(s => s.id === sessionId)?.topic,
      });

    } catch (error) {
      console.error('Error sending message:', error);
      addMessage(sessionId, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      });
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, sessionId, settings.language, user?.id, addMessage, setIsLoading, updateSession, sessions, sessionMessages.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTranscript = (transcript: string) => {
    setInput((prev) => prev + ' ' + transcript);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-800">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            AI Tutor
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your personal learning companion
          </p>
        </div>
        <div className="flex items-center gap-2">
          <VoiceControl
            onTranscript={handleTranscript}
            isListening={isListening}
            setIsListening={setIsListening}
          />
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {sessionMessages.length === 0 ? (
          <WelcomeScreen onSuggestionClick={setInput} />
        ) : (
          sessionMessages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onOpenWorkspace={onOpenWorkspace}
              sessionId={sessionId}
            />
          ))
        )}
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        {showFileUpload && (
          <FileUpload onClose={() => setShowFileUpload(false)} />
        )}
        <div className="flex items-end gap-2">
          <button
            onClick={() => setShowFileUpload(!showFileUpload)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Upload document"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about your studies..."
              className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              rows={1}
              style={{ minHeight: '48px', maxHeight: '200px' }}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="p-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          AI Tutor can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}

function WelcomeScreen({ onSuggestionClick }: { onSuggestionClick: (text: string) => void }) {
  const suggestions = [
    "Explain photosynthesis using the Feynman technique",
    "Help me understand quadratic equations step by step",
    "Create a presentation about the solar system",
    "What are the main causes of climate change?",
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mb-4">
        <span className="text-3xl">🎓</span>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Welcome to AI Tutor!
      </h2>
      <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md">
        I'm here to help you learn anything. Ask me questions, request explanations,
        or let me quiz you on topics you're studying.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSuggestionClick(suggestion)}
            className="p-4 text-left border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {suggestion}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Helper function to detect topic from user message
function detectTopicFromMessage(message: string): string | null {
  const topicPatterns = [
    // Science
    { pattern: /photosynthesis|biology|cell|dna|genetics|evolution/i, topic: 'Biology' },
    { pattern: /physics|gravity|force|energy|motion|waves|electricity/i, topic: 'Physics' },
    { pattern: /chemistry|element|molecule|atom|reaction|compound/i, topic: 'Chemistry' },
    // Math
    { pattern: /math|equation|algebra|calculus|geometry|statistics|probability/i, topic: 'Mathematics' },
    { pattern: /quadratic|polynomial|linear|function|graph/i, topic: 'Algebra' },
    { pattern: /trigonometry|sine|cosine|tangent|angle/i, topic: 'Trigonometry' },
    // History & Social Studies
    { pattern: /history|war|revolution|ancient|medieval|civilization/i, topic: 'History' },
    { pattern: /geography|continent|country|climate|map|population/i, topic: 'Geography' },
    { pattern: /economics|market|trade|gdp|inflation|supply|demand/i, topic: 'Economics' },
    // Languages
    { pattern: /grammar|vocabulary|writing|essay|literature|poem/i, topic: 'Language Arts' },
    { pattern: /spanish|french|german|language learning|translation/i, topic: 'Foreign Language' },
    // Technology
    { pattern: /programming|code|software|algorithm|computer|python|javascript/i, topic: 'Computer Science' },
    { pattern: /ai|machine learning|neural network|artificial intelligence/i, topic: 'AI/ML' },
    // General
    { pattern: /presentation|slides|powerpoint/i, topic: 'Presentation' },
    { pattern: /explain|understand|learn|study|teach/i, topic: 'General Learning' },
  ];

  for (const { pattern, topic } of topicPatterns) {
    if (pattern.test(message)) {
      return topic;
    }
  }

  return null;
}
