import { storage } from '../../storage';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get all slides for a specific lesson
 */
export async function getSlides(args: { lessonId: number }) {
  try {
    const { lessonId } = args;
    
    console.log(`[SlideTools] Getting slides for lesson ID: ${lessonId}`);
    
    // Get lesson to validate it exists
    const lesson = await storage.getLesson(lessonId);
    if (!lesson) {
      throw new Error(`Lesson with ID ${lessonId} not found`);
    }
    
    // Get all slides for the lesson
    const slides = await storage.getSlidesByLessonId(lessonId);
    
    // Sort slides by order
    return slides.sort((a, b) => a.order - b.order);
  } catch (error: any) {
    console.error('[SlideTools] Error getting slides:', error);
    throw new Error(`Failed to get slides: ${error.message}`);
  }
}

/**
 * Get details about a specific slide
 */
export async function getSlide(args: { lessonId: number, slideId: number }) {
  try {
    const { lessonId, slideId } = args;
    
    console.log(`[SlideTools] Getting slide ID: ${slideId} from lesson ID: ${lessonId}`);
    
    // Get the slide
    const slide = await storage.getSlide(slideId);
    
    if (!slide) {
      throw new Error(`Slide with ID ${slideId} not found`);
    }
    
    if (slide.lessonId !== lessonId) {
      throw new Error(`Slide with ID ${slideId} does not belong to lesson with ID ${lessonId}`);
    }
    
    return slide;
  } catch (error: any) {
    console.error('[SlideTools] Error getting slide:', error);
    throw new Error(`Failed to get slide: ${error.message}`);
  }
}

/**
 * Add a new slide to a lesson
 */
export async function addSlide(args: { 
  lessonId: number,
  title: string,
  content: string,
  type: 'info' | 'challenge' | 'quiz',
  tags?: string[],
  initialCode?: string,
  filename?: string,
  tests?: Array<{
    id?: string,
    name: string,
    description: string,
    validation: string,
    type: 'regex' | 'js'
  }>
}) {
  try {
    const { lessonId, title, content, type, tags = [], initialCode, filename, tests = [] } = args;
    
    console.log(`[SlideTools] Adding new ${type} slide to lesson ID: ${lessonId}`);
    
    // Get lesson to validate it exists
    const lesson = await storage.getLesson(lessonId);
    if (!lesson) {
      throw new Error(`Lesson with ID ${lessonId} not found`);
    }
    
    // Get existing slides to determine order
    const slides = await storage.getSlidesByLessonId(lessonId);
    const order = slides.length;
    
    // Process tests to ensure each has an ID
    const processedTests = tests.map(test => ({
      ...test,
      id: test.id || uuidv4()
    }));
    
    // Create the new slide
    const newSlide = await storage.createSlide({
      lessonId,
      title,
      content,
      type,
      order,
      tags,
      initialCode,
      filename,
      tests: processedTests
    });
    
    return newSlide;
  } catch (error: any) {
    console.error('[SlideTools] Error adding slide:', error);
    throw new Error(`Failed to add slide: ${error.message}`);
  }
}

/**
 * Update an existing slide
 */
export async function updateSlide(args: { 
  lessonId: number,
  slideId: number,
  title?: string,
  content?: string,
  type?: 'info' | 'challenge' | 'quiz',
  tags?: string[],
  initialCode?: string,
  filename?: string,
  tests?: Array<{
    id?: string,
    name: string,
    description: string,
    validation: string,
    type: 'regex' | 'js'
  }>
}) {
  try {
    const { lessonId, slideId, ...updateData } = args;
    
    console.log(`[SlideTools] Updating slide ID: ${slideId} in lesson ID: ${lessonId}`);
    
    // Get the slide to ensure it exists and belongs to the lesson
    const slide = await storage.getSlide(slideId);
    
    if (!slide) {
      throw new Error(`Slide with ID ${slideId} not found`);
    }
    
    if (slide.lessonId !== lessonId) {
      throw new Error(`Slide with ID ${slideId} does not belong to lesson with ID ${lessonId}`);
    }
    
    // Process tests if provided to ensure each has a valid ID
    if (updateData.tests) {
      // Add properly typed test array
      const processedTests = updateData.tests.map(test => ({
        id: test.id || uuidv4(),
        name: test.name,
        description: test.description,
        validation: test.validation,
        type: test.type
      }));
      
      // Replace the original tests with properly typed tests
      updateData.tests = processedTests;
    }
    
    // Update the slide
    const updatedSlide = await storage.updateSlide(slideId, updateData);
    
    return updatedSlide;
  } catch (error: any) {
    console.error('[SlideTools] Error updating slide:', error);
    throw new Error(`Failed to update slide: ${error.message}`);
  }
}