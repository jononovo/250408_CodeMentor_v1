import {
  type Lesson,
  type InsertLesson,
  type Slide,
  type InsertSlide,
  type Chat,
  type InsertChat,
  type Message,
  type InsertMessage,
  type User,
  type InsertUser,
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Lessons
  getLessons(): Promise<Lesson[]>;
  getLesson(id: number): Promise<Lesson | undefined>;
  createLesson(lesson: InsertLesson): Promise<Lesson>;
  updateLesson(id: number, lesson: Partial<Lesson>): Promise<Lesson>;
  deleteLesson(id: number): Promise<boolean>;
  
  // Slides
  getSlide(id: number): Promise<Slide | undefined>;
  getSlidesByLessonId(lessonId: number): Promise<Slide[]>;
  createSlide(slide: InsertSlide): Promise<Slide>;
  updateSlide(id: number, slide: Partial<Slide>): Promise<Slide>;
  deleteSlide(id: number): Promise<boolean>;
  
  // Chats
  getChat(id: number): Promise<Chat | undefined>;
  getChatByLessonId(lessonId: number): Promise<Chat | undefined>;
  createChat(chat: InsertChat): Promise<Chat>;
  updateChat(id: number, chat: Partial<Chat>): Promise<Chat>;
  deleteChat(id: number): Promise<boolean>;
  
  // Messages
  getMessage(id: number): Promise<Message | undefined>;
  getMessagesByChatId(chatId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private lessons: Map<number, Lesson>;
  private slides: Map<number, Slide>;
  private chats: Map<number, Chat>;
  private messages: Map<number, Message>;
  
  private userId: number;
  private lessonId: number;
  private slideId: number;
  private chatId: number;
  private messageId: number;

  constructor() {
    this.users = new Map();
    this.lessons = new Map();
    this.slides = new Map();
    this.chats = new Map();
    this.messages = new Map();
    
    this.userId = 1;
    this.lessonId = 1;
    this.slideId = 1;
    this.chatId = 1;
    this.messageId = 1;
    
    // Add some initial data
    this.initializeData();
  }

  // Initialize with sample data
  private initializeData() {
    // Sample JavaScript lesson
    const jsLesson: Lesson = {
      id: this.lessonId++,
      title: "JavaScript Basics",
      description: "Learn the fundamentals of JavaScript programming language.",
      difficulty: "beginner",
      language: "javascript",
      createdAt: new Date(),
      updatedAt: new Date(),
      estimatedTime: "15 min",
    };
    this.lessons.set(jsLesson.id, jsLesson);
    
    // Sample slides for JavaScript lesson
    const slides = [
      {
        id: this.slideId++,
        lessonId: jsLesson.id,
        title: "Introduction to JavaScript",
        content: "JavaScript is a programming language that powers the dynamic behavior on websites. It's an essential skill for web development.\n\n> JavaScript was created in 1995 by Brendan Eich while he was an engineer at Netscape Communications.\n\nIn this lesson, we'll learn the basics of JavaScript functions.",
        type: "info",
        order: 0,
        tags: ["introduction", "history"],
        completed: false,
      },
      {
        id: this.slideId++,
        lessonId: jsLesson.id,
        title: "What is a Function?",
        content: "Functions are reusable blocks of code that perform a specific task.\n\n```\nfunction greet() {\n  console.log(\"Hello, world!\");\n}\n\n// Call the function\ngreet();\n```\n\nFunctions help us organize code, make it reusable, and easier to maintain.",
        type: "info",
        order: 1,
        tags: ["functions"],
        completed: false,
      },
      {
        id: this.slideId++,
        lessonId: jsLesson.id,
        title: "Creating Your First Function",
        content: "Functions are like mini-programs that can be used over and over. They're perfect when you need to perform the same task multiple times!\n\n> Function Syntax\n```\nfunction nameOfFunction() {\n  // Code goes here\n  console.log(\"Hello from the function!\");\n}\n```\n\nYour Challenge:\n\nCreate a function called `buildDoghouse` that prints `\"Woof! Thanks for my new home!\"` to the console when called.\n\nHINT: Remember, you need to both define your function and then call it for something to happen!",
        type: "challenge",
        order: 2,
        tags: ["functions"],
        initialCode: "// Write your code here\n// Don't forget to define and call your function!",
        filename: "script.js",
        tests: [
          {
            id: "test-1",
            name: "Function exists",
            description: "Your code should include a function called buildDoghouse",
            validation: "return code.includes('function buildDoghouse')",
            type: "js"
          },
          {
            id: "test-2",
            name: "Function outputs correct message",
            description: "The function should print \"Woof! Thanks for my new home!\"",
            validation: "return code.includes('\"Woof! Thanks for my new home!\"') || code.includes(\"'Woof! Thanks for my new home!'\")",
            type: "js"
          },
          {
            id: "test-3",
            name: "Function is called",
            description: "You need to call your function to see the output",
            validation: "return code.includes('buildDoghouse()')",
            type: "js"
          }
        ],
        completed: false,
      }
    ];
    
    slides.forEach(slide => {
      this.slides.set(slide.id, slide as Slide);
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Lesson methods
  async getLessons(): Promise<Lesson[]> {
    return Array.from(this.lessons.values());
  }

  async getLesson(id: number): Promise<Lesson | undefined> {
    return this.lessons.get(id);
  }

  async createLesson(insertLesson: InsertLesson): Promise<Lesson> {
    const id = this.lessonId++;
    const now = new Date();
    const lesson = { 
      ...insertLesson, 
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.lessons.set(id, lesson);
    return lesson;
  }

  async updateLesson(id: number, partialLesson: Partial<Lesson>): Promise<Lesson> {
    const lesson = this.lessons.get(id);
    if (!lesson) {
      throw new Error(`Lesson with id ${id} not found`);
    }
    
    const updatedLesson = { 
      ...lesson, 
      ...partialLesson, 
      updatedAt: new Date() 
    };
    this.lessons.set(id, updatedLesson);
    return updatedLesson;
  }

  async deleteLesson(id: number): Promise<boolean> {
    return this.lessons.delete(id);
  }

  // Slide methods
  async getSlide(id: number): Promise<Slide | undefined> {
    return this.slides.get(id);
  }

  async getSlidesByLessonId(lessonId: number): Promise<Slide[]> {
    return Array.from(this.slides.values()).filter(
      (slide) => slide.lessonId === lessonId
    );
  }

  async createSlide(insertSlide: InsertSlide): Promise<Slide> {
    const id = this.slideId++;
    const slide = { ...insertSlide, id };
    this.slides.set(id, slide);
    return slide;
  }

  async updateSlide(id: number, partialSlide: Partial<Slide>): Promise<Slide> {
    const slide = this.slides.get(id);
    if (!slide) {
      throw new Error(`Slide with id ${id} not found`);
    }
    
    const updatedSlide = { ...slide, ...partialSlide };
    this.slides.set(id, updatedSlide);
    return updatedSlide;
  }

  async deleteSlide(id: number): Promise<boolean> {
    return this.slides.delete(id);
  }

  // Chat methods
  async getChat(id: number): Promise<Chat | undefined> {
    return this.chats.get(id);
  }

  async getChatByLessonId(lessonId: number): Promise<Chat | undefined> {
    return Array.from(this.chats.values()).find(
      (chat) => chat.lessonId === lessonId
    );
  }

  async createChat(insertChat: InsertChat): Promise<Chat> {
    const id = this.chatId++;
    const now = new Date();
    const chat = { 
      ...insertChat, 
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.chats.set(id, chat);
    return chat;
  }

  async updateChat(id: number, partialChat: Partial<Chat>): Promise<Chat> {
    const chat = this.chats.get(id);
    if (!chat) {
      throw new Error(`Chat with id ${id} not found`);
    }
    
    const updatedChat = { 
      ...chat, 
      ...partialChat, 
      updatedAt: new Date() 
    };
    this.chats.set(id, updatedChat);
    return updatedChat;
  }

  async deleteChat(id: number): Promise<boolean> {
    return this.chats.delete(id);
  }

  // Message methods
  async getMessage(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async getMessagesByChatId(chatId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter((message) => message.chatId === chatId)
      .sort((a, b) => {
        if (a.timestamp instanceof Date && b.timestamp instanceof Date) {
          return a.timestamp.getTime() - b.timestamp.getTime();
        }
        return 0;
      });
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageId++;
    const now = new Date();
    const message = { 
      ...insertMessage, 
      id, 
      timestamp: insertMessage.timestamp || now 
    };
    this.messages.set(id, message);
    return message;
  }
}

export const storage = new MemStorage();
