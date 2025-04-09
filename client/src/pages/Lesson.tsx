import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import LessonSlides, { Slide } from "@/components/LessonSlides";
import CodeEditor from "@/components/CodeEditor";
import ChatPanel from "@/components/ChatPanel";
import { parseTests, TestResult } from "@/lib/codeTests";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Lesson as LessonType } from "@/types";

export default function Lesson() {
  const { id } = useParams();
  const { toast } = useToast();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [currentCode, setCurrentCode] = useState("");
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  // Fetch the lesson
  const { data: lesson, isLoading } = useQuery<LessonType>({
    queryKey: [`/api/lessons/${id}`],
  });

  // When the slide changes, update the code if needed
  useEffect(() => {
    if (lesson?.slides && lesson.slides[currentSlideIndex]) {
      const slide = lesson.slides[currentSlideIndex];
      if (slide.initialCode && currentCode === "") {
        setCurrentCode(slide.initialCode);
      }
    }
  }, [currentSlideIndex, lesson, currentCode]);

  // Handle test completion
  const handleTestsComplete = (results: TestResult[]) => {
    setTestResults(results);
    
    const allPassed = results.every(result => result.passed);
    if (allPassed) {
      toast({
        title: "All tests passed! 🎉",
        description: "Great job! You can move to the next slide.",
        variant: "default"
      });
    }
  };

  // Update code
  const handleCodeChange = (code: string) => {
    setCurrentCode(code);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <span className="ml-2 text-lg">Loading lesson...</span>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Lesson not found</h2>
          <p className="text-gray-500">The lesson you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  // Make sure slides array exists and has elements
  if (!lesson.slides || lesson.slides.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No slides available</h2>
          <p className="text-gray-500">This lesson doesn't have any slides yet.</p>
        </div>
      </div>
    );
  }

  const currentSlide = lesson.slides[currentSlideIndex] || {};
  
  return (
    <div className="flex h-full overflow-hidden">
      {/* Lesson Slides Panel */}
      <LessonSlides
        lessonTitle={lesson.title}
        slides={lesson.slides}
        currentSlideIndex={currentSlideIndex}
        onSlideChange={setCurrentSlideIndex}
        format={lesson.format || 'markdown'}
        testResults={testResults}
        lessonStyle={lesson.styleName || ''}
        lessonCss={lesson.cssContent || ''}
        lessonJs={lesson.jsContent || ''}
      />
      
      {/* Code Editor */}
      <CodeEditor
        initialCode={currentSlide.initialCode || "// Write your code here\n"}
        filename={currentSlide.filename || "script.js"}
        tests={currentSlide.tests || []}
        onTestsComplete={handleTestsComplete}
        onCodeChange={handleCodeChange}
      />
      
      {/* Chat Panel */}
      <ChatPanel lessonId={id} />
    </div>
  );
}
