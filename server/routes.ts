import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { restackOpenAIService } from "./services/restack/openaiService";
import { WebSocketServer } from "ws";

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

      // Generate a lesson using AI with the Restack OpenAI integration
      const generatedLesson = await restackOpenAIService.generateLesson(topic, difficulty);
      
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

  // Create new slide
  app.post("/api/lessons/:lessonId/slides", async (req, res) => {
    try {
      const lessonId = parseInt(req.params.lessonId);
      
      // Validate if lesson exists
      const lesson = await storage.getLesson(lessonId);
      if (!lesson) {
        return res.status(404).json({ message: "Lesson not found" });
      }
      
      // Get existing slides to determine order
      const slides = await storage.getSlidesByLessonId(lessonId);
      const order = slides.length;
      
      // Extract slide data from request
      const { title, content, type, tags, initialCode, filename, tests } = req.body;
      
      // Create the new slide
      const newSlide = await storage.createSlide({
        lessonId,
        title,
        content,
        type,
        order,
        tags: tags || [],
        initialCode,
        filename,
        tests: tests || []
      });
      
      res.status(201).json(newSlide);
    } catch (error) {
      console.error("Error creating slide:", error);
      res.status(500).json({ message: "Failed to create slide" });
    }
  });

  // Update existing slide
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
  
  // Delete slide
  app.delete("/api/lessons/:lessonId/slides/:slideId", async (req, res) => {
    try {
      const lessonId = parseInt(req.params.lessonId);
      const slideId = parseInt(req.params.slideId);
      
      const slide = await storage.getSlide(slideId);
      if (!slide || slide.lessonId !== lessonId) {
        return res.status(404).json({ message: "Slide not found" });
      }
      
      // Delete the slide
      await storage.deleteSlide(slideId);
      
      // Reorder remaining slides
      const slides = await storage.getSlidesByLessonId(lessonId);
      const sortedSlides = slides.sort((a, b) => a.order - b.order);
      
      for (let i = 0; i < sortedSlides.length; i++) {
        if (sortedSlides[i].order !== i) {
          await storage.updateSlide(sortedSlides[i].id, { order: i });
        }
      }
      
      res.status(200).json({ message: "Slide deleted successfully" });
    } catch (error) {
      console.error("Error deleting slide:", error);
      res.status(500).json({ message: "Failed to delete slide" });
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
      
      // Generate AI response using Restack OpenAI integration
      // Handle the case where lessonId might be null
      const lessonId = typeof chat.lessonId === 'number' ? chat.lessonId : undefined;
      const aiResponse = await restackOpenAIService.generateResponse(content, chatId, lessonId);
      
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
  
  // Create WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'chat_message') {
          const { chatId, content, lessonId } = data;
          
          // Generate AI response using Restack OpenAI integration
          const response = await restackOpenAIService.generateResponse(content, chatId, lessonId);
          
          // Send the response back to the client
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({
              type: 'chat_response',
              chatId,
              response
            }));
          }
        }
      } catch (error: any) {
        console.error('Error processing WebSocket message:', error);
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({
            type: 'error',
            error: error.message
          }));
        }
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });
  
  return httpServer;
}
