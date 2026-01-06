'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  FileText,
  Download,
  Share2,
  ChevronDown,
  ExternalLink,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import { showToast } from '@/components/ui/Toaster';
import { GoogleDocs, getGoogleAccessToken } from '@/lib/google-auth';

interface DocumentExportProps {
  title: string;
  content: string;
  onClose?: () => void;
}

export function DocumentExport({ title, content, onClose }: DocumentExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [hasGoogleAccess, setHasGoogleAccess] = useState(false);
  const [copied, setCopied] = useState(false);
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

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      showToast('Copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      showToast('Failed to copy', 'error');
    }
  };

  const exportToGoogleDocs = useCallback(async () => {
    const token = await getGoogleAccessToken();
    if (!token) {
      showToast('Please sign in with Google to export to Docs', 'error');
      return;
    }

    setIsExporting(true);
    setShowExportMenu(false);

    try {
      // Create a new document
      const doc = await GoogleDocs.createDocument(title);

      // Insert content into the document
      await GoogleDocs.insertContent(doc.documentId, content);

      // Open the document in a new tab
      const url = GoogleDocs.getDocumentUrl(doc.documentId);
      window.open(url, '_blank');

      showToast('Document exported to Google Docs!', 'success');
    } catch (error: any) {
      console.error('Error exporting to Google Docs:', error);
      if (error.message?.includes('401')) {
        localStorage.removeItem('google_access_token');
        setHasGoogleAccess(false);
        showToast('Google session expired. Please sign in again.', 'error');
      } else {
        showToast('Failed to export to Google Docs. Please try again.', 'error');
      }
    } finally {
      setIsExporting(false);
    }
  }, [title, content]);

  const downloadAsDocx = useCallback(async () => {
    setIsExporting(true);
    setShowExportMenu(false);

    try {
      // Dynamically import docx library
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');

      // Parse content and create document
      const lines = content.split('\n');
      const children: any[] = [];

      // Add title
      children.push(
        new Paragraph({
          text: title,
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 200 },
        })
      );

      // Process content lines
      for (const line of lines) {
        if (!line.trim()) {
          children.push(new Paragraph({ text: '' }));
          continue;
        }

        // Check for headings (## format)
        if (line.startsWith('## ')) {
          children.push(
            new Paragraph({
              text: line.replace('## ', ''),
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 100 },
            })
          );
        } else if (line.startsWith('### ')) {
          children.push(
            new Paragraph({
              text: line.replace('### ', ''),
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 150, after: 75 },
            })
          );
        } else if (line.startsWith('- ') || line.startsWith('• ')) {
          // Bullet points
          children.push(
            new Paragraph({
              text: line.replace(/^[-•]\s*/, ''),
              bullet: { level: 0 },
            })
          );
        } else if (line.match(/^\d+\.\s/)) {
          // Numbered list
          children.push(
            new Paragraph({
              text: line.replace(/^\d+\.\s*/, ''),
              numbering: { reference: 'default-numbering', level: 0 },
            })
          );
        } else if (line.startsWith('**') && line.endsWith('**')) {
          // Bold text
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: line.replace(/^\*\*|\*\*$/g, ''),
                  bold: true,
                }),
              ],
            })
          );
        } else {
          // Regular paragraph
          children.push(
            new Paragraph({
              text: line,
            })
          );
        }
      }

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: children,
          },
        ],
      });

      // Generate and download
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('Document downloaded successfully!', 'success');
    } catch (error) {
      console.error('Error generating DOCX:', error);
      // Fallback to plain text download if docx fails
      try {
        const blob = new Blob([`${title}\n\n${content}`], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Downloaded as text file (DOCX generation not available)', 'success');
      } catch (fallbackError) {
        showToast('Failed to generate document. Please try again.', 'error');
      }
    } finally {
      setIsExporting(false);
    }
  }, [title, content]);

  const downloadAsPDF = useCallback(async () => {
    setIsExporting(true);
    setShowExportMenu(false);

    try {
      // Use jspdf for PDF generation
      const { default: jsPDF } = await import('jspdf');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Set font
      pdf.setFont('helvetica');

      // Add title
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      const titleLines = pdf.splitTextToSize(title, 170);
      pdf.text(titleLines, 20, 30);

      // Calculate starting Y position after title
      let yPos = 30 + (titleLines.length * 10) + 10;

      // Add content
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');

      const lines = content.split('\n');
      
      for (const line of lines) {
        // Check if we need a new page
        if (yPos > 270) {
          pdf.addPage();
          yPos = 20;
        }

        if (!line.trim()) {
          yPos += 5;
          continue;
        }

        // Handle headings
        if (line.startsWith('## ')) {
          pdf.setFontSize(16);
          pdf.setFont('helvetica', 'bold');
          const headingText = line.replace('## ', '');
          const headingLines = pdf.splitTextToSize(headingText, 170);
          pdf.text(headingLines, 20, yPos);
          yPos += headingLines.length * 7 + 5;
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'normal');
        } else if (line.startsWith('### ')) {
          pdf.setFontSize(14);
          pdf.setFont('helvetica', 'bold');
          const headingText = line.replace('### ', '');
          const headingLines = pdf.splitTextToSize(headingText, 170);
          pdf.text(headingLines, 20, yPos);
          yPos += headingLines.length * 6 + 4;
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'normal');
        } else if (line.startsWith('- ') || line.startsWith('• ')) {
          // Bullet point
          const bulletText = '• ' + line.replace(/^[-•]\s*/, '');
          const bulletLines = pdf.splitTextToSize(bulletText, 160);
          pdf.text(bulletLines, 25, yPos);
          yPos += bulletLines.length * 5 + 2;
        } else {
          // Regular text
          const textLines = pdf.splitTextToSize(line, 170);
          pdf.text(textLines, 20, yPos);
          yPos += textLines.length * 5 + 2;
        }
      }

      // Download the PDF
      pdf.save(`${title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
      showToast('PDF downloaded successfully!', 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast('Failed to generate PDF. Please try again.', 'error');
    } finally {
      setIsExporting(false);
    }
  }, [title, content]);

  return (
    <div className="flex items-center gap-2">
      {/* Copy button */}
      <button
        onClick={copyToClipboard}
        className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        title="Copy to clipboard"
      >
        {copied ? (
          <Check className="w-4 h-4 text-green-600" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </button>

      {/* Export menu */}
      <div className="relative" ref={exportMenuRef}>
        <button
          onClick={() => setShowExportMenu(!showExportMenu)}
          disabled={isExporting}
          className="flex items-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Download className="w-4 h-4" />
              Export
            </>
          )}
          <ChevronDown className="w-3 h-3" />
        </button>

        {showExportMenu && (
          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
            <div className="py-1">
              {hasGoogleAccess && (
                <button
                  onClick={exportToGoogleDocs}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Export to Google Docs
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </button>
              )}
              <button
                onClick={downloadAsDocx}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <FileText className="w-4 h-4 text-blue-600" />
                Download as DOCX
              </button>
              <button
                onClick={downloadAsPDF}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <FileText className="w-4 h-4 text-red-600" />
                Download as PDF
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
    </div>
  );
}
