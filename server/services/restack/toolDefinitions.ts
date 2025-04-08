import { v4 as uuidv4 } from 'uuid';
import { storage } from '../../storage';

/**
 * Tool definitions for Restack OpenAI integrations
 */

export const tools = [
  {
    type: "function",
    function: {
      name: "createLesson",
      description: "Create a new coding lesson on a specific topic",
      parameters: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            description: "The programming topic to create a lesson about, e.g., 'JavaScript loops', 'Python functions'",
          },
          difficulty: {
            type: "string",
            enum: ["beginner", "intermediate", "advanced"],
            description: "The difficulty level of the lesson",
          },
          language: {
            type: "string",
            description: "The programming language for the lesson, e.g., 'JavaScript', 'Python'",
          },
        },
        required: ["topic"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "updateSlide",
      description: "Update an existing slide in a lesson",
      parameters: {
        type: "object",
        properties: {
          lessonId: {
            type: "number",
            description: "The ID of the lesson containing the slide",
          },
          slideId: {
            type: "number",
            description: "The ID of the slide to update",
          },
          title: {
            type: "string",
            description: "The new title for the slide",
          },
          content: {
            type: "string",
            description: "The new content for the slide",
          },
        },
        required: ["lessonId", "slideId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyzeCode",
      description: "Analyze code for errors, improvements, and best practices",
      parameters: {
        type: "object",
        properties: {
          code: {
            type: "string",
            description: "The code to analyze",
          },
          language: {
            type: "string",
            description: "The programming language of the code",
          },
        },
        required: ["code", "language"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "explainCode",
      description: "Provide a line-by-line explanation of code",
      parameters: {
        type: "object",
        properties: {
          code: {
            type: "string",
            description: "The code to explain",
          },
          language: {
            type: "string",
            description: "The programming language of the code",
          },
        },
        required: ["code", "language"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generateTests",
      description: "Generate test cases for a coding challenge",
      parameters: {
        type: "object",
        properties: {
          challenge: {
            type: "string",
            description: "Description of the coding challenge",
          },
          code: {
            type: "string",
            description: "The code to generate tests for",
          },
          language: {
            type: "string",
            description: "The programming language of the code",
          },
        },
        required: ["challenge", "language"],
      },
    },
  },
];

/**
 * Tool implementation map
 */
export const toolsMap = {
  createLesson: async (args: { topic: string; difficulty?: string; language?: string }) => {
    try {
      const { topic, difficulty = 'beginner', language = 'JavaScript' } = args;
      
      // Create the lesson
      const lesson = await storage.createLesson({
        title: `Learning ${topic}`,
        description: `A ${difficulty} level lesson about ${topic}`,
        language,
        difficulty: difficulty as any,
        estimatedTime: '15 minutes'
      });
      
      // Generate basic slides
      const slideTypes = ['info', 'info', 'challenge', 'quiz'];
      const slideTitles = ['Introduction', 'Core Concepts', 'Coding Challenge', 'Knowledge Check'];
      
      for (let i = 0; i < slideTypes.length; i++) {
        await storage.createSlide({
          lessonId: lesson.id,
          title: slideTitles[i],
          content: `# ${slideTitles[i]}\n\nContent about ${topic} goes here.`,
          type: slideTypes[i] as any,
          order: i,
          tags: [topic.toLowerCase(), slideTypes[i]],
          initialCode: slideTypes[i] === 'challenge' ? `// Write your code for ${topic} here` : undefined,
          filename: slideTypes[i] === 'challenge' ? 'script.js' : undefined,
          tests: slideTypes[i] === 'challenge' ? [
            {
              id: uuidv4(),
              name: "Basic Test",
              description: "Checks basic functionality",
              validation: "function exists",
              type: 'regex'
            }
          ] : undefined
        });
      }
      
      return {
        id: lesson.id,
        title: lesson.title,
        message: `Created a new lesson: ${lesson.title}`
      };
    } catch (error: any) {
      console.error('Error in createLesson tool:', error);
      throw new Error(`Failed to create lesson: ${error.message}`);
    }
  },
  
  updateSlide: async (args: { lessonId: number; slideId: number; title?: string; content?: string }) => {
    try {
      const { lessonId, slideId, title, content } = args;
      
      // Verify the slide exists
      const slide = await storage.getSlide(slideId);
      if (!slide || slide.lessonId !== lessonId) {
        throw new Error('Slide not found or does not belong to the specified lesson');
      }
      
      // Update the slide
      const updatedSlide = await storage.updateSlide(slideId, {
        title: title || slide.title,
        content: content || slide.content
      });
      
      return {
        message: `Updated slide: ${updatedSlide.title}`,
        slide: updatedSlide
      };
    } catch (error: any) {
      console.error('Error in updateSlide tool:', error);
      throw new Error(`Failed to update slide: ${error.message}`);
    }
  },
  
  analyzeCode: async (args: { code: string; language: string }) => {
    const { code, language } = args;
    
    // This would typically call OpenAI to analyze the code
    // For now, we return a simple analysis
    return {
      analysis: `This is an analysis of the ${language} code provided:\n\n1. No major errors detected\n2. Consider adding more comments\n3. Code follows standard conventions`,
      suggestions: [
        "Add more inline documentation",
        "Consider edge cases",
        "Add error handling"
      ]
    };
  },
  
  explainCode: async (args: { code: string; language: string }) => {
    const { code, language } = args;
    
    // This would typically call OpenAI to explain the code
    // For now, we return a simple explanation
    const lines = code.split('\n');
    const explanations = lines.map((line, index) => 
      `Line ${index + 1}: ${line.trim() ? `This line ${
        line.includes('function') ? 'defines a function' : 
        line.includes('return') ? 'returns a value' : 
        line.includes('for') || line.includes('while') ? 'creates a loop' : 
        line.includes('if') ? 'checks a condition' : 
        'performs an operation'
      }` : 'This is a blank line'}`
    );
    
    return {
      explanation: explanations.join('\n'),
      language
    };
  },
  
  generateTests: async (args: { challenge: string; code?: string; language: string }) => {
    const { challenge, code, language } = args;
    
    // This would typically call OpenAI to generate tests
    // For now, we return sample tests
    const tests = [
      {
        id: uuidv4(),
        name: "Basic functionality",
        description: "Checks if the solution works for basic inputs",
        validation: language === 'JavaScript' 
          ? "solution(1, 2) === 3" 
          : "assert solution(1, 2) == 3",
        type: 'js'
      },
      {
        id: uuidv4(),
        name: "Edge case",
        description: "Checks if the solution handles edge cases",
        validation: language === 'JavaScript'
          ? "solution(0, 0) === 0"
          : "assert solution(0, 0) == 0",
        type: 'js'
      }
    ];
    
    return {
      tests,
      message: `Generated ${tests.length} tests for the challenge`
    };
  }
};