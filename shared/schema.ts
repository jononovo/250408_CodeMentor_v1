import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Lessons table
export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  difficulty: text("difficulty").notNull().default("beginner"),
  language: text("language").notNull().default("javascript"),
  format: text("format").notNull().default("markdown"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  estimatedTime: text("estimated_time"),
  styleName: text("style_name"), // Brown Markdown, Neon Racer, etc.
  cssContent: text("css_content"), // Shared CSS across all slides
  jsContent: text("js_content"), // Shared JavaScript across all slides
});

export const insertLessonSchema = createInsertSchema(lessons).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Slides table
export const slides = pgTable("slides", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id").notNull().references(() => lessons.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull().default("info"),
  order: integer("order").notNull(),
  tags: json("tags").$type<string[]>().default([]),
  completed: boolean("completed").notNull().default(false),
  initialCode: text("initial_code"),
  filename: text("filename"),
  cssContent: text("css_content"),
  jsContent: text("js_content"),
  tests: json("tests").$type<{
    id: string;
    name: string;
    description: string;
    validation: string;
    type: 'regex' | 'js';
  }[]>().default([]),
});

export const insertSlideSchema = createInsertSchema(slides).omit({
  id: true
});

// Chats table
export const chats = pgTable("chats", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id").references(() => lessons.id),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertChatSchema = createInsertSchema(chats).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Messages table
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").notNull().references(() => chats.id),
  role: text("role").notNull().default("user"),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true
});

// User type
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Export types
export type Lesson = typeof lessons.$inferSelect;
export type InsertLesson = z.infer<typeof insertLessonSchema>;

export type Slide = typeof slides.$inferSelect;
export type InsertSlide = z.infer<typeof insertSlideSchema>;

export type Chat = typeof chats.$inferSelect;
export type InsertChat = z.infer<typeof insertChatSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
