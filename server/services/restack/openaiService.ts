import OpenAI from 'openai';
import { storage } from '../../storage';
import { tools, toolsMap } from './toolDefinitions';
import { v4 as uuidv4 } from 'uuid';

// Initialize OpenAI client with API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

class RestackOpenAIService {
  // Track processed messages to avoid duplicates
  private processedMessages: Set<string> = new Set();

  /**
   * Generate a new lesson based on a topic and difficulty
   */
  async generateLesson(
    topic: string,
    difficulty: string = 'beginner'
  ) {
    try {
      // Create basic lesson structure
      const language = this.detectLanguageFromTopic(topic);
      const title = this.generateTitle(topic, difficulty);
      
      // Insert the new lesson
      const lesson = await storage.createLesson({
        title,
        description: `Learn about ${topic} with this ${difficulty} level lesson.`,
        language,
        difficulty: difficulty as any,
        estimatedTime: '15 minutes'
      });
      
      // Generate slides for the lesson
      const slides = this.generateSlidesForTopic(topic, language, difficulty);
      
      // Create slides for the lesson
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        await storage.createSlide({
          lessonId: lesson.id,
          title: slide.title,
          content: slide.content,
          type: slide.type as any,
          order: i,
          tags: slide.tags,
          initialCode: slide.initialCode,
          filename: slide.filename,
          tests: slide.tests
        });
      }
      
      return lesson;
    } catch (error: any) {
      console.error('Error generating lesson:', error);
      throw new Error(`Failed to generate lesson: ${error.message}`);
    }
  }

  /**
   * Generate a response to a user message
   */
  async generateResponse(
    message: string,
    chatId: number,
    lessonId?: number
  ): Promise<string> {
    try {
      // Get chat history
      let chatHistory: any[] = [];
      if (chatId) {
        const messages = await storage.getMessagesByChatId(chatId);
        chatHistory = messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      }
      
      let response = '';
      
      // Check if this is a request to create a new lesson
      if (this.isNewLessonRequest(message)) {
        // Extract topic and difficulty from message
        const topic = this.extractTopicFromMessage(message);
        const difficulty = this.extractDifficultyFromMessage(message);
        
        try {
          // Generate a new lesson
          const lesson = await this.generateLesson(topic, difficulty);
          
          // Format response with lesson details and ID for redirect
          // Using the format expected by ChatPanel: __LESSON_CREATED__:lessonId:lessonTitle
          response = `I've created a new lesson about ${topic}. It's ready for you to explore!\n\n__LESSON_CREATED__:${lesson.id}:${lesson.title}`;
        } catch (error: any) {
          console.error('Error creating new lesson:', error);
          response = `I'm sorry, I couldn't create a lesson about ${topic}. Error: ${error.message}`;
        }
      }
      // Check if this is a request to edit a slide
      else if (lessonId && this.isSlideEditRequest(message)) {
        response = await this.handleSlideEditRequest(message, lessonId);
      }
      // Use OpenAI function calling for other responses when in a lesson context
      else if (lessonId) {
        // Convert our tools to OpenAI tool format
        const openaiTools = tools.map(tool => ({
          type: 'function' as const,
          function: {
            name: tool.function.name,
            description: tool.function.description,
            parameters: tool.function.parameters
          }
        }));
        
        // Make the initial API call with tools
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are Mumu, a friendly coding tutor for teenagers. You assist with coding lessons."
            },
            ...chatHistory,
            { role: "user", content: message }
          ],
          tools: openaiTools
        });
        
        const responseMessage = completion.choices[0].message;
        
        // Check if the model wants to call a function
        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
          const toolCall = responseMessage.tool_calls[0];
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          
          // Execute the function if it exists in our toolsMap
          if (Object.prototype.hasOwnProperty.call(toolsMap, functionName)) {
            try {
              // Cast toolsMap to any for type safety
              const functionToCall = (toolsMap as any)[functionName];
              const functionResult = await functionToCall(functionArgs);
              
              // Make a follow-up call with the function result
              const secondCompletion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                  {
                    role: "system",
                    content: "You are Mumu, a friendly coding tutor for teenagers. You assist with coding lessons."
                  },
                  ...chatHistory,
                  { role: "user", content: message },
                  responseMessage,
                  {
                    role: "tool",
                    tool_call_id: toolCall.id,
                    name: functionName,
                    content: JSON.stringify(functionResult)
                  }
                ]
              });
              
              response = secondCompletion.choices[0].message.content || "I'm not sure how to respond to that.";
            } catch (error: any) {
              console.error(`Error executing function ${functionName}:`, error);
              response = `I tried to help with that, but encountered an error: ${error.message}`;
            }
          } else {
            response = `I wanted to use the ${functionName} tool, but it's not available.`;
          }
        } else {
          // If no function call was made, use the original response
          response = responseMessage.content || "I'm not sure how to respond to that.";
        }
      }
      // Default chat response for general inquiries
      else {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are Mumu, a friendly coding tutor for teenagers. You're enthusiastic, encouraging, and patient. You explain programming concepts in simple, accessible ways with relevant examples. Your goal is to make learning to code fun and engaging."
            },
            ...chatHistory,
            { role: "user", content: message }
          ],
        });
        
        response = completion.choices[0].message.content || "I'm not sure how to respond to that.";
      }
      
      // Store the message from the user
      await storage.createMessage({
        chatId,
        role: 'user',
        content: message
      });
      
      // Store the response from the assistant
      await storage.createMessage({
        chatId,
        role: 'assistant',
        content: response
      });
      
      return response;
    } catch (error: any) {
      console.error('Error generating response:', error);
      return `I'm having trouble responding right now. Error: ${error.message}`;
    }
  }

  private isSlideEditRequest(message: string): boolean {
    const editPatterns = [
      /edit slide/i,
      /update slide/i,
      /change slide/i,
      /modify slide/i,
      /improve slide/i
    ];
    return editPatterns.some(pattern => pattern.test(message));
  }

  private isNewLessonRequest(message: string): boolean {
    const createPatterns = [
      /create (a|new) lesson/i,
      /make (a|new) lesson/i,
      /generate (a|new) lesson/i,
      /teach me (about|how to)/i,
      /create (a|an) tutorial/i,
      /build (a|an) lesson/i
    ];
    return createPatterns.some(pattern => pattern.test(message));
  }

  private extractTopicFromMessage(message: string): string {
    const topicPatterns = [
      /about\s+([^,\.]+)/i,
      /on\s+([^,\.]+)/i,
      /for\s+([^,\.]+)/i,
      /covering\s+([^,\.]+)/i,
      /teach me\s+([^,\.]+)/i
    ];
    
    for (const pattern of topicPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    // Default to a generic topic if no specific one is found
    return "programming basics";
  }

  private extractDifficultyFromMessage(message: string): string {
    if (/beginner/i.test(message) || /basic/i.test(message) || /simple/i.test(message)) {
      return "beginner";
    } else if (/intermediate/i.test(message) || /medium/i.test(message)) {
      return "intermediate";
    } else if (/advanced/i.test(message) || /expert/i.test(message) || /difficult/i.test(message)) {
      return "advanced";
    }
    
    // Default to beginner if no difficulty specified
    return "beginner";
  }

  private async handleSlideEditRequest(message: string, lessonId: number): Promise<string> {
    try {
      // Get the slides for this lesson
      const slides = await storage.getSlidesByLessonId(lessonId);
      if (!slides || slides.length === 0) {
        return "I couldn't find any slides for this lesson.";
      }
      
      // For simplicity, assume the edit request is for the current slide (first slide)
      // In a real application, you would parse the message to determine which slide to edit
      const slideToEdit = slides[0];
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert in creating educational content for coding lessons. 
            You need to update a slide based on a user request.
            The current slide title is: "${slideToEdit.title}"
            The current slide content is: "${slideToEdit.content}"
            
            Generate improved title and content based on the user's request.`
          },
          {
            role: "user",
            content: message
          }
        ],
        response_format: { type: "json_object" }
      });
      
      const responseContent = completion.choices[0].message.content || "{}";
      const updatedSlide = JSON.parse(responseContent);
      
      // Update the slide
      await storage.updateSlide(slideToEdit.id, {
        title: updatedSlide.title || slideToEdit.title,
        content: updatedSlide.content || slideToEdit.content
      });
      
      return `I've updated the slide "${updatedSlide.title || slideToEdit.title}" based on your request.`;
    } catch (error: any) {
      console.error('Error handling slide edit request:', error);
      return `I couldn't update the slide. Error: ${error.message}`;
    }
  }

  private detectLanguageFromTopic(topic: string): string {
    // Detect programming language mentioned in the topic
    if (/javascript/i.test(topic) || /js/i.test(topic)) {
      return "JavaScript";
    } else if (/python/i.test(topic)) {
      return "Python";
    } else if (/html/i.test(topic)) {
      return "HTML";
    } else if (/css/i.test(topic)) {
      return "CSS";
    }
    return "JavaScript"; // Default
  }

  private generateTitle(topic: string, difficulty: string): string {
    // This is a placeholder - in a real implementation, you would generate a more
    // engaging title based on the topic and difficulty
    return `Learning ${this.capitalizeFirstLetter(topic)} - ${this.capitalizeFirstLetter(difficulty)} Level`;
  }

  private generateSlidesForTopic(topic: string, language: string, difficulty: string): any[] {
    // This is a placeholder - in a real implementation, you would use OpenAI to generate
    // a complete set of slides based on the topic, language, and difficulty
    return [
      {
        title: "Introduction",
        content: this.generateIntroContent(topic, language),
        type: "info",
        tags: ["introduction", topic.toLowerCase()],
      },
      {
        title: "Core Concepts",
        content: this.generateConceptsContent(topic, language),
        type: "info",
        tags: ["concepts", topic.toLowerCase()],
      },
      {
        title: "Coding Challenge",
        content: this.generateChallengeContent(topic, language),
        type: "challenge",
        tags: ["challenge", topic.toLowerCase()],
        initialCode: this.generateInitialCode(topic, language),
        filename: this.getFilenameForLanguage(language),
        tests: this.generateTests(topic, language),
      },
      {
        title: "Knowledge Check",
        content: this.generateQuizContent(topic, language),
        type: "quiz",
        tags: ["quiz", topic.toLowerCase()],
      }
    ];
  }

  private capitalizeFirstLetter(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  private generateIntroContent(topic: string, language: string): string {
    // This is a placeholder - in a real implementation, you would use OpenAI to generate
    // engaging intro content
    return `# Introduction to ${topic}\n\n${this.getDefinitionForTopic(topic)}`;
  }

  private generateConceptsContent(topic: string, language: string): string {
    // This is a placeholder - in a real implementation, you would use OpenAI to generate
    // detailed concept explanations
    return `# Core Concepts of ${topic}\n\n${this.getUsageForTopic(topic)}\n\n## Best Practices\n\n${this.getBestPracticesForTopic(topic)}\n\n\`\`\`${language.toLowerCase()}\n${this.getExampleCodeForTopic(topic, language)}\n\`\`\``;
  }

  private generateChallengeContent(topic: string, language: string): string {
    // This is a placeholder - in a real implementation, you would use OpenAI to generate
    // challenging but accessible coding exercises
    return `# Practice ${topic}\n\n${this.getChallengeDescriptionForTopic(topic, language)}\n\n## Hint\n\n${this.getHintForTopic(topic, language)}`;
  }

  private generateQuizContent(topic: string, language: string): string {
    // This is a placeholder - in a real implementation, you would use OpenAI to generate
    // quiz questions that reinforce learning
    return `# Test Your Knowledge\n\n## Which of the following is true about ${topic}?\n\n- A. ${this.getQuizAnswerForTopic(topic, "A")}\n- B. ${this.getQuizAnswerForTopic(topic, "B")}\n- C. ${this.getQuizAnswerForTopic(topic, "C")}\n- D. ${this.getQuizAnswerForTopic(topic, "D")}`;
  }

  private getDefinitionForTopic(topic: string): string {
    return `This is a definition of ${topic} that would be generated by OpenAI in a real implementation.`;
  }

  private getUsageForTopic(topic: string): string {
    return `Here's how you typically use ${topic} in real-world programming scenarios.`;
  }

  private getBestPracticesForTopic(topic: string): string {
    return `When working with ${topic}, it's important to follow these best practices...`;
  }

  private getExampleCodeForTopic(topic: string, language: string): string {
    if (language.toLowerCase() === "javascript") {
      return `// Example JavaScript code for ${topic}\nfunction example() {\n  console.log("This is a ${topic} example");\n}`;
    } else if (language.toLowerCase() === "python") {
      return `# Example Python code for ${topic}\ndef example():\n    print("This is a ${topic} example")`;
    }
    return `// Example code for ${topic}`;
  }

  private getChallengeDescriptionForTopic(topic: string, language: string): string {
    return `Your task is to implement a function that demonstrates your understanding of ${topic}.`;
  }

  private getHintForTopic(topic: string, language: string): string {
    return `Think about how ${topic} works and what operations you can perform with it.`;
  }

  private getQuizAnswerForTopic(topic: string, option: string): string {
    if (option === "A") {
      return `An accurate statement about ${topic}`;
    } else if (option === "B") {
      return `A common misconception about ${topic}`;
    } else if (option === "C") {
      return `Another accurate statement about ${topic}`;
    } else {
      return `A completely incorrect statement about ${topic}`;
    }
  }

  private generateInitialCode(topic: string, language: string): string {
    if (language.toLowerCase() === "javascript") {
      return `// Write your ${topic} code here\nfunction challenge() {\n  // Your code here\n}\n`;
    } else if (language.toLowerCase() === "python") {
      return `# Write your ${topic} code here\ndef challenge():\n    # Your code here\n    pass\n`;
    }
    return `// Write your ${topic} code here`;
  }

  private getFilenameForLanguage(language: string): string {
    if (language.toLowerCase() === "javascript") {
      return "script.js";
    } else if (language.toLowerCase() === "python") {
      return "script.py";
    } else if (language.toLowerCase() === "html") {
      return "index.html";
    } else if (language.toLowerCase() === "css") {
      return "styles.css";
    }
    return "code.txt";
  }

  private generateTests(topic: string, language: string): Array<{id: string; name: string; description: string; validation: string; type: 'regex' | 'js'}> {
    if (language.toLowerCase() === "javascript") {
      return [
        {
          id: uuidv4(),
          name: "Function exists",
          description: "Checks if the challenge function exists",
          validation: "function\\s+challenge\\s*\\(\\)",
          type: "regex"
        },
        {
          id: uuidv4(),
          name: "Basic functionality",
          description: "Checks if the function performs the basic task",
          validation: "// This would be real validation logic in a production system",
          type: "js"
        }
      ];
    } else if (language.toLowerCase() === "python") {
      return [
        {
          id: uuidv4(),
          name: "Function exists",
          description: "Checks if the challenge function exists",
          validation: "def\\s+challenge\\s*\\(\\)",
          type: "regex"
        },
        {
          id: uuidv4(),
          name: "Basic functionality",
          description: "Checks if the function performs the basic task",
          validation: "# This would be real validation logic in a production system",
          type: "js"
        }
      ];
    }
    
    return [
      {
        id: uuidv4(),
        name: "Basic test",
        description: "Checks if the code meets basic requirements",
        validation: "// This would be real validation logic in a production system",
        type: "js"
      }
    ];
  }
}

export const restackOpenAIService = new RestackOpenAIService();