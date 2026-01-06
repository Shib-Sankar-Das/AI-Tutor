'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Image as ImageIcon,
  Share2,
  ChevronDown,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { SlideData } from '@/lib/store';
import { showToast } from '@/components/ui/Toaster';
import { GoogleSlides, getGoogleAccessToken } from '@/lib/google-auth';

interface SlideDeckProps {
  slides: SlideData[];
  onClose: () => void;
}

export function SlideDeck({ slides, onClose }: SlideDeckProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
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

  const nextSlide = () => {
    setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => Math.max(prev - 1, 0));
  };

  const downloadPPTX = useCallback(async () => {
    setIsGenerating(true);

    try {
      // Dynamically import PptxGenJS (client-side only)
      const PptxGenJS = (await import('pptxgenjs')).default;
      const pres = new PptxGenJS();

      // Set presentation properties
      pres.author = 'AI Tutor';
      pres.title = slides[0]?.title || 'Presentation';
      pres.subject = 'Educational Content';

      // Define slide template
      pres.defineSlideMaster({
        title: 'TITLE_SLIDE',
        background: { color: '1e40af' },
        objects: [
          { placeholder: { options: { name: 'title', type: 'title', x: 0.5, y: 2.5, w: 9, h: 1 }, text: '' } },
        ],
      });

      pres.defineSlideMaster({
        title: 'CONTENT_SLIDE',
        background: { color: 'FFFFFF' },
        objects: [
          { rect: { x: 0, y: 0, w: '100%', h: 0.75, fill: { color: '1e40af' } } },
        ],
      });

      for (let i = 0; i < slides.length; i++) {
        const slideData = slides[i];
        const slide = pres.addSlide(i === 0 ? 'TITLE_SLIDE' : 'CONTENT_SLIDE');

        if (i === 0) {
          // Title slide
          slide.addText(slideData.title, {
            x: 0.5,
            y: 2,
            w: 9,
            h: 1.5,
            fontSize: 44,
            color: 'FFFFFF',
            bold: true,
            align: 'center',
          });
          slide.addText(slideData.body, {
            x: 0.5,
            y: 3.5,
            w: 9,
            h: 1,
            fontSize: 20,
            color: 'FFFFFF',
            align: 'center',
          });
        } else {
          // Content slide
          slide.addText(slideData.title, {
            x: 0.5,
            y: 0.15,
            w: 9,
            h: 0.5,
            fontSize: 24,
            color: 'FFFFFF',
            bold: true,
          });

          // Body text
          const bodyLines = slideData.body.split('\n').filter((l) => l.trim());
          const bulletPoints = bodyLines.map((line) => ({
            text: line.replace(/^[-•]\s*/, ''),
            options: { bullet: true, fontSize: 18, color: '333333' },
          }));

          slide.addText(bulletPoints, {
            x: 0.5,
            y: 1,
            w: slideData.imagePrompt ? 5 : 9,
            h: 4.5,
            valign: 'top',
          });

          // Add image if prompt exists
          if (slideData.imagePrompt) {
            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
              slideData.imagePrompt + ', educational diagram, clean, simple'
            )}?width=400&height=300`;

            slide.addImage({
              path: imageUrl,
              x: 5.5,
              y: 1,
              w: 4,
              h: 3,
            });
          }
        }
      }

      // Download the file
      const fileName = `${slides[0]?.title.replace(/[^a-z0-9]/gi, '_') || 'presentation'}.pptx`;
      await pres.writeFile({ fileName });

      showToast('Presentation downloaded successfully!', 'success');
    } catch (error) {
      console.error('Error generating PPTX:', error);
      showToast('Failed to generate presentation. Please try again.', 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [slides]);

  const exportToGoogleSlides = useCallback(async () => {
    const token = await getGoogleAccessToken();
    if (!token) {
      showToast('Please sign in with Google to export to Slides', 'error');
      return;
    }

    setIsExporting(true);
    setShowExportMenu(false);

    try {
      // Create a new presentation
      const presentation = await GoogleSlides.createPresentation(
        slides[0]?.title || 'AI Tutor Presentation'
      );

      // Prepare slides content for batch update
      const slideContents = slides.map((slide, index) => ({
        title: slide.title,
        body: slide.body,
        isTitle: index === 0,
      }));

      // Add slides to the presentation
      await GoogleSlides.addSlides(presentation.presentationId, slideContents);

      // Open the presentation in a new tab
      const url = GoogleSlides.getPresentationUrl(presentation.presentationId);
      window.open(url, '_blank');

      showToast('Presentation exported to Google Slides!', 'success');
    } catch (error: any) {
      console.error('Error exporting to Google Slides:', error);
      if (error.message?.includes('401')) {
        localStorage.removeItem('google_access_token');
        setHasGoogleAccess(false);
        showToast('Google session expired. Please sign in again.', 'error');
      } else {
        showToast('Failed to export to Google Slides. Please try again.', 'error');
      }
    } finally {
      setIsExporting(false);
    }
  }, [slides]);

  const downloadAsPDF = useCallback(async () => {
    setIsGenerating(true);
    setShowExportMenu(false);

    try {
      // Generate PPTX first using PptxGenJS
      const PptxGenJS = (await import('pptxgenjs')).default;
      const pres = new PptxGenJS();

      pres.author = 'AI Tutor';
      pres.title = slides[0]?.title || 'Presentation';

      for (let i = 0; i < slides.length; i++) {
        const slideData = slides[i];
        const slide = pres.addSlide();

        if (i === 0) {
          slide.background = { color: '1e40af' };
          slide.addText(slideData.title, {
            x: 0.5, y: 2, w: 9, h: 1.5,
            fontSize: 44, color: 'FFFFFF', bold: true, align: 'center',
          });
          slide.addText(slideData.body, {
            x: 0.5, y: 3.5, w: 9, h: 1,
            fontSize: 20, color: 'FFFFFF', align: 'center',
          });
        } else {
          slide.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.75, fill: { color: '1e40af' } });
          slide.addText(slideData.title, {
            x: 0.5, y: 0.15, w: 9, h: 0.5,
            fontSize: 24, color: 'FFFFFF', bold: true,
          });

          const bodyLines = slideData.body.split('\n').filter((l) => l.trim());
          const bulletPoints = bodyLines.map((line) => ({
            text: line.replace(/^[-•]\s*/, ''),
            options: { bullet: true, fontSize: 18, color: '333333' },
          }));

          slide.addText(bulletPoints, {
            x: 0.5, y: 1, w: 9, h: 4.5, valign: 'top',
          });
        }
      }

      // For PDF, we'll download as PPTX and show a message about conversion
      // Browser-based PDF generation from PPTX is complex, so we provide instructions
      const fileName = `${slides[0]?.title.replace(/[^a-z0-9]/gi, '_') || 'presentation'}.pptx`;
      await pres.writeFile({ fileName });

      showToast('Downloaded as PPTX. Open in PowerPoint/Google Slides to export as PDF.', 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast('Failed to generate file. Please try again.', 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [slides]);

  const slide = slides[currentSlide];

  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-600 dark:text-gray-300">
          Slide {currentSlide + 1} of {slides.length}
        </span>
        
        <div className="flex items-center gap-2">
          {/* Download PPTX */}
          <button
            onClick={downloadPPTX}
            disabled={isGenerating || isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download PPTX
              </>
            )}
          </button>

          {/* Export Menu */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={isGenerating || isExporting}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              <ChevronDown className="w-3 h-3" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                <div className="py-1">
                  {hasGoogleAccess && (
                    <button
                      onClick={exportToGoogleSlides}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Export to Google Slides
                      <ExternalLink className="w-3 h-3 ml-auto" />
                    </button>
                  )}
                  <button
                    onClick={downloadAsPDF}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <FileText className="w-4 h-4" />
                    Download for PDF
                  </button>
                  {!hasGoogleAccess && (
                    <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
                      Sign in with Google to export to Slides
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slide Preview */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div
          className={`h-full p-6 ${
            currentSlide === 0
              ? 'bg-gradient-to-br from-primary-700 to-primary-900 text-white'
              : 'bg-white dark:bg-gray-800'
          }`}
        >
          {/* Title Slide */}
          {currentSlide === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <h1 className="text-3xl font-bold mb-4">{slide.title}</h1>
              <p className="text-lg opacity-90">{slide.body}</p>
            </div>
          ) : (
            /* Content Slide */
            <div className="h-full">
              <div className="bg-primary-700 -mx-6 -mt-6 px-6 py-3 mb-4">
                <h2 className="text-xl font-semibold text-white">{slide.title}</h2>
              </div>
              <div className="flex gap-4 h-[calc(100%-4rem)]">
                <div className={`flex-1 ${slide.imagePrompt ? '' : 'w-full'}`}>
                  <ul className="space-y-2">
                    {slide.body.split('\n').filter(l => l.trim()).map((line, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-gray-700 dark:text-gray-300"
                      >
                        <span className="w-2 h-2 mt-2 rounded-full bg-primary-500 flex-shrink-0" />
                        <span>{line.replace(/^[-•]\s*/, '')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {slide.imagePrompt && (
                  <div className="w-1/2 flex items-center justify-center">
                    <div className="relative w-full aspect-[4/3] bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                      <img
                        src={`https://image.pollinations.ai/prompt/${encodeURIComponent(
                          slide.imagePrompt + ', educational diagram'
                        )}?width=400&height=300`}
                        alt={slide.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-600 animate-pulse">
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4 mt-4">
        <button
          onClick={prevSlide}
          disabled={currentSlide === 0}
          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex gap-1">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === currentSlide
                  ? 'bg-primary-600'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>
        <button
          onClick={nextSlide}
          disabled={currentSlide === slides.length - 1}
          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
