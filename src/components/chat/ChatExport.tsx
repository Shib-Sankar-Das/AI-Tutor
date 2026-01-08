'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Download,
  Share2,
  ChevronDown,
  ExternalLink,
  Loader2,
  FileText,
  MessageSquare,
} from 'lucide-react';
import { Message } from '@/lib/store';
import { showToast } from '@/components/ui/Toaster';
import { GoogleDocs, getGoogleAccessToken } from '@/lib/google-auth';

interface ChatExportProps {
  messages: Message[];
  sessionTitle?: string;
}

export function ChatExport({ messages, sessionTitle = 'Chat Export' }: ChatExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [hasGoogleAccess, setHasGoogleAccess] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = getGoogleAccessToken();
    setHasGoogleAccess(!!token);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Convert markdown to plain text for exports
  const markdownToPlainText = (md: string): string => {
    return md
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      // Italic
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      // Code blocks
      .replace(/```[\s\S]*?```/g, (match) => match.replace(/```\w*\n?/g, '').trim())
      // Inline code
      .replace(/`(.+?)`/g, '$1')
      // Headers
      .replace(/^#{1,6}\s+/gm, '')
      // Links
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      // Images
      .replace(/!\[.*?\]\(.*?\)/g, '[Image]')
      // Horizontal rules
      .replace(/^[-*_]{3,}\s*$/gm, '────────────────────')
      // Clean up extra whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  // Format chat for export
  const formatChatForExport = useCallback(() => {
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let content = `# ${sessionTitle}\n\n`;
    content += `**Exported on:** ${date}\n\n`;
    content += `**Total Messages:** ${messages.length}\n\n`;
    content += '---\n\n';

    messages.forEach((msg, index) => {
      const time = new Date(msg.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const role = msg.role === 'user' ? '👤 You' : '🤖 AI Tutor';
      
      content += `### ${role} (${time})\n\n`;
      content += `${msg.content}\n\n`;
      
      if (index < messages.length - 1) {
        content += '---\n\n';
      }
    });

    return content;
  }, [messages, sessionTitle]);

  const exportToGoogleDocs = useCallback(async () => {
    const token = await getGoogleAccessToken();
    if (!token) {
      showToast('Please sign in with Google to export to Docs', 'error');
      return;
    }

    setIsExporting(true);
    setShowExportMenu(false);

    try {
      const content = formatChatForExport();
      const plainContent = markdownToPlainText(content);
      
      const doc = await GoogleDocs.createDocument(sessionTitle);
      await GoogleDocs.insertContent(doc.documentId, plainContent);
      
      const url = GoogleDocs.getDocumentUrl(doc.documentId);
      window.open(url, '_blank');

      showToast('Chat exported to Google Docs!', 'success');
    } catch (error: any) {
      console.error('Error exporting to Google Docs:', error);
      if (error.message?.includes('401')) {
        localStorage.removeItem('google_access_token');
        setHasGoogleAccess(false);
        showToast('Google session expired. Please sign in again.', 'error');
      } else {
        showToast('Failed to export to Google Docs.', 'error');
      }
    } finally {
      setIsExporting(false);
    }
  }, [formatChatForExport, sessionTitle]);

  const downloadAsDocx = useCallback(async () => {
    setIsExporting(true);
    setShowExportMenu(false);

    try {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle, AlignmentType } = await import('docx');
      
      const children: any[] = [];
      const date = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Title
      children.push(
        new Paragraph({
          text: sessionTitle,
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 200 },
        })
      );

      // Metadata
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Exported on: ', bold: true }),
            new TextRun({ text: date }),
          ],
          spacing: { after: 100 },
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Total Messages: ', bold: true }),
            new TextRun({ text: messages.length.toString() }),
          ],
          spacing: { after: 300 },
        })
      );

      // Messages
      for (const msg of messages) {
        const time = new Date(msg.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const role = msg.role === 'user' ? 'You' : 'AI Tutor';
        const isUser = msg.role === 'user';

        // Role header
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${role} `,
                bold: true,
                color: isUser ? '2563eb' : '16a34a',
              }),
              new TextRun({
                text: `(${time})`,
                color: '6b7280',
                size: 20,
              }),
            ],
            spacing: { before: 200, after: 100 },
            border: {
              bottom: {
                color: isUser ? '2563eb' : '16a34a',
                size: 1,
                style: BorderStyle.SINGLE,
              },
            },
          })
        );

        // Message content - properly rendered
        const plainContent = markdownToPlainText(msg.content);
        const lines = plainContent.split('\n');
        
        for (const line of lines) {
          if (!line.trim()) {
            children.push(new Paragraph({ text: '' }));
            continue;
          }

          if (line.startsWith('• ') || line.startsWith('- ')) {
            children.push(
              new Paragraph({
                text: line.replace(/^[•-]\s*/, ''),
                bullet: { level: 0 },
              })
            );
          } else if (line.match(/^\d+\.\s/)) {
            children.push(
              new Paragraph({
                text: line.replace(/^\d+\.\s*/, ''),
                numbering: { reference: 'default-numbering', level: 0 },
              })
            );
          } else {
            children.push(new Paragraph({ text: line }));
          }
        }
      }

      const doc = new Document({
        sections: [{ properties: {}, children }],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sessionTitle.replace(/[^a-z0-9]/gi, '_')}_chat.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('Chat exported as DOCX!', 'success');
    } catch (error) {
      console.error('Error generating DOCX:', error);
      // Fallback to text
      try {
        const content = formatChatForExport();
        const plainContent = markdownToPlainText(content);
        const blob = new Blob([plainContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sessionTitle.replace(/[^a-z0-9]/gi, '_')}_chat.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Downloaded as text file', 'success');
      } catch (fallbackError) {
        showToast('Failed to export chat', 'error');
      }
    } finally {
      setIsExporting(false);
    }
  }, [messages, sessionTitle, formatChatForExport]);

  const downloadAsPDF = useCallback(async () => {
    setIsExporting(true);
    setShowExportMenu(false);

    try {
      const { default: jsPDF } = await import('jspdf');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 20;
      const contentWidth = pageWidth - 2 * margin;
      let yPos = margin;

      const addNewPageIfNeeded = (neededHeight: number) => {
        if (yPos + neededHeight > pageHeight - margin) {
          pdf.addPage();
          yPos = margin;
          return true;
        }
        return false;
      };

      // Title
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 58, 138);
      pdf.text(sessionTitle, margin, yPos);
      yPos += 12;

      // Date
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      const date = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      pdf.text(`Exported on: ${date} | ${messages.length} messages`, margin, yPos);
      yPos += 15;

      // Divider
      pdf.setDrawColor(229, 231, 235);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      // Messages
      for (const msg of messages) {
        addNewPageIfNeeded(30);

        const time = new Date(msg.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const role = msg.role === 'user' ? 'You' : 'AI Tutor';
        const isUser = msg.role === 'user';

        // Role header with colored background
        pdf.setFillColor(isUser ? 239, 246, 255 : 240, 253, 244);
        pdf.roundedRect(margin, yPos - 4, contentWidth, 8, 2, 2, 'F');
        
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(isUser ? 37, 99, 235 : 22, 163, 74);
        pdf.text(`${role}`, margin + 3, yPos);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(107, 114, 128);
        pdf.text(`(${time})`, margin + 3 + pdf.getTextWidth(`${role} `), yPos);
        yPos += 8;

        // Message content
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(55, 65, 81);

        const plainContent = markdownToPlainText(msg.content);
        const lines = plainContent.split('\n');

        for (const line of lines) {
          if (!line.trim()) {
            yPos += 3;
            continue;
          }

          addNewPageIfNeeded(6);

          const textLines = pdf.splitTextToSize(line, contentWidth - 6);
          for (const textLine of textLines) {
            addNewPageIfNeeded(5);
            pdf.text(textLine, margin + 3, yPos);
            yPos += 5;
          }
        }

        yPos += 8;
      }

      pdf.save(`${sessionTitle.replace(/[^a-z0-9]/gi, '_')}_chat.pdf`);
      showToast('Chat exported as PDF!', 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast('Failed to generate PDF', 'error');
    } finally {
      setIsExporting(false);
    }
  }, [messages, sessionTitle]);

  if (messages.length === 0) return null;

  return (
    <div className="relative" ref={exportMenuRef}>
      <button
        onClick={() => setShowExportMenu(!showExportMenu)}
        disabled={isExporting}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
        title="Export entire chat"
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Export Chat</span>
            <ChevronDown className="w-3 h-3" />
          </>
        )}
      </button>

      {showExportMenu && (
        <div className="absolute right-0 bottom-full mb-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="py-1">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              Export Entire Conversation
            </div>
            
            {hasGoogleAccess && (
              <button
                onClick={exportToGoogleDocs}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Google Docs
                <ExternalLink className="w-3 h-3 ml-auto" />
              </button>
            )}
            
            <button
              onClick={downloadAsDocx}
              className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              Download DOCX
            </button>
            
            <button
              onClick={downloadAsPDF}
              className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FileText className="w-4 h-4 text-red-600" />
              Download PDF
            </button>

            {!hasGoogleAccess && (
              <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
                Sign in with Google to export to Docs
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
