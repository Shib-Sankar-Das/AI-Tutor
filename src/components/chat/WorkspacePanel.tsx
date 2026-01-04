'use client';

import { useState } from 'react';
import { X, FileText, Presentation, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore, SlideData } from '@/lib/store';
import { SlideDeck } from './SlideDeck';

interface WorkspacePanelProps {
  onClose: () => void;
}

export function WorkspacePanel({ onClose }: WorkspacePanelProps) {
  const { uploadedDocument, generatedSlides, setUploadedDocument, setGeneratedSlides } =
    useAppStore();
  const [activeTab, setActiveTab] = useState<'document' | 'slides'>(
    generatedSlides ? 'slides' : 'document'
  );

  return (
    <div className="w-[40%] min-w-[400px] h-full bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          {uploadedDocument && (
            <button
              onClick={() => setActiveTab('document')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                activeTab === 'document'
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-1" />
              Document
            </button>
          )}
          {generatedSlides && (
            <button
              onClick={() => setActiveTab('slides')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                activeTab === 'slides'
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              <Presentation className="w-4 h-4 inline mr-1" />
              Slides
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'document' && uploadedDocument && (
          <DocumentViewer
            document={uploadedDocument}
            onRemove={() => setUploadedDocument(null)}
          />
        )}
        {activeTab === 'slides' && generatedSlides && (
          <SlideDeck
            slides={generatedSlides}
            onClose={() => setGeneratedSlides(null)}
          />
        )}
        {!uploadedDocument && !generatedSlides && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <FileText className="w-12 h-12 mb-4 opacity-50" />
            <p>No content to display</p>
            <p className="text-sm mt-2">
              Upload a document or generate a presentation to view it here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentViewer({
  document,
  onRemove,
}: {
  document: { name: string; content: string };
  onRemove: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary-600" />
          <span className="font-medium text-gray-900 dark:text-white">
            {document.name}
          </span>
        </div>
        <button
          onClick={onRemove}
          className="text-sm text-red-500 hover:text-red-700"
        >
          Remove
        </button>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
          {document.content}
        </p>
      </div>
      <p className="text-xs text-gray-400 mt-2">
        Document has been processed and indexed for RAG. You can now ask questions about its content.
      </p>
    </div>
  );
}
