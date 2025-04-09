import { useState, useRef, useEffect } from 'react';
import { X, ChevronUp, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAI } from '@/hooks/use-ai';
import { Chat, Message } from '@/types';

// Track which messages have been processed for lesson creation
const processedMessages = new Set<number>();

interface ChatPanelProps {
  lessonId?: string;
  onNewLesson?: (title: string) => void;
}

export default function ChatPanel({ lessonId, onNewLesson }: ChatPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const { chat, messages, sendMessage, isLoading } = useAI(lessonId);

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      sendMessage(message);
      setMessage('');
    }
  };

  const toggleMinimized = () => {
    setIsMinimized(!isMinimized);
    // Focus input when maximizing
    if (isMinimized && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
    }
  };

  const formatMessage = (content: string, messageId: number = -1) => {
    // Check for lesson creation metadata and handle it
    if (content.includes('__LESSON_CREATED__:')) {
      const metaMatch = content.match(/__LESSON_CREATED__:(\d+):(.+)$/);
      
      if (metaMatch && onNewLesson && !processedMessages.has(messageId)) {
        // Extract lessonId and title
        const lessonTitle = metaMatch[2];
        
        // Mark this message as processed
        processedMessages.add(messageId);
        
        // Call the onNewLesson callback with the title
        setTimeout(() => {
          if (onNewLesson) onNewLesson(lessonTitle);
        }, 500);
        
        // Remove the metadata from the message for display
        content = content.replace(/__LESSON_CREATED__:\d+:.+$/, '');
      } else {
        // Always remove the metadata from the message for display, 
        // even if we've already processed it
        content = content.replace(/__LESSON_CREATED__:\d+:.+$/, '');
      }
    }
    
    // Handle code blocks
    let formattedContent = content;
    const codeBlockRegex = /```([\s\S]+?)```/g;
    
    formattedContent = formattedContent.replace(codeBlockRegex, (match, code) => {
      return `<pre class="bg-white p-2 rounded mt-2 text-xs font-mono overflow-x-auto">${code}</pre>`;
    });
    
    // Handle inline code
    const inlineCodeRegex = /`(.+?)`/g;
    formattedContent = formattedContent.replace(inlineCodeRegex, (match, code) => {
      return `<code class="bg-gray-100 px-1 py-0.5 rounded text-primary-700 font-mono">${code}</code>`;
    });
    
    return formattedContent;
  };

  const formatTime = (timestamp: string | number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed bottom-4 right-4 z-10">
      {isMinimized ? (
        <Button 
          onClick={toggleMinimized}
          className="bg-primary text-white rounded-full p-3 shadow-lg float-right"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <line x1="9" y1="10" x2="15" y2="10" />
            <line x1="12" y1="7" x2="12" y2="13" />
          </svg>
        </Button>
      ) : (
        <div className="bg-white rounded-lg shadow-lg w-96 max-h-[500px] flex flex-col overflow-hidden">
          <div className="bg-primary text-white p-3 flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center mr-2">
                <span className="text-primary font-bold">M</span>
              </div>
              <h3 className="font-display font-medium">Mumu the Coding Mentor</h3>
            </div>
            <div className="flex">
              <button 
                className="text-white hover:text-gray-200"
                onClick={toggleMinimized}
              >
                <ChevronUp className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-center text-gray-500">
                <div>
                  <p>Welcome to CodeMumu!</p>
                  <p className="text-sm mt-2">Ask me to create a new coding lesson for you, or help with your current challenge.</p>
                </div>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div key={index} className={`flex items-start ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role !== 'user' && (
                    <div className="flex-shrink-0 mr-3">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary font-bold">M</span>
                      </div>
                    </div>
                  )}
                  <div className={`rounded-lg p-3 max-w-[85%] ${
                    msg.role === 'user' 
                      ? 'bg-primary-100' 
                      : 'bg-gray-100'
                  }`}>
                    <div 
                      className="text-sm text-gray-800"
                      dangerouslySetInnerHTML={{ __html: formatMessage(msg.content, msg.id) }}
                    />
                    <span className="text-xs text-gray-500 block mt-1">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  {msg.role === 'user' && (
                    <div className="flex-shrink-0 ml-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 font-bold">Y</span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary font-bold">M</span>
                  </div>
                </div>
                <div className="bg-gray-100 rounded-lg p-3 max-w-[85%]">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '600ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="border-t p-3">
            <form className="flex flex-col" onSubmit={handleSubmit}>
              <div className="flex">
                <textarea 
                  ref={inputRef}
                  className="flex-1 border border-gray-300 rounded-l-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[60px] resize-none" 
                  placeholder="Ask Mumu for help..." 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={isLoading}
                  rows={3}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                <Button 
                  type="submit" 
                  className="bg-primary text-white rounded-r-md py-2 px-3 hover:bg-primary/90 h-auto self-stretch"
                  disabled={isLoading}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-xs text-gray-500 mt-1 text-right">
                Press Shift+Enter for new line, Enter to send
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
