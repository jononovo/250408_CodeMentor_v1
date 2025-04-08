import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Maximize, ArrowLeftToLine, Check, List, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";

export interface Slide {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'challenge' | 'quiz';
  tags: string[];
  cssContent?: string;
  jsContent?: string;
  tests?: {
    id: string;
    name: string;
    description: string;
    validation: string;
    type: 'regex' | 'js';
  }[];
}

interface LessonSlidesProps {
  lessonTitle: string;
  slides: Slide[];
  currentSlideIndex: number;
  onSlideChange: (index: number) => void;
  format?: 'markdown' | 'html';
  testResults?: {
    id: string;
    name: string;
    passed: boolean;
    message?: string;
  }[];
}

export default function LessonSlides({ 
  lessonTitle, 
  slides, 
  currentSlideIndex, 
  onSlideChange,
  format = 'markdown',
  testResults = []
}: LessonSlidesProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [timeLeft, setTimeLeft] = useState("15 min left");
  
  const currentSlide = slides[currentSlideIndex];
  
  const toggleMinimized = () => {
    setIsMinimized(!isMinimized);
  };
  
  const goToNextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      onSlideChange(currentSlideIndex + 1);
    }
  };
  
  const goToPrevSlide = () => {
    if (currentSlideIndex > 0) {
      onSlideChange(currentSlideIndex - 1);
    }
  };

  // Create progress dots
  const renderProgressDots = () => {
    return slides.map((_, index) => {
      const isActive = index === currentSlideIndex;
      const isPast = index < currentSlideIndex;
      
      return (
        <div 
          key={index}
          className={`h-2 w-2 rounded-full ${
            isActive 
              ? 'bg-primary animate-pulse' 
              : isPast 
                ? 'bg-primary' 
                : 'bg-gray-300'
          }`}
        />
      );
    });
  };

  // Parse and render the slide content with enhanced formatting and interactivity
  const renderSlideContent = (content: string) => {
    if (!content) return null;
    
    // If using HTML format, render the HTML content directly
    if (format === 'html') {
      // Create a style tag for CSS content if available
      const cssStyle = currentSlide.cssContent ? 
        `<style>${currentSlide.cssContent}</style>` : '';
      
      // Create a script tag for JS content if available
      const jsScript = currentSlide.jsContent ? 
        `<script>${currentSlide.jsContent}</script>` : '';
      
      // Combine HTML, CSS and JS
      const fullHtml = `${cssStyle}${content}${jsScript}`;
      
      // Use dangerouslySetInnerHTML to render the HTML content
      return (
        <div className="html-content" dangerouslySetInnerHTML={{ __html: fullHtml }} />
      );
    }
    
    // Enhanced parser for markdown-like content with more interactive elements
    const paragraphs = content.split('\n\n');
    
    return paragraphs.map((paragraph, idx) => {
      // Code blocks with language highlighting
      if (paragraph.startsWith('```') && paragraph.endsWith('```')) {
        let code = paragraph.slice(3, -3);
        let language = '';
        
        // Check for language definition (```javascript)
        const firstLineEnd = code.indexOf('\n');
        if (firstLineEnd > 0) {
          const potentialLang = code.substring(0, firstLineEnd).trim();
          // If the first line looks like a language name
          if (/^[a-zA-Z]+$/.test(potentialLang)) {
            language = potentialLang;
            code = code.substring(firstLineEnd + 1);
          }
        }
        
        return (
          <div key={idx} className="relative group mb-6">
            <pre className={`font-mono text-sm bg-gray-50 p-3 rounded-md overflow-x-auto border border-gray-200 ${language}`}>
              <div className="absolute top-0 right-0 bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-bl-md">
                {language || 'code'}
              </div>
              <code>{code}</code>
            </pre>
            <button className="absolute top-2 right-12 opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-white text-xs px-2 py-1 rounded">
              Copy
            </button>
          </div>
        );
      }
      
      // Info boxes with enhanced styling
      if (paragraph.startsWith('> ')) {
        const info = paragraph.slice(2);
        return (
          <div key={idx} className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-md shadow-sm transform hover:scale-[1.01] transition-transform duration-200">
            <div className="flex items-start">
              <div className="text-blue-500 mr-3">
                <svg 
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
              </div>
              <p className="text-blue-800 flex-1">{info}</p>
            </div>
          </div>
        );
      }
      
      // Hint boxes with enhanced styling and collapsible content
      if (paragraph.startsWith('HINT: ')) {
        const hint = paragraph.slice(6);
        return (
          <details key={idx} className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6 rounded-r-md shadow-sm group cursor-pointer">
            <summary className="font-medium text-yellow-800 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24" 
                fill="currentColor" 
                className="w-4 h-4 mr-2 inline"
              >
                <path d="M12 2.625c-5.344 0-9.75 4.406-9.75 9.75 0 5.344 4.406 9.75 9.75 9.75 5.344 0
                9.75-4.406 9.75-9.75 0-5.344-4.406-9.75-9.75-9.75zm-1.5 5.625c0-.621.504-1.125
                1.125-1.125.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125-.621
                0-1.125-.504-1.125-1.125v-4.5zm1.5 10.5c-.828 0-1.5-.672-1.5-1.5s.672-1.5 1.5-1.5
                1.5.672 1.5 1.5-.672 1.5-1.5 1.5z" />
              </svg>
              <span>Hint</span>
              <svg className="ml-2 w-4 h-4 transition-transform group-open:rotate-180" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </summary>
            <p className="text-yellow-700 mt-2 pl-6">{hint}</p>
          </details>
        );
      }
      
      // Warning boxes
      if (paragraph.startsWith('WARNING: ')) {
        const warning = paragraph.slice(9);
        return (
          <div key={idx} className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-md shadow-sm">
            <div className="flex items-start">
              <div className="text-red-500 mr-3">
                <svg 
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <p className="text-red-700 flex-1">{warning}</p>
            </div>
          </div>
        );
      }
      
      // Tip boxes
      if (paragraph.startsWith('TIP: ')) {
        const tip = paragraph.slice(5);
        return (
          <div key={idx} className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-r-md shadow-sm">
            <div className="flex items-start">
              <div className="text-green-500 mr-3">
                <svg 
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </div>
              <p className="text-green-700 flex-1">{tip}</p>
            </div>
          </div>
        );
      }
      
      // Header with special styling
      if (paragraph.startsWith('## ')) {
        const header = paragraph.slice(3);
        return (
          <h2 key={idx} className="font-display font-bold text-xl text-gray-800 mb-4 border-b pb-2">
            {header}
          </h2>
        );
      }
      
      // Regular paragraphs with inline code and better styling
      return (
        <p key={idx} className="text-gray-700 mb-4 leading-relaxed">
          {paragraph.split('`').map((part, i) => 
            i % 2 === 0 
              ? part 
              : <code key={i} className="font-mono bg-gray-100 text-primary-700 px-1.5 py-0.5 rounded border border-gray-200">{part}</code>
          )}
        </p>
      );
    });
  };

  if (isMinimized) {
    return (
      <button 
        onClick={toggleMinimized}
        className="fixed top-20 left-4 p-2 bg-primary text-white rounded-full shadow-lg z-10"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="w-[30%] min-w-[300px] max-w-md h-full bg-white shadow-md flex flex-col overflow-hidden animate-fade-in">
      <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-lg text-gray-800">{lessonTitle}</h2>
          <div className="flex items-center text-sm text-gray-500 mt-1">
            <span className="flex items-center mr-3">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-4 w-4 mr-1" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M3 8h18M9 3v18" />
              </svg>
              Slide {currentSlideIndex + 1}/{slides.length}
            </span>
            <span className="flex items-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-4 w-4 mr-1" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {timeLeft}
            </span>
          </div>
        </div>
        <div className="flex items-center">
          <button className="text-gray-500 hover:text-gray-700 p-1">
            <Maximize className="h-5 w-5" />
          </button>
          <button 
            className="text-gray-500 hover:text-gray-700 p-1 ml-1 lg:hidden" 
            onClick={toggleMinimized}
          >
            <ArrowLeftToLine className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6">
        {/* Current Slide Content with Animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-4 flex flex-wrap gap-2">
              {currentSlide.type === 'challenge' && (
                <motion.span 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center bg-primary-100 text-primary-800 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                >
                  <PlayCircle className="h-3 w-3 mr-1" />
                  Challenge
                </motion.span>
              )}
              {currentSlide.type === 'quiz' && (
                <motion.span 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center bg-secondary-100 text-secondary-800 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3 w-3 mr-1"
                  >
                    <path d="M9.879 16.121A3 3 0 1012 12.879" />
                    <path d="M12 6l-2.124 2.124" />
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                  Quiz
                </motion.span>
              )}
              {currentSlide.type === 'info' && (
                <motion.span 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3 w-3 mr-1"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4M12 8h.01" />
                  </svg>
                  Info
                </motion.span>
              )}
              {currentSlide.tags.map((tag, index) => (
                <motion.span 
                  key={index}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 + (index * 0.05) }}
                  className="inline-flex items-center bg-yellow-100 text-yellow-800 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 mr-1.5"></span>
                  {tag}
                </motion.span>
              ))}
            </div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-display font-bold text-2xl text-gray-900 mb-4"
            >
              {currentSlide.title}
            </motion.h1>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {renderSlideContent(currentSlide.content)}
            </motion.div>
            
            {/* Test section for challenges with animations */}
            {currentSlide.type === 'challenge' && currentSlide.tests && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200 shadow-sm"
              >
                <div className="flex items-center mb-3">
                  <List className="h-4 w-4 text-gray-600 mr-2" />
                  <h3 className="font-semibold text-gray-800">Tests to Complete:</h3>
                </div>
                <ul className="space-y-2">
                  {currentSlide.tests.map((test, index) => {
                    // Find matching test result if available
                    const result = testResults.find(r => r.id === test.id);
                    
                    return (
                      <motion.li 
                        key={test.id} 
                        className={`flex items-start p-2 rounded ${
                          result?.passed ? 'bg-green-50' : result ? 'bg-red-50' : 'bg-white'
                        }`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + (index * 0.1) }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium ${
                            result?.passed 
                              ? 'text-green-700' 
                              : result 
                                ? 'text-red-700' 
                                : 'text-gray-800'
                          }`}>
                            Test {index + 1}: {test.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{test.description}</p>
                        </div>
                        <div className="ml-3 flex-shrink-0">
                          <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full ${
                            result?.passed 
                              ? 'bg-green-100 text-green-600 border border-green-200' 
                              : result 
                                ? 'bg-red-100 text-red-600 border border-red-200' 
                                : 'bg-gray-100 text-gray-600 border border-gray-200'
                          }`}>
                            {result?.passed 
                              ? <Check className="h-3 w-3" />
                              : result 
                                ? '✗' 
                                : (index + 1)}
                          </span>
                        </div>
                      </motion.li>
                    );
                  })}
                </ul>
                
                {/* Test progress summary */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mt-4 pt-3 border-t border-gray-200"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      {testResults.filter(r => r.passed).length} of {currentSlide.tests.length} tests passing
                    </span>
                    {testResults.length > 0 && testResults.every(r => r.passed) && (
                      <span className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                        <Check className="h-3 w-3 mr-1" />
                        All tests passing!
                      </span>
                    )}
                  </div>
                  
                  {/* Progress bar */}
                  <div className="h-1.5 w-full bg-gray-200 rounded-full mt-2">
                    <div 
                      className="h-1.5 bg-primary rounded-full transition-all duration-500"
                      style={{ 
                        width: `${testResults.length > 0 
                          ? (testResults.filter(r => r.passed).length / currentSlide.tests.length) * 100 
                          : 0}%` 
                      }}
                    />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Slide Navigation */}
      <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
        <Button
          onClick={goToPrevSlide}
          disabled={currentSlideIndex === 0}
          variant="ghost"
          className="flex items-center justify-center text-gray-700 hover:text-primary font-medium"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <div className="flex space-x-1">
          {renderProgressDots()}
        </div>
        <Button
          onClick={goToNextSlide}
          disabled={currentSlideIndex === slides.length - 1}
          className="flex items-center justify-center text-white bg-primary hover:bg-primary/90 py-2 px-4 rounded-md font-medium"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
