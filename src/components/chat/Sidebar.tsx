'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  Brain,
  Plus,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Clock,
  Calendar,
  Search,
  X,
} from 'lucide-react';
import { useAppStore, ChatSession } from '@/lib/store';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { sessions, currentSessionId, deleteSession } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const createNewChat = () => {
    const newId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    window.location.href = `/chat/${newId}`;
  };

  // Group sessions by time period
  const groupedSessions = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Filter by search
    let filtered = sessions;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = sessions.filter(
        (s) =>
          s.title?.toLowerCase().includes(query) ||
          s.topic?.toLowerCase().includes(query) ||
          s.lastMessage?.toLowerCase().includes(query)
      );
    }

    const groups: { label: string; sessions: ChatSession[] }[] = [
      { label: 'Today', sessions: [] },
      { label: 'Yesterday', sessions: [] },
      { label: 'Last 7 Days', sessions: [] },
      { label: 'Last 30 Days', sessions: [] },
      { label: 'Older', sessions: [] },
    ];

    filtered.forEach((session) => {
      const sessionDate = new Date(session.updatedAt);
      if (sessionDate >= today) {
        groups[0].sessions.push(session);
      } else if (sessionDate >= yesterday) {
        groups[1].sessions.push(session);
      } else if (sessionDate >= lastWeek) {
        groups[2].sessions.push(session);
      } else if (sessionDate >= lastMonth) {
        groups[3].sessions.push(session);
      } else {
        groups[4].sessions.push(session);
      }
    });

    // Remove empty groups
    return groups.filter((g) => g.sessions.length > 0);
  }, [sessions, searchQuery]);

  const handleDeleteSession = (id: string) => {
    deleteSession(id);
    setShowDeleteConfirm(null);
    if (pathname === `/chat/${id}`) {
      window.location.href = '/chat';
    }
  };

  return (
    <>
      {/* Toggle Button (visible when sidebar is closed) */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed left-4 top-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-gray-900 text-white transition-all duration-300 z-40 ${
          isOpen ? 'w-64' : 'w-0 overflow-hidden'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <Link href="/" className="flex items-center gap-2">
              <Brain className="w-6 h-6 text-primary-400" />
              <span className="font-semibold">AI Tutor</span>
            </Link>
            <button
              onClick={onToggle}
              className="p-1 rounded hover:bg-gray-700"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          {/* New Chat Button */}
          <div className="p-4 space-y-3">
            <button
              onClick={createNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Chat
            </button>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-primary-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto px-2">
            {groupedSessions.map((group) => (
              <div key={group.label} className="mb-4">
                <p className="px-3 py-2 text-xs text-gray-400 uppercase flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.sessions.map((session) => (
                    <div key={session.id} className="group relative">
                      <Link
                        href={`/chat/${session.id}`}
                        className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm transition-colors pr-8 ${
                          pathname === `/chat/${session.id}`
                            ? 'bg-gray-700 text-white'
                            : 'text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <span className="block truncate">
                            {session.title || 'New Chat'}
                          </span>
                          {session.topic && (
                            <span className="text-xs text-gray-500 truncate block">
                              {session.topic}
                            </span>
                          )}
                        </div>
                      </Link>
                      
                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setShowDeleteConfirm(session.id);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete confirmation */}
                      {showDeleteConfirm === session.id && (
                        <div className="absolute right-0 top-full mt-1 p-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10">
                          <p className="text-xs text-gray-300 mb-2">Delete chat?</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDeleteSession(session.id)}
                              className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(null)}
                              className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {sessions.length === 0 && (
              <p className="px-3 py-2 text-sm text-gray-500 text-center">
                No chat history yet
              </p>
            )}
            
            {sessions.length > 0 && groupedSessions.length === 0 && searchQuery && (
              <p className="px-3 py-2 text-sm text-gray-500 text-center">
                No chats match "{searchQuery}"
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-700">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors mb-2"
            >
              <Calendar className="w-4 h-4" />
              Dashboard
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
