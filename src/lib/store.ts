import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    toolUsed?: string;
    imageUrl?: string;
    slideData?: SlideData[];
    documentContent?: string;
    calendarEvent?: CalendarEventAction;
    helpful?: boolean;  // For feedback
    generatedImage?: string;  // Base64 data URL for SD 3.5 generated images
    imagePrompt?: string;  // Prompt used to generate the image
    imageModel?: string;  // Model used to generate the image
  };
}

export interface SlideData {
  title: string;
  body: string;
  imagePrompt?: string;
}

export interface CalendarEventAction {
  action: 'create' | 'update' | 'delete';
  title: string;
  date: string;
  description?: string;
}

export interface LearningGoal {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  completed: boolean;
  calendarEventId?: string;
  createdAt: Date;
}

export interface UserProfile {
  id: string;
  fullName: string;
  grade: string;
  language: string;
  preferences: {
    voiceEnabled: boolean;
    preferredVoice: string;
    visualLearner: boolean;
    dyslexicFont: boolean;
  };
}

export interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  topic?: string;  // Primary topic discussed in this session
  context?: string;  // Summary of session context
  createdAt: Date;
  updatedAt: Date;
}

// Memory-related interfaces
export interface MemoryProfile {
  learningStyle: string[];
  interests: string[];
  challenges: string[];
  proficiencies: Record<string, { level: string; lastUpdated: string }>;
  preferences: Record<string, string>;
}

export interface MemoryContext {
  recentTopics: string[];
  effectiveStrategies: string[];
  crossSessionContext: string[];
}

interface AppState {
  // Hydration state
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  // User
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;

  // Chat Sessions
  sessions: ChatSession[];
  currentSessionId: string | null;
  addSession: (session: ChatSession) => void;
  updateSession: (id: string, updates: Partial<ChatSession>) => void;
  setCurrentSession: (id: string) => void;
  deleteSession: (id: string) => void;

  // Messages
  messages: Record<string, Message[]>;
  addMessage: (sessionId: string, message: Message) => void;
  updateMessage: (sessionId: string, messageId: string, updates: Partial<Message>) => void;
  clearSessionMessages: (sessionId: string) => void;

  // Memory System
  memoryProfile: MemoryProfile | null;
  memoryContext: MemoryContext | null;
  setMemoryProfile: (profile: MemoryProfile | null) => void;
  setMemoryContext: (context: MemoryContext | null) => void;
  
  // Document Upload
  uploadedDocument: { name: string; content: string } | null;
  setUploadedDocument: (doc: { name: string; content: string } | null) => void;

  // Slides
  generatedSlides: SlideData[] | null;
  setGeneratedSlides: (slides: SlideData[] | null) => void;

  // UI State
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  isSpeaking: boolean;
  setIsSpeaking: (speaking: boolean) => void;
  isListening: boolean;
  setIsListening: (listening: boolean) => void;

  // Settings
  settings: {
    language: string;
    voiceEnabled: boolean;
    theme: 'light' | 'dark' | 'system';
  };
  updateSettings: (settings: Partial<AppState['settings']>) => void;

  // Helper functions
  getSessionsByTopic: (topic: string) => ChatSession[];
  getRecentSessions: (limit?: number) => ChatSession[];
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Hydration state
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      // User
      user: null,
      setUser: (user) => set({ user }),

      // Chat Sessions
      sessions: [],
      currentSessionId: null,
      addSession: (session) =>
        set((state) => {
          // Prevent duplicate sessions
          if (state.sessions.some(s => s.id === session.id)) {
            return state;
          }
          return { sessions: [session, ...state.sessions] };
        }),
      updateSession: (id, updates) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, ...updates, updatedAt: new Date() } : s
          ),
        })),
      setCurrentSession: (id) => set({ currentSessionId: id }),
      deleteSession: (id) =>
        set((state) => {
          const { [id]: _, ...remainingMessages } = state.messages;
          return {
            sessions: state.sessions.filter((s) => s.id !== id),
            messages: remainingMessages,
            currentSessionId: state.currentSessionId === id ? null : state.currentSessionId,
          };
        }),

      // Messages
      messages: {},
      addMessage: (sessionId, message) =>
        set((state) => ({
          messages: {
            ...state.messages,
            [sessionId]: [...(state.messages[sessionId] || []), message],
          },
        })),
      updateMessage: (sessionId, messageId, updates) =>
        set((state) => ({
          messages: {
            ...state.messages,
            [sessionId]: (state.messages[sessionId] || []).map((m) =>
              m.id === messageId ? { ...m, ...updates } : m
            ),
          },
        })),
      clearSessionMessages: (sessionId) =>
        set((state) => ({
          messages: {
            ...state.messages,
            [sessionId]: [],
          },
        })),

      // Memory System
      memoryProfile: null,
      memoryContext: null,
      setMemoryProfile: (profile) => set({ memoryProfile: profile }),
      setMemoryContext: (context) => set({ memoryContext: context }),

      // Document Upload
      uploadedDocument: null,
      setUploadedDocument: (doc) => set({ uploadedDocument: doc }),

      // Slides
      generatedSlides: null,
      setGeneratedSlides: (slides) => set({ generatedSlides: slides }),

      // UI State
      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading }),
      isSpeaking: false,
      setIsSpeaking: (speaking) => set({ isSpeaking: speaking }),
      isListening: false,
      setIsListening: (listening) => set({ isListening: listening }),

      // Settings
      settings: {
        language: 'en',
        voiceEnabled: true,
        theme: 'system',
      },
      updateSettings: (newSettings) =>
        set((state) => ({ settings: { ...state.settings, ...newSettings } })),

      // Helper functions
      getSessionsByTopic: (topic: string) => {
        const state = get();
        return state.sessions.filter((s) =>
          s.topic?.toLowerCase().includes(topic.toLowerCase()) ||
          s.title?.toLowerCase().includes(topic.toLowerCase())
        );
      },
      getRecentSessions: (limit = 5) => {
        const state = get();
        return [...state.sessions]
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, limit);
      },
    }),
    {
      name: 'ai-tutor-storage',
      partialize: (state) => ({
        sessions: state.sessions,
        messages: state.messages,
        settings: state.settings,
        user: state.user,
        memoryProfile: state.memoryProfile,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
