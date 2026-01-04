'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { Sidebar } from '@/components/chat/Sidebar';
import { WorkspacePanel } from '@/components/chat/WorkspacePanel';
import { useAppStore } from '@/lib/store';

export default function ChatPage() {
  const params = useParams();
  const sessionId = params?.sessionId as string || 'default';
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const { uploadedDocument, generatedSlides } = useAppStore();

  useEffect(() => {
    // Open workspace panel when document is uploaded or slides are generated
    if (uploadedDocument || generatedSlides) {
      setIsWorkspaceOpen(true);
    }
  }, [uploadedDocument, generatedSlides]);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
      />

      {/* Main Chat Area */}
      <div className={`flex-1 flex transition-all duration-300 ${
        isSidebarOpen ? 'ml-64' : 'ml-0'
      }`}>
        <ChatInterface 
          sessionId={sessionId}
          onOpenWorkspace={() => setIsWorkspaceOpen(true)}
        />

        {/* Workspace Panel */}
        {isWorkspaceOpen && (
          <WorkspacePanel onClose={() => setIsWorkspaceOpen(false)} />
        )}
      </div>
    </div>
  );
}
