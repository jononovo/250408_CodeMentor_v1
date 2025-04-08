import { Tool } from "../openai";
import { storage } from "../../storage";
import { InsertSlide } from "@shared/schema";

/**
 * Tool definitions for slide-related operations
 */
export const slideTools = {
  definitions: [
    {
      type: "function",
      function: {
        name: "createSlide",
        description: "Create a new slide for a lesson",
        parameters: {
          type: "object",
          properties: {
            lessonId: {
              type: "number",
              description: "The ID of the lesson to add the slide to"
            },
            title: {
              type: "string",
              description: "The title of the slide"
            },
            content: {
              type: "string",
              description: "The content of the slide in markdown format"
            },
            type: {
              type: "string",
              enum: ["info", "challenge", "quiz"],
              description: "The type of slide"
            },
            order: {
              type: "number",
              description: "The order position of the slide (optional)"
            },
            tags: {
              type: "array",
              items: {
                type: "string"
              },
              description: "Tags relevant to the slide content"
            },
            initialCode: {
              type: "string",
              description: "Starter code for challenge slides (if applicable)"
            },
            filename: {
              type: "string",
              description: "Filename for code (if applicable)"
            },
            tests: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    description: "Unique ID for the test"
                  },
                  name: {
                    type: "string",
                    description: "Name of the test"
                  },
                  description: {
                    type: "string",
                    description: "Description of what the test is checking"
                  },
                  validation: {
                    type: "string",
                    description: "Regex or JavaScript code to validate solution"
                  },
                  type: {
                    type: "string",
                    enum: ["regex", "js"],
                    description: "Type of validation (regex or js)"
                  }
                }
              },
              description: "Tests for challenge slides (if applicable)"
            }
          },
          required: ["lessonId", "title", "content", "type"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "updateSlide",
        description: "Update an existing slide",
        parameters: {
          type: "object",
          properties: {
            slideId: {
              type: "number",
              description: "The ID of the slide to update"
            },
            title: {
              type: "string",
              description: "The updated title of the slide"
            },
            content: {
              type: "string",
              description: "The updated content of the slide in markdown format"
            },
            type: {
              type: "string",
              enum: ["info", "challenge", "quiz"],
              description: "The updated type of slide"
            },
            tags: {
              type: "array",
              items: {
                type: "string"
              },
              description: "Updated tags relevant to the slide content"
            },
            initialCode: {
              type: "string",
              description: "Updated starter code for challenge slides (if applicable)"
            },
            filename: {
              type: "string",
              description: "Updated filename for code (if applicable)"
            },
            tests: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    description: "Unique ID for the test"
                  },
                  name: {
                    type: "string",
                    description: "Name of the test"
                  },
                  description: {
                    type: "string",
                    description: "Description of what the test is checking"
                  },
                  validation: {
                    type: "string",
                    description: "Regex or JavaScript code to validate solution"
                  },
                  type: {
                    type: "string",
                    enum: ["regex", "js"],
                    description: "Type of validation (regex or js)"
                  }
                }
              },
              description: "Updated tests for challenge slides (if applicable)"
            }
          },
          required: ["slideId"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "getSlides",
        description: "Get all slides for a lesson",
        parameters: {
          type: "object",
          properties: {
            lessonId: {
              type: "number",
              description: "The ID of the lesson to get slides for"
            }
          },
          required: ["lessonId"]
        }
      }
    }
  ],
  functions: {
    /**
     * Create a new slide
     */
    createSlide: async ({
      lessonId,
      title,
      content,
      type,
      order,
      tags,
      initialCode,
      filename,
      tests
    }: {
      lessonId: number;
      title: string;
      content: string;
      type: "info" | "challenge" | "quiz";
      order?: number;
      tags?: string[];
      initialCode?: string;
      filename?: string;
      tests?: Array<{
        id: string;
        name: string;
        description: string;
        validation: string;
        type: "regex" | "js";
      }>;
    }) => {
      try {
        // Check if lesson exists
        const lesson = await storage.getLesson(lessonId);
        if (!lesson) {
          return {
            status: "error",
            message: `Lesson with ID ${lessonId} not found`
          };
        }
        
        // Get existing slides to determine order
        const slides = await storage.getSlidesByLessonId(lessonId);
        const slideOrder = order !== undefined ? order : slides.length;
        
        // Create slide
        const slide = await storage.createSlide({
          lessonId,
          title,
          content,
          type,
          order: slideOrder,
          tags: tags || [],
          initialCode,
          filename,
          tests: tests || []
        });
        
        return {
          status: "success",
          message: "Slide created successfully",
          slideId: slide.id,
          slideTitle: slide.title,
          slideOrder: slide.order
        };
      } catch (error) {
        console.error("Error creating slide:", error);
        return {
          status: "error",
          message: `Failed to create slide: ${error.message}`
        };
      }
    },
    
    /**
     * Update an existing slide
     */
    updateSlide: async ({
      slideId,
      title,
      content,
      type,
      tags,
      initialCode,
      filename,
      tests
    }: {
      slideId: number;
      title?: string;
      content?: string;
      type?: "info" | "challenge" | "quiz";
      tags?: string[];
      initialCode?: string;
      filename?: string;
      tests?: Array<{
        id: string;
        name: string;
        description: string;
        validation: string;
        type: "regex" | "js";
      }>;
    }) => {
      try {
        // Check if slide exists
        const slide = await storage.getSlide(slideId);
        if (!slide) {
          return {
            status: "error",
            message: `Slide with ID ${slideId} not found`
          };
        }
        
        // Update slide
        const updates: any = {};
        if (title !== undefined) updates.title = title;
        if (content !== undefined) updates.content = content;
        if (type !== undefined) updates.type = type;
        if (tags !== undefined) updates.tags = tags;
        
        // Handle challenge-specific fields
        if (type === "challenge" || slide.type === "challenge") {
          if (initialCode !== undefined) updates.initialCode = initialCode;
          if (filename !== undefined) updates.filename = filename;
          if (tests !== undefined) updates.tests = tests;
        }
        
        const updatedSlide = await storage.updateSlide(slideId, updates);
        
        return {
          status: "success",
          message: "Slide updated successfully",
          slideId: updatedSlide.id,
          slideTitle: updatedSlide.title
        };
      } catch (error) {
        console.error("Error updating slide:", error);
        return {
          status: "error",
          message: `Failed to update slide: ${error.message}`
        };
      }
    },
    
    /**
     * Get all slides for a lesson
     */
    getSlides: async ({ lessonId }: { lessonId: number }) => {
      try {
        // Check if lesson exists
        const lesson = await storage.getLesson(lessonId);
        if (!lesson) {
          return {
            status: "error",
            message: `Lesson with ID ${lessonId} not found`
          };
        }
        
        // Get slides
        const slides = await storage.getSlidesByLessonId(lessonId);
        
        return {
          status: "success",
          count: slides.length,
          slides: slides.sort((a, b) => a.order - b.order)
        };
      } catch (error) {
        console.error("Error getting slides:", error);
        return {
          status: "error",
          message: `Failed to get slides: ${error.message}`
        };
      }
    }
  }
};