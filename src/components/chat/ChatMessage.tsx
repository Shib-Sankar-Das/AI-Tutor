'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Bot, Volume2, Download, Image as ImageIcon, Calendar, FileText, Target, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Message, useAppStore } from '@/lib/store';
import { useState } from 'react';
import { DocumentExport } from './DocumentExport';
import { GoogleCalendar, getGoogleAccessToken } from '@/lib/google-auth';
import { showToast } from '@/components/ui/Toaster';

interface ChatMessageProps {
  message: Message;
  onOpenWorkspace: () => void;
  sessionId?: string;
}

export function ChatMessage({ message, onOpenWorkspace, sessionId }: ChatMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showDocExport, setShowDocExport] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<'helpful' | 'not-helpful' | null>(
    message.metadata?.helpful === true ? 'helpful' : 
    message.metadata?.helpful === false ? 'not-helpful' : null
  );
  const { setIsSpeaking, setGeneratedSlides, settings, user, updateMessage } = useAppStore();

  const isUser = message.role === 'user';
  const hasSlides = message.metadata?.slideData;
  const hasImage = message.metadata?.imageUrl || message.content.includes('image.pollinations.ai');
  const hasDocument = message.metadata?.documentContent;
  const hasCalendarEvent = message.metadata?.calendarEvent;

  // Extract Pollinations image URLs from markdown
  const extractImageUrl = (content: string): string | null => {
    const match = content.match(/!\[.*?\]\((https:\/\/image\.pollinations\.ai\/[^)]+)\)/);
    return match ? match[1] : null;
  };

  const imageUrl = message.metadata?.imageUrl || extractImageUrl(message.content);

  // Check if the content looks like document content (notes, summaries, etc.)
  const isDocumentContent = () => {
    const docIndicators = ['## ', '### ', '**Summary**', '**Notes**', '**Key Points**', '1. ', '2. ', '3. '];
    return !isUser && docIndicators.some(indicator => message.content.includes(indicator));
  };

  const handleSpeak = async () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsSpeaking(false);
      return;
    }

    try {
      setIsPlaying(true);
      setIsSpeaking(true);

      // Use backend TTS endpoint for better quality
      const response = await fetch(
        `http://localhost:8000/tts?text=${encodeURIComponent(message.content)}&voice=en-US-AriaNeural`
      );
      
      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          setIsPlaying(false);
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };
        
        audio.play();
      } else {
        // Fallback to Web Speech API
        const utterance = new SpeechSynthesisUtterance(message.content);
        utterance.onend = () => {
          setIsPlaying(false);
          setIsSpeaking(false);
        };
        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('TTS error:', error);
      setIsPlaying(false);
      setIsSpeaking(false);
    }
  };

  const handleViewSlides = () => {
    if (hasSlides) {
      setGeneratedSlides(message.metadata!.slideData!);
      onOpenWorkspace();
    }
  };

  const handleAddToCalendar = async () => {
    if (!hasCalendarEvent) return;

    const token = getGoogleAccessToken();
    if (!token) {
      showToast('Please sign in with Google to add calendar events', 'error');
      return;
    }

    try {
      const event = message.metadata!.calendarEvent!;
      await GoogleCalendar.createEvent(token, 'primary', {
        summary: event.title,
        description: event.description,
        start: { date: event.date },
        end: { date: event.date },
      });
      showToast('Event added to Google Calendar!', 'success');
    } catch (error: any) {
      console.error('Failed to add calendar event:', error);
      showToast('Failed to add event to calendar', 'error');
    }
  };

  // Handle feedback submission for memory system
  const handleFeedback = async (isHelpful: boolean) => {
    if (feedbackGiven || !user || !sessionId) return;
    
    setFeedbackGiven(isHelpful ? 'helpful' : 'not-helpful');
    
    // Update local message metadata
    updateMessage(sessionId, message.id, {
      metadata: { ...message.metadata, helpful: isHelpful }
    });
    
    try {
      // Send feedback to memory system
      await fetch('http://localhost:8000/memory/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          session_id: sessionId,
          message_id: message.id,
          was_helpful: isHelpful,
          feedback_text: isHelpful ? 'User found this helpful' : 'User found this unhelpful',
        }),
      });
      
      showToast(
        isHelpful ? 'Thanks for your feedback!' : 'Thanks, we\'ll improve!',
        'success'
      );
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      // Don't show error to user - feedback is non-critical
    }
  };

  return (
    <div
      className={`flex gap-3 message-enter ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? 'bg-primary-100 text-primary-600'
            : 'bg-accent-100 text-accent-600'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message Content */}
      <div
        className={`flex-1 max-w-[80%] ${
          isUser ? 'items-end' : 'items-start'
        }`}
      >
        <div
          className={`px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-primary-600 text-white rounded-tr-sm'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-tl-sm'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Custom image renderer for Pollinations images
                  img: ({ src, alt }) => (
                    <div className="my-4">
                      <img
                        src={src}
                        alt={alt || 'AI Generated Image'}
                        className="rounded-lg max-w-full h-auto"
                        loading="lazy"
                      />
                      <p className="text-xs text-gray-500 mt-1">{alt}</p>
                    </div>
                  ),
                  // Code blocks
                  code: ({ className, children, ...props }) => {
                    const match = /language-(\w+)/.exec(className || '');
                    const isInline = !match;
                    return isInline ? (
                      <code className="bg-gray-200 dark:bg-gray-600 px-1 py-0.5 rounded text-sm" {...props}>
                        {children}
                      </code>
                    ) : (
                      <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto">
                        <code className={className} {...props}>
                          {children}
                        </code>
                      </pre>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {!isUser && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {settings.voiceEnabled && (
              <button
                onClick={handleSpeak}
                className={`p-1.5 rounded-lg transition-colors ${
                  isPlaying
                    ? 'bg-primary-100 text-primary-600'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
                title={isPlaying ? 'Stop speaking' : 'Read aloud'}
              >
                <Volume2 className="w-4 h-4" />
              </button>
            )}
            {hasSlides && (
              <button
                onClick={handleViewSlides}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                title="View slides"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
            {hasCalendarEvent && (
              <button
                onClick={handleAddToCalendar}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                title="Add to Google Calendar"
              >
                <Calendar className="w-3 h-3" />
                Add to Calendar
              </button>
            )}
            {isDocumentContent() && (
              <div className="ml-auto">
                <DocumentExport 
                  title="AI Tutor Notes"
                  content={message.content}
                />
              </div>
            )}
            
            {/* Feedback Buttons */}
            {user && sessionId && (
              <div className="flex items-center gap-1 ml-2 border-l border-gray-200 dark:border-gray-600 pl-2">
                <button
                  onClick={() => handleFeedback(true)}
                  disabled={feedbackGiven !== null}
                  className={`p-1.5 rounded-lg transition-colors ${
                    feedbackGiven === 'helpful'
                      ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                      : feedbackGiven
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30'
                  }`}
                  title="This was helpful"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleFeedback(false)}
                  disabled={feedbackGiven !== null}
                  className={`p-1.5 rounded-lg transition-colors ${
                    feedbackGiven === 'not-helpful'
                      ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      : feedbackGiven
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30'
                  }`}
                  title="This wasn't helpful"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            
            <span className="text-xs text-gray-400">
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
