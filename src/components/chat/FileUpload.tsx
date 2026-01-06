'use client';

import { useState, useCallback } from 'react';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { showToast } from '@/components/ui/Toaster';

interface FileUploadProps {
  onClose: () => void;
}

export function FileUpload({ onClose }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { setUploadedDocument } = useAppStore();

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.includes('pdf')) {
      showToast('Please upload a PDF file', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      showToast('File size must be less than 10MB', 'error');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/ingest', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload document');
      }

      const data = await response.json();
      
      setUploadedDocument({
        name: file.name,
        content: data.preview || 'Document uploaded successfully',
      });

      showToast(`${file.name} uploaded successfully!`, 'success');
      onClose();
    } catch (error) {
      console.error('Upload error:', error);
      showToast('Failed to upload document. Please try again.', 'error');
    } finally {
      setIsUploading(false);
    }
  }, [setUploadedDocument, onClose]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Upload Document for RAG
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-300 dark:border-gray-600'
        }`}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Processing document...
            </p>
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              Drag and drop a PDF file here, or
            </p>
            <label className="cursor-pointer">
              <span className="text-primary-600 hover:text-primary-700 font-medium">
                browse files
              </span>
              <input
                type="file"
                accept=".pdf"
                onChange={handleInputChange}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-400 mt-2">
              Max file size: 10MB | Supported: PDF
            </p>
          </>
        )}
      </div>
    </div>
  );
}
