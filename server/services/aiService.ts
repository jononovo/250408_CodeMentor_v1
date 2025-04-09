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
    format: string = 'html',
    style: string = '',
    description?: string
  ) {
    try {
      // Generate lesson content using OpenAI
      const generatedContent = await generateLesson(topic, difficulty, format, description, style) as GeneratedLesson;
      
      // Generate CSS for the chosen style
      const { cssContent, jsContent } = this.generateStyleTemplateForLesson(style, topic);
      
      // Create the lesson in storage
      const lesson = await storage.createLesson({
        title: generatedContent.title,
        description: generatedContent.description,
        difficulty: difficulty as 'beginner' | 'intermediate' | 'advanced',
        language: generatedContent.language,
        estimatedTime: generatedContent.estimatedTime,
        format: format,
        styleName: style || 'brown-markdown', // Default to Brown Markdown if no style is specified
        cssContent,
        jsContent
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
        
        // Check if this is a response to a lesson creation proposal
        if (/yes, that looks good/i.test(message)) {
          // This is a confirmation of a previous lesson proposal
          const previousMessages = await storage.getMessagesByChatId(chatId);
          let lastMessage = previousMessages.filter(m => m.role === 'assistant').pop();
          
          if (lastMessage && lastMessage.content.includes('choose a style for your lesson')) {
            // The user has selected a style choice in a previous interaction
            // Extract the style from the user message
            const style = this.extractStyleFromMessage(message) || "brown-markdown";
            
            try {
              // Get the topic and difficulty from the previous context
              let contextTopic = topic;
              let contextDifficulty = difficulty;
              
              // Loop through previous messages to find the proposed lesson details
              for (const msg of previousMessages.reverse()) {
                if (msg.role === 'assistant' && msg.content.includes('Lesson:')) {
                  const proposalMatch = msg.content.match(/Topic:\s*(.*?)\s*\n/i);
                  const difficultyMatch = msg.content.match(/Level:\s*(.*?)\s*(\n|$)/i);
                  
                  if (proposalMatch && proposalMatch[1]) {
                    contextTopic = proposalMatch[1].trim();
                  }
                  
                  if (difficultyMatch && difficultyMatch[1]) {
                    const diffText = difficultyMatch[1].toLowerCase().trim();
                    if (diffText.includes('beginner')) {
                      contextDifficulty = 'beginner';
                    } else if (diffText.includes('intermediate')) {
                      contextDifficulty = 'intermediate';
                    } else if (diffText.includes('advanced')) {
                      contextDifficulty = 'advanced';
                    }
                  }
                  
                  break;
                }
              }
              
              // Generate a new lesson in HTML format with the selected style
              const lesson = await this.generateLesson(contextTopic, contextDifficulty, 'html', style);
              
              // Format response with lesson details and ID for redirect
              // Using the format expected by ChatPanel: __LESSON_CREATED__:lessonId:lessonTitle
              response = `I've created your lesson about ${contextTopic} using the ${this.getStyleDisplayName(style)} style. It's ready for you to explore!\n\n__LESSON_CREATED__:${lesson.id}:${lesson.title}`;
            } catch (error: any) {
              console.error('Error creating new lesson:', error);
              response = `I'm sorry, I couldn't create the lesson. Error: ${error.message}`;
            }
          } else {
            // This is a confirmation of a lesson proposal, now ask for style preference
            response = this.generateStyleSelectionPrompt(topic, difficulty);
          }
        } else if (/i'd like to change it to/i.test(message)) {
          // The user wants to modify the lesson proposal
          // For simplicity, just present a new lesson proposal
          const updatedTopic = this.extractTopicFromMessage(message) || topic;
          const updatedDifficulty = this.extractDifficultyFromMessage(message) || difficulty;
          
          response = this.generateLessonProposal(updatedTopic, updatedDifficulty);
        } else if (/brown[-\s]?markdown|neon[-\s]?racer|interaction[-\s]?galore|practical[-\s]?project/i.test(message) || /you decide/i.test(message)) {
          // The user is selecting a style from the options
          let style = this.extractStyleFromMessage(message);
          
          // If "you decide" was selected, randomly choose a style
          if (/you decide/i.test(message)) {
            const styles = ["brown-markdown", "neon-racer", "interaction-galore", "practical-project"];
            style = styles[Math.floor(Math.random() * styles.length)];
          }
          
          try {
            // Extract the topic and difficulty from previous context
            let contextTopic = topic;
            let contextDifficulty = difficulty;
            
            // Get previous messages to find context
            const previousMessages = await storage.getMessagesByChatId(chatId);
            
            // Loop through previous messages to find the proposed lesson details
            for (const msg of previousMessages.reverse()) {
              if (msg.role === 'assistant' && msg.content.includes('Lesson:')) {
                const proposalMatch = msg.content.match(/Topic:\s*(.*?)\s*\n/i);
                const difficultyMatch = msg.content.match(/Level:\s*(.*?)\s*(\n|$)/i);
                
                if (proposalMatch && proposalMatch[1]) {
                  contextTopic = proposalMatch[1].trim();
                }
                
                if (difficultyMatch && difficultyMatch[1]) {
                  const diffText = difficultyMatch[1].toLowerCase().trim();
                  if (diffText.includes('beginner')) {
                    contextDifficulty = 'beginner';
                  } else if (diffText.includes('intermediate')) {
                    contextDifficulty = 'intermediate';
                  } else if (diffText.includes('advanced')) {
                    contextDifficulty = 'advanced';
                  }
                }
                
                break;
              }
            }
            
            // Generate a new lesson in HTML format with the selected style
            const lesson = await this.generateLesson(contextTopic, contextDifficulty, 'html', style);
            
            // Format response with lesson details and ID for redirect
            // Using the format expected by ChatPanel: __LESSON_CREATED__:lessonId:lessonTitle
            response = `I've created your lesson about ${contextTopic} using the ${this.getStyleDisplayName(style)} style. It's ready for you to explore!\n\n__LESSON_CREATED__:${lesson.id}:${lesson.title}`;
          } catch (error: any) {
            console.error('Error creating new lesson:', error);
            response = `I'm sorry, I couldn't create the lesson. Error: ${error.message}`;
          }
        } else {
          // This is a new lesson request, present a proposal
          response = this.generateLessonProposal(topic, difficulty);
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
      /build (a|an) lesson/i,
      /i want to create a lesson/i,
      /i'd like a lesson/i,
      /can you make a lesson/i
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

  /**
   * Generate a styled lesson proposal with details about the lesson
   */
  private generateLessonProposal(topic: string, difficulty: string): string {
    const language = this.detectLanguageFromTopic(topic);
    const title = this.generateTitle(topic, difficulty);
    
    // Generate an estimated time based on difficulty
    let estimatedTime = '15-20 minutes';
    if (difficulty === 'intermediate') {
      estimatedTime = '25-35 minutes';
    } else if (difficulty === 'advanced') {
      estimatedTime = '40-60 minutes';
    }
    
    // Format the response with styled markdown
    return `
I'd be happy to create a lesson for you! Here's what I'm thinking:

### 📋 Lesson Proposal:

**Lesson:** ${title}
**Topic:** ${topic}
**Description:** An interactive ${difficulty} level lesson about ${topic} using ${language}. You'll learn key concepts, see practical examples, and complete coding challenges.
**Duration:** ${estimatedTime}
**Level:** ${this.capitalizeFirstLetter(difficulty)}
**Language:** ${language}

**What you'll learn:**
- Core concepts of ${topic}
- How to use ${topic} in real-world scenarios
- Best practices and common pitfalls
- Hands-on coding experience

Does this look good to you?

__SUGGESTION__:Yes, that looks good.
__SUGGESTION__:I'd like to change it to
`;
  }
  
  /**
   * Generate a prompt for selecting lesson style with visual options
   */
  private generateStyleSelectionPrompt(topic: string, difficulty: string): string {
    return `
Got it! Now finally, what style of lesson would you prefer today?

__SUGGESTION__:Brown Markdown 🏖️ - A relaxed, earthy style with tan/beige/brown colors.
__SUGGESTION__:Neon Racer 🏎️ - A vibrant, high-energy style with neon colors and animations.
__SUGGESTION__:Interaction Galore 💃🏽 - A style focused on interactivity with lots of clickable elements.
__SUGGESTION__:Practical Project Building 🚀 - A progressive style that builds concepts step by step.
__SUGGESTION__:You decide!
`;
  }
  
  /**
   * Get a display name for style with emoji
   */
  private getStyleDisplayName(style: string): string {
    switch(style) {
      case 'brown-markdown':
        return 'Brown Markdown 🏖️';
      case 'neon-racer':
        return 'Neon Racer 🏎️';
      case 'interaction-galore':
        return 'Interaction Galore 💃🏽';
      case 'practical-project':
        return 'Practical Project Building 🚀';
      default:
        return 'Default Style';
    }
  }
  
  private extractStyleFromMessage(message: string): string {
    // Extract the style from the user message
    if (/brown[-\s]?markdown/i.test(message) || /earthy/i.test(message) || /relaxed/i.test(message)) {
      return "brown-markdown";
    } else if (/neon[-\s]?racer/i.test(message) || /vibrant/i.test(message) || /energetic/i.test(message)) {
      return "neon-racer";
    } else if (/interaction[-\s]?galore/i.test(message) || /interactive/i.test(message) || /clickable/i.test(message)) {
      return "interaction-galore";
    } else if (/practical[-\s]?project/i.test(message) || /project[-\s]?building/i.test(message) || /progressive/i.test(message)) {
      return "practical-project";
    }
    
    // Default to Brown Markdown if no style is specified
    return "brown-markdown";
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
        initialCode: "// Starter code for challenge would go here",
        filename: `challenge.${language.toLowerCase() === 'javascript' ? 'js' : language.toLowerCase() === 'python' ? 'py' : 'txt'}`,
        tests: [{
          id: uuidv4(),
          name: "Example Test",
          description: "Basic functionality test",
          validation: "// Test validation code",
          type: 'js'
        }],
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
      return `A related but incorrect statement about ${topic}`;
    } else if (option === "C") {
      return `A common misconception about ${topic}`;
    } else {
      return `A completely unrelated statement about programming`;
    }
  }

  /**
   * Generate the appropriate CSS and JS content based on the selected style template
   */
  private generateStyleTemplateForLesson(style: string, topic: string): { cssContent: string, jsContent: string } {
    switch(style) {
      case 'brown-markdown':
        return this.generateBrownMarkdownStyle(topic);
      case 'neon-racer':
        return this.generateNeonRacerStyle(topic);
      case 'interaction-galore':
        return this.generateInteractionGaloreStyle(topic);
      case 'practical-project':
        return this.generatePracticalProjectStyle(topic);
      default:
        // Default to Brown Markdown if no style is provided or recognized
        return this.generateBrownMarkdownStyle(topic);
    }
  }

  /**
   * Brown Markdown 🏖️: A relaxed, earthy style with tan/beige/brown colors
   */
  private generateBrownMarkdownStyle(topic: string): { cssContent: string, jsContent: string } {
    return {
      cssContent: `
        /* Brown Markdown Style - Relaxed, earthy theme */
        :root {
          --primary-color: #8B4513;
          --secondary-color: #A0522D;
          --background-color: #F5F5DC;
          --text-color: #3E2723;
          --accent-color: #D2B48C;
          --highlight-color: #CD853F;
          --code-bg: #F0E6D2;
          --info-bg: #E6D9B8;
          --warning-bg: #F8D7DA;
        }

        body, html {
          font-family: 'Georgia', serif;
          color: var(--text-color);
          background-color: var(--background-color);
          line-height: 1.6;
        }

        h1, h2, h3, h4, h5 {
          font-family: 'Bookman', serif;
          color: var(--primary-color);
          margin-bottom: 1rem;
          border-bottom: 1px solid var(--accent-color);
          padding-bottom: 0.5rem;
        }

        code {
          font-family: 'Courier New', monospace;
          background-color: var(--code-bg);
          padding: 0.2rem 0.4rem;
          border-radius: 3px;
          font-size: 0.9em;
        }

        pre {
          background-color: var(--code-bg);
          padding: 1rem;
          border-radius: 5px;
          border-left: 4px solid var(--primary-color);
          overflow-x: auto;
        }

        blockquote {
          border-left: 4px solid var(--accent-color);
          padding-left: 1rem;
          margin-left: 0;
          color: var(--secondary-color);
          font-style: italic;
        }

        /* Special elements */
        .info-box {
          background-color: var(--info-bg);
          border-left: 4px solid var(--primary-color);
          padding: 1rem;
          margin: 1rem 0;
          border-radius: 5px;
        }

        .warning-box {
          background-color: var(--warning-bg);
          border-left: 4px solid #DC3545;
          padding: 1rem;
          margin: 1rem 0;
          border-radius: 5px;
        }

        .hint-box {
          background-color: var(--accent-color);
          border-left: 4px solid var(--highlight-color);
          padding: 1rem;
          margin: 1rem 0;
          border-radius: 5px;
          position: relative;
        }

        /* Challenge and Quiz styling */
        .challenge-container, .quiz-container {
          background-color: var(--info-bg);
          border: 1px solid var(--accent-color);
          border-radius: 8px;
          padding: 1.5rem;
          margin: 2rem 0;
          box-shadow: 0 4px 8px rgba(62, 39, 35, 0.1);
        }

        /* Buttons */
        button {
          background-color: var(--primary-color);
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 5px;
          cursor: pointer;
          font-family: inherit;
          transition: background-color 0.3s;
        }

        button:hover {
          background-color: var(--highlight-color);
        }

        /* Links */
        a {
          color: var(--secondary-color);
          text-decoration: none;
          border-bottom: 1px dashed var(--secondary-color);
        }

        a:hover {
          color: var(--primary-color);
          border-bottom: 1px solid var(--primary-color);
        }
      `,
      jsContent: `
        // Brown Markdown Style - Helper JavaScript functions
        document.addEventListener('DOMContentLoaded', function() {
          // Set up any collapsible sections
          const collapsibles = document.querySelectorAll('.collapsible');
          collapsibles.forEach(collapsible => {
            const header = collapsible.querySelector('.collapsible-header');
            const content = collapsible.querySelector('.collapsible-content');
            
            if (header && content) {
              content.style.display = 'none';
              header.addEventListener('click', () => {
                if (content.style.display === 'none') {
                  content.style.display = 'block';
                  header.classList.add('open');
                } else {
                  content.style.display = 'none';
                  header.classList.remove('open');
                }
              });
            }
          });
        });
      `
    };
  }

  /**
   * Neon Racer 🏎️: A vibrant, high-energy style with neon colors and animations
   */
  private generateNeonRacerStyle(topic: string): { cssContent: string, jsContent: string } {
    return {
      cssContent: `
        /* Neon Racer Style - Vibrant, high-energy theme */
        :root {
          --primary-color: #FF00FF;
          --secondary-color: #00FFFF;
          --background-color: #0F0F1A;
          --text-color: #F0F0F0;
          --accent-color: #FF00AA;
          --highlight-color: #00FF00;
          --code-bg: #1A1A2E;
          --info-bg: #1E1E3A;
          --warning-bg: #3A1E1E;
        }

        @keyframes neon-glow {
          0% { text-shadow: 0 0 5px var(--primary-color), 0 0 10px var(--primary-color); }
          50% { text-shadow: 0 0 10px var(--primary-color), 0 0 20px var(--primary-color), 0 0 30px var(--primary-color); }
          100% { text-shadow: 0 0 5px var(--primary-color), 0 0 10px var(--primary-color); }
        }

        @keyframes border-pulse {
          0% { border-color: var(--primary-color); }
          50% { border-color: var(--secondary-color); }
          100% { border-color: var(--primary-color); }
        }

        body, html {
          font-family: 'Orbitron', 'Tahoma', sans-serif;
          color: var(--text-color);
          background-color: var(--background-color);
          line-height: 1.6;
          background-image: 
            linear-gradient(rgba(15, 15, 26, 0.8), rgba(15, 15, 26, 0.8)),
            repeating-linear-gradient(90deg, rgba(255, 0, 255, 0.05) 0px, rgba(255, 0, 255, 0.05) 1px, transparent 1px, transparent 50px),
            repeating-linear-gradient(0deg, rgba(0, 255, 255, 0.05) 0px, rgba(0, 255, 255, 0.05) 1px, transparent 1px, transparent 50px);
        }

        h1, h2, h3, h4, h5 {
          font-family: 'Orbitron', 'Impact', sans-serif;
          color: var(--primary-color);
          animation: neon-glow 2s ease-in-out infinite;
          margin-bottom: 1.5rem;
          position: relative;
          display: inline-block;
        }

        h1::after, h2::after {
          content: '';
          position: absolute;
          bottom: -10px;
          left: 0;
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, var(--primary-color), var(--secondary-color), var(--primary-color));
          animation: border-pulse 2s infinite;
        }

        code {
          font-family: 'Courier New', monospace;
          background-color: var(--code-bg);
          color: var(--highlight-color);
          padding: 0.2rem 0.4rem;
          border-radius: 3px;
          font-size: 0.9em;
          border: 1px solid var(--secondary-color);
        }

        pre {
          background-color: var(--code-bg);
          padding: 1rem;
          border-radius: 5px;
          border: 1px solid var(--secondary-color);
          overflow-x: auto;
          position: relative;
        }

        pre::before {
          content: 'CODE';
          position: absolute;
          top: -10px;
          right: 10px;
          background-color: var(--background-color);
          color: var(--secondary-color);
          padding: 0 8px;
          font-size: 0.8em;
          border-radius: 10px;
          border: 1px solid var(--secondary-color);
        }

        /* Special elements */
        .info-box {
          background-color: var(--info-bg);
          border: 1px solid var(--secondary-color);
          box-shadow: 0 0 10px var(--secondary-color);
          padding: 1rem;
          margin: 1rem 0;
          border-radius: 5px;
        }

        .warning-box {
          background-color: var(--warning-bg);
          border: 1px solid var(--accent-color);
          box-shadow: 0 0 10px var(--accent-color);
          padding: 1rem;
          margin: 1rem 0;
          border-radius: 5px;
        }

        /* Buttons */
        button {
          background-color: transparent;
          color: var(--primary-color);
          border: 2px solid var(--primary-color);
          padding: 0.5rem 1.5rem;
          border-radius: 50px;
          cursor: pointer;
          font-family: 'Orbitron', sans-serif;
          text-transform: uppercase;
          letter-spacing: 1px;
          position: relative;
          overflow: hidden;
          z-index: 1;
          transition: color 0.3s;
        }

        button::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 0;
          height: 100%;
          background-color: var(--primary-color);
          z-index: -1;
          transition: width 0.3s;
        }

        button:hover {
          color: var(--background-color);
        }

        button:hover::before {
          width: 100%;
        }

        /* Progress bar */
        .progress-container {
          width: 100%;
          height: 10px;
          background-color: var(--code-bg);
          border-radius: 5px;
          margin: 1rem 0;
          overflow: hidden;
        }

        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
          border-radius: 5px;
          transition: width 0.5s;
        }
      `,
      jsContent: `
        // Neon Racer Style - Helper JavaScript functions
        document.addEventListener('DOMContentLoaded', function() {
          // Add particle background
          const createParticles = () => {
            const container = document.createElement('div');
            container.className = 'particles-container';
            container.style.position = 'fixed';
            container.style.top = '0';
            container.style.left = '0';
            container.style.width = '100%';
            container.style.height = '100%';
            container.style.pointerEvents = 'none';
            container.style.zIndex = '-1';
            document.body.appendChild(container);
            
            for (let i = 0; i < 50; i++) {
              const particle = document.createElement('div');
              particle.className = 'particle';
              particle.style.position = 'absolute';
              particle.style.width = Math.random() * 3 + 1 + 'px';
              particle.style.height = particle.style.width;
              particle.style.backgroundColor = Math.random() > 0.5 ? '#FF00FF' : '#00FFFF';
              particle.style.borderRadius = '50%';
              particle.style.opacity = Math.random() * 0.5 + 0.2;
              
              // Random starting positions
              particle.style.top = Math.random() * 100 + 'vh';
              particle.style.left = Math.random() * 100 + 'vw';
              
              // Add animation
              particle.style.animation = \`float \${Math.random() * 10 + 10}s linear infinite\`;
              particle.style.animationDelay = \`-\${Math.random() * 10}s\`;
              
              container.appendChild(particle);
            }
            
            // Add the float animation
            const style = document.createElement('style');
            style.innerHTML = \`
              @keyframes float {
                0% { transform: translateY(0); }
                100% { transform: translateY(-100vh); }
              }
            \`;
            document.head.appendChild(style);
          };
          
          createParticles();
          
          // Add click effects
          document.addEventListener('click', (e) => {
            const ripple = document.createElement('div');
            ripple.className = 'click-ripple';
            ripple.style.position = 'fixed';
            ripple.style.width = '10px';
            ripple.style.height = '10px';
            ripple.style.borderRadius = '50%';
            ripple.style.background = 'radial-gradient(circle, #FF00FF 0%, transparent 70%)';
            ripple.style.top = e.clientY + 'px';
            ripple.style.left = e.clientX + 'px';
            ripple.style.transform = 'translate(-50%, -50%)';
            ripple.style.animation = 'ripple-effect 1s ease-out forwards';
            
            document.body.appendChild(ripple);
            
            setTimeout(() => {
              ripple.remove();
            }, 1000);
          });
          
          // Add ripple effect animation
          const rippleStyle = document.createElement('style');
          rippleStyle.innerHTML = \`
            @keyframes ripple-effect {
              0% { width: 0px; height: 0px; opacity: 1; }
              100% { width: 100px; height: 100px; opacity: 0; }
            }
          \`;
          document.head.appendChild(rippleStyle);
        });
      `
    };
  }

  /**
   * Interaction Galore 💃🏽: A style focused on interactive elements with plenty of clickable components
   */
  private generateInteractionGaloreStyle(topic: string): { cssContent: string, jsContent: string } {
    return {
      cssContent: `
        /* Interaction Galore Style - Highly interactive theme */
        :root {
          --primary-color: #4285F4;
          --secondary-color: #34A853;
          --tertiary-color: #FBBC05;
          --quaternary-color: #EA4335;
          --background-color: #FFFFFF;
          --panel-bg: #F8F9FA;
          --text-color: #202124;
          --text-secondary: #5F6368;
          --border-color: #DADCE0;
          --shadow-color: rgba(60, 64, 67, 0.15);
        }

        body, html {
          font-family: 'Roboto', 'Segoe UI', sans-serif;
          color: var(--text-color);
          background-color: var(--background-color);
          line-height: 1.6;
        }

        h1, h2, h3, h4, h5 {
          font-family: 'Google Sans', 'Roboto', sans-serif;
          color: var(--primary-color);
          margin-bottom: 1rem;
        }

        /* Interactive Panels */
        .panel {
          background-color: var(--panel-bg);
          border-radius: 8px;
          box-shadow: 0 2px 6px var(--shadow-color);
          padding: 1.5rem;
          margin: 1.5rem 0;
          transition: transform 0.3s, box-shadow 0.3s;
        }

        .panel:hover {
          transform: translateY(-5px);
          box-shadow: 0 4px 12px var(--shadow-color);
        }

        /* Tabs System */
        .tabs-container {
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 1.5rem;
        }

        .tab-buttons {
          display: flex;
          gap: 0.5rem;
          overflow-x: auto;
          padding-bottom: 0.5rem;
        }

        .tab-btn {
          background: none;
          border: none;
          padding: 0.75rem 1.25rem;
          border-radius: 20px;
          cursor: pointer;
          font-weight: 500;
          color: var(--text-secondary);
          position: relative;
          transition: color 0.3s;
        }

        .tab-btn.active {
          color: var(--primary-color);
          background-color: rgba(66, 133, 244, 0.1);
        }

        .tab-content {
          display: none;
          padding: 1rem 0;
        }

        .tab-content.active {
          display: block;
          animation: fadeIn 0.3s;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Accordions */
        .accordion {
          border: 1px solid var(--border-color);
          border-radius: 8px;
          margin-bottom: 1rem;
          overflow: hidden;
        }

        .accordion-header {
          padding: 1rem;
          background-color: var(--panel-bg);
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 500;
        }

        .accordion-content {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease-out;
          background-color: var(--background-color);
          padding: 0 1rem;
        }

        .accordion.open .accordion-content {
          max-height: 500px;
          padding: 1rem;
        }

        .accordion-icon {
          transition: transform 0.3s;
        }

        .accordion.open .accordion-icon {
          transform: rotate(180deg);
        }

        /* Cards */
        .cards-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1rem;
        }

        .card {
          background-color: var(--panel-bg);
          border-radius: 8px;
          border: 1px solid var(--border-color);
          overflow: hidden;
          transition: transform 0.3s, box-shadow 0.3s;
        }

        .card:hover {
          transform: translateY(-5px);
          box-shadow: 0 4px 12px var(--shadow-color);
        }

        .card-header {
          padding: 1rem;
          background-color: var(--primary-color);
          color: white;
          font-weight: 500;
        }

        .card-body {
          padding: 1rem;
        }

        .card-footer {
          padding: 1rem;
          border-top: 1px solid var(--border-color);
          display: flex;
          justify-content: flex-end;
        }

        /* Buttons */
        button {
          background-color: var(--primary-color);
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0.5rem 1rem;
          font-family: inherit;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.3s;
        }

        button:hover {
          background-color: #3367D6;
        }

        button.secondary {
          background-color: transparent;
          color: var(--primary-color);
          border: 1px solid var(--primary-color);
        }

        button.secondary:hover {
          background-color: rgba(66, 133, 244, 0.1);
        }

        /* Toggle Switch */
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 40px;
          height: 20px;
          margin: 0 10px;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: .4s;
          border-radius: 20px;
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 3px;
          bottom: 2px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }

        input:checked + .slider {
          background-color: var(--primary-color);
        }

        input:checked + .slider:before {
          transform: translateX(18px);
        }

        /* Tooltips */
        .tooltip {
          position: relative;
          display: inline-block;
          cursor: help;
        }

        .tooltip .tooltip-text {
          visibility: hidden;
          width: 200px;
          background-color: var(--text-color);
          color: #fff;
          text-align: center;
          border-radius: 6px;
          padding: 8px;
          position: absolute;
          z-index: 1;
          bottom: 125%;
          left: 50%;
          transform: translateX(-50%);
          opacity: 0;
          transition: opacity 0.3s;
        }

        .tooltip:hover .tooltip-text {
          visibility: visible;
          opacity: 1;
        }

        /* Progress Indicators */
        .progress-bar {
          width: 100%;
          height: 8px;
          background-color: #E0E0E0;
          border-radius: 4px;
          overflow: hidden;
          margin: 1rem 0;
        }

        .progress-value {
          height: 100%;
          background-color: var(--primary-color);
          width: 0;
          transition: width 1s ease;
          border-radius: 4px;
        }
      `,
      jsContent: `
        // Interaction Galore Style - Helper JavaScript functions
        document.addEventListener('DOMContentLoaded', function() {
          // Tab system
          const initTabs = () => {
            const tabBtns = document.querySelectorAll('.tab-btn');
            tabBtns.forEach(btn => {
              btn.addEventListener('click', (e) => {
                window.showTab(e, btn.dataset.tab);
              });
            });

            // Initialize first tab
            if (tabBtns.length > 0) {
              const firstBtn = tabBtns[0];
              firstBtn.click();
            }
          };

          // Accordion system
          const initAccordions = () => {
            const accordions = document.querySelectorAll('.accordion');
            accordions.forEach(accordion => {
              const header = accordion.querySelector('.accordion-header');
              header.addEventListener('click', () => {
                accordion.classList.toggle('open');
              });
            });
          };

          // Progress bars
          const initProgressBars = () => {
            const progressBars = document.querySelectorAll('.progress-bar');
            progressBars.forEach(bar => {
              const value = bar.dataset.value || 0;
              const progressValue = bar.querySelector('.progress-value');
              setTimeout(() => {
                progressValue.style.width = \`\${value}%\`;
              }, 500);
            });
          };

          // Initialize interactive elements
          initTabs();
          initAccordions();
          initProgressBars();

          // Custom input elements
          const rangeInputs = document.querySelectorAll('input[type="range"]');
          rangeInputs.forEach(input => {
            const output = document.createElement('output');
            output.for = input.id;
            output.style.marginLeft = '10px';
            output.textContent = input.value;
            
            input.parentNode.insertBefore(output, input.nextSibling);
            
            input.addEventListener('input', () => {
              output.textContent = input.value;
            });
          });

          // Animation for elements as they enter viewport
          const observeElements = () => {
            const observerOptions = {
              root: null,
              rootMargin: '0px',
              threshold: 0.1
            };

            const observer = new IntersectionObserver((entries) => {
              entries.forEach(entry => {
                if (entry.isIntersecting) {
                  entry.target.classList.add('visible');
                  observer.unobserve(entry.target);
                }
              });
            }, observerOptions);

            document.querySelectorAll('.panel, .card, .accordion').forEach(el => {
              el.classList.add('animate-on-scroll');
              observer.observe(el);
            });
          };

          // Add animation classes
          const style = document.createElement('style');
          style.innerHTML = \`
            .animate-on-scroll {
              opacity: 0;
              transform: translateY(20px);
              transition: opacity 0.6s, transform 0.6s;
            }
            .animate-on-scroll.visible {
              opacity: 1;
              transform: translateY(0);
            }
          \`;
          document.head.appendChild(style);

          observeElements();
        });
      `
    };
  }

  /**
   * Practical Project Building 🚀: A style focused on progressive learning with each slide building on the previous
   */
  private generatePracticalProjectStyle(topic: string): { cssContent: string, jsContent: string } {
    return {
      cssContent: `
        /* Practical Project Building Style - Progressive learning theme */
        :root {
          --primary-color: #0070F3;
          --secondary-color: #0366D6;
          --background-color: #FFFFFF;
          --panel-bg: #F6F8FA;
          --success-color: #28A745;
          --warning-color: #FFC107;
          --danger-color: #DC3545;
          --text-color: #24292E;
          --text-secondary: #586069;
          --border-color: #E1E4E8;
          --code-bg: #F6F8FA;
        }

        body, html {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: var(--text-color);
          background-color: var(--background-color);
          line-height: 1.6;
        }

        h1, h2, h3, h4, h5 {
          font-weight: 600;
          margin-bottom: 1rem;
        }

        h1 {
          font-size: 1.75rem;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 0.5rem;
        }

        h2 {
          font-size: 1.5rem;
        }

        /* Project Structure */
        .project-container {
          border: 1px solid var(--border-color);
          border-radius: 6px;
          margin: 1.5rem 0;
          overflow: hidden;
        }

        .project-header {
          background-color: var(--panel-bg);
          padding: 1rem;
          border-bottom: 1px solid var(--border-color);
          font-weight: 600;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .project-content {
          padding: 1rem;
        }

        .files-tree {
          border: 1px solid var(--border-color);
          border-radius: 6px;
          margin-bottom: 1rem;
        }

        .file-item, .folder-item {
          padding: 0.5rem 1rem;
          border-bottom: 1px solid var(--border-color);
          font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
        }

        .file-item:last-child, .folder-item:last-child {
          border-bottom: none;
        }

        .file-item:before, .folder-item:before {
          content: '';
          display: inline-block;
          width: 16px;
          height: 16px;
          margin-right: 0.5rem;
          background-size: contain;
          background-repeat: no-repeat;
        }

        .file-item.selected {
          background-color: #0366D610;
        }

        /* Code Blocks */
        code {
          font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
          background-color: var(--code-bg);
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-size: 0.9em;
          color: var(--secondary-color);
        }

        pre {
          background-color: var(--code-bg);
          padding: 1rem;
          border-radius: 6px;
          border: 1px solid var(--border-color);
          overflow-x: auto;
          margin: 1rem 0;
        }

        pre code {
          background-color: transparent;
          padding: 0;
          font-size: 0.9rem;
          color: var(--text-color);
        }

        /* Step Progression */
        .steps-container {
          display: flex;
          margin: 2rem 0;
          position: relative;
          z-index: 1;
        }

        .steps-container:before {
          content: '';
          position: absolute;
          top: 14px;
          left: 0;
          right: 0;
          height: 2px;
          background-color: var(--border-color);
          z-index: -1;
        }

        .step {
          flex: 1;
          text-align: center;
          position: relative;
        }

        .step-circle {
          width: 30px;
          height: 30px;
          background-color: var(--panel-bg);
          border: 2px solid var(--border-color);
          border-radius: 50%;
          margin: 0 auto 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .step.active .step-circle {
          background-color: var(--primary-color);
          border-color: var(--primary-color);
          color: white;
        }

        .step.completed .step-circle {
          background-color: var(--success-color);
          border-color: var(--success-color);
          color: white;
        }

        .step-label {
          font-size: 0.8rem;
          color: var(--text-secondary);
          max-width: 100px;
          margin: 0 auto;
        }

        .step.active .step-label {
          color: var(--primary-color);
          font-weight: 500;
        }

        /* Buttons */
        button {
          background-color: var(--primary-color);
          color: white;
          border: none;
          border-radius: 6px;
          padding: 0.5rem 1rem;
          font-family: inherit;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        button:hover {
          background-color: var(--secondary-color);
        }

        button.secondary {
          background-color: var(--panel-bg);
          color: var(--text-color);
          border: 1px solid var(--border-color);
        }

        button.secondary:hover {
          background-color: var(--border-color);
        }

        button.success {
          background-color: var(--success-color);
        }

        button.success:hover {
          background-color: #218838;
        }

        /* Alerts and Messages */
        .alert {
          padding: 1rem;
          border-radius: 6px;
          margin: 1rem 0;
          border: 1px solid transparent;
        }

        .alert-success {
          background-color: #D4EDDA;
          border-color: #C3E6CB;
          color: #155724;
        }

        .alert-warning {
          background-color: #FFF3CD;
          border-color: #FFEEBA;
          color: #856404;
        }

        .alert-danger {
          background-color: #F8D7DA;
          border-color: #F5C6CB;
          color: #721C24;
        }

        .alert-info {
          background-color: #D1ECF1;
          border-color: #BEE5EB;
          color: #0C5460;
        }

        /* Task Lists */
        .task-list {
          list-style-type: none;
          padding-left: 0;
        }

        .task-list li {
          padding: 0.5rem 0;
          display: flex;
          align-items: flex-start;
        }

        .task-checkbox {
          margin-right: 0.5rem;
          margin-top: 0.25rem;
        }

        .task-completed {
          text-decoration: line-through;
          color: var(--text-secondary);
        }
      `,
      jsContent: `
        // Practical Project Building Style - Helper JavaScript functions
        document.addEventListener('DOMContentLoaded', function() {
          // File system visualization
          const initFileExplorer = () => {
            const folders = document.querySelectorAll('.folder-item');
            
            folders.forEach(folder => {
              folder.addEventListener('click', () => {
                const folderId = folder.dataset.folder;
                const folderContents = document.querySelector(\`.folder-contents[data-folder="\${folderId}"]\`);
                
                if (folderContents) {
                  folderContents.classList.toggle('hidden');
                  folder.classList.toggle('expanded');
                }
              });
            });
            
            const files = document.querySelectorAll('.file-item');
            
            files.forEach(file => {
              file.addEventListener('click', () => {
                // Deselect all files
                files.forEach(f => f.classList.remove('selected'));
                
                // Select current file
                file.classList.add('selected');
                
                const fileId = file.dataset.file;
                const fileContents = document.querySelectorAll('.file-content');
                
                fileContents.forEach(content => {
                  if (content.dataset.file === fileId) {
                    content.classList.remove('hidden');
                  } else {
                    content.classList.add('hidden');
                  }
                });
              });
            });
          };
          
          // Task checklist functionality
          const initTaskLists = () => {
            const taskCheckboxes = document.querySelectorAll('.task-checkbox');
            
            taskCheckboxes.forEach(checkbox => {
              checkbox.addEventListener('change', () => {
                const taskItem = checkbox.parentElement;
                
                if (checkbox.checked) {
                  taskItem.classList.add('task-completed');
                } else {
                  taskItem.classList.remove('task-completed');
                }
                
                // Check if all tasks are completed
                const allCheckboxes = taskItem.parentElement.querySelectorAll('.task-checkbox');
                const allChecked = Array.from(allCheckboxes).every(cb => cb.checked);
                
                if (allChecked) {
                  const completionAlert = document.createElement('div');
                  completionAlert.className = 'alert alert-success';
                  completionAlert.textContent = 'Great job! You\'ve completed all the tasks for this section.';
                  
                  // Add after the task list
                  taskItem.parentElement.after(completionAlert);
                  
                  // Auto-scroll to the alert
                  setTimeout(() => {
                    completionAlert.scrollIntoView({ behavior: 'smooth' });
                  }, 300);
                }
              });
            });
          };
          
          // Step progression system
          const initStepProgression = () => {
            const nextButtons = document.querySelectorAll('.next-step-button');
            const prevButtons = document.querySelectorAll('.prev-step-button');
            
            nextButtons.forEach(button => {
              button.addEventListener('click', () => {
                const currentStep = parseInt(button.dataset.currentStep);
                const nextStep = currentStep + 1;
                
                // Update step indicators
                const currentStepEl = document.querySelector(\`.step[data-step="\${currentStep}"]\`);
                const nextStepEl = document.querySelector(\`.step[data-step="\${nextStep}"]\`);
                
                if (currentStepEl && nextStepEl) {
                  currentStepEl.classList.remove('active');
                  currentStepEl.classList.add('completed');
                  nextStepEl.classList.add('active');
                }
                
                // Show next step content
                const currentContent = document.querySelector(\`.step-content[data-step="\${currentStep}"]\`);
                const nextContent = document.querySelector(\`.step-content[data-step="\${nextStep}"]\`);
                
                if (currentContent && nextContent) {
                  currentContent.classList.add('hidden');
                  nextContent.classList.remove('hidden');
                  
                  // Scroll to the top of the new content
                  nextContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              });
            });
            
            prevButtons.forEach(button => {
              button.addEventListener('click', () => {
                const currentStep = parseInt(button.dataset.currentStep);
                const prevStep = currentStep - 1;
                
                // Update step indicators
                const currentStepEl = document.querySelector(\`.step[data-step="\${currentStep}"]\`);
                const prevStepEl = document.querySelector(\`.step[data-step="\${prevStep}"]\`);
                
                if (currentStepEl && prevStepEl) {
                  currentStepEl.classList.remove('active');
                  prevStepEl.classList.remove('completed');
                  prevStepEl.classList.add('active');
                }
                
                // Show previous step content
                const currentContent = document.querySelector(\`.step-content[data-step="\${currentStep}"]\`);
                const prevContent = document.querySelector(\`.step-content[data-step="\${prevStep}"]\`);
                
                if (currentContent && prevContent) {
                  currentContent.classList.add('hidden');
                  prevContent.classList.remove('hidden');
                  
                  // Scroll to the top of the new content
                  prevContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              });
            });
          };
          
          // Code diff visualization
          const initCodeDiffs = () => {
            const diffToggles = document.querySelectorAll('.diff-toggle');
            
            diffToggles.forEach(toggle => {
              toggle.addEventListener('click', () => {
                const diffId = toggle.dataset.diff;
                const diffContent = document.querySelector(\`.diff-content[data-diff="\${diffId}"]\`);
                
                if (diffContent) {
                  diffContent.classList.toggle('hidden');
                  toggle.textContent = diffContent.classList.contains('hidden') ? 'Show Changes' : 'Hide Changes';
                }
              });
            });
          };
          
          // Initialize all components
          initFileExplorer();
          initTaskLists();
          initStepProgression();
          initCodeDiffs();
        });
      `
    };
  }f (option === "B") {
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