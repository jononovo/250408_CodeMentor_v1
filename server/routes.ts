import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { aiService } from "./services/aiService";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  
  // Lessons
  app.get("/api/lessons", async (_req, res) => {
    try {
      const lessons = await storage.getLessons();
      res.json(lessons);
    } catch (error) {
      console.error("Error fetching lessons:", error);
      res.status(500).json({ message: "Failed to fetch lessons" });
    }
  });

  app.get("/api/lessons/:id", async (req, res) => {
    try {
      const lessonId = parseInt(req.params.id);
      const lesson = await storage.getLesson(lessonId);

      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }

      // Get slides for this lesson
      const slides = await storage.getSlidesByLessonId(lessonId);
      
      // Return lesson with slides
      res.json({
        ...lesson,
        slides: slides.sort((a, b) => a.order - b.order),
      });
    } catch (error) {
      console.error("Error fetching lesson:", error);
      res.status(500).json({ message: "Failed to fetch lesson" });
    }
  });

  app.post("/api/lessons", async (req, res) => {
    try {
      const { topic, difficulty, description } = req.body;
      
      if (!topic) {
        return res.status(400).json({ message: "Topic is required" });
      }

      // Generate a lesson using AI
      const generatedLesson = await aiService.generateLesson(topic, difficulty, description);
      
      // Create lesson in storage
      const lesson = await storage.createLesson({
        title: generatedLesson.title,
        description: generatedLesson.description,
        difficulty: difficulty || "beginner",
        language: generatedLesson.language || "javascript",
        estimatedTime: generatedLesson.estimatedTime || "15 min",
      });

      // Create slides
      if (generatedLesson.slides && generatedLesson.slides.length > 0) {
        for (let i = 0; i < generatedLesson.slides.length; i++) {
          const slideData = generatedLesson.slides[i];
          await storage.createSlide({
            lessonId: lesson.id,
            title: slideData.title,
            content: slideData.content,
            type: slideData.type,
            order: i,
            tags: slideData.tags || [],
            initialCode: slideData.initialCode,
            filename: slideData.filename,
            tests: slideData.tests || [],
          });
        }
      }

      res.status(201).json(lesson);
    } catch (error) {
      console.error("Error creating lesson:", error);
      res.status(500).json({ message: "Failed to create lesson" });
    }
  });

  // Slide updates
  app.patch("/api/lessons/:lessonId/slides/:slideId", async (req, res) => {
    try {
      const lessonId = parseInt(req.params.lessonId);
      const slideId = parseInt(req.params.slideId);
      
      const slide = await storage.getSlide(slideId);
      if (!slide || slide.lessonId !== lessonId) {
        return res.status(404).json({ message: "Slide not found" });
      }
      
      const updatedSlide = await storage.updateSlide(slideId, req.body);
      res.json(updatedSlide);
    } catch (error) {
      console.error("Error updating slide:", error);
      res.status(500).json({ message: "Failed to update slide" });
    }
  });

  // Chats
  app.get("/api/chats/:lessonId", async (req, res) => {
    try {
      const lessonId = parseInt(req.params.lessonId);
      const chat = await storage.getChatByLessonId(lessonId);
      
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      
      // Get messages for this chat
      const messages = await storage.getMessagesByChatId(chat.id);
      
      // Return chat with messages
      res.json({
        ...chat,
        messages,
      });
    } catch (error) {
      console.error("Error fetching chat:", error);
      res.status(500).json({ message: "Failed to fetch chat" });
    }
  });

  app.post("/api/chats", async (req, res) => {
    try {
      const { lessonId } = req.body;
      
      let title = "New Chat";
      if (lessonId) {
        const lesson = await storage.getLesson(parseInt(lessonId));
        if (lesson) {
          title = `Chat for ${lesson.title}`;
        }
      }
      
      const chat = await storage.createChat({
        lessonId: lessonId ? parseInt(lessonId) : undefined,
        title,
      });
      
      // Add welcome message
      const welcomeMessage = await storage.createMessage({
        chatId: chat.id,
        role: "assistant",
        content: "Hi there! I'm Mumu, your coding mentor. How can I help you with your coding journey today?",
      });
      
      res.status(201).json({
        ...chat,
        messages: [welcomeMessage],
      });
    } catch (error) {
      console.error("Error creating chat:", error);
      res.status(500).json({ message: "Failed to create chat" });
    }
  });

  // Messages
  app.post("/api/chats/:chatId/messages", async (req, res) => {
    try {
      const chatId = parseInt(req.params.chatId);
      const { content } = req.body;
      
      if (!content) {
        return res.status(400).json({ message: "Message content is required" });
      }
      
      const chat = await storage.getChat(chatId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      
      // Store user message
      await storage.createMessage({
        chatId,
        role: "user",
        content,
      });
      
      // Generate AI response
      const aiResponse = await aiService.generateResponse(content, chatId);
      
      // Store AI message
      const message = await storage.createMessage({
        chatId,
        role: "assistant",
        content: aiResponse,
      });
      
      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
