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
  /**
   * Keep track of processed messages to avoid duplicates
   */
  private processedMessages: Set<string> = new Set();

  /**
   * Generate a complete lesson with slides
   */
  async generateLesson(
    topic: string,
    userId: number,
    difficulty: string = 'beginner',
    style?: string
  ): Promise<number> {
    try {
      // Generate the initial lesson content
      const lesson = await generateLesson(topic, difficulty);
      
      let title = lesson.title;
      let description = lesson.description;
      let language = lesson.language || this.detectLanguageFromTopic(topic);
      let estimatedTime = lesson.estimatedTime || '30-45 minutes';
      let format = 'html'; // Default to HTML format

      // Determine the style template to use
      const styleToUse = style || this.extractStyleFromMessage(topic);
      
      // Generate CSS and JS content based on style
      const { cssContent, jsContent } = this.generateStyleTemplateForLesson(styleToUse, topic);

      // Create the lesson
      const newLesson = await storage.createLesson({
        title: title,
        description: description,
        difficulty: difficulty as 'beginner' | 'intermediate' | 'advanced',
        language: language,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userId: userId,
        format: format,
        estimatedTime: estimatedTime,
        styleName: styleToUse,
        cssContent: cssContent,
        jsContent: jsContent
      });

      const lessonId = newLesson.id;

      // Create the individual slides
      const slides = lesson.slides || this.generateSlidesForTopic(topic, language, difficulty);
      const slidesPromises = slides.map(async (slide, index) => {
        return storage.createSlide({
          lessonId: lessonId,
          title: slide.title,
          content: slide.content,
          type: slide.type,
          order: index,
          tags: slide.tags || [],
          initialCode: slide.initialCode,
          filename: slide.filename,
          tests: slide.tests as any,
        });
      });

      await Promise.all(slidesPromises);

      // Create a chat for the lesson
      await storage.createChat({
        lessonId: lessonId,
        title: `Chat about ${title}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: []
      });

      return lessonId;
    } catch (error) {
      console.error('Error generating lesson:', error);
      throw error;
    }
  }

  /**
   * Generate a response to a user message
   */
  async generateResponse(
    message: string,
    userId: number,
    chatId?: number,
    lessonId?: number
  ): Promise<string> {
    try {
      // Check if this is a request to create a new lesson
      if (this.isNewLessonRequest(message)) {
        // Extract topic from message
        const topic = this.extractTopicFromMessage(message);
        const difficulty = this.extractDifficultyFromMessage(message);
        
        // Generate a lesson proposal with style options
        return this.generateLessonProposal(topic, difficulty);
      }
      
      // If associated with a lesson, check if it's a slide edit request
      if (lessonId && this.isSlideEditRequest(message)) {
        return this.handleSlideEditRequest(message, lessonId);
      }
      
      // Handle style selection message 
      if (message.includes('style') && (message.includes('select') || message.includes('choose'))) {
        const style = this.extractStyleFromMessage(message);
        const topic = this.extractTopicFromMessage(message);
        
        if (style) {
          // This is the confirmation that will trigger actual lesson creation
          return `Great choice! I'll use the "${this.getStyleDisplayName(style)}" style for this lesson. Let me create that for you now...

__LESSON_GENERATING__:${topic}:${style}`;
        }
      }
      
      // Get the chat history if this is part of a chat
      const messages = [];
      
      if (chatId) {
        try {
          const chatMessages = await storage.getMessagesByChatId(chatId);
          // Add chat history but limit to last 10 messages to avoid token limits
          messages.push(
            ...chatMessages
              .slice(-10)
              .map(msg => ({ role: msg.role, content: msg.content }))
          );
        } catch (error) {
          console.error("Error fetching chat messages:", error);
        }
      }
      
      // Add the current message
      messages.push({ role: 'user', content: message });
      
      // Get lesson information if available
      let systemContext = "";
      if (lessonId) {
        try {
          const lesson = await storage.getLesson(lessonId);
          if (lesson) {
            systemContext = `This chat is about the lesson titled "${lesson.title}" which is a ${lesson.difficulty} difficulty lesson about ${lesson.language}. The user may ask questions about this lesson content.`;
            
            // Add slides information
            const slides = await storage.getSlidesByLessonId(lessonId);
            if (slides.length > 0) {
              systemContext += ` The lesson has ${slides.length} slides including: ${slides.map(s => `"${s.title}"`).join(", ")}.`;
            }
          }
        } catch (error) {
          console.error("Error fetching lesson:", error);
        }
      }
      
      let response;
      
      // Keep track of the request fingerprint to avoid duplicates
      const requestFingerprint = `${chatId}-${message}`;
      if (this.processedMessages.has(requestFingerprint)) {
        console.log("Duplicate message detected, skipping AI processing");
        return "I've already processed this message. Please try a different question!";
      }
      
      this.processedMessages.add(requestFingerprint);
      
      // Add personality traits to make the chat more engaging
      const personalityContext = `
        You are Mumu the Coding Tiger 🐯, a cheerful and enthusiastic coding teacher who specializes in making coding fun for beginners.
        Your communication style:
        - Use emojis frequently to express emotions 🎉
        - Speak with enthusiasm and excitement
        - Be encouraging and supportive 💪
        - Use simple, clear explanations
        - Occasionally use playful tiger-related metaphors
        - Keep explanations concise (2-3 paragraphs max)
        - Use markdown for formatting code and explanations
        
        Your name is Mumu and you should refer to yourself as Mumu. When introducing yourself, mention you're a coding tiger.
      `;
      
      // Generate the response
      if (lessonId) {
        // For lesson-specific chats, use more context
        const systemMessage = systemContext + "\n" + personalityContext;
        response = await generateChatResponse(messages, systemMessage);
      } else {
        // For general chats, use the default personality
        response = await generateChatResponse(messages, personalityContext);
      }
      
      // Save the new message to the database if this is part of a chat
      if (chatId) {
        try {
          await storage.createMessage({
            chatId: chatId,
            role: 'user',
            content: message,
            timestamp: Date.now()
          });
          
          await storage.createMessage({
            chatId: chatId,
            role: 'assistant',
            content: response,
            timestamp: Date.now()
          });
          
          const chat = await storage.getChat(chatId);
          if (chat) {
            await storage.updateChat(chatId, {
              updatedAt: Date.now()
            });
          }
        } catch (error) {
          console.error("Error saving messages:", error);
        }
      }
      
      return response;
    } catch (error) {
      console.error('Error generating response:', error);
      return "I'm sorry, I had trouble generating a response. Please try again.";
    }
  }

  /**
   * Detect if a message is requesting a slide edit
   */
  private isSlideEditRequest(message: string): boolean {
    // Look for keywords that would indicate a slide edit request
    const editKeywords = [
      'edit slide', 
      'change slide',
      'update slide',
      'modify slide',
      'revise slide',
    ];
    
    return editKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  /**
   * Detect if a message is requesting a new lesson
   */
  private isNewLessonRequest(message: string): boolean {
    // Keywords that would indicate a request for a new lesson
    const newLessonKeywords = [
      'create a lesson',
      'make a lesson',
      'generate a lesson',
      'new lesson',
      'teach me',
      'lesson about',
      'explain',
      'tutorial',
      'learn'
    ];
    
    return newLessonKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  /**
   * Extract a topic from a user message
   */
  private extractTopicFromMessage(message: string): string {
    // Look for phrases like "about X" or "on X"
    const aboutMatch = message.match(/about\s+([^.?!,]+)/i);
    if (aboutMatch && aboutMatch[1]) return aboutMatch[1].trim();
    
    const onMatch = message.match(/on\s+([^.?!,]+)/i);
    if (onMatch && onMatch[1]) return onMatch[1].trim();
    
    // Look for phrases like "teach me X" or "learn X"
    const teachMatch = message.match(/teach\s+(?:me|us)\s+([^.?!,]+)/i);
    if (teachMatch && teachMatch[1]) return teachMatch[1].trim();
    
    const learnMatch = message.match(/learn\s+([^.?!,]+)/i);
    if (learnMatch && learnMatch[1]) return learnMatch[1].trim();
    
    // Default to a generic topic if no matches found
    return "programming fundamentals";
  }

  /**
   * Extract difficulty from a user message
   */
  private extractDifficultyFromMessage(message: string): string {
    const message_lower = message.toLowerCase();
    
    if (message_lower.includes('beginner') || message_lower.includes('easy') || message_lower.includes('basic')) {
      return 'beginner';
    } else if (message_lower.includes('intermediate') || message_lower.includes('moderate')) {
      return 'intermediate';
    } else if (message_lower.includes('advanced') || message_lower.includes('expert') || message_lower.includes('hard')) {
      return 'advanced';
    }
    
    // Default to beginner if no difficulty specified
    return 'beginner';
  }

  /**
   * Handle requests to edit a slide
   */
  private async handleSlideEditRequest(message: string, lessonId: number): Promise<string> {
    try {
      // Get the slides for the lesson
      const slides = await storage.getSlidesByLessonId(lessonId);
      
      if (slides.length === 0) {
        return "I couldn't find any slides for this lesson to edit.";
      }
      
      // Try to determine which slide to edit based on the message
      const slideNumberMatch = message.match(/slide\s+(\d+)/i);
      let slideToEdit;
      
      if (slideNumberMatch && slideNumberMatch[1]) {
        const slideIndex = parseInt(slideNumberMatch[1]) - 1; // Convert to 0-indexed
        slideToEdit = slides[slideIndex];
      } else {
        // Look for title matches
        const slideTitleRegex = /(?:edit|change|update|modify|revise)\s+(?:the\s+)?(?:slide|content)\s+(?:titled|called|named)?\s+["']?([^"'.?!,]+)["']?/i;
        const titleMatch = message.match(slideTitleRegex);
        
        if (titleMatch && titleMatch[1]) {
          const titleToFind = titleMatch[1].trim();
          slideToEdit = slides.find(s => 
            s.title.toLowerCase().includes(titleToFind.toLowerCase())
          );
        } else {
          // Default to the first slide if no specific slide identified
          slideToEdit = slides[0];
        }
      }
      
      if (!slideToEdit) {
        return "I couldn't determine which slide you want to edit. Please specify the slide number or title.";
      }
      
      // Determine what to update based on the message
      if (message.toLowerCase().includes('content')) {
        // Update the slide content
        const newContent = this.generateUpdatedContentFromMessage(message, slideToEdit.content);
        await storage.updateSlide(slideToEdit.id, { content: newContent });
        return `I've updated the content of the slide "${slideToEdit.title}".`;
      } else if (message.toLowerCase().includes('title')) {
        // Update the slide title
        const newTitle = this.generateUpdatedTitleFromMessage(message, slideToEdit.title);
        await storage.updateSlide(slideToEdit.id, { title: newTitle });
        return `I've updated the title of the slide to "${newTitle}".`;
      } else {
        // Default to updating content
        const newContent = this.generateUpdatedContentFromMessage(message, slideToEdit.content);
        await storage.updateSlide(slideToEdit.id, { content: newContent });
        return `I've updated the slide "${slideToEdit.title}" with your requested changes.`;
      }
    } catch (error) {
      console.error("Error handling slide edit:", error);
      return "I encountered an error while trying to edit the slide. Please try again.";
    }
  }

  /**
   * Generate updated content based on user's edit request
   */
  private generateUpdatedContentFromMessage(message: string, currentContent: string): string {
    // This would typically call the OpenAI API to generate better content
    // For now, just append the user's request to the current content
    return currentContent + "\n\n" + "Updated based on user request: " + message;
  }

  /**
   * Generate updated title based on user's edit request
   */
  private generateUpdatedTitleFromMessage(message: string, currentTitle: string): string {
    // Extract the new title from the message
    const newTitleMatch = message.match(/new title ["']?([^"'.?!]+)["']?/i);
    if (newTitleMatch && newTitleMatch[1]) {
      return newTitleMatch[1].trim();
    }
    
    // If no explicit title found, modify the current one slightly
    return "Updated: " + currentTitle;
  }

  /**
   * Determine the appropriate slide type based on message content
   */
  private determineSlideType(message: string): 'info' | 'challenge' | 'quiz' {
    const messageLower = message.toLowerCase();
    
    if (messageLower.includes('quiz') || messageLower.includes('test') || messageLower.includes('question')) {
      return 'quiz';
    } else if (messageLower.includes('challenge') || messageLower.includes('exercise') || messageLower.includes('practice')) {
      return 'challenge';
    } else {
      return 'info';
    }
  }

  /**
   * Generate a slide title from a message
   */
  private generateSlideTitleFromMessage(message: string): string {
    // Extract key phrases that could be a good title
    const titlePhrases = [
      /about\s+([^.?!,]+)/i,
      /titled\s+["']?([^"'.?!]+)["']?/i,
      /called\s+["']?([^"'.?!]+)["']?/i
    ];
    
    for (const phrase of titlePhrases) {
      const match = message.match(phrase);
      if (match && match[1]) {
        return this.capitalizeFirstLetter(match[1].trim());
      }
    }
    
    // Default title based on slide type
    const type = this.determineSlideType(message);
    return this.capitalizeFirstLetter(`${type} about ${this.extractTopicFromMessage(message)}`);
  }

  /**
   * Generate slide content from a message
   */
  private generateSlideContentFromMessage(message: string, type: 'info' | 'challenge' | 'quiz'): string {
    // Default sample content based on slide type
    return this.generateDetailedContent(this.extractTopicFromMessage(message), type);
  }

  /**
   * Generate detailed content for a slide based on topic and type
   */
  private generateDetailedContent(topic: string, type: 'info' | 'challenge' | 'quiz'): string {
    switch (type) {
      case 'info':
        return `
          <h1>${this.capitalizeFirstLetter(topic)}</h1>
          <p>${this.getDefinitionForTopic(topic)}</p>
          <h2>How it works</h2>
          <p>${this.getUsageForTopic(topic)}</p>
          <h2>Best Practices</h2>
          <p>${this.getBestPracticesForTopic(topic)}</p>
        `;
      case 'challenge':
        return `
          <h1>Challenge: ${this.capitalizeFirstLetter(topic)}</h1>
          <p>${this.getChallengeDescriptionForTopic(topic, this.detectLanguageFromTopic(topic))}</p>
          <div class="hint-box">
            <h3>Hint</h3>
            <p>${this.getHintForTopic(topic, this.detectLanguageFromTopic(topic))}</p>
          </div>
        `;
      case 'quiz':
        return `
          <h1>Quiz: Test Your Knowledge</h1>
          <p>Select the correct answer about ${topic}:</p>
          <div class="quiz-container">
            <div class="quiz-option" data-option="A">
              <strong>A:</strong> ${this.getQuizAnswerForTopic(topic, 'A')}
            </div>
            <div class="quiz-option" data-option="B">
              <strong>B:</strong> ${this.getQuizAnswerForTopic(topic, 'B')}
            </div>
            <div class="quiz-option" data-option="C">
              <strong>C:</strong> ${this.getQuizAnswerForTopic(topic, 'C')}
            </div>
            <div id="feedback-correct">
              ✅ Correct! Well done!
            </div>
            <div id="feedback-incorrect">
              ❌ Not quite right. Try again!
            </div>
          </div>
          
          <script>
            window.selectOption = function(option) {
              const options = document.querySelectorAll('.quiz-option');
              options.forEach(opt => opt.classList.remove('correct', 'incorrect'));
              
              const selectedOption = document.querySelector(\`.quiz-option[data-option="\${option}"]\`);
              const correctFeedback = document.getElementById('feedback-correct');
              const incorrectFeedback = document.getElementById('feedback-incorrect');
              
              correctFeedback.style.display = 'none';
              incorrectFeedback.style.display = 'none';
              
              // For demonstration, let's say option "B" is always correct
              if (option === 'B') {
                selectedOption.classList.add('correct');
                correctFeedback.style.display = 'block';
              } else {
                selectedOption.classList.add('incorrect');
                incorrectFeedback.style.display = 'block';
              }
            }
          </script>
        `;
      default:
        return `<h1>${this.capitalizeFirstLetter(topic)}</h1><p>Content about ${topic}</p>`;
    }
  }

  /**
   * Determine appropriate tags for a slide based on user message
   */
  private determineTagsFromMessage(message: string): string[] {
    const topic = this.extractTopicFromMessage(message);
    const tags = [topic];
    
    const language = this.detectLanguageFromTopic(topic);
    if (language) tags.push(language);
    
    const difficulty = this.extractDifficultyFromMessage(message);
    tags.push(difficulty);
    
    const type = this.determineSlideType(message);
    tags.push(type);
    
    // Add more contextual tags based on message content
    const keywordMap = {
      'example': ['example', 'demonstration', 'sample'],
      'theory': ['theory', 'concept', 'principle'],
      'code': ['code', 'programming', 'syntax'],
      'practice': ['practice', 'exercise', 'drill'],
      'test': ['test', 'quiz', 'assessment']
    };
    
    for (const [tag, keywords] of Object.entries(keywordMap)) {
      if (keywords.some(keyword => message.toLowerCase().includes(keyword))) {
        tags.push(tag);
      }
    }
    
    return tags;
  }

  /**
   * Generate initial code for challenges based on message
   */
  private generateInitialCodeFromMessage(message: string): string | undefined {
    const topic = this.extractTopicFromMessage(message);
    const language = this.detectLanguageFromTopic(topic);
    
    // Only generate code for challenge slides
    if (this.determineSlideType(message) !== 'challenge') {
      return undefined;
    }
    
    return this.getExampleCodeForTopic(topic, language);
  }

  /**
   * Generate tests for challenges based on message
   */
  private generateTestsFromMessage(message: string): Array<{id: string; name: string; description: string; validation: string; type: 'regex' | 'js'}> | undefined {
    const topic = this.extractTopicFromMessage(message);
    const language = this.detectLanguageFromTopic(topic);
    
    // Only generate tests for challenge slides
    if (this.determineSlideType(message) !== 'challenge') {
      return undefined;
    }
    
    if (language === 'javascript' || language === 'typescript') {
      return [
        {
          id: uuidv4(),
          name: "Variable declaration",
          description: "Checks if the necessary variables are declared",
          validation: "# Check if variables exist",
          type: "regex"
        },
        {
          id: uuidv4(),
          name: "Function implementation",
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

  /**
   * Generate a styled lesson proposal with details about the lesson
   */
  private generateLessonProposal(topic: string, difficulty: string): string {
    const title = this.generateTitle(topic, difficulty);
    
    return `
# 🐯 Lesson Proposal: ${title}

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

${this.generateStyleSelectionPrompt(topic, difficulty)}

Does this sound good? Let me know if you'd like to proceed or if you want to make any changes to the plan!
    `;
  }

  /**
   * Generate a prompt for selecting lesson style with visual options
   */
  private generateStyleSelectionPrompt(topic: string, difficulty: string): string {
    return `
## 🎨 Choose a Style:
Please select a visual style for your lesson:

1. ${this.getStyleDisplayName('brown-markdown')} - A relaxed, earthy style with tan/beige/brown colors
2. ${this.getStyleDisplayName('neon-racer')} - A vibrant, high-energy style with neon colors and animations
3. ${this.getStyleDisplayName('interaction-galore')} - A style focused on interactive elements with plenty of clickable components
4. ${this.getStyleDisplayName('practical-project')} - A style focused on progressive learning with each slide building on the previous

Just reply with which style you prefer!
    `;
  }

  /**
   * Get a display name for style with emoji
   */
  private getStyleDisplayName(style: string): string {
    switch (style) {
      case 'brown-markdown':
        return 'Brown Markdown 🏖️';
      case 'neon-racer':
        return 'Neon Racer 🏎️';
      case 'interaction-galore':
        return 'Interaction Galore 💃🏽';
      case 'practical-project':
        return 'Practical Project Building 🚀';
      default:
        return style;
    }
  }

  /**
   * Extract style selection from user message
   */
  private extractStyleFromMessage(message: string): string {
    const messageLower = message.toLowerCase();
    
    if (messageLower.includes('brown') || messageLower.includes('earth') || messageLower.includes('markdown')) {
      return 'brown-markdown';
    } else if (messageLower.includes('neon') || messageLower.includes('racer') || messageLower.includes('vibrant')) {
      return 'neon-racer';
    } else if (messageLower.includes('interaction') || messageLower.includes('galore') || messageLower.includes('interactive')) {
      return 'interaction-galore';
    } else if (messageLower.includes('practical') || messageLower.includes('project') || messageLower.includes('progressive')) {
      return 'practical-project';
    } else if (messageLower.includes('style 1') || messageLower.includes('option 1') || messageLower.includes('first')) {
      return 'brown-markdown';
    } else if (messageLower.includes('style 2') || messageLower.includes('option 2') || messageLower.includes('second')) {
      return 'neon-racer';
    } else if (messageLower.includes('style 3') || messageLower.includes('option 3') || messageLower.includes('third')) {
      return 'interaction-galore';
    } else if (messageLower.includes('style 4') || messageLower.includes('option 4') || messageLower.includes('fourth')) {
      return 'practical-project';
    }
    
    // Default style if none detected
    return 'practical-project';
  }

  /**
   * Detect the programming language from a topic
   */
  private detectLanguageFromTopic(topic: string): string {
    const topicLower = topic.toLowerCase();
    
    // Map of keywords to languages
    const languageKeywords: Record<string, string[]> = {
      'javascript': ['javascript', 'js', 'node', 'react', 'angular', 'vue', 'dom', 'jquery', 'frontend'],
      'typescript': ['typescript', 'ts', 'angular', 'type', 'interface'],
      'python': ['python', 'django', 'flask', 'numpy', 'pandas', 'matplotlib', 'scikit'],
      'java': ['java', 'spring', 'maven', 'gradle', 'android'],
      'html': ['html', 'markup', 'dom', 'element', 'tag'],
      'css': ['css', 'style', 'flexbox', 'grid', 'responsive'],
      'sql': ['sql', 'database', 'query', 'table', 'join', 'select'],
      'ruby': ['ruby', 'rails', 'erb', 'gem'],
      'c#': ['c#', 'csharp', '.net', 'asp.net', 'unity'],
      'php': ['php', 'laravel', 'symfony', 'wordpress']
    };
    
    // Find the language with the most keyword matches
    let bestMatch = '';
    let highestScore = 0;
    
    for (const [language, keywords] of Object.entries(languageKeywords)) {
      const score = keywords.filter(keyword => topicLower.includes(keyword)).length;
      if (score > highestScore) {
        highestScore = score;
        bestMatch = language;
      }
    }
    
    // If no matches, default based on general topics
    if (highestScore === 0) {
      if (topicLower.includes('web') || topicLower.includes('frontend')) {
        return 'javascript';
      } else if (topicLower.includes('data') || topicLower.includes('machine learning')) {
        return 'python';
      } else if (topicLower.includes('server') || topicLower.includes('backend')) {
        return 'javascript'; // Assuming Node.js
      }
    }
    
    return bestMatch || 'javascript';
  }

  /**
   * Generate a title based on topic and difficulty
   */
  private generateTitle(topic: string, difficulty: string): string {
    const titlePrefixes = {
      'beginner': ['Introducing', 'Getting Started with', 'Basics of', 'Fundamentals of'],
      'intermediate': ['Mastering', 'Deep Dive into', 'Practical', 'Working with'],
      'advanced': ['Advanced', 'Expert-Level', 'Professional', 'Specialized']
    };
    
    const prefixList = titlePrefixes[difficulty as keyof typeof titlePrefixes] || titlePrefixes.beginner;
    const prefix = prefixList[Math.floor(Math.random() * prefixList.length)];
    
    return `${prefix} ${this.capitalizeFirstLetter(topic)}`;
  }

  /**
   * Generate slides based on topic
   */
  private generateSlidesForTopic(topic: string, language: string, difficulty: string): any[] {
    // Basic slides for every lesson
    return [
      {
        title: "Introduction",
        content: this.generateIntroContent(topic, language),
        type: "info",
        tags: [topic, language, difficulty, "introduction"],
      },
      {
        title: "Core Concepts",
        content: this.generateConceptsContent(topic, language),
        type: "info",
        tags: [topic, language, difficulty, "concepts"],
      },
      {
        title: "Example Code",
        content: `
          <h1>Example: ${this.capitalizeFirstLetter(topic)}</h1>
          <p>Here's a practical example of ${topic} in action:</p>
          <pre><code>${this.getExampleCodeForTopic(topic, language)}</code></pre>
          <p>Try modifying this code to see how it works!</p>
        `,
        type: "info",
        tags: [topic, language, difficulty, "example"],
      },
      {
        title: "Challenge",
        content: this.generateChallengeContent(topic, language),
        type: "challenge",
        tags: [topic, language, difficulty, "challenge"],
        initialCode: this.generateInitialCode(topic, language),
        filename: language === 'javascript' ? 'script.js' : (language === 'python' ? 'main.py' : 'code.txt'),
        tests: this.generateTests(topic, language),
      },
      {
        title: "Common Patterns",
        content: `
          <h1>Common Patterns with ${this.capitalizeFirstLetter(topic)}</h1>
          <p>Here are some frequently used patterns when working with ${topic}:</p>
          <ul>
            <li><strong>Pattern 1:</strong> Basic implementation</li>
            <li><strong>Pattern 2:</strong> Advanced usage</li>
            <li><strong>Pattern 3:</strong> Optimization techniques</li>
          </ul>
          <div class="info-box">
            <h3>Pro Tip</h3>
            <p>Always consider the context and requirements before choosing a pattern!</p>
          </div>
        `,
        type: "info",
        tags: [topic, language, difficulty, "patterns"],
      },
      {
        title: "Knowledge Check",
        content: this.generateQuizContent(topic, language),
        type: "quiz",
        tags: [topic, language, difficulty, "quiz"],
      }
    ];
  }

  /**
   * Capitalize the first letter of a string
   */
  private capitalizeFirstLetter(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  /**
   * Generate Introduction slide content
   */
  private generateIntroContent(topic: string, language: string): string {
    return `
      <h1>Introduction to ${this.capitalizeFirstLetter(topic)}</h1>
      <p>${this.getDefinitionForTopic(topic)}</p>
      <div class="info-box">
        <h3>What You'll Learn</h3>
        <ul>
          <li>Understanding the basics of ${topic}</li>
          <li>How to implement ${topic} in ${language}</li>
          <li>Best practices and common pitfalls</li>
        </ul>
      </div>
      <p>Let's get started with ${topic}!</p>
    `;
  }

  /**
   * Generate Concepts slide content
   */
  private generateConceptsContent(topic: string, language: string): string {
    return `
      <h1>Core Concepts of ${this.capitalizeFirstLetter(topic)}</h1>
      <p>Before diving into code, let's understand the key concepts:</p>
      <div class="concept-grid">
        <div class="concept">
          <h3>Concept 1</h3>
          <p>The fundamental principle behind ${topic}.</p>
        </div>
        <div class="concept">
          <h3>Concept 2</h3>
          <p>How ${topic} is typically used in ${language}.</p>
        </div>
        <div class="concept">
          <h3>Concept 3</h3>
          <p>Advanced applications and variations.</p>
        </div>
      </div>
      <p>${this.getUsageForTopic(topic)}</p>
    `;
  }

  /**
   * Generate Challenge slide content
   */
  private generateChallengeContent(topic: string, language: string): string {
    return `
      <h1>Challenge: Implement ${this.capitalizeFirstLetter(topic)}</h1>
      <p>${this.getChallengeDescriptionForTopic(topic, language)}</p>
      <div class="hint-toggle">
        <button onclick="toggleHint()">Show Hint</button>
      </div>
      <div id="hint-content" style="display: none;">
        <div class="hint-box">
          <h3>Hint</h3>
          <p>${this.getHintForTopic(topic, language)}</p>
        </div>
      </div>
      
      <script>
        // Define global helper functions for interactive elements
        window.toggleHint = function() {
          const hintContent = document.getElementById('hint-content');
          const hintButton = document.querySelector('.hint-toggle');
          
          if (hintContent.style.display === 'none') {
            hintContent.style.display = 'block';
            hintButton.innerHTML = '<button>Hide Hint</button>';
          } else {
            hintContent.style.display = 'none';
            hintButton.innerHTML = '<button>Show Hint</button>';
          }
        }
      </script>
    `;
  }

  /**
   * Generate Quiz slide content
   */
  private generateQuizContent(topic: string, language: string): string {
    return `
      <h1>Quiz: Test Your Knowledge</h1>
      <p>Select the correct answer about ${topic}:</p>
      <div class="quiz-container">
        <div class="quiz-option" data-option="A" onclick="selectOption('A')">
          <strong>A:</strong> ${this.getQuizAnswerForTopic(topic, 'A')}
        </div>
        <div class="quiz-option" data-option="B" onclick="selectOption('B')">
          <strong>B:</strong> ${this.getQuizAnswerForTopic(topic, 'B')}
        </div>
        <div class="quiz-option" data-option="C" onclick="selectOption('C')">
          <strong>C:</strong> ${this.getQuizAnswerForTopic(topic, 'C')}
        </div>
        <div id="feedback-correct">
          ✅ Correct! Well done! ${topic} is indeed a powerful concept.
        </div>
        <div id="feedback-incorrect">
          ❌ Not quite right. Try again! Think about how ${topic} is typically used.
        </div>
      </div>
      
      <script>
        // Define global helper functions for quiz
        window.selectOption = function(option) {
          const options = document.querySelectorAll('.quiz-option');
          options.forEach(opt => opt.classList.remove('correct', 'incorrect'));
          
          const selectedOption = document.querySelector(\`.quiz-option[data-option="\${option}"]\`);
          const correctFeedback = document.getElementById('feedback-correct');
          const incorrectFeedback = document.getElementById('feedback-incorrect');
          
          correctFeedback.style.display = 'none';
          incorrectFeedback.style.display = 'none';
          
          // For demonstration, let's say option "B" is always correct
          if (option === 'B') {
            selectedOption.classList.add('correct');
            correctFeedback.style.display = 'block';
          } else {
            selectedOption.classList.add('incorrect');
            incorrectFeedback.style.display = 'block';
          }
        }
      </script>
    `;
  }

  /**
   * Generate a definition for a topic
   */
  private getDefinitionForTopic(topic: string): string {
    // Simplified example - in a real implementation, this would be more sophisticated
    return `${this.capitalizeFirstLetter(topic)} is a fundamental concept in programming that helps developers create more efficient and maintainable code. It provides a structured approach to solving common problems in software development.`;
  }

  /**
   * Generate usage information for a topic
   */
  private getUsageForTopic(topic: string): string {
    return `${this.capitalizeFirstLetter(topic)} is commonly used when you need to organize code, improve performance, or handle complex data structures. Understanding ${topic} will help you write cleaner, more efficient code.`;
  }

  /**
   * Generate best practices for a topic
   */
  private getBestPracticesForTopic(topic: string): string {
    return `
      When working with ${topic}, keep these best practices in mind:
      <ul>
        <li>Always consider the performance implications</li>
        <li>Write clean, self-documenting code</li>
        <li>Test thoroughly to catch edge cases</li>
        <li>Consider reusability and maintainability</li>
      </ul>
    `;
  }

  /**
   * Generate example code for a topic in a specific language
   */
  private getExampleCodeForTopic(topic: string, language: string): string {
    if (language === 'javascript' || language === 'typescript') {
      return `// Example of ${topic} in JavaScript
function exampleFunction() {
  // Implementation related to ${topic}
  const data = [1, 2, 3, 4, 5];
  const result = data.map(item => item * 2);
  console.log(result);
  return result;
}

// Call the function
exampleFunction();`;
    } else if (language === 'python') {
      return `# Example of ${topic} in Python
def example_function():
    # Implementation related to ${topic}
    data = [1, 2, 3, 4, 5]
    result = [item * 2 for item in data]
    print(result)
    return result

# Call the function
example_function()`;
    } else if (language === 'html') {
      return `<!-- Example of ${topic} in HTML -->
<div class="container">
  <h1>Example of ${topic}</h1>
  <p>This demonstrates a basic implementation.</p>
  <div class="example-content">
    <span>This is a sample element</span>
  </div>
</div>`;
    } else if (language === 'css') {
      return `/* Example of ${topic} in CSS */
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  background-color: #f5f5f5;
}

.example-content {
  border: 1px solid #ddd;
  padding: 15px;
  border-radius: 5px;
}`;
    } else {
      return `// Example of ${topic}
// This is a generic code example
// Replace with specific code relevant to your language and topic`;
    }
  }

  /**
   * Generate a challenge description for a topic
   */
  private getChallengeDescriptionForTopic(topic: string, language: string): string {
    return `Now it's your turn to implement a solution using ${topic}! 
      
    Your task is to write code that demonstrates understanding of ${topic}. Try to use the concepts we've covered so far.
      
    Complete the code in the editor below.`;
  }

  /**
   * Generate a hint for a challenge
   */
  private getHintForTopic(topic: string, language: string): string {
    return `Think about how ${topic} can be applied to solve this problem. Consider using the example code as a starting point, but adapt it to the specific requirements of this challenge.`;
  }

  /**
   * Generate a quiz answer for a topic
   */
  private getQuizAnswerForTopic(topic: string, option: string): string {
    if (option === 'A') {
      return `${this.capitalizeFirstLetter(topic)} is only used for visual formatting and has no functional purpose.`;
    } else if (option === 'B') {
      return `${this.capitalizeFirstLetter(topic)} is a programming concept that helps organize and structure code for better functionality and maintenance.`;
    } else if (option === 'C') {
      return `${this.capitalizeFirstLetter(topic)} was deprecated in recent programming language updates and should not be used anymore.`;
    } else {
      return `An answer about ${topic}`;
    }
  }

  /**
   * Generate the appropriate CSS and JS content based on the selected style template
   */
  private generateStyleTemplateForLesson(style: string, topic: string): { cssContent: string, jsContent: string } {
    // Import the templates from the templates directory
    const { generateStyleTemplateForLesson } = require('../templates');
    return generateStyleTemplateForLesson(style, topic);
  }

  /**
   * Generate initial code for a challenge
   */
  private generateInitialCode(topic: string, language: string): string {
    if (language === 'javascript') {
      return `// Complete the function for ${topic}
function implement${topic.replace(/\s+/g, '')}() {
  // Your code here
  
  // Return your result
  return null;
}`;
    } else if (language === 'python') {
      return `# Complete the function for ${topic}
def implement_${topic.replace(/\s+/g, '_').toLowerCase()}():
    # Your code here
    
    # Return your result
    return None`;
    } else {
      return `// Write your code for ${topic} here`;
    }
  }

  /**
   * Get the appropriate filename for a language
   */
  private getFilenameForLanguage(language: string): string {
    if (language === 'javascript') {
      return 'script.js';
    } else if (language === 'python') {
      return 'main.py';
    } else if (language === 'html') {
      return 'index.html';
    } else if (language === 'css') {
      return 'styles.css';
    } else {
      return 'code.txt';
    }
  }

  /**
   * Generate tests for a challenge
   */
  private generateTests(topic: string, language: string): Array<{id: string; name: string; description: string; validation: string; type: 'regex' | 'js'}> {
    if (language === 'javascript') {
      return [
        {
          id: uuidv4(),
          name: "Variable declaration",
          description: "Checks if the necessary variables are declared",
          validation: "# Check if variables exist",
          type: "regex"
        },
        {
          id: uuidv4(),
          name: "Function implementation",
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