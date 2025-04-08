export interface Lesson {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  language: string;
  format: 'markdown' | 'html';
  createdAt: number;
  updatedAt: number;
  slides: Slide[];
  estimatedTime?: string;
}

export interface Slide {
  id: string;
  lessonId: string;
  title: string;
  content: string;
  type: 'info' | 'challenge' | 'quiz';
  order: number;
  tags: string[];
  completed?: boolean;
  initialCode?: string;
  filename?: string;
  cssContent?: string;
  jsContent?: string;
  tests?: {
    id: string;
    name: string;
    description: string;
    validation: string;
    type: 'regex' | 'js';
  }[];
}

export interface Chat {
  id: number;
  lessonId?: number;
  title: string;
  createdAt: string | number;
  updatedAt: string | number;
  messages: Message[];
}

export interface Message {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string | number;
}

export interface Test {
  id: string;
  name: string;
  description: string;
  validation: string;
  type: 'regex' | 'js';
}

export interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  message?: string;
}
