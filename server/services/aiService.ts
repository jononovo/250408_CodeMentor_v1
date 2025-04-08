/**
 * AI Service for generating lesson content and chat responses
 * This is a simplified service that would be replaced by calls to an actual AI service
 */
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
  // Generate a complete lesson based on topic, difficulty, and description
  async generateLesson(
    topic: string, 
    difficulty: string = 'beginner',
    description?: string
  ): Promise<GeneratedLesson> {
    // In a real implementation, this would call an external AI API
    // For now, return a mock response based on the topic
    
    // For demo purposes, generate a simple lesson about the requested topic
    const cleanTopic = topic.toLowerCase().trim();
    const language = this.detectLanguageFromTopic(cleanTopic);
    
    return {
      title: this.generateTitle(cleanTopic, difficulty),
      description: description || `Learn about ${topic} in a fun and interactive way. This ${difficulty} lesson is designed for teens.`,
      language,
      estimatedTime: '15 min',
      slides: this.generateSlidesForTopic(cleanTopic, language, difficulty)
    };
  }
  
  // Generate a response to a chat message
  async generateResponse(
    message: string,
    chatId: number,
    lessonId?: number
  ): Promise<string> {
    // In a real implementation, this would call an external AI API
    // For now, handle specific message patterns
    
    const lowerMessage = message.toLowerCase();
    
    // Check if this is a slide editing request
    if (lessonId && this.isSlideEditRequest(lowerMessage)) {
      try {
        return await this.handleSlideEditRequest(message, lessonId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `I couldn't update the slide. Error: ${errorMessage}`;
      }
    }
    
    // Regular responses
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return "Hello! I'm Mumu, your coding mentor. How can I help you learn to code today?";
    }
    
    if (lowerMessage.includes('function')) {
      return "Functions are blocks of reusable code. They help you organize your code and make it more reusable. Here's a simple example:\n\n```\nfunction sayHello() {\n  console.log(\"Hello, world!\");\n}\n\n// Call the function\nsayHello();\n```\n\nWould you like to learn more about functions?";
    }
    
    if (lowerMessage.includes('challenge') || lowerMessage.includes('test')) {
      return "I see you're working on a coding challenge! Remember to read the requirements carefully and break down the problem. Don't hesitate to ask if you get stuck on a specific part of the challenge.";
    }
    
    if (lowerMessage.includes('help')) {
      return "I'm here to help! What specific coding concept or challenge are you struggling with? The more details you provide, the better I can assist you.";
    }
    
    // Default response
    return "That's an interesting question! To help you better, could you provide more details about what you're trying to learn or accomplish? I'm here to support your coding journey.";
  }
  
  // Check if a message is requesting slide edits
  private isSlideEditRequest(message: string): boolean {
    const editKeywords = [
      'edit slide', 'update slide', 'change slide', 
      'modify slide', 'fix slide', 'add slide', 
      'create slide', 'new slide', 'delete slide', 
      'remove slide'
    ];
    
    return editKeywords.some(keyword => message.includes(keyword));
  }
  
  // Handle a request to edit slides
  private async handleSlideEditRequest(message: string, lessonId: number): Promise<string> {
    // Get current slides
    const slides = await storage.getSlidesByLessonId(lessonId);
    if (!slides || slides.length === 0) {
      return "I couldn't find any slides for this lesson to edit.";
    }
    
    const lowerMessage = message.toLowerCase();
    let slideIndex = -1;
    
    // Try to determine which slide to edit
    if (lowerMessage.includes('slide 1') || lowerMessage.includes('first slide')) {
      slideIndex = 0;
    } else if (lowerMessage.includes('slide 2') || lowerMessage.includes('second slide')) {
      slideIndex = 1;
    } else if (lowerMessage.includes('slide 3') || lowerMessage.includes('third slide')) {
      slideIndex = 2;
    } else if (lowerMessage.includes('slide 4') || lowerMessage.includes('fourth slide')) {
      slideIndex = 3;
    } else {
      // For "add slide" or "new slide" we want to create a new one
      if (lowerMessage.includes('add slide') || lowerMessage.includes('new slide') || lowerMessage.includes('create slide')) {
        // Create a new slide
        const slideType = this.determineSlideType(message);
        const slideTitle = this.generateSlideTitleFromMessage(message);
        const slideContent = this.generateSlideContentFromMessage(message, slideType);
        
        const newSlide = await storage.createSlide({
          lessonId,
          title: slideTitle,
          content: slideContent,
          type: slideType,
          order: slides.length, // Add to the end
          tags: this.determineTagsFromMessage(message),
          initialCode: slideType === 'challenge' ? this.generateInitialCodeFromMessage(message) : undefined,
          filename: slideType === 'challenge' ? this.getFilenameForLanguage("javascript") : undefined,
          tests: slideType === 'challenge' ? this.generateTestsFromMessage(message) : undefined
        });
        
        return `I've added a new ${slideType} slide titled "${slideTitle}" to your lesson. You can view it as slide #${slides.length + 1}.`;
      }
      
      return "I'm not sure which slide you want to edit. Please specify by saying something like 'edit slide 1' or 'update the second slide'.";
    }
    
    // Check if the requested slide exists
    if (slideIndex >= slides.length) {
      return `This lesson only has ${slides.length} slides. Please specify a valid slide number.`;
    }
    
    const slideToEdit = slides[slideIndex];
    
    // Handle different types of edits
    if (lowerMessage.includes('delete') || lowerMessage.includes('remove')) {
      if (slides.length <= 1) {
        return "A lesson must have at least one slide. I can't delete the only slide.";
      }
      
      await storage.deleteSlide(slideToEdit.id);
      
      // Reorder remaining slides
      const remainingSlides = slides.filter((s: any) => s.id !== slideToEdit.id);
      for (let i = 0; i < remainingSlides.length; i++) {
        if (remainingSlides[i].order !== i) {
          await storage.updateSlide(remainingSlides[i].id, { order: i });
        }
      }
      
      return `I've deleted slide #${slideIndex + 1} titled "${slideToEdit.title}". The remaining slides have been reordered.`;
    }
    
    // Update the slide content
    const updatedContent = this.generateUpdatedContentFromMessage(message, slideToEdit.content);
    const updatedTitle = lowerMessage.includes('title') ? this.generateUpdatedTitleFromMessage(message, slideToEdit.title) : slideToEdit.title;
    
    const updates: any = {
      content: updatedContent,
      title: updatedTitle
    };
    
    // Update slide type if requested
    if (lowerMessage.includes('make it a challenge') || lowerMessage.includes('change to challenge')) {
      updates.type = 'challenge';
      updates.initialCode = this.generateInitialCodeFromMessage(message) || "// Write your code here";
      updates.filename = this.getFilenameForLanguage("javascript");
      updates.tests = this.generateTestsFromMessage(message) || [];
    } else if (lowerMessage.includes('make it a quiz') || lowerMessage.includes('change to quiz')) {
      updates.type = 'quiz';
      delete updates.initialCode;
      delete updates.filename;
      delete updates.tests;
    } else if (lowerMessage.includes('make it info') || lowerMessage.includes('change to info')) {
      updates.type = 'info';
      delete updates.initialCode;
      delete updates.filename;
      delete updates.tests;
    }
    
    await storage.updateSlide(slideToEdit.id, updates);
    
    return `I've updated slide #${slideIndex + 1}. The title is now "${updatedTitle}" and the content has been updated. ${
      updates.type !== slideToEdit.type ? `I've also changed the slide type to "${updates.type}".` : ''
    }`;
  }
  
  private generateUpdatedContentFromMessage(message: string, currentContent: string): string {
    // In a real AI implementation, this would be much more sophisticated
    // For now, extract content that appears after certain phrases
    
    const contentMarkers = [
      'with content:', 'content:', 'to say:', 
      'with text:', 'text:', 'that says:',
      'replace with:'
    ];
    
    for (const marker of contentMarkers) {
      const markerIndex = message.indexOf(marker);
      if (markerIndex !== -1) {
        return message.substring(markerIndex + marker.length).trim();
      }
    }
    
    // If no specific content is provided, make a small modification to the existing content
    return currentContent + "\n\n[Updated based on your request]";
  }
  
  private generateUpdatedTitleFromMessage(message: string, currentTitle: string): string {
    const titleMarkers = [
      'with title:', 'title:', 'titled:', 'rename to:'
    ];
    
    const contentMarkers = [
      'with content:', 'content:', 'to say:', 
      'with text:', 'text:', 'that says:',
      'replace with:'
    ];
    
    for (const marker of titleMarkers) {
      const markerIndex = message.indexOf(marker);
      if (markerIndex !== -1) {
        const restOfMessage = message.substring(markerIndex + marker.length).trim();
        const newlineIndex = restOfMessage.indexOf('\n');
        
        if (newlineIndex !== -1) {
          return restOfMessage.substring(0, newlineIndex).trim();
        } else {
          // Extract until the next possible marker
          const nextMarkerIndex = contentMarkers.reduce((minIndex: number, marker: string) => {
            const index = restOfMessage.indexOf(marker);
            return index !== -1 && (index < minIndex || minIndex === -1) ? index : minIndex;
          }, -1);
          
          if (nextMarkerIndex !== -1) {
            return restOfMessage.substring(0, nextMarkerIndex).trim();
          } else {
            return restOfMessage;
          }
        }
      }
    }
    
    return currentTitle;
  }
  
  private determineSlideType(message: string): 'info' | 'challenge' | 'quiz' {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('challenge') || lowerMessage.includes('coding exercise')) {
      return 'challenge';
    } else if (lowerMessage.includes('quiz') || lowerMessage.includes('test knowledge')) {
      return 'quiz';
    } else {
      return 'info';
    }
  }
  
  private generateSlideTitleFromMessage(message: string): string {
    const titleMarkers = [
      'with title:', 'title:', 'titled:', 'called:'
    ];
    
    for (const marker of titleMarkers) {
      const markerIndex = message.indexOf(marker);
      if (markerIndex !== -1) {
        const restOfMessage = message.substring(markerIndex + marker.length).trim();
        const newlineIndex = restOfMessage.indexOf('\n');
        
        if (newlineIndex !== -1) {
          return restOfMessage.substring(0, newlineIndex).trim();
        } else {
          // If no specific title is found, generate one based on content
          const contentStart = restOfMessage.substring(0, 30);
          return contentStart + '...';
        }
      }
    }
    
    // Generate title based on content if possible
    const lowerMessage = message.toLowerCase();
    
    // Check for topic in message
    if (lowerMessage.includes('array') || lowerMessage.includes('arrays')) {
      return "Understanding JavaScript Arrays";
    } else if (lowerMessage.includes('function') || lowerMessage.includes('functions')) {
      return "Working with Functions";
    } else if (lowerMessage.includes('loop') || lowerMessage.includes('loops')) {
      return "Mastering JavaScript Loops";
    } else if (lowerMessage.includes('variable') || lowerMessage.includes('variables')) {
      return "JavaScript Variables Explained";
    } else if (lowerMessage.includes('object') || lowerMessage.includes('objects')) {
      return "Understanding JavaScript Objects";
    }
    
    // Default title if none specified
    return "New Slide";
  }
  
  private generateSlideContentFromMessage(message: string, type: 'info' | 'challenge' | 'quiz'): string {
    const contentMarkers = [
      'with content:', 'content:', 'to say:', 
      'with text:', 'text:', 'that says:'
    ];
    
    for (const marker of contentMarkers) {
      const markerIndex = message.indexOf(marker);
      if (markerIndex !== -1) {
        return message.substring(markerIndex + marker.length).trim();
      }
    }
    
    // Extract topic from message
    const lowerMessage = message.toLowerCase();
    let topic = '';
    
    if (lowerMessage.includes('array') || lowerMessage.includes('arrays')) {
      topic = 'arrays';
    } else if (lowerMessage.includes('function') || lowerMessage.includes('functions')) {
      topic = 'functions';
    } else if (lowerMessage.includes('loop') || lowerMessage.includes('loops')) {
      topic = 'loops';
    } else if (lowerMessage.includes('variable') || lowerMessage.includes('variables')) {
      topic = 'variables';
    } else if (lowerMessage.includes('object') || lowerMessage.includes('objects')) {
      topic = 'objects';
    }
    
    // If no specific content is provided, generate content based on type and topic
    if (topic) {
      return this.generateDetailedContent(topic, type);
    }
    
    // Fallback generic content
    if (type === 'info') {
      return "This is an informational slide. The content provides explanations and examples.";
    } else if (type === 'challenge') {
      return "This is a coding challenge. Write code to solve the problem described below:\n\n[Challenge description]";
    } else {
      return "This is a quiz slide to test your knowledge. Answer the following questions:\n\n1. [Question 1]\n   a) Option A\n   b) Option B\n   c) Option C\n   d) Option D";
    }
  }
  
  private generateDetailedContent(topic: string, type: 'info' | 'challenge' | 'quiz'): string {
    if (topic === 'arrays') {
      if (type === 'info') {
        return `# Arrays in JavaScript

