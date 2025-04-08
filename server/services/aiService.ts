/**
 * AI Service for generating lesson content and chat responses
 * Using OpenAI API with tools functionality
 */
import { v4 as uuidv4 } from 'uuid';
import { generateLesson, generateToolResponse, generateChatResponse } from './openai';
import { tools, toolsMap } from './tools';
import { storage } from '../storage';

interface GeneratedLesson {
  title: string;
  description: string;
  language: string;
  estimatedTime?: string;
  slides: Array<{
    title: string;
    content: string;
    type: 'info' | 'challenge' | 'quiz';
    tags: string[];
    initialCode?: string;
    filename?: string;
    tests?: Array<{
      id: string;
      name: string;
      description: string;
      validation: string;
      type: 'regex' | 'js';
    }>;
  }>;
}

class AIService {
  // Set to track processed message IDs to prevent duplicate notifications
  private processedMessages: Set<string> = new Set();

  async generateLesson(
    topic: string,
    difficulty: string = 'beginner',
    description?: string
  ) {
    try {
      // Generate lesson content using OpenAI
      const generatedContent = await generateLesson(topic, difficulty, description) as GeneratedLesson;
      
      // Create the lesson in storage
      const lesson = await storage.createLesson({
        title: generatedContent.title,
        description: generatedContent.description,
        difficulty: difficulty as 'beginner' | 'intermediate' | 'advanced',
        language: generatedContent.language,
        estimatedTime: generatedContent.estimatedTime
      });
      
      // Create slides for the lesson
      const slidePromises = generatedContent.slides.map((slide, index) => {
        return storage.createSlide({
          lessonId: lesson.id,
          title: slide.title,
          content: slide.content,
          type: slide.type,
          order: index,
          tags: slide.tags,
          initialCode: slide.initialCode,
          filename: slide.filename,
          tests: slide.tests
        });
      });
      
      await Promise.all(slidePromises);
      
      // Return the created lesson with its ID
      return {
        ...lesson,
        slides: await storage.getSlidesByLessonId(lesson.id)
      };
    } catch (error: any) {
      console.error('Error generating lesson:', error);
      throw new Error(`Failed to generate lesson: ${error.message}`);
    }
  }

  async generateResponse(
    message: string,
    chatId: number,
    lessonId?: number
  ) {
    try {
      // Check if this message has already been processed
      const messageId = `${chatId}-${message}`;
      if (this.processedMessages.has(messageId)) {
        return "This message has already been processed.";
      }
      
      // Mark the message as processed
      this.processedMessages.add(messageId);
      
      // Get the chat history
      const chat = await storage.getChat(chatId);
      if (!chat) {
        throw new Error(`Chat with ID ${chatId} not found`);
      }
      
      // Get messages for this chat
      const messages = await storage.getMessagesByChatId(chatId);
      
      // Convert messages to the format expected by OpenAI
      const chatHistory = messages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }));
      
      let response;
      
      // Check if this is a request to create a new lesson
      if (this.isNewLessonRequest(message)) {
        const topic = this.extractTopicFromMessage(message);
        const difficulty = this.extractDifficultyFromMessage(message);
        
        try {
          // Generate a new lesson
          const lesson = await this.generateLesson(topic, difficulty);
          
          // Format response with lesson details and ID for redirect
          response = JSON.stringify({
            type: 'new_lesson',
            lessonId: lesson.id,
            lessonTitle: lesson.title
          });
        } catch (error: any) {
          console.error('Error creating new lesson:', error);
          response = `I'm sorry, I couldn't create a lesson about ${topic}. Error: ${error.message}`;
        }
      }
      // Check if this is a request to edit a slide
      else if (lessonId && this.isSlideEditRequest(message)) {
        response = await this.handleSlideEditRequest(message, lessonId);
      }
      // Use tools for other responses when in a lesson context
      else if (lessonId) {
        response = await generateToolResponse(
          [...chatHistory, { role: 'user', content: message }],
          tools,
          toolsMap
        );
      }
      // Default chat response
      else {
        response = await generateChatResponse(message, chatHistory, lessonId);
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
      
      // Generate updates based on the message
      const updatedTitle = this.generateUpdatedTitleFromMessage(message, slideToEdit.title);
      const updatedContent = this.generateUpdatedContentFromMessage(message, slideToEdit.content);
      
      // Update the slide
      await storage.updateSlide(slideToEdit.id, {
        title: updatedTitle,
        content: updatedContent
      });
      
      return `I've updated the slide "${updatedTitle}" based on your request.`;
    } catch (error: any) {
      console.error('Error handling slide edit request:', error);
      return `I couldn't update the slide. Error: ${error.message}`;
    }
  }

  private generateUpdatedContentFromMessage(message: string, currentContent: string): string {
    // This is a placeholder - in a real implementation, you would use OpenAI to generate
    // updated content based on the message and current content
    return currentContent + "\n\n*Updated based on user request*";
  }

  private generateUpdatedTitleFromMessage(message: string, currentTitle: string): string {
    // This is a placeholder - in a real implementation, you would use OpenAI to generate
    // an updated title based on the message and current title
    return currentTitle;
  }

  private determineSlideType(message: string): 'info' | 'challenge' | 'quiz' {
    if (/challenge/i.test(message) || /exercise/i.test(message) || /practice/i.test(message)) {
      return 'challenge';
    } else if (/quiz/i.test(message) || /question/i.test(message) || /test/i.test(message)) {
      return 'quiz';
    }
    return 'info';
  }

  private generateSlideTitleFromMessage(message: string): string {
    // This is a placeholder - in a real implementation, you would use OpenAI to generate
    // a title based on the message
    return "New Slide";
  }

  private generateSlideContentFromMessage(message: string, type: 'info' | 'challenge' | 'quiz'): string {
    // This is a placeholder - in a real implementation, you would use OpenAI to generate
    // content based on the message and slide type
    return "This is the content of the new slide.";
  }

  private generateDetailedContent(topic: string, type: 'info' | 'challenge' | 'quiz'): string {
    // This is a placeholder - in a real implementation, you would use OpenAI to generate
    // detailed content based on the topic and slide type
    return "Detailed content would be generated here.";
  }

  private determineTagsFromMessage(message: string): string[] {
    // This is a placeholder - in a real implementation, you would use OpenAI to generate
    // appropriate tags based on the message
    return ["sample", "tag"];
  }

  private generateInitialCodeFromMessage(message: string): string | undefined {
    // This is a placeholder - in a real implementation, you would use OpenAI to generate
    // initial code for challenge slides
    if (/challenge/i.test(message) || /exercise/i.test(message)) {
      return "// Initial code for the challenge";
    }
    return undefined;
  }

  private generateTestsFromMessage(message: string): Array<{id: string; name: string; description: string; validation: string; type: 'regex' | 'js'}> | undefined {
    // This is a placeholder - in a real implementation, you would use OpenAI to generate
    // tests for challenge slides
    if (/challenge/i.test(message) || /exercise/i.test(message)) {
      return [
        {
          id: uuidv4(),
          name: "Test 1",
          description: "Basic test",
          validation: "function exists",
          type: 'regex'
        }
      ];
    }
    return undefined;
  }

  private detectLanguageFromTopic(topic: string): string {
    // This is a placeholder - in a real implementation, you would extract the programming language
    // from the topic if mentioned
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

export const aiService = new AIService();