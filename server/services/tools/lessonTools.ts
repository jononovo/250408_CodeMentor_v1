import { Tool } from "../openai";
import { storage } from "../../storage";
import { generateLesson } from "../openai";
import { InsertLesson } from "@shared/schema";

/**
 * Tool definitions for lesson-related operations
 */
export const lessonTools = {
  definitions: [
    {
      type: "function",
      function: {
        name: "createLesson",
        description: "Create a new coding lesson for a specific topic and difficulty level",
        parameters: {
          type: "object",
          properties: {
            topic: {
              type: "string",
              description: "The main topic or concept for the lesson (e.g. 'JavaScript arrays', 'Python loops')"
            },
            difficulty: {
              type: "string",
              enum: ["beginner", "intermediate", "advanced"],
              description: "The difficulty level of the lesson"
            },
            description: {
              type: "string",
              description: "An optional description for the lesson"
            }
          },
          required: ["topic", "difficulty"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "getLesson",
        description: "Get details about a specific lesson",
        parameters: {
          type: "object",
          properties: {
            lessonId: {
              type: "number",
              description: "The ID of the lesson to retrieve"
            }
          },
          required: ["lessonId"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "searchLessons",
        description: "Search for lessons by topic, language, or difficulty",
        parameters: {
          type: "object",
          properties: {
            topic: {
              type: "string",
              description: "Optional topic to search for"
            },
            language: {
              type: "string",
              description: "Optional programming language to filter by"
            },
            difficulty: {
              type: "string",
              enum: ["beginner", "intermediate", "advanced"],
              description: "Optional difficulty level to filter by"
            }
          }
        }
      }
    }
  ],
  functions: {
    /**
     * Create a new lesson
     */
    createLesson: async ({
      topic,
      difficulty,
      description
    }: {
      topic: string;
      difficulty: string;
      description?: string;
    }) => {
      try {
        // Generate lesson content using OpenAI
        const generatedLesson = await generateLesson(topic, difficulty, description);
        
        // Create lesson in storage
        const lesson = await storage.createLesson({
          title: generatedLesson.title,
          description: generatedLesson.description,
          difficulty: difficulty as "beginner" | "intermediate" | "advanced",
          language: generatedLesson.language || "javascript",
          estimatedTime: generatedLesson.estimatedTime || "15 min",
        });
        
        // Create slides for the lesson
        if (generatedLesson.slides && generatedLesson.slides.length > 0) {
          for (let i = 0; i < generatedLesson.slides.length; i++) {
            const slideData = generatedLesson.slides[i];
            await storage.createSlide({
              lessonId: lesson.id,
              title: slideData.title,
              content: slideData.content,
              type: slideData.type as "info" | "challenge" | "quiz",
              order: i,
              tags: slideData.tags || [],
              initialCode: slideData.initialCode,
              filename: slideData.filename,
              tests: slideData.tests || [],
            });
          }
        }
        
        return {
          status: "success",
          message: "Lesson created successfully",
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          slideCount: generatedLesson.slides.length
        };
      } catch (error) {
        console.error("Error creating lesson:", error);
        return {
          status: "error",
          message: `Failed to create lesson: ${error.message}`
        };
      }
    },
    
    /**
     * Get details about a specific lesson
     */
    getLesson: async ({ lessonId }: { lessonId: number }) => {
      try {
        const lesson = await storage.getLesson(lessonId);
        if (!lesson) {
          return {
            status: "error",
            message: `Lesson with ID ${lessonId} not found`
          };
        }
        
        // Get slides for the lesson
        const slides = await storage.getSlidesByLessonId(lessonId);
        
        return {
          status: "success",
          lesson: {
            ...lesson,
            slideCount: slides.length
          }
        };
      } catch (error) {
        console.error("Error getting lesson:", error);
        return {
          status: "error",
          message: `Failed to get lesson: ${error.message}`
        };
      }
    },
    
    /**
     * Search for lessons
     */
    searchLessons: async ({
      topic,
      language,
      difficulty
    }: {
      topic?: string;
      language?: string;
      difficulty?: string;
    }) => {
      try {
        // Get all lessons
        let lessons = await storage.getLessons();
        
        // Filter by criteria if provided
        if (topic) {
          lessons = lessons.filter(lesson => 
            lesson.title.toLowerCase().includes(topic.toLowerCase()) || 
            lesson.description.toLowerCase().includes(topic.toLowerCase())
          );
        }
        
        if (language) {
          lessons = lessons.filter(lesson => 
            lesson.language.toLowerCase() === language.toLowerCase()
          );
        }
        
        if (difficulty) {
          lessons = lessons.filter(lesson => 
            lesson.difficulty === difficulty
          );
        }
        
        return {
          status: "success",
          count: lessons.length,
          lessons: lessons.map(lesson => ({
            id: lesson.id,
            title: lesson.title,
            description: lesson.description,
            difficulty: lesson.difficulty,
            language: lesson.language
          }))
        };
      } catch (error) {
        console.error("Error searching lessons:", error);
        return {
          status: "error",
          message: `Failed to search lessons: ${error.message}`
        };
      }
    }
  }
};