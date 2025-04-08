import { getLesson, getLessons, getCurrentSlideContext, updateLesson } from '../tools/lessonTools';
import { getSlides, getSlide, addSlide, updateSlide } from '../tools/slideTools';

/**
 * Tool definition interface
 */
export interface Tool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties?: Record<string, any>;
      required?: string[];
    };
  };
}

/**
 * Define tools to be used with OpenAI function calling
 */
export const tools: Tool[] = [
  {
    type: "function",
    function: {
      name: "getLesson",
      description: "Get detailed information about a specific lesson and its slides",
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
      name: "getLessons",
      description: "Get a list of all available lessons",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getCurrentSlideContext",
      description: "Get the current slide context based on the chat history to determine what slide the user is viewing",
      parameters: {
        type: "object",
        properties: {
          lessonId: {
            type: "number",
            description: "The ID of the lesson"
          },
          chatId: {
            type: "number",
            description: "The ID of the chat to analyze for context"
          }
        },
        required: ["lessonId", "chatId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "updateLesson",
      description: "Update details of a lesson",
      parameters: {
        type: "object",
        properties: {
          lessonId: {
            type: "number",
            description: "The ID of the lesson to update"
          },
          title: {
            type: "string",
            description: "New title for the lesson"
          },
          description: {
            type: "string",
            description: "New description for the lesson"
          },
          difficulty: {
            type: "string",
            enum: ["beginner", "intermediate", "advanced"],
            description: "New difficulty level for the lesson"
          },
          language: {
            type: "string",
            description: "New programming language for the lesson"
          },
          estimatedTime: {
            type: "string",
            description: "New estimated completion time for the lesson"
          }
        },
        required: ["lessonId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getSlides",
      description: "Get all slides for a specific lesson",
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
  },
  {
    type: "function",
    function: {
      name: "getSlide",
      description: "Get details about a specific slide",
      parameters: {
        type: "object",
        properties: {
          lessonId: {
            type: "number",
            description: "The ID of the lesson the slide belongs to"
          },
          slideId: {
            type: "number",
            description: "The ID of the slide to retrieve"
          }
        },
        required: ["lessonId", "slideId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "addSlide",
      description: "Add a new slide to a lesson",
      parameters: {
        type: "object",
        properties: {
          lessonId: {
            type: "number",
            description: "The ID of the lesson to add a slide to"
          },
          title: {
            type: "string",
            description: "Title for the new slide"
          },
          content: {
            type: "string",
            description: "Content for the slide in Markdown format"
          },
          type: {
            type: "string",
            enum: ["info", "challenge", "quiz"],
            description: "Type of slide to add"
          },
          tags: {
            type: "array",
            items: {
              type: "string"
            },
            description: "Tags to categorize the slide"
          },
          initialCode: {
            type: "string",
            description: "Initial code for a challenge slide"
          },
          filename: {
            type: "string",
            description: "Filename for the code editor (e.g., script.js, index.html)"
          },
          tests: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Name of the test"
                },
                description: {
                  type: "string",
                  description: "Description of what the test checks for"
                },
                validation: {
                  type: "string",
                  description: "Validation code or regex pattern to check"
                },
                type: {
                  type: "string",
                  enum: ["regex", "js"],
                  description: "Type of test (regex or JavaScript)"
                }
              },
              required: ["name", "description", "validation", "type"]
            },
            description: "Tests for challenge slides to validate user code"
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
          lessonId: {
            type: "number",
            description: "The ID of the lesson the slide belongs to"
          },
          slideId: {
            type: "number",
            description: "The ID of the slide to update"
          },
          title: {
            type: "string",
            description: "New title for the slide"
          },
          content: {
            type: "string",
            description: "New content for the slide in Markdown format"
          },
          type: {
            type: "string",
            enum: ["info", "challenge", "quiz"],
            description: "New type for the slide"
          },
          tags: {
            type: "array",
            items: {
              type: "string"
            },
            description: "New tags for the slide"
          },
          initialCode: {
            type: "string",
            description: "New initial code for a challenge slide"
          },
          filename: {
            type: "string",
            description: "New filename for the code editor"
          },
          tests: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Name of the test"
                },
                description: {
                  type: "string",
                  description: "Description of what the test checks for"
                },
                validation: {
                  type: "string",
                  description: "Validation code or regex pattern to check"
                },
                type: {
                  type: "string",
                  enum: ["regex", "js"],
                  description: "Type of test (regex or JavaScript)"
                }
              },
              required: ["name", "description", "validation", "type"]
            },
            description: "New tests for challenge slides"
          }
        },
        required: ["lessonId", "slideId"]
      }
    }
  }
];

/**
 * Map of function names to their implementations
 * This is used by the OpenAI function calling mechanism
 */
export const toolsMap: Record<string, Function> = {
  getLesson,
  getLessons,
  getCurrentSlideContext,
  updateLesson,
  getSlides,
  getSlide,
  addSlide,
  updateSlide
};