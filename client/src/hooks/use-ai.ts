import { useState, useEffect } from 'react';
import { apiRequest, queryClient } from '@/lib/queryClient';
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
  const sendMessage = async (content: string, persona?: 'mumu' | 'baloo') => {
    if (!chat || !content.trim()) return;

    // Add persona context to the message before sending to backend
    const contextualContent = 
      persona === 'mumu' 
        ? `[As Mumu the Coding Ninja 🐯] ${content}`
        : persona === 'baloo'
          ? `[As Baloo the Lesson Creator 🐻] ${content}`
          : content;
    
    // Temporary message for UI only, backend will create the real one
    const userMessage = {
      id: -1, // Temporary ID, will be replaced by the real one from the server
      role: 'user' as const,
      content, // Show the original content to the user (without persona context)
      timestamp: Date.now()
    };

    // Update UI immediately with user message
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      // Send the contextual content to the backend
      const response = await apiRequest('POST', `/api/chats/${chat.id}/messages`, {
        content: contextualContent
      });
      
      const data = await response.json();
      
      // Add AI response to messages
      setMessages(prev => [...prev, data]);
      
      // If this is a lesson chat, refresh the lesson data
      // This makes sure any slide changes are visible immediately
      if (lessonId) {
        queryClient.invalidateQueries({ queryKey: [`/api/lessons/${lessonId}`] });
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  return { chat, messages, sendMessage, isLoading, error };
}
