import OpenAI from 'openai';
import { storage } from '../../storage';
import { tools, toolsMap } from './toolDefinitions';
import { v4 as uuidv4 } from 'uuid';
import { getLesson, getCurrentSlideContext } from '../tools/lessonTools';

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
    difficulty: string = 'beginner',
    format: string = 'html',
    style?: string
  ) {
    try {
      console.log(`[AI Service] Generating lesson about "${topic}" with difficulty "${difficulty}" and style "${style || 'default'}"`);
      
      // Create basic lesson structure
      const language = this.detectLanguageFromTopic(topic);
      const title = this.generateTitle(topic, difficulty, style);
      
      console.log(`[AI Service] Using language: ${language}, title: ${title}, style: ${style || 'default'}`);
      
      // Insert the new lesson
      const lesson = await storage.createLesson({
        title,
        description: `Learn about ${topic} with this ${difficulty} level lesson.`,
        language,
        difficulty: difficulty as any,
        format: format, // Use the provided format parameter
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
      
      console.log('[AI Service] Processing message:', message);
      console.log('[AI Service] Is new lesson request?', this.isNewLessonRequest(message));
      
      // Check if this is a request to create a new lesson
      if (this.isNewLessonRequest(message)) {
        // Extract topic and difficulty from message
        const topic = this.extractTopicFromMessage(message);
        const difficulty = this.extractDifficultyFromMessage(message);
        
        // First step: Present a lesson proposal with style options
        console.log(`[AI Service] New lesson request detected for topic: ${topic}, difficulty: ${difficulty}`);
        
        // Generate a styled lesson proposal with style options
        response = `
# 🐯 Lesson Proposal: Learning ${topic} - ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Level

I'd be happy to create a lesson about **${topic}** for you! Here's what I'm thinking:

## 📚 Lesson Details:
- **Topic:** ${topic}
- **Difficulty:** ${difficulty}
- **Format:** HTML with interactive elements
- **Estimated Time:** 30-45 minutes

## 🧩 What You'll Learn:
- Core concepts of ${topic}
- Practical implementation techniques
- Best practices and common pitfalls
- Hands-on coding challenges

## 📝 Proposed Slides:
1. Introduction to ${topic}
2. Core Concepts Explained
3. Example Code & Demonstration
4. Interactive Challenge
5. Common Patterns & Use Cases
6. Quiz: Test Your Knowledge

## 🎨 Choose a Style:
Please select a visual style for your lesson:

1. Brown Markdown 🏖️ - A relaxed, earthy style with tan/beige/brown colors
2. Neon Racer 🏎️ - A vibrant, high-energy style with neon colors and animations
3. Interaction Galore 💃🏽 - A style focused on interactive elements with plenty of clickable components
4. Practical Project Building 🚀 - A style focused on progressive learning with each slide building on the previous

Just reply with which style you prefer!
`;
      }
      // Handle style selection for a lesson
      else if (this.isStyleSelectionMessage(message)) {
        // Extract topic, difficulty and style from message
        const topic = this.extractTopicFromMessage(message);
        const difficulty = this.extractDifficultyFromMessage(message);
        const style = this.extractLessonStyle(message);
        
        if (style && topic) {
          try {
            console.log(`[AI Service] Style selected: ${style} for topic: ${topic}`);
            
            // Generate a new lesson in HTML format by default with the specified style
            const lesson = await this.generateLesson(topic, difficulty, 'html', style);
            
            // Format response with lesson details and ID for redirect
            let styleDisplayName = '';
            switch (style) {
              case 'brown-markdown': styleDisplayName = 'Brown Markdown 🏖️'; break;
              case 'neon-racer': styleDisplayName = 'Neon Racer 🏎️'; break;
              case 'interaction-galore': styleDisplayName = 'Interaction Galore 💃🏽'; break;
              case 'project-building': styleDisplayName = 'Practical Project Building 🚀'; break;
              default: styleDisplayName = style;
            }
            
            response = `Great choice! I'll use the "${styleDisplayName}" style for this lesson.

I'm generating your lesson about "${topic}" now. This will take a few moments. You'll see the new lesson appear in your list when it's ready!

__LESSON_CREATED__:${lesson.id}:${lesson.title}`;
          } catch (error: any) {
            console.error('Error creating new lesson:', error);
            response = `I'm sorry, I couldn't create a lesson about ${topic}. Error: ${error.message}`;
          }
        } else {
          response = "I'm not sure which style you'd like to use. Could you please select one of the style options I presented?";
        }
      }
      // Check if this is a request to edit a slide
      else if (lessonId && this.isSlideEditRequest(message)) {
        response = await this.handleSlideEditRequest(message, lessonId);
      }
      // Use OpenAI function calling for other responses when in a lesson context
      else if (lessonId) {
        // Declare completion variable outside the try-catch block so it's accessible later
        let completion: any;
        
        // First, get the current lesson and slide context to provide as context
        try {
          // Get detailed lesson information
          const lessonDetails = await getLesson({ lessonId });
          
          // Get current slide context based on chat history
          const slideContext = await getCurrentSlideContext({ lessonId, chatId });
          
          // Build a detailed context message for the AI
          const contextMessage = `
You are currently helping with the lesson "${lessonDetails.title}" (ID: ${lessonId}), which is a ${lessonDetails.difficulty} level lesson about ${lessonDetails.language}.

The current slide appears to be "${slideContext.currentSlide.title}" (ID: ${slideContext.currentSlide.id}, type: ${slideContext.currentSlide.type}).

The lesson contains ${lessonDetails.slides.length} slides in total:
${lessonDetails.slides.map((slide: any, index: number) => `${index + 1}. ${slide.title} (${slide.type})`).join('\n')}

You have access to tools that allow you to:
- Get lesson and slide information
- Update existing slides
- Add new slides to the lesson
- Analyze the current context

When the user asks for changes to the lesson or requests new content, use these tools to fulfill their request. Always confirm what actions you've taken.
`;

          console.log('[AI Service] Using lesson context for response generation');
          
          // Convert our tools to OpenAI tool format
          const openaiTools = tools.map(tool => ({
            type: 'function' as const,
            function: {
              name: tool.function.name,
              description: tool.function.description,
              parameters: tool.function.parameters
            }
          }));
          
          // Make the initial API call with tools and enhanced context
          completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: `You are Mumu, a friendly coding tutor for teenagers. You assist with coding lessons.\n\n${contextMessage}`
              },
              ...chatHistory,
              { role: "user", content: message }
            ],
            tools: openaiTools
          });
        } catch (error) {
          console.error('[AI Service] Error getting lesson context:', error);
          
          // Fallback to basic context if we can't get the lesson details
          const openaiTools = tools.map(tool => ({
            type: 'function' as const,
            function: {
              name: tool.function.name,
              description: tool.function.description,
              parameters: tool.function.parameters
            }
          }));
          
          // Make the initial API call with tools but minimal context
          completion = await openai.chat.completions.create({
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
        }
        
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
      /create (a|new|an?)? (Brown Markdown 🏖️|Interaction Galore 💃🏽|Practical Project Building 🚀|Neon Racer 🏎️)? ?lesson/i,
      /make (a|new)? (Brown Markdown 🏖️|Interaction Galore 💃🏽|Practical Project Building 🚀|Neon Racer 🏎️)? ?lesson/i,
      /generate (a|new)? (Brown Markdown 🏖️|Interaction Galore 💃🏽|Practical Project Building 🚀|Neon Racer 🏎️)? ?lesson/i,
      /teach me (about|how to)/i,
      /create (a|an)? (Brown Markdown 🏖️|Interaction Galore 💃🏽|Practical Project Building 🚀|Neon Racer 🏎️)? ?tutorial/i,
      /build (a|an)? (Brown Markdown 🏖️|Interaction Galore 💃🏽|Practical Project Building 🚀|Neon Racer 🏎️)? ?lesson/i,
      /new (Brown Markdown 🏖️|Interaction Galore 💃🏽|Practical Project Building 🚀|Neon Racer 🏎️)? ?lesson/i,
      /(Brown Markdown 🏖️|Interaction Galore 💃🏽|Practical Project Building 🚀|Neon Racer 🏎️)? ?lesson (about|on)/i,
      /can you (make|create) a (Brown Markdown 🏖️|Interaction Galore 💃🏽|Practical Project Building 🚀|Neon Racer 🏎️)? ?/i,
      /create a (Brown Markdown 🏖️|Interaction Galore 💃🏽|Practical Project Building 🚀|Neon Racer 🏎️)? ?tutorial/i
    ];
    return createPatterns.some(pattern => pattern.test(message));
  }
  
  private isStyleSelectionMessage(message: string): boolean {
    // Check if it's a style selection message
    const lowerMsg = message.toLowerCase();
    
    // Check if it mentions style selection explicitly
    if (lowerMsg.includes('style') || lowerMsg.includes('option') || lowerMsg.includes('choose')) {
      return true;
    }
    
    // Check for numeric selection
    if (lowerMsg.match(/\b[1-4]\b/) && !this.isNewLessonRequest(message)) {
      return true;
    }
    
    // Check for style names
    if ((lowerMsg.includes('brown') || lowerMsg.includes('markdown') || 
         lowerMsg.includes('neon') || lowerMsg.includes('racer') ||
         lowerMsg.includes('interaction') || lowerMsg.includes('galore') ||
         lowerMsg.includes('practical') || lowerMsg.includes('project')) && 
        !this.isNewLessonRequest(message)) {
      return true;
    }
    
    return false;
  }
  
  private extractLessonStyle(message: string): string | undefined {
    const messageLower = message.toLowerCase();
    
    // Check for emoji style names first
    const stylePatterns = [
      { pattern: /Brown Markdown 🏖️/i, style: 'brown-markdown' },
      { pattern: /Interaction Galore 💃🏽/i, style: 'interaction-galore' },
      { pattern: /Practical Project Building 🚀/i, style: 'project-building' },
      { pattern: /Neon Racer 🏎️/i, style: 'neon-racer' }
    ];
    
    for (const { pattern, style } of stylePatterns) {
      if (pattern.test(message)) {
        return style;
      }
    }
    
    // Check for style names without emojis
    if (messageLower.includes('brown') || messageLower.includes('markdown') || messageLower.includes('earthy')) {
      return 'brown-markdown';
    } else if (messageLower.includes('neon') || messageLower.includes('racer') || messageLower.includes('vibrant')) {
      return 'neon-racer';
    } else if (messageLower.includes('interaction') || messageLower.includes('galore')) {
      return 'interaction-galore';
    } else if (messageLower.includes('practical') || messageLower.includes('project') || messageLower.includes('progressive')) {
      return 'project-building';
    }
    
    // Check for numeric selection
    if (messageLower.includes('1') || messageLower.includes('first') || messageLower.includes('option 1')) {
      return 'brown-markdown';
    } else if (messageLower.includes('2') || messageLower.includes('second') || messageLower.includes('option 2')) {
      return 'neon-racer';
    } else if (messageLower.includes('3') || messageLower.includes('third') || messageLower.includes('option 3')) {
      return 'interaction-galore';
    } else if (messageLower.includes('4') || messageLower.includes('fourth') || messageLower.includes('option 4')) {
      return 'project-building';
    }
    
    return undefined;
  }

  private extractTopicFromMessage(message: string): string {
    const topicPatterns = [
      /about\s+([^,\.?!]+)/i,
      /on\s+([^,\.?!]+)/i,
      /for\s+([^,\.?!]+)/i,
      /covering\s+([^,\.?!]+)/i,
      /teach me\s+([^,\.?!]+)/i,
      /lesson (?:about|on) ([^,\.?!]+)/i,
      /create (?:a |an )?(?:new )?lesson (?:about|on|for) ([^,\.?!]+)/i,
      /make (?:a |an )?(?:new )?lesson (?:about|on|for) ([^,\.?!]+)/i,
      /generate (?:a |an )?(?:new )?lesson (?:about|on|for) ([^,\.?!]+)/i,
      /tutorial (?:about|on|for) ([^,\.?!]+)/i
    ];
    
    // Look for patterns in the message
    for (const pattern of topicPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    // If no match found with specific patterns, try to extract a subject from the message
    // by finding a potential programming related term
    const programmingTerms = [
      "javascript", "python", "java", "c\\+\\+", "html", "css", 
      "react", "node", "express", "vue", "angular", "typescript",
      "arrays", "functions", "loops", "objects", "classes", 
      "variables", "data structures", "algorithms", "web development"
    ];
    
    const termsRegex = new RegExp(`\\b(${programmingTerms.join("|")})\\b`, "i");
    const termMatch = message.match(termsRegex);
    
    if (termMatch && termMatch[1]) {
      return termMatch[1].trim();
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

  private generateTitle(topic: string, difficulty: string, style?: string): string {
    // Add style-specific title prefixes or formatting
    if (style) {
      switch (style) {
        case 'brown-markdown':
          return `Beach Learning: ${this.capitalizeFirstLetter(topic)} - ${this.capitalizeFirstLetter(difficulty)} Level 🏖️`;
        case 'interaction-galore':
          return `Interactive ${this.capitalizeFirstLetter(topic)} - ${this.capitalizeFirstLetter(difficulty)} Dance 💃🏽`;
        case 'project-building':
          return `Building with ${this.capitalizeFirstLetter(topic)} - ${this.capitalizeFirstLetter(difficulty)} Project 🚀`;
        case 'neon-racer':
          return `${this.capitalizeFirstLetter(topic)} Racing - ${this.capitalizeFirstLetter(difficulty)} Track 🏎️`;
        default:
          break;
      }
    }
    
    // Default title if no style is specified
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
    // Generate colorful, interactive HTML by default
    return `<div class="lesson-intro">
    <h1 class="animated-title">Introduction to ${topic}</h1>
    <div class="colorful-card">
      <p>${this.getDefinitionForTopic(topic)}</p>
    </div>
    <div class="interactive-element">
      <button class="reveal-button" onclick="document.getElementById('extra-info').style.display='block'">Learn More</button>
      <div id="extra-info" class="hidden-content">
        <h3>Why ${topic} is Important</h3>
        <p>Understanding ${topic} is a foundational skill for programming in ${language}.</p>
      </div>
    </div>
    <style>
      .animated-title {
        color: #4a6bff;
        animation: fadeIn 1s ease-in-out;
      }
      .colorful-card {
        background: linear-gradient(135deg, #f5f7ff 0%, #e3e9ff 100%);
        border-radius: 8px;
        padding: 15px;
        margin: 15px 0;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        border-left: 5px solid #4a6bff;
      }
      .interactive-element {
        margin: 20px 0;
      }
      .reveal-button {
        background-color: #4a6bff;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.3s ease;
      }
      .reveal-button:hover {
        background-color: #3451d1;
      }
      .hidden-content {
        display: none;
        padding: 15px;
        background-color: #f9f9f9;
        border-radius: 4px;
        margin-top: 10px;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    </style>
    </div>`;
  }

  private generateConceptsContent(topic: string, language: string): string {
    // Generate colorful, interactive HTML by default
    return `<div class="lesson-concepts">
    <h1 class="concept-title">Core Concepts of ${topic}</h1>
    
    <div class="concept-grid">
      <div class="concept-card">
        <h3>Basic Usage</h3>
        <p>${this.getUsageForTopic(topic)}</p>
      </div>
      
      <div class="concept-card">
        <h3>Best Practices</h3>
        <p>${this.getBestPracticesForTopic(topic)}</p>
      </div>
    </div>
    
    <h2 class="code-title">Example Code</h2>
    <div class="code-container">
      <pre><code class="${language.toLowerCase()}">${this.getExampleCodeForTopic(topic, language)}</code></pre>
      <button class="copy-btn" onclick="navigator.clipboard.writeText(\`${this.getExampleCodeForTopic(topic, language)}\`)">Copy Code</button>
    </div>
    
    <div class="tabs-container">
      <div class="tabs">
        <button class="tab-btn active" onclick="showTab(event, 'tab1')">Learn More</button>
        <button class="tab-btn" onclick="showTab(event, 'tab2')">Common Mistakes</button>
        <button class="tab-btn" onclick="showTab(event, 'tab3')">Tips</button>
      </div>
      
      <div id="tab1" class="tab-content active">
        <p>When using ${topic} in ${language}, remember to follow proper syntax and structure.</p>
      </div>
      
      <div id="tab2" class="tab-content">
        <p>A common mistake with ${topic} is forgetting to initialize variables properly.</p>
      </div>
      
      <div id="tab3" class="tab-content">
        <p>Try using ${topic} in small examples first before implementing in larger projects.</p>
      </div>
    </div>
    
    <style>
      .concept-title {
        color: #4a6bff;
        margin-bottom: 25px;
      }
      .concept-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin-bottom: 30px;
      }
      .concept-card {
        background-color: #f8f9ff;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.08);
        border-top: 4px solid #4a6bff;
        transition: transform 0.3s ease;
      }
      .concept-card:hover {
        transform: translateY(-5px);
      }
      .code-title {
        color: #4a6bff;
        margin-top: 30px;
      }
      .code-container {
        position: relative;
        background-color: #2d2d2d;
        border-radius: 8px;
        margin: 20px 0;
        overflow: hidden;
      }
      .code-container pre {
        padding: 20px;
        margin: 0;
        overflow-x: auto;
      }
      .code-container code {
        color: #f8f8f2;
        font-family: 'Courier New', monospace;
      }
      .copy-btn {
        position: absolute;
        top: 10px;
        right: 10px;
        background-color: rgba(255,255,255,0.1);
        color: white;
        border: none;
        border-radius: 4px;
        padding: 5px 10px;
        cursor: pointer;
        font-size: 12px;
      }
      .copy-btn:hover {
        background-color: rgba(255,255,255,0.2);
      }
      .tabs-container {
        margin-top: 30px;
      }
      .tabs {
        display: flex;
        border-bottom: 2px solid #e1e4e8;
      }
      .tab-btn {
        padding: 10px 20px;
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        margin-bottom: -2px;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      .tab-btn.active {
        border-bottom: 2px solid #4a6bff;
        color: #4a6bff;
        font-weight: bold;
      }
      .tab-content {
        display: none;
        padding: 15px;
        background-color: #f9f9ff;
        border-radius: 0 0 8px 8px;
      }
      .tab-content.active {
        display: block;
        animation: fadeIn 0.5s ease;
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    </style>
    <script>
      function showTab(evt, tabId) {
        // Hide all tab content
        var tabContents = document.getElementsByClassName("tab-content");
        for (var i = 0; i < tabContents.length; i++) {
          tabContents[i].classList.remove("active");
        }
        
        // Remove active class from all tab buttons
        var tabBtns = document.getElementsByClassName("tab-btn");
        for (var i = 0; i < tabBtns.length; i++) {
          tabBtns[i].classList.remove("active");
        }
        
        // Show the selected tab and add active class to the button
        document.getElementById(tabId).classList.add("active");
        evt.currentTarget.classList.add("active");
      }
    </script>
    </div>`;
  }

  private generateChallengeContent(topic: string, language: string): string {
    // Generate colorful, interactive HTML by default
    return `<div class="lesson-challenge">
    <h1 class="challenge-title">Practice ${topic}</h1>
    
    <div class="challenge-card">
      <div class="challenge-header">
        <span class="challenge-badge">CHALLENGE</span>
        <h2>Implement Your Knowledge</h2>
      </div>
      
      <p class="challenge-description">${this.getChallengeDescriptionForTopic(topic, language)}</p>
      
      <div class="expandable-hint">
        <button class="hint-toggle" onclick="toggleHint()">
          <span class="hint-icon">💡</span> Show Hint
        </button>
        
        <div id="hint-content" class="hint-content">
          <p>${this.getHintForTopic(topic, language)}</p>
        </div>
      </div>
    </div>
    
    <div class="progress-tracker">
      <div class="progress-step completed">
        <div class="step-number">1</div>
        <div class="step-label">Learn</div>
      </div>
      <div class="progress-connector"></div>
      <div class="progress-step active">
        <div class="step-number">2</div>
        <div class="step-label">Practice</div>
      </div>
      <div class="progress-connector"></div>
      <div class="progress-step">
        <div class="step-number">3</div>
        <div class="step-label">Master</div>
      </div>
    </div>
    
    <style>
      .challenge-title {
        color: #ff6b4a;
        margin-bottom: 25px;
        position: relative;
      }
      .challenge-title::after {
        content: '';
        position: absolute;
        left: 0;
        bottom: -10px;
        width: 50px;
        height: 4px;
        background-color: #ff6b4a;
      }
      .challenge-card {
        background-color: #fffaf8;
        border-radius: 12px;
        padding: 25px;
        box-shadow: 0 8px 16px rgba(255, 107, 74, 0.1);
        margin: 30px 0;
        border-left: 5px solid #ff6b4a;
      }
      .challenge-header {
        display: flex;
        align-items: center;
        margin-bottom: 15px;
      }
      .challenge-badge {
        background-color: #ff6b4a;
        color: white;
        font-size: 12px;
        font-weight: bold;
        padding: 5px 10px;
        border-radius: 50px;
        margin-right: 15px;
      }
      .challenge-description {
        font-size: 16px;
        line-height: 1.6;
        margin-bottom: 20px;
      }
      .expandable-hint {
        margin-top: 20px;
      }
      .hint-toggle {
        background-color: transparent;
        color: #ff6b4a;
        border: 2px solid #ff6b4a;
        border-radius: 6px;
        padding: 8px 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        transition: all 0.3s ease;
        font-weight: 500;
      }
      .hint-toggle:hover {
        background-color: #ff6b4a;
        color: white;
      }
      .hint-icon {
        margin-right: 8px;
        font-size: 18px;
      }
      .hint-content {
        display: none;
        background-color: #fff8f6;
        border-radius: 6px;
        padding: 15px;
        margin-top: 15px;
        border: 1px solid #ffe1da;
      }
      .progress-tracker {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 40px;
        padding: 0 10%;
      }
      .progress-step {
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
      }
      .step-number {
        width: 36px;
        height: 36px;
        background-color: #e1e4e8;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #6c757d;
        font-weight: bold;
        margin-bottom: 8px;
      }
      .progress-step.completed .step-number {
        background-color: #4aff9e;
        color: white;
      }
      .progress-step.active .step-number {
        background-color: #ff6b4a;
        color: white;
      }
      .step-label {
        font-size: 14px;
        color: #6c757d;
      }
      .progress-step.active .step-label {
        color: #ff6b4a;
        font-weight: 500;
      }
      .progress-connector {
        height: 3px;
        flex-grow: 1;
        background-color: #e1e4e8;
        margin: 0 10px;
        position: relative;
        top: -12px;
      }
    </style>
    <script>
      function toggleHint() {
        const hintContent = document.getElementById('hint-content');
        const hintButton = document.querySelector('.hint-toggle');
        
        if (hintContent.style.display === 'block') {
          hintContent.style.display = 'none';
          hintButton.innerHTML = '<span class="hint-icon">💡</span> Show Hint';
        } else {
          hintContent.style.display = 'block';
          hintButton.innerHTML = '<span class="hint-icon">💡</span> Hide Hint';
        }
      }
    </script>
    </div>`;
  }

  private generateQuizContent(topic: string, language: string): string {
    // Generate colorful, interactive HTML by default
    return `<div class="lesson-quiz">
    <h1 class="quiz-title">Test Your Knowledge</h1>
    
    <div class="quiz-container">
      <div class="quiz-progress">
        <div class="quiz-progress-bar"></div>
        <div class="quiz-progress-text">Question 1/4</div>
      </div>
      
      <div class="quiz-question">
        <h2>Which of the following is true about ${topic}?</h2>
        
        <div class="quiz-options">
          <label class="quiz-option">
            <input type="radio" name="q1" value="A" onclick="selectOption('A')">
            <span class="option-text">A. ${this.getQuizAnswerForTopic(topic, "A")}</span>
          </label>
          
          <label class="quiz-option">
            <input type="radio" name="q1" value="B" onclick="selectOption('B')">
            <span class="option-text">B. ${this.getQuizAnswerForTopic(topic, "B")}</span>
          </label>
          
          <label class="quiz-option">
            <input type="radio" name="q1" value="C" onclick="selectOption('C')">
            <span class="option-text">C. ${this.getQuizAnswerForTopic(topic, "C")}</span>
          </label>
          
          <label class="quiz-option">
            <input type="radio" name="q1" value="D" onclick="selectOption('D')">
            <span class="option-text">D. ${this.getQuizAnswerForTopic(topic, "D")}</span>
          </label>
        </div>
      </div>
      
      <div class="quiz-feedback" id="feedback-correct">
        <div class="feedback-icon">✓</div>
        <div class="feedback-message">
          <h3>Correct!</h3>
          <p>Great job! You've understood the concept correctly.</p>
        </div>
      </div>
      
      <div class="quiz-feedback" id="feedback-incorrect">
        <div class="feedback-icon">✗</div>
        <div class="feedback-message">
          <h3>Not quite right</h3>
          <p>Think about how ${topic} works in ${language}.</p>
        </div>
      </div>
      
      <div class="quiz-actions">
        <button class="quiz-button" id="check-answer" onclick="checkAnswer()">Check Answer</button>
        <button class="quiz-button next-button" id="next-question" onclick="nextQuestion()">Next Question</button>
      </div>
    </div>
    
    <style>
      .quiz-title {
        color: #6c5ce7;
        margin-bottom: 25px;
        text-align: center;
      }
      .quiz-container {
        background-color: #f8f7ff;
        border-radius: 12px;
        padding: 30px;
        box-shadow: 0 8px 20px rgba(108, 92, 231, 0.1);
        max-width: 800px;
        margin: 0 auto;
      }
      .quiz-progress {
        margin-bottom: 25px;
        position: relative;
      }
      .quiz-progress-bar {
        height: 8px;
        width: 25%;
        background-color: #6c5ce7;
        border-radius: 4px;
      }
      .quiz-progress-text {
        position: absolute;
        right: 0;
        top: -5px;
        font-size: 14px;
        color: #6c5ce7;
      }
      .quiz-question h2 {
        color: #2d3436;
        margin-bottom: 20px;
        font-size: 18px;
        font-weight: 600;
      }
      .quiz-options {
        display: flex;
        flex-direction: column;
        gap: 15px;
        margin-bottom: 25px;
      }
      .quiz-option {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        background-color: white;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .quiz-option:hover {
        border-color: #6c5ce7;
      }
      .quiz-option input[type="radio"] {
        margin-right: 12px;
        accent-color: #6c5ce7;
        width: 18px;
        height: 18px;
      }
      .option-text {
        font-size: 16px;
      }
      .quiz-feedback {
        display: none;
        background-color: #f0fff4;
        border-radius: 8px;
        padding: 16px;
        margin: 20px 0;
        display: flex;
        align-items: center;
      }
      #feedback-correct {
        background-color: #f0fff4;
        border-left: 4px solid #38c172;
        display: none;
      }
      #feedback-incorrect {
        background-color: #fff5f5;
        border-left: 4px solid #e53e3e;
        display: none;
      }
      .feedback-icon {
        font-size: 24px;
        margin-right: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 50%;
      }
      #feedback-correct .feedback-icon {
        color: #38c172;
        background-color: rgba(56, 193, 114, 0.1);
      }
      #feedback-incorrect .feedback-icon {
        color: #e53e3e;
        background-color: rgba(229, 62, 62, 0.1);
      }
      .feedback-message h3 {
        margin: 0 0 5px 0;
        font-size: 16px;
      }
      .feedback-message p {
        margin: 0;
        font-size: 14px;
      }
      .quiz-actions {
        display: flex;
        justify-content: space-between;
        margin-top: 25px;
      }
      .quiz-button {
        padding: 10px 24px;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      #check-answer {
        background-color: #6c5ce7;
        color: white;
        border: none;
      }
      #check-answer:hover {
        background-color: #5649c0;
      }
      .next-button {
        background-color: transparent;
        color: #6c5ce7;
        border: 2px solid #6c5ce7;
        display: none;
      }
      .next-button:hover {
        background-color: #f3f0ff;
      }
    </style>
    <script>
      let selectedOption = '';
      
      function selectOption(option) {
        selectedOption = option;
        document.getElementById('check-answer').disabled = false;
      }
      
      function checkAnswer() {
        if (!selectedOption) return;
        
        // Assuming A is the correct answer for this example
        if (selectedOption === 'A') {
          document.getElementById('feedback-correct').style.display = 'flex';
          document.getElementById('feedback-incorrect').style.display = 'none';
        } else {
          document.getElementById('feedback-incorrect').style.display = 'flex';
          document.getElementById('feedback-correct').style.display = 'none';
        }
        
        document.getElementById('check-answer').style.display = 'none';
        document.getElementById('next-question').style.display = 'block';
      }
      
      function nextQuestion() {
        // In a real implementation, this would show the next question
        alert('This would navigate to the next question in a full implementation');
      }
      
      // Initialize
      document.getElementById('check-answer').disabled = true;
      document.getElementById('next-question').style.display = 'none';
      document.getElementById('feedback-correct').style.display = 'none';
      document.getElementById('feedback-incorrect').style.display = 'none';
    </script>
    </div>`;
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