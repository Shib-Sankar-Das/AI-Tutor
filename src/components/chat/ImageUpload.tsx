'use client';

import { useState, useRef, useCallback } from 'react';
import { ImageIcon, X, Upload, Loader2 } from 'lucide-react';
import { showToast } from '@/components/ui/Toaster';

interface ImageUploadProps {
  onImageSelect: (imageData: { base64: string; mimeType: string; preview: string }) => void;
  selectedImage: { base64: string; mimeType: string; preview: string } | null;
  onClear: () => void;
}

export function ImageUpload({ onImageSelect, selectedImage, onClear }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImage = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      showToast('Image must be less than 10MB', 'error');
      return;
    }

    setIsProcessing(true);

    try {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const base64Full = e.target?.result as string;
        const base64 = base64Full.split(',')[1]; // Remove data URL prefix
        
        onImageSelect({
          base64,
          mimeType: file.type,
          preview: base64Full,
        });
        
        setIsProcessing(false);
      };

      reader.onerror = () => {
        showToast('Failed to read image', 'error');
        setIsProcessing(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      showToast('Failed to process image', 'error');
      setIsProcessing(false);
    }
  }, [onImageSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      processImage(file);
    }
  }, [processImage]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
  }, [processImage]);

  // If image is selected, show preview
  if (selectedImage) {
    return (
      <div className="relative inline-block">
        <div className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-primary-500">
          <img
            src={selectedImage.preview}
            alt="Selected"
            className="w-full h-full object-cover"
          />
          <button
            onClick={onClear}
            className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => fileInputRef.current?.click()}
      className={`p-2 rounded-lg cursor-pointer transition-colors ${
        isDragging
          ? 'bg-primary-100 dark:bg-primary-900/30 border-2 border-dashed border-primary-500'
          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
      title="Upload image to analyze"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {isProcessing ? (
        <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
      ) : (
        <ImageIcon className="w-5 h-5 text-gray-500 hover:text-primary-600 dark:hover:text-primary-400" />
      )}
    </div>
  );
}

// Compact image preview for chat input area
export function ImagePreviewCompact({ 
  preview, 
  onRemove 
}: { 
  preview: string; 
  onRemove: () => void;
}) {
  return (
    <div className="relative inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg mb-2">
      <img
        src={preview}
        alt="Attached"
        className="w-10 h-10 rounded object-cover"
      />
      <span className="text-sm text-gray-600 dark:text-gray-300">Image attached</span>
      <button
        onClick={onRemove}
        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
      >
        <X className="w-4 h-4 text-gray-500" />
      </button>
    </div>
  );
}
