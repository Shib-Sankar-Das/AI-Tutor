'use client';

import { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Presentation,
  MessageCircle,
  ChevronDown,
  Sparkles,
  ImageIcon,
  Wand2,
} from 'lucide-react';

export type ToolType = 'auto' | 'chat' | 'report' | 'presentation' | 'image';

interface ToolSelectorProps {
  selectedTool: ToolType;
  onToolChange: (tool: ToolType) => void;
}

const tools = [
  {
    id: 'auto' as ToolType,
    name: 'Auto',
    description: 'AI automatically selects the best tool',
    icon: Sparkles,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  {
    id: 'chat' as ToolType,
    name: 'Chat',
    description: 'General conversation & learning',
    icon: MessageCircle,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  {
    id: 'report' as ToolType,
    name: 'Report',
    description: 'Generate detailed multi-page reports',
    icon: FileText,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  {
    id: 'presentation' as ToolType,
    name: 'PPT',
    description: 'Create beautiful presentations',
    icon: Presentation,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  {
    id: 'image' as ToolType,
    name: 'Image',
    description: 'Generate images with Stable Diffusion 3.5',
    icon: ImageIcon,
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
  },
];

export function ToolSelector({ selectedTool, onToolChange }: ToolSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedToolData = tools.find((t) => t.id === selectedTool) || tools[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected Tool Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${selectedToolData.bgColor}`}
        title={selectedToolData.description}
      >
        <selectedToolData.icon className={`w-4 h-4 ${selectedToolData.color}`} />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {selectedToolData.name}
        </span>
        <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
          <div className="p-2">
            <p className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
              Select Tool
            </p>
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => {
                  onToolChange(tool.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-start gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  selectedTool === tool.id ? 'bg-gray-100 dark:bg-gray-700' : ''
                }`}
              >
                <div className={`p-2 rounded-lg ${tool.bgColor}`}>
                  <tool.icon className={`w-4 h-4 ${tool.color}`} />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {tool.name}
                    </span>
                    {selectedTool === tool.id && (
                      <span className="text-xs px-2 py-0.5 bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {tool.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Compact version for mobile
export function ToolSelectorCompact({ selectedTool, onToolChange }: ToolSelectorProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onToolChange(tool.id)}
          className={`p-2 rounded-md transition-colors ${
            selectedTool === tool.id
              ? `${tool.bgColor} ${tool.color}`
              : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          title={tool.description}
        >
          <tool.icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
}
