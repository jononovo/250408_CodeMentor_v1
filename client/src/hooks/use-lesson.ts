import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Lesson, Slide } from '@/types';

export function useLesson(lessonId?: string) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  
  // Fetch lesson data
  const { 
    data: lesson,
    isLoading,
    error
  } = useQuery<Lesson>({
    queryKey: [`/api/lessons/${lessonId}`],
    enabled: !!lessonId,
  });
  
  // Make sure currentSlideIndex is within bounds
  useEffect(() => {
    if (lesson && currentSlideIndex >= lesson.slides.length) {
      setCurrentSlideIndex(0);
    }
  }, [lesson, currentSlideIndex]);
  
  // Get current slide
  const currentSlide = lesson?.slides[currentSlideIndex];
  
  // Navigate to next slide
  const nextSlide = () => {
    if (lesson && currentSlideIndex < lesson.slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
      return true;
    }
    return false;
  };
  
  // Navigate to previous slide
  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
      return true;
    }
    return false;
  };
  
  // Update slide content
  const updateSlideMutation = useMutation({
    mutationFn: async ({ slideId, content }: { slideId: string; content: Partial<Slide> }) => {
      if (!lessonId) throw new Error('No lesson ID provided');
      const response = await apiRequest('PATCH', `/api/lessons/${lessonId}/slides/${slideId}`, content);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/lessons/${lessonId}`] });
    },
  });
  
  // Mark slide as completed
  const markSlideCompleted = async () => {
    if (!currentSlide || !lessonId) return;
    
    await updateSlideMutation.mutateAsync({
      slideId: currentSlide.id,
      content: { completed: true }
    });
  };
  
  return {
    lesson,
    isLoading,
    error,
    currentSlide,
    currentSlideIndex,
    totalSlides: lesson?.slides.length || 0,
    nextSlide,
    prevSlide,
    setCurrentSlideIndex,
    markSlideCompleted,
    updateSlide: updateSlideMutation.mutate
  };
}
