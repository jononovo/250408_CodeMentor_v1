import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { Chat, Message } from '@/types';

export function useAI(lessonId?: string) {
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize chat or load existing chat
  useEffect(() => {
    const loadExistingChat = async () => {
      if (lessonId) {
        try {
          // This route gets a chat by lesson ID (not chat ID)
          // Convert lessonId string from URL to number for API
          const lessonIdNum = parseInt(lessonId, 10);
          const response = await apiRequest('GET', `/api/chats/${lessonIdNum}`);
          const data = await response.json();
          setChat(data);
          setMessages(data.messages || []);
        } catch (err) {
          console.error('Error loading chat:', err);
          // Create a new chat for this lesson if none exists
          createNewChat();
        }
      }
    };

    const createNewChat = async () => {
      try {
        // Make sure lessonId is converted to a number if provided
        const payload = lessonId ? { lessonId: parseInt(lessonId, 10) } : {};
        const response = await apiRequest('POST', '/api/chats', payload);
        const data = await response.json();
        setChat(data);
        setMessages(data.messages || []);
      } catch (err) {
        console.error('Error creating chat:', err);
        setError('Failed to create chat');
      }
    };

    if (lessonId) {
      loadExistingChat();
    } else {
      createNewChat();
    }
  }, [lessonId]);

  // Send message to AI
  const sendMessage = async (content: string) => {
    if (!chat || !content.trim()) return;

    // Temporary message for UI only, backend will create the real one
    const userMessage = {
      id: -1, // Temporary ID, will be replaced by the real one from the server
      role: 'user' as const,
      content,
      timestamp: Date.now()
    };

    // Update UI immediately with user message
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest('POST', `/api/chats/${chat.id}/messages`, {
        content
      });
      
      const data = await response.json();
      
      // Add AI response to messages
      setMessages(prev => [...prev, data]);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  return { chat, messages, sendMessage, isLoading, error };
}
