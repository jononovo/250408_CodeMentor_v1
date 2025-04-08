import { storage } from '../../storage';

/**
 * Get details about a specific lesson
 */
export async function getLesson(args: { lessonId: number }) {
  try {
    const { lessonId } = args;
    
    console.log(`[LessonTools] Getting lesson ID: ${lessonId}`);
    
    // Get the lesson
    const lesson = await storage.getLesson(lessonId);
    
    if (!lesson) {
      throw new Error(`Lesson with ID ${lessonId} not found`);
    }
    
    // Get slides for this lesson
    const slides = await storage.getSlidesByLessonId(lessonId);
    
    // Return lesson with slides
    return {
      ...lesson,
      slides: slides.sort((a, b) => a.order - b.order),
    };
  } catch (error: any) {
    console.error('[LessonTools] Error getting lesson:', error);
    throw new Error(`Failed to get lesson: ${error.message}`);
  }
}

/**
 * Get all lessons
 */
export async function getLessons() {
  try {
    console.log('[LessonTools] Getting all lessons');
    
    // Get all lessons
    const lessons = await storage.getLessons();
    
    return lessons;
  } catch (error: any) {
    console.error('[LessonTools] Error getting lessons:', error);
    throw new Error(`Failed to get lessons: ${error.message}`);
  }
}

/**
 * Update lesson details
 */
export async function updateLesson(args: { 
  lessonId: number, 
  title?: string, 
  description?: string,
  difficulty?: 'beginner' | 'intermediate' | 'advanced',
  language?: string,
  estimatedTime?: string
}) {
  try {
    const { lessonId, ...updateData } = args;
    
    console.log(`[LessonTools] Updating lesson ID: ${lessonId}`);
    
    // Get the lesson to ensure it exists
    const lesson = await storage.getLesson(lessonId);
    
    if (!lesson) {
      throw new Error(`Lesson with ID ${lessonId} not found`);
    }
    
    // Update the lesson
    const updatedLesson = await storage.updateLesson(lessonId, updateData);
    
    return updatedLesson;
  } catch (error: any) {
    console.error('[LessonTools] Error updating lesson:', error);
    throw new Error(`Failed to update lesson: ${error.message}`);
  }
}

/**
 * Get the current active slide based on chat context
 * This helps determine which slide the user is currently viewing
 */
export async function getCurrentSlideContext(args: { lessonId: number, chatId: number }) {
  try {
    const { lessonId, chatId } = args;
    
    console.log(`[LessonTools] Getting current slide context for lesson ID: ${lessonId}, chat ID: ${chatId}`);
    
    // Get the chat to ensure it exists
    const chat = await storage.getChat(chatId);
    
    if (!chat) {
      throw new Error(`Chat with ID ${chatId} not found`);
    }
    
    // Get chat messages to analyze context
    const messages = await storage.getMessagesByChatId(chatId);
    
    // Get all slides for the lesson
    const slides = await storage.getSlidesByLessonId(lessonId);
    
    if (!slides || slides.length === 0) {
      throw new Error(`No slides found for lesson with ID ${lessonId}`);
    }
    
    // Look through messages to find references to specific slides
    // This is a simple implementation - in a real app, you would use more sophisticated
    // NLP techniques to determine the current context
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      
      // Look for mentions of slide titles in recent messages
      for (const slide of slides) {
        if (message.content.includes(slide.title)) {
          return {
            currentSlide: slide,
            allSlides: slides.sort((a, b) => a.order - b.order)
          };
        }
      }
      
      // Look for mentions of slide numbers
      for (let j = 0; j < slides.length; j++) {
        const slideNumber = j + 1;
        if (message.content.includes(`slide ${slideNumber}`) || 
            message.content.includes(`Slide ${slideNumber}`)) {
          return {
            currentSlide: slides[j],
            allSlides: slides.sort((a, b) => a.order - b.order)
          };
        }
      }
    }
    
    // Default to the first slide if no specific context is found
    return {
      currentSlide: slides.sort((a, b) => a.order - b.order)[0],
      allSlides: slides.sort((a, b) => a.order - b.order)
    };
  } catch (error: any) {
    console.error('[LessonTools] Error getting current slide context:', error);
    throw new Error(`Failed to get current slide context: ${error.message}`);
  }
}