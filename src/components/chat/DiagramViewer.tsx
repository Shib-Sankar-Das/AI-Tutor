'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Copy,
  Download,
  Code,
  Eye,
  Check,
  Maximize2,
  Minimize2,
  RefreshCw,
  FileCode,
  Image as ImageIcon,
} from 'lucide-react';
import { showToast } from '@/components/ui/Toaster';

interface DiagramViewerProps {
  svgCode: string;
  onCodeChange?: (code: string) => void;
  title?: string;
}

export function DiagramViewer({ svgCode: initialCode, onCodeChange, title = 'Diagram' }: DiagramViewerProps) {
  const [code, setCode] = useState(initialCode);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState<'svg' | 'xml' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Update code when prop changes
  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  // Validate and render SVG
  useEffect(() => {
    if (previewRef.current && activeTab === 'preview') {
      try {
        // Basic SVG validation
        const parser = new DOMParser();
        const doc = parser.parseFromString(code, 'image/svg+xml');
        const parseError = doc.querySelector('parsererror');
        
        if (parseError) {
          setError('Invalid SVG syntax');
          previewRef.current.innerHTML = `<div class="text-red-500 text-sm p-4">Error: Invalid SVG syntax. Please check your code.</div>`;
        } else {
          setError(null);
          previewRef.current.innerHTML = code;
          
          // Apply styles to make SVG responsive
          const svg = previewRef.current.querySelector('svg');
          if (svg) {
            svg.style.maxWidth = '100%';
            svg.style.height = 'auto';
            svg.style.display = 'block';
            svg.style.margin = '0 auto';
          }
        }
      } catch (e) {
        setError('Failed to parse SVG');
        previewRef.current.innerHTML = `<div class="text-red-500 text-sm p-4">Error: Failed to parse SVG code.</div>`;
      }
    }
  }, [code, activeTab]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    onCodeChange?.(newCode);
  };

  const copyToClipboard = async (format: 'svg' | 'xml') => {
    try {
      let textToCopy = code;
      
      if (format === 'xml') {
        // Add XML declaration for XML format
        if (!code.startsWith('<?xml')) {
          textToCopy = `<?xml version="1.0" encoding="UTF-8"?>\n${code}`;
        }
      }
      
      await navigator.clipboard.writeText(textToCopy);
      setCopied(format);
      showToast(`Copied as ${format.toUpperCase()}!`, 'success');
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      showToast('Failed to copy', 'error');
    }
  };

  const downloadFile = (format: 'svg' | 'xml') => {
    let content = code;
    let mimeType = 'image/svg+xml';
    let extension = 'svg';
    
    if (format === 'xml') {
      if (!code.startsWith('<?xml')) {
        content = `<?xml version="1.0" encoding="UTF-8"?>\n${code}`;
      }
      mimeType = 'application/xml';
      extension = 'xml';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_diagram.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Downloaded as ${extension.toUpperCase()}!`, 'success');
  };

  const downloadAsPNG = async () => {
    try {
      const svgElement = previewRef.current?.querySelector('svg');
      if (!svgElement) {
        showToast('No SVG to export', 'error');
        return;
      }

      // Create a canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Get SVG dimensions
      const svgRect = svgElement.getBoundingClientRect();
      const scale = 2; // Higher resolution
      canvas.width = svgRect.width * scale;
      canvas.height = svgRect.height * scale;
      ctx.scale(scale, scale);
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Convert SVG to data URL
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      // Draw to canvas
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(svgUrl);

        // Download
        const pngUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_diagram.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast('Downloaded as PNG!', 'success');
      };
      img.src = svgUrl;
    } catch (err) {
      showToast('Failed to export as PNG', 'error');
    }
  };

  const resetCode = () => {
    setCode(initialCode);
    showToast('Code reset to original', 'success');
  };

  return (
    <div
      ref={containerRef}
      className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</span>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Tab Switcher */}
          <div className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-lg p-0.5 mr-2">
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === 'preview'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Eye className="w-3 h-3" />
              Preview
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === 'code'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Code className="w-3 h-3" />
              Code
            </button>
          </div>

          {/* Actions */}
          <button
            onClick={resetCode}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            title="Reset to original"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className={`${isFullscreen ? 'h-[calc(100%-8rem)]' : 'h-64'}`}>
        {activeTab === 'preview' ? (
          <div
            ref={previewRef}
            className="w-full h-full overflow-auto p-4 bg-white dark:bg-gray-900 flex items-center justify-center"
            style={{ minHeight: '200px' }}
          />
        ) : (
          <textarea
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            className="w-full h-full p-4 font-mono text-sm bg-gray-900 text-green-400 resize-none focus:outline-none"
            spellCheck={false}
            placeholder="Enter SVG/XML code here..."
          />
        )}
      </div>

      {/* Footer with Actions */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {error ? (
            <span className="text-red-500">⚠️ {error}</span>
          ) : (
            <span>✓ Valid SVG</span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Copy Buttons */}
          <div className="flex items-center border-r border-gray-300 dark:border-gray-600 pr-2 mr-2">
            <button
              onClick={() => copyToClipboard('svg')}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              title="Copy as SVG"
            >
              {copied === 'svg' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              SVG
            </button>
            <button
              onClick={() => copyToClipboard('xml')}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              title="Copy as XML"
            >
              {copied === 'xml' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              XML
            </button>
          </div>

          {/* Download Buttons */}
          <button
            onClick={() => downloadFile('svg')}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 rounded transition-colors"
            title="Download SVG"
          >
            <Download className="w-3 h-3" />
            .svg
          </button>
          <button
            onClick={() => downloadFile('xml')}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded transition-colors"
            title="Download XML"
          >
            <Download className="w-3 h-3" />
            .xml
          </button>
          <button
            onClick={downloadAsPNG}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 rounded transition-colors"
            title="Download PNG"
          >
            <ImageIcon className="w-3 h-3" />
            .png
          </button>
        </div>
      </div>
    </div>
  );
}

// Extract SVG code from markdown or text
export function extractSVGFromContent(content: string): string | null {
  // Try to find SVG tag in the content
  const svgMatch = content.match(/<svg[\s\S]*?<\/svg>/i);
  if (svgMatch) {
    return svgMatch[0];
  }
  
  // Try to find SVG in code blocks
  const codeBlockMatch = content.match(/```(?:svg|xml)?\s*([\s\S]*?)<svg[\s\S]*?<\/svg>[\s\S]*?```/i);
  if (codeBlockMatch) {
    const innerMatch = codeBlockMatch[0].match(/<svg[\s\S]*?<\/svg>/i);
    return innerMatch ? innerMatch[0] : null;
  }
  
  return null;
}
