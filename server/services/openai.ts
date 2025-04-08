import OpenAI from "openai";
import { storage } from "../storage";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
 * Message interface to match OpenAI requirements
 */
export type MessageParam = {
  role: "system" | "user" | "assistant" | "tool" | "function";
  content: string;
  name?: string;
  tool_call_id?: string;
};

/**
 * Execute a function call from the OpenAI API
 */
export async function executeToolCall(
  toolCall: any,
  toolsMap: Record<string, (args: any) => Promise<any> | any>
) {
  const functionName = toolCall.function.name;
  const functionArgs = JSON.parse(toolCall.function.arguments);
  
  if (!toolsMap[functionName]) {
    throw new Error(`Function ${functionName} not found in tools map`);
  }
  
  try {
    return await toolsMap[functionName](functionArgs);
  } catch (error: any) {
    console.error(`Error executing function ${functionName}:`, error);
    return { error: `Failed to execute ${functionName}: ${error.message}` };
  }
}

/**
 * Generate a response using the OpenAI API with tools
 */
export async function generateToolResponse(
  messages: MessageParam[],
  tools: Tool[],
  toolsMap: Record<string, (args: any) => Promise<any> | any>
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: messages as any,
      tools: tools as any,
      tool_choice: "auto",
    });

    const responseMessage = response.choices[0].message;

    // Check if the model wants to call a function
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolCall = responseMessage.tool_calls[0];
      
      // Execute the function call
      const functionResult = await executeToolCall(toolCall, toolsMap);
      
      // Add the function call and result to the messages
      messages.push({
        role: "assistant",
        content: responseMessage.content || "",
      }); // Add the assistant's response with the function call
      
      // Add the function result as a new message
      messages.push({
        role: "tool",
        content: JSON.stringify(functionResult),
        tool_call_id: toolCall.id,
      });
      
      // Get a new response from the model
      return generateToolResponse(messages, tools, toolsMap);
    }

    return responseMessage.content || "I couldn't generate a proper response.";
  } catch (error: any) {
    console.error("Error calling OpenAI API:", error);
    return `Sorry, I'm having trouble processing your request right now. Error: ${error.message}`;
  }
}

/**
 * Generate a lesson using the OpenAI API
 */
export async function generateLesson(
  topic: string,
  difficulty: string = "beginner",
  description?: string
) {
  try {
    const prompt = `Create an interactive coding lesson for teenagers about ${topic}.
    
Difficulty level: ${difficulty}
${description ? `Description: ${description}` : ""}

The lesson should be engaging, informative, and include challenges that build upon the concepts taught.
Format the response as a JSON object with the following structure:
{
  "title": "Lesson title",
  "description": "Brief description of the lesson",
  "language": "programming language",
  "estimatedTime": "estimated completion time",
  "slides": [
    {
      "title": "Slide title",
      "content": "Slide content with markdown formatting",
      "type": "info or challenge or quiz",
      "tags": ["tag1", "tag2"],
      "initialCode": "starter code for challenges (if applicable)",
      "filename": "filename for code (if applicable)",
      "tests": [
        {
          "id": "unique test id",
          "name": "Test name",
          "description": "What the test is checking",
          "validation": "regex or js code to validate solution",
          "type": "regex or js"
        }
      ]
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    return JSON.parse(content);
  } catch (error: any) {
    console.error("Error generating lesson:", error);
    throw new Error(`Failed to generate lesson: ${error.message}`);
  }
}

/**
 * Generate a chat response using the OpenAI API
 */
export async function generateChatResponse(
  message: string,
  chatHistory: MessageParam[],
  lessonId?: number
) {
  try {
    // If there's a lessonId, get the lesson details to provide context
    let lessonContext = "";
    if (lessonId) {
      const lesson = await storage.getLesson(lessonId);
      if (lesson) {
        lessonContext = `You are helping with a coding lesson titled "${lesson.title}" about ${lesson.language}. 
The difficulty level is ${lesson.difficulty}.`;
        
        // Get slides for additional context
        const slides = await storage.getSlidesByLessonId(lessonId);
        if (slides && slides.length > 0) {
          lessonContext += `\nThe lesson has ${slides.length} slides, covering topics like: ${slides.map(s => s.title).join(", ")}.`;
        }
      }
    }

    const systemMessage: MessageParam = {
      role: "system",
      content: `You are Mumu, a friendly AI coding mentor for teenagers learning to code. 
Your goal is to make coding approachable, fun, and educational.
${lessonContext}
Keep explanations simple but accurate. Use emojis occasionally to appear friendly.
Include code examples when relevant. Format code snippets with markdown syntax using \`\`\` for code blocks.`
    };

    const fullMessages = [systemMessage, ...chatHistory, { role: "user", content: message }];

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: fullMessages as any,
    });

    return response.choices[0].message.content || "I couldn't generate a proper response.";
  } catch (error: any) {
    console.error("Error generating chat response:", error);
    return `I'm having trouble responding right now. Error: ${error.message}`;
  }
}