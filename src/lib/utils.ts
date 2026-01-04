/**
 * Utility functions for the Agentic AI Tutor
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Format a date relative to now
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return then.toLocaleDateString();
}

/**
 * Truncate text to a maximum length
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Parse slide data from AI response
 */
export function parseSlidesFromResponse(content: string): any[] | null {
  try {
    // Look for JSON in the response
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      return parsed.slides || null;
    }
    
    // Try parsing directly
    const parsed = JSON.parse(content);
    return parsed.slides || null;
  } catch {
    return null;
  }
}

/**
 * Generate Pollinations.ai image URL
 */
export function generateImageUrl(
  prompt: string,
  width: number = 512,
  height: number = 512
): string {
  const encodedPrompt = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}`;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Check if code is running on client
 */
export function isClient(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Safe localStorage getter
 */
export function getLocalStorage<T>(key: string, defaultValue: T): T {
  if (!isClient()) return defaultValue;
  
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Safe localStorage setter
 */
export function setLocalStorage<T>(key: string, value: T): void {
  if (!isClient()) return;
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.error('Failed to save to localStorage');
  }
}

/**
 * Extract first image URL from markdown content
 */
export function extractImageFromMarkdown(content: string): string | null {
  const match = content.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
  return match ? match[1] : null;
}

/**
 * Convert markdown to plain text (basic)
 */
export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
    .replace(/\[([^\]]+)\]\(.*?\)/g, '$1') // Convert links to text
    .replace(/#{1,6}\s*/g, '') // Remove headers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
    .replace(/\*([^*]+)\*/g, '$1') // Remove italic
    .replace(/`([^`]+)`/g, '$1') // Remove inline code
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/[-*+]\s+/g, '') // Remove list markers
    .trim();
}

/**
 * Language code to full name mapping
 */
export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  zh: 'Chinese',
  ja: 'Japanese',
};

/**
 * Get language name from code
 */
export function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code] || code;
}
