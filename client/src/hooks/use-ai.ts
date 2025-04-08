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
          const response = await apiRequest('GET', `/api/chats/${lessonId}`);
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
        const response = await apiRequest('POST', '/api/chats', { lessonId });
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

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
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