Arrays are special objects that store multiple values in a single variable. They're like ordered lists that can hold any type of data.

## Creating Arrays

There are two ways to create arrays:

\`\`\`javascript
// Using array literal (recommended)
const fruits = ['Apple', 'Banana', 'Orange'];

// Using the Array constructor
const numbers = new Array(1, 2, 3, 4, 5);
\`\`\`

## Accessing Array Elements

Array elements are accessed using their index (position). **Indexing starts at 0**:

\`\`\`javascript
const colors = ['red', 'green', 'blue'];
console.log(colors[0]); // Output: 'red'
console.log(colors[2]); // Output: 'blue'
\`\`\`

## Common Array Methods

* **push()** - Add an element to the end
* **pop()** - Remove the last element
* **unshift()** - Add an element to the beginning  
* **shift()** - Remove the first element
* **splice()** - Add/remove elements from any position
* **slice()** - Extract a section without modifying original array

## Array Properties

* **length** - Returns the number of elements
\`\`\`javascript
const animals = ['dog', 'cat', 'bird'];
console.log(animals.length); // Output: 3
\`\`\`

## Iterating Over Arrays

\`\`\`javascript
const scores = [85, 92, 78, 90];

// Using for loop
for (let i = 0; i < scores.length; i++) {
  console.log(scores[i]);
}

// Using for...of loop (modern)
for (let score of scores) {
  console.log(score);
}

// Using forEach method
scores.forEach(score => {
  console.log(score);
});
\`\`\`

Arrays are an essential data structure in JavaScript programming!`;
      } else if (type === 'challenge') {
        return `# Array Challenge

Let's practice working with arrays by creating a function that finds the largest number in an array.

## Your Task

Write a function called \`findMax\` that takes an array of numbers as input and returns the largest number in the array.

### Requirements:
1. The function should work with arrays of any length
2. If the array is empty, return null or undefined
3. Use a loop to iterate through the array

### Example:
\`\`\`javascript
findMax([5, 2, 9, 1, 7]); // Should return 9
findMax([0, -5, -2]);     // Should return 0
findMax([]);              // Should return null or undefined
\`\`\`

Get coding and good luck!`;
      } else { // quiz
        return `# Test Your Knowledge on Arrays

Answer the following questions about JavaScript arrays:

1. What is the output of the following code?
   \`\`\`javascript
   const arr = [1, 2, 3];
   arr[5] = 5;
   console.log(arr.length);
   \`\`\`
   
   a) 3
   b) 5
   c) 6
   d) Error

2. Which method adds one or more elements to the end of an array?
   
   a) unshift()
   b) push()
   c) concat()
   d) append()

3. What's the best way to remove the last element from an array?
   
   a) delete arr[arr.length-1]
   b) arr.length = arr.length - 1
   c) arr.pop()
   d) arr.splice(arr.length-1, 1)

4. How do you check if a value exists in an array?
   
   a) arr.contains(value)
   b) arr.has(value)
   c) arr.includes(value)
   d) arr.indexOf(value) >= 0
   
5. What does the following code return?
   \`\`\`javascript
   [1, 2, 3, 4].map(x => x * 2);
   \`\`\`
   
   a) [1, 2, 3, 4, 1, 2, 3, 4]
   b) [2, 4, 6, 8]
   c) [1, 4, 9, 16]
   d) 2

Answers: 1-c, 2-b, 3-c, 4-c (or d), 5-b`;
      }
    } else if (topic === 'functions') {
      if (type === 'info') {
        return `# JavaScript Functions

Functions are reusable blocks of code designed to perform specific tasks. They help organize your code, make it more reusable, and easier to maintain.

## Declaring Functions

There are several ways to create functions in JavaScript:

### Function Declaration
\`\`\`javascript
function greet(name) {
  return "Hello, " + name + "!";
}
\`\`\`

### Function Expression
\`\`\`javascript
const greet = function(name) {
  return "Hello, " + name + "!";
};
\`\`\`

### Arrow Function (ES6)
\`\`\`javascript
const greet = (name) => {
  return "Hello, " + name + "!";
};

// Shorter syntax for simple returns
const greet = name => "Hello, " + name + "!";
\`\`\`

## Function Parameters and Arguments

- **Parameters** are variables listed in the function definition
- **Arguments** are values passed to the function when it's called

\`\`\`javascript
function add(a, b) { // a and b are parameters
  return a + b;
}

add(5, 3); // 5 and 3 are arguments
\`\`\`

## Return Values

Functions can return values using the \`return\` statement:

\`\`\`javascript
function multiply(a, b) {
  return a * b; // Returns the product
}

const result = multiply(4, 5); // result = 20
\`\`\`

Functions are one of the most important concepts in JavaScript. They allow you to write reusable, modular code that's easier to test and maintain.`;
      } else if (type === 'challenge' || type === 'quiz') {
        // Add challenge and quiz content for functions here
        return this.generateConceptsContent('functions', 'javascript');
      }
    }
    
    // Default generic content if topic is not specifically handled
    if (type === 'info') {
      return "This is an informational slide. The content provides explanations and examples.";
    } else if (type === 'challenge') {
      return "This is a coding challenge. Write code to solve the problem described below:\n\n[Challenge description]";
    } else {
      return "This is a quiz slide to test your knowledge. Answer the following questions:\n\n1. [Question 1]\n   a) Option A\n   b) Option B\n   c) Option C\n   d) Option D";
    }
  }
  
  private determineTagsFromMessage(message: string): string[] {
    const lowerMessage = message.toLowerCase();
    const tags = [];
    
    const commonTags = [
      'function', 'variable', 'loop', 'array', 
      'object', 'conditional', 'class', 'event',
      'dom', 'api', 'json', 'async', 'error',
      'debugging', 'testing', 'algorithm'
    ];
    
    for (const tag of commonTags) {
      if (lowerMessage.includes(tag)) {
        tags.push(tag);
      }
    }
    
    return tags.length > 0 ? tags : ['general'];
  }
  
  private generateInitialCodeFromMessage(message: string): string | undefined {
    const codeMarkers = [
      'with initial code:', 'initial code:', 'starting code:', 
      'code template:', 'code:'
    ];
    
    for (const marker of codeMarkers) {
      const markerIndex = message.indexOf(marker);
      if (markerIndex !== -1) {
        const codeStart = message.substring(markerIndex + marker.length).trim();
        
        // Check if the code is wrapped in code blocks
        if (codeStart.startsWith('```')) {
          const codeEnd = codeStart.indexOf('```', 3);
          if (codeEnd !== -1) {
            return codeStart.substring(3, codeEnd).trim();
          }
        }
        
        return codeStart;
      }
    }
    
    return "// Write your solution here\n\n";
  }
  
  private generateTestsFromMessage(message: string): Array<{id: string; name: string; description: string; validation: string; type: 'regex' | 'js'}> | undefined {
    // In a real AI implementation, this would generate tests based on the message content
    // For now, return simple default tests
    
    return [
      {
        id: `test-${Date.now()}-1`,
        name: "Function exists",
        description: "Check if the required function exists",
        validation: "return code.includes('function');",
        type: 'js'
      },
      {
        id: `test-${Date.now()}-2`,
        name: "Returns correct value",
        description: "Check if the function returns the expected value",
        validation: "return code.includes('return');",
        type: 'js'
      }
    ];
  }
  
  // Helper methods
  private detectLanguageFromTopic(topic: string): string {
    if (topic.includes('javascript') || topic.includes('js')) return 'javascript';
    if (topic.includes('python')) return 'python';
    if (topic.includes('html')) return 'html';
    if (topic.includes('css')) return 'css';
    // Default to JavaScript
    return 'javascript';
  }
  
  private generateTitle(topic: string, difficulty: string): string {
    // Create a more engaging title based on the topic
    const titlePrefixes = [
      'Mastering', 'Introduction to', 'Learning', 'Exploring', 
      'Fun with', 'Coding with', 'Discovering'
    ];
    
    const prefix = titlePrefixes[Math.floor(Math.random() * titlePrefixes.length)];
    
    // Capitalize first letter of each word in topic
    const formattedTopic = topic.replace(/\b\w/g, l => l.toUpperCase());
    
    return `${prefix} ${formattedTopic}`;
  }
  
  private generateSlidesForTopic(topic: string, language: string, difficulty: string): any[] {
    // Generate appropriate slides based on the topic and language
    const slides = [];
    
    // Introduction slide
    slides.push({
      title: `Introduction to ${this.capitalizeFirstLetter(topic)}`,
      content: this.generateIntroContent(topic, language),
      type: 'info',
      tags: ['introduction'],
    });
    
    // Concepts slide
    slides.push({
      title: `Key Concepts in ${this.capitalizeFirstLetter(topic)}`,
      content: this.generateConceptsContent(topic, language),
      type: 'info',
      tags: [topic, 'concepts'],
    });
    
    // Challenge slide
    slides.push({
      title: `Your First ${this.capitalizeFirstLetter(topic)} Challenge`,
      content: this.generateChallengeContent(topic, language),
      type: 'challenge',
      tags: [topic, 'challenge'],
      initialCode: this.generateInitialCode(topic, language),
      filename: this.getFilenameForLanguage(language),
      tests: this.generateTests(topic, language),
    });
    
    // Quiz slide
    slides.push({
      title: `Test Your Knowledge: ${this.capitalizeFirstLetter(topic)} Quiz`,
      content: this.generateQuizContent(topic, language),
      type: 'quiz',
      tags: [topic, 'quiz'],
    });
    
    return slides;
  }
  
  private capitalizeFirstLetter(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
  
  private generateIntroContent(topic: string, language: string): string {
    if (topic.includes('function')) {
      return "Functions are reusable blocks of code that perform a specific task. They are a fundamental concept in programming.\n\n> Functions help us organize our code, make it more reusable, and easier to maintain.\n\nIn this lesson, we'll learn how to create and use functions in JavaScript.";
    }
    
    if (topic.includes('variable')) {
      return "Variables are containers for storing data values. They are a fundamental concept in programming.\n\n> Variables allow us to store and manipulate data in our programs.\n\nIn this lesson, we'll learn how to declare and use variables in JavaScript.";
    }
    
    return `Welcome to this interactive lesson on ${topic}! In this lesson, you'll learn the basics of ${topic} and how to apply them in real-world scenarios.\n\n> ${this.capitalizeFirstLetter(topic)} is an essential concept in ${language} programming.\n\nLet's get started by exploring what ${topic} is and why it's important.`;
  }
  
  private generateConceptsContent(topic: string, language: string): string {
    if (topic.includes('function')) {
      return "Functions have several key components:\n\n1. **Function name**: A descriptive name that explains what the function does\n2. **Parameters**: Inputs that the function can accept\n3. **Function body**: The code that runs when the function is called\n4. **Return value**: The output of the function\n\n```\nfunction add(a, b) {\n  return a + b; // Return the sum\n}\n\nconst sum = add(5, 3); // Call the function\nconsole.log(sum); // Output: 8\n```\n\nFunctions can be called multiple times with different inputs, making your code more reusable and organized.";
    }
    
    if (topic.includes('variable')) {
      return "Variables in JavaScript can be declared using three keywords:\n\n1. **var**: The traditional way to declare variables (function-scoped)\n2. **let**: Modern way to declare variables that can be reassigned (block-scoped)\n3. **const**: For variables that should not be reassigned (block-scoped)\n\n```\n// Using let (can be reassigned)\nlet age = 16;\nage = 17; // Valid\n\n// Using const (cannot be reassigned)\nconst name = \"Alex\";\n// name = \"Sam\"; // This would cause an error\n```\n\nChoosing the right variable declaration is important for writing clean and bug-free code.";
    }
    
    return `Here are the key concepts you need to understand about ${topic}:\n\n1. **Definition**: ${this.getDefinitionForTopic(topic)}\n2. **Usage**: ${this.getUsageForTopic(topic)}\n3. **Best practices**: ${this.getBestPracticesForTopic(topic)}\n\n\`\`\`\n${this.getExampleCodeForTopic(topic, language)}\n\`\`\`\n\nUnderstanding these concepts will help you write better ${language} code.`;
  }
  
  private generateChallengeContent(topic: string, language: string): string {
    if (topic.includes('function')) {
      return "Now it's time to create your own function!\n\n> Functions are declared using the `function` keyword followed by a name, parentheses, and curly braces.\n\n```\nfunction greet(name) {\n  console.log(\"Hello, \" + name + \"!\");\n}\n\n// Call the function\ngreet(\"Alex\");\n```\n\nYour Challenge:\n\nCreate a function called `calculateArea` that takes the radius of a circle as a parameter and returns the area of the circle. Remember, the formula for the area of a circle is π * radius².\n\nHINT: You can use `Math.PI` for the value of π and `Math.pow(radius, 2)` or `radius * radius` for radius².";
    }
    
    if (topic.includes('variable')) {
      return "Let's practice working with variables!\n\n> Remember to use descriptive variable names that explain what data the variable contains.\n\n```\n// Good variable names\nlet userAge = 16;\nlet userName = \"Alex\";\n\n// Less helpful variable names\nlet a = 16;\nlet b = \"Alex\";\n```\n\nYour Challenge:\n\nCreate variables to store information about a student: name, age, and whether they are enrolled in a course. Then print a message that uses all these variables.\n\nHINT: Use `const` for values that won't change (like name) and `let` for values that might change (like age or enrollment status).";
    }
    
    return `It's time for a challenge! Let's put your knowledge of ${topic} to the test.\n\n> Remember: Practice is the key to mastering coding concepts.\n\n\`\`\`\n${this.getExampleCodeForTopic(topic, language)}\n\`\`\`\n\nYour Challenge:\n\n${this.getChallengeDescriptionForTopic(topic, language)}\n\nHINT: ${this.getHintForTopic(topic, language)}`;
  }
  
  private generateQuizContent(topic: string, language: string): string {
    return `Let's check your understanding of ${topic} with a quick quiz!\n\n1. What is the main purpose of ${topic} in ${language}?\n   a) To make code run faster\n   b) ${this.getQuizAnswerForTopic(topic, 'b')}\n   c) To reduce the file size of your program\n   d) To add visual effects to your program\n\n2. Which of the following is a best practice when using ${topic}?\n   a) ${this.getQuizAnswerForTopic(topic, 'a')}\n   b) Always use the shortest names possible\n   c) Avoid using comments\n   d) Copy and paste code instead\n\n3. What might happen if you don't use ${topic} correctly?\n   a) Your program will always crash\n   b) Nothing will happen\n   c) ${this.getQuizAnswerForTopic(topic, 'c')}\n   d) Your computer might overheat\n\nCheck your answers and see how well you understand ${topic}!`;
  }
  
  private getDefinitionForTopic(topic: string): string {
    const definitions: {[key: string]: string} = {
      'function': 'A reusable block of code designed to perform a particular task',
      'variable': 'A container for storing data values',
      'loop': 'A control structure that repeats a sequence of instructions',
      'array': 'A data structure used to store multiple values in a single variable',
      'object': 'A collection of related data and/or functionality',
      'conditional': 'A control structure that performs different actions based on whether a condition is true or false',
      'default': 'A specific coding concept that helps organize and structure your code'
    };
    
    // Find the first key that matches part of the topic
    for (const key in definitions) {
      if (topic.includes(key)) {
        return definitions[key];
      }
    }
    
    return definitions['default'];
  }
  
  private getUsageForTopic(topic: string): string {
    const usages: {[key: string]: string} = {
      'function': 'Functions are used to encapsulate code that performs a specific task, making programs more organized and maintainable',
      'variable': 'Variables are used to store, retrieve, and manipulate data throughout your program',
      'loop': 'Loops are used to execute a block of code multiple times without repeating the code itself',
      'array': 'Arrays are used to store multiple related values that can be accessed by their position in the list',
      'object': 'Objects are used to model real-world entities by storing related data and functions together',
      'conditional': 'Conditionals are used to make decisions in code, executing different code blocks based on different conditions',
      'default': 'This concept is commonly used to solve specific problems and make your code more efficient'
    };
    
    // Find the first key that matches part of the topic
    for (const key in usages) {
      if (topic.includes(key)) {
        return usages[key];
      }
    }
    
    return usages['default'];
  }
  
  private getBestPracticesForTopic(topic: string): string {
    const practices: {[key: string]: string} = {
      'function': 'Use descriptive function names, keep functions small and focused on a single task, and avoid side effects',
      'variable': 'Use descriptive variable names, declare variables with the appropriate scope, and use const for values that won\'t change',
      'loop': 'Be careful with loop conditions to avoid infinite loops, and consider using array methods instead of loops when possible',
      'array': 'Use array methods like map, filter, and reduce to transform data instead of writing complex loops',
      'object': 'Keep objects focused on a single responsibility and use meaningful property names',
      'conditional': 'Keep conditions simple and readable, and consider using switch statements for multiple conditions',
      'default': 'Write clean, readable code with good comments and follow established coding conventions'
    };
    
    // Find the first key that matches part of the topic
    for (const key in practices) {
      if (topic.includes(key)) {
        return practices[key];
      }
    }
    
    return practices['default'];
  }
  
  private getExampleCodeForTopic(topic: string, language: string): string {
    if (language === 'javascript') {
      const jsExamples: {[key: string]: string} = {
        'function': 'function calculateSum(a, b) {\n  return a + b;\n}\n\n// Call the function\nconst result = calculateSum(5, 3);\nconsole.log(result); // Output: 8',
        'variable': 'const name = "Alex";\nlet age = 16;\nlet isStudent = true;\n\nconsole.log(`${name} is ${age} years old.`);\n\n// Variables can be updated\nage = 17;\nconsole.log(`Now ${name} is ${age} years old.`);',
        'loop': 'const fruits = ["apple", "banana", "orange"];\n\n// For loop\nfor (let i = 0; i < fruits.length; i++) {\n  console.log(fruits[i]);\n}\n\n// For...of loop (simpler)\nfor (const fruit of fruits) {\n  console.log(fruit);\n}',
        'array': 'const colors = ["red", "green", "blue"];\n\n// Add to the end\ncolors.push("yellow");\n\n// Get the first item\nconst firstColor = colors[0];\n\n// Loop through an array\ncolors.forEach(color => {\n  console.log(`I like ${color}`);\n});',
        'object': 'const student = {\n  name: "Alex",\n  age: 16,\n  grades: [95, 87, 92],\n  calculateAverage: function() {\n    const sum = this.grades.reduce((total, grade) => total + grade, 0);\n    return sum / this.grades.length;\n  }\n};\n\nconsole.log(student.calculateAverage());',
        'conditional': 'const age = 16;\n\nif (age >= 18) {\n  console.log("You are an adult");\n} else if (age >= 13) {\n  console.log("You are a teenager");\n} else {\n  console.log("You are a child");\n}',
        'default': '// Example code\nconst value = 42;\nconsole.log(`The value is ${value}`);\n\n// More complex example\nfunction process(data) {\n  return data.map(item => item * 2);\n}'
      };
      
      // Find the first key that matches part of the topic
      for (const key in jsExamples) {
        if (topic.includes(key)) {
          return jsExamples[key];
        }
      }
      
      return jsExamples['default'];
    }
    
    // Default code example for any language
    return '// Example code for ' + topic + '\n// Replace this with your own code';
  }
  
  private getChallengeDescriptionForTopic(topic: string, language: string): string {
    if (language === 'javascript') {
      const challenges: {[key: string]: string} = {
        'function': 'Create a function called `calculateDiscount` that takes two parameters: the original price and the discount percentage. The function should return the final price after the discount is applied.',
        'variable': 'Create three variables to represent a video game character: `characterName` (a string), `healthPoints` (a number), and `hasWeapon` (a boolean). Then use these variables to print a status message.',
        'loop': 'Create a loop that counts from 1 to 10, but only prints numbers that are even. Use any type of loop you prefer.',
        'array': 'Create an array of your favorite movies. Then, add a new movie to the list, remove the first movie, and print the updated list.',
        'object': 'Create an object to represent a book with properties for title, author, year, and a method that returns a string describing the book.',
        'conditional': 'Write code that asks for the current temperature and then gives appropriate clothing advice based on whether it\'s hot, warm, cool, or cold.',
        'default': 'Use what you\'ve learned about coding to solve a simple problem. Create a program that performs a specific task and demonstrates your understanding of basic programming concepts.'
      };
      
      // Find the first key that matches part of the topic
      for (const key in challenges) {
        if (topic.includes(key)) {
          return challenges[key];
        }
      }
      
      return challenges['default'];
    }
    
    // Default challenge for any language
    return 'Apply what you\'ve learned about ' + topic + ' to solve a simple problem. Create code that demonstrates your understanding of this concept.';
  }
  
  private getHintForTopic(topic: string, language: string): string {
    if (language === 'javascript') {
      const hints: {[key: string]: string} = {
        'function': 'Remember the formula: finalPrice = originalPrice - (originalPrice * (discountPercentage / 100))',
        'variable': 'Use const for characterName since it won\'t change, and let for healthPoints since it might change during the game',
        'loop': 'You can use the modulo operator (%) to check if a number is even: if (number % 2 === 0)',
        'array': 'Use array methods like push() to add items and shift() to remove the first item',
        'object': 'Object methods are just functions attached to object properties',
        'conditional': 'Use if/else if/else statements to handle different temperature ranges',
        'default': 'Break down the problem into smaller steps and tackle each one separately'
      };
      
      // Find the first key that matches part of the topic
      for (const key in hints) {
        if (topic.includes(key)) {
          return hints[key];
        }
      }
      
      return hints['default'];
    }
    
    // Default hint for any language
    return 'Think about the key concepts we discussed and how they apply to this challenge. Don\'t be afraid to experiment!';
  }
  
  private getQuizAnswerForTopic(topic: string, option: string): string {
    if (topic.includes('function')) {
      const answers: {[key: string]: string} = {
        'a': 'Give functions descriptive names that explain what they do',
        'b': 'To organize code into reusable blocks',
        'c': 'Your code may be harder to maintain and have repeated logic'
      };
      return answers[option];
    }
    
    if (topic.includes('variable')) {
      const answers: {[key: string]: string} = {
        'a': 'Use descriptive variable names',
        'b': 'To store and track information in your program',
        'c': 'You might accidentally change values or use incorrect data types'
      };
      return answers[option];
    }
    
    // Default answers
    const defaultAnswers: {[key: string]: string} = {
      'a': 'Follow established coding conventions',
      'b': 'To make your code more organized and maintainable',
      'c': 'Your code might have bugs or be difficult to maintain'
    };
    return defaultAnswers[option];
  }
  
  private generateInitialCode(topic: string, language: string): string {
    if (language === 'javascript') {
      if (topic.includes('function')) {
        return "// Write your calculateDiscount function here\n\n\n// Example usage (uncomment to test):\n// const originalPrice = 100;\n// const discountPercent = 20;\n// const finalPrice = calculateDiscount(originalPrice, discountPercent);\n// console.log(finalPrice); // Should output: 80";
      }
      
      if (topic.includes('variable')) {
        return "// Create your character variables here\n\n\n// Print a status message using your variables\n";
      }
      
      return "// Write your code here\n// Don't forget to test your solution!\n";
    }
    
    // Default for any language
    return "// Write your code here\n// Don't forget to test your solution!\n";
  }
  
  private getFilenameForLanguage(language: string): string {
    const fileExtensions: {[key: string]: string} = {
      'javascript': 'script.js',
      'python': 'script.py',
      'html': 'index.html',
      'css': 'styles.css'
    };
    
    return fileExtensions[language] || 'script.js';
  }
  
  private generateTests(topic: string, language: string): Array<{id: string; name: string; description: string; validation: string; type: 'regex' | 'js'}> {
    if (language === 'javascript') {
      if (topic.includes('function')) {
        return [
          {
            id: "test-1",
            name: "Function exists",
            description: "Your code should include a function called calculateDiscount",
            validation: "return code.includes('function calculateDiscount')",
            type: "js"
          },
          {
            id: "test-2", 
            name: "Function returns correct value",
            description: "calculateDiscount(100, 20) should return 80",
            validation: "try { const fn = new Function('return ' + code + '; calculateDiscount(100, 20);'); return Math.abs(fn() - 80) < 0.1; } catch(e) { return false; }",
            type: "js"
          },
          {
            id: "test-3",
            name: "Function handles zero discount",
            description: "calculateDiscount(50, 0) should return 50",
            validation: "try { const fn = new Function('return ' + code + '; calculateDiscount(50, 0);'); return Math.abs(fn() - 50) < 0.1; } catch(e) { return false; }",
            type: "js"
          }
        ];
      }
      
      if (topic.includes('variable')) {
        return [
          {
            id: "test-1",
            name: "Character name variable exists",
            description: "Your code should include a variable for the character name",
            validation: "return /\\b(const|let|var)\\s+\\w*[nN]ame\\b/.test(code)",
            type: "js"
          },
          {
            id: "test-2",
            name: "Health points variable exists",
            description: "Your code should include a variable for health points",
            validation: "return /\\b(const|let|var)\\s+\\w*(health|hp|points|life)\\w*\\s*=\\s*\\d+/.test(code)",
            type: "js"
          },
          {
            id: "test-3",
            name: "Status message is printed",
            description: "Your code should print a message using console.log",
            validation: "return code.includes('console.log')",
            type: "js"
          }
        ];
      }
      
      // Default tests
      return [
        {
          id: "test-1",
          name: "Code runs without errors",
          description: "Your code should execute without any errors",
          validation: "try { new Function(code)(); return true; } catch(e) { return false; }",
          type: "js"
        },
        {
          id: "test-2",
          name: "Solution implemented",
          description: "Your code should implement a solution to the challenge",
          validation: "return code.trim().length > 30",
          type: "js"
        }
      ];
    }
    
    // Default tests for any language
    return [
      {
        id: "test-1",
        name: "Code contains a solution",
        description: "Your code should contain a solution to the challenge",
        validation: "return code.trim().length > 20",
        type: "js"
      }
    ];
  }
}

export const aiService = new AIService();
