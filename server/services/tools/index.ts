import { Tool } from "../openai";

/**
 * Tool definitions for lesson-related operations
 */
export const lessonTools = {
  definitions: [
    {
      type: "function" as const,
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
    }
  ],
  functions: {
    /**
     * Create a new lesson (simplified placeholder)
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
      return {
        status: "success",
        message: "Placeholder: Lesson creation would happen here with real OpenAI",
        lessonId: 1,
        lessonTitle: `Learning ${topic}`
      };
    }
  }
};

/**
 * Tool definitions for slide-related operations
 */
export const slideTools = {
  definitions: [
    {
      type: "function" as const,
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
            }
          },
          required: ["slideId"]
        }
      }
    }
  ],
  functions: {
    /**
     * Update a slide (simplified placeholder)
     */
    updateSlide: async ({
      slideId,
      title,
      content
    }: {
      slideId: number;
      title?: string;
      content?: string;
    }) => {
      return {
        status: "success",
        message: "Placeholder: Slide update would happen here"
      };
    }
  }
};

/**
 * Tool definitions for code-related operations
 */
export const codeTools = {
  definitions: [
    {
      type: "function" as const,
      function: {
        name: "analyzeCode",
        description: "Analyze code for errors, improvements, and best practices",
        parameters: {
          type: "object",
          properties: {
            code: {
              type: "string",
              description: "The code snippet to analyze"
            },
            language: {
              type: "string",
              description: "The programming language (javascript, python, html, css, etc.)"
            }
          },
          required: ["code", "language"]
        }
      }
    }
  ],
  functions: {
    /**
     * Analyze code (simplified placeholder)
     */
    analyzeCode: async ({
      code,
      language
    }: {
      code: string;
      language: string;
    }) => {
      return {
        status: "success",
        analysis: "Placeholder: Code analysis would happen here with real OpenAI"
      };
    }
  }
};

/**
 * Combine all tools into a single list for the OpenAI API
 */
export const tools: Tool[] = [
  ...lessonTools.definitions,
  ...slideTools.definitions,
  ...codeTools.definitions
];

/**
 * Combine all tool functions into a single map for execution
 */
export const toolsMap: Record<string, (args: any) => Promise<any> | any> = {
  ...lessonTools.functions,
  ...slideTools.functions,
  ...codeTools.functions
};