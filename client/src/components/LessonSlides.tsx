import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Maximize, ArrowLeftToLine } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Slide {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'challenge' | 'quiz';
  tags: string[];
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

  // Parse and render the slide content with proper formatting
  const renderSlideContent = (content: string) => {
    if (!content) return null;
    
    // Simple parser for markdown-like content
    const paragraphs = content.split('\n\n');
    
    return paragraphs.map((paragraph, idx) => {
      // Code blocks
      if (paragraph.startsWith('```') && paragraph.endsWith('```')) {
        const code = paragraph.slice(3, -3);
        return (
          <pre key={idx} className="font-mono text-sm bg-white p-3 rounded-md overflow-x-auto mb-6">
            {code}
          </pre>
        );
      }
      
      // Info boxes
      if (paragraph.startsWith('> ')) {
        const info = paragraph.slice(2);
        return (
          <div key={idx} className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
            <p className="text-blue-800">{info}</p>
          </div>
        );
      }
      
      // Hint boxes
      if (paragraph.startsWith('HINT: ')) {
        const hint = paragraph.slice(6);
        return (
          <div key={idx} className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
            <h3 className="font-medium text-yellow-800 mb-2">
              <span className="inline-flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24" 
                  fill="currentColor" 
                  className="w-4 h-4 mr-1"
                >
                  <path d="M12 2.625c-5.344 0-9.75 4.406-9.75 9.75 0 5.344 4.406 9.75 9.75 9.75 5.344 0
                  9.75-4.406 9.75-9.75 0-5.344-4.406-9.75-9.75-9.75zm-1.5 5.625c0-.621.504-1.125
                  1.125-1.125.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125-.621
                  0-1.125-.504-1.125-1.125v-4.5zm1.5 10.5c-.828 0-1.5-.672-1.5-1.5s.672-1.5 1.5-1.5
                  1.5.672 1.5 1.5-.672 1.5-1.5 1.5z" />
                </svg>
                Hint
              </span>
            </h3>
            <p className="text-yellow-700">{hint}</p>
          </div>
        );
      }
      
      // Regular paragraphs with inline code
      return (
        <p key={idx} className="text-gray-700 mb-4">
          {paragraph.split('`').map((part, i) => 
            i % 2 === 0 
              ? part 
              : <code key={i} className="font-mono bg-gray-100 text-primary-700 px-1 rounded">{part}</code>
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
        {/* Current Slide Content */}
        <div className="animate-fade-in">
          <div className="mb-4">
            {currentSlide.type === 'challenge' && (
              <span className="inline-block bg-primary-100 text-primary-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full">
                Challenge
              </span>
            )}
            {currentSlide.type === 'quiz' && (
              <span className="inline-block bg-secondary-100 text-secondary-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full">
                Quiz
              </span>
            )}
            {currentSlide.type === 'info' && (
              <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full">
                Info
              </span>
            )}
            {currentSlide.tags.map((tag, index) => (
              <span 
                key={index}
                className="inline-block bg-yellow-100 text-yellow-800 text-xs font-semibold px-2.5 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
          
          <h1 className="font-display font-bold text-2xl text-gray-900 mb-4">
            {currentSlide.title}
          </h1>
          
          {renderSlideContent(currentSlide.content)}
          
          {/* Test section for challenges */}
          {currentSlide.type === 'challenge' && currentSlide.tests && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">Tests:</h3>
              <ul className="space-y-2">
                {currentSlide.tests.map((test, index) => {
                  // Find matching test result if available
                  const result = testResults.find(r => r.id === test.id);
                  
                  return (
                    <li key={test.id} className="flex items-start">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">Test {index + 1}: {test.name}</p>
                        <p className="text-xs text-gray-500">{test.description}</p>
                      </div>
                      <div className="ml-3 flex-shrink-0">
                        <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full ${
                          result?.passed 
                            ? 'bg-green-500 text-white' 
                            : result 
                              ? 'bg-red-500 text-white' 
                              : 'bg-gray-200 text-gray-600'
                        }`}>
                          {result?.passed 
                            ? '✓' 
                            : result 
                              ? '✗' 
                              : (index + 1)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
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
