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
  const [agentPersona, setAgentPersona] = useState<'mumu' | 'baloo'>('mumu');
  
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
      // Set the current persona in the hook state but don't add it to the visible message
      sendMessage(message, agentPersona === 'mumu' ? 'mumu' : 'baloo');
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
    
    // Check for the lesson generation in progress message
    if (content.includes('__LESSON_GENERATING__:')) {
      // This triggers the actual generation
      const metaMatch = content.match(/__LESSON_GENERATING__:([^:]+):([^:]+)$/);
      
      if (metaMatch && !processedMessages.has(messageId)) {
        // Extract topic and style
        const topic = metaMatch[1];
        const style = metaMatch[2];
        
        // Mark this message as processed
        processedMessages.add(messageId);
        
        // Send a follow-up message to create the lesson with the selected style
        setTimeout(() => {
          sendMessage(`Create a new lesson about ${topic} with the ${style} style`, 'baloo');
        }, 500);
        
        // Remove the metadata from the message for display
        content = content.replace(/__LESSON_GENERATING__:[^:]+:[^:]+$/, '');
      } else {
        // Always remove the metadata from the message for display
        content = content.replace(/__LESSON_GENERATING__:[^:]+:[^:]+$/, '');
      }
    }
    
    // Check for style selection options in the lesson proposal
    // Look for the "Choose a Style" section in the message
    if (content.includes('Choose a Style:') && 
        (content.includes('Brown Markdown') || 
         content.includes('Neon Racer') || 
         content.includes('Interaction Galore') || 
         content.includes('Practical Project'))) {
      
      // Extract the topic from the message
      const topicMatch = content.match(/about\s+\*\*([^*]+)\*\*/i) || 
                         content.match(/Learn(?:ing)?\s+([^-]+)/i) ||
                         content.match(/lesson\s+(?:about|on)\s+([^!.]+)/i);
      
      let topic = "programming";
      if (topicMatch && topicMatch[1]) {
        topic = topicMatch[1].trim();
      }
      
      // Remove the "Choose a Style" section from the content
      const styleSection = content.indexOf('## 🎨 Choose a Style:');
      if (styleSection !== -1) {
        content = content.substring(0, styleSection).trim();
      }
      
      // Append style selection buttons
      content += `\n\n__SUGGESTION__:STYLE_SELECT:${topic}`;
    }
    
    // Improve formatting for section headers and line spacing
    content = content.replace(/\n(#+\s+[^\n]+)/g, '\n\n$1');
    content = content.replace(/\n\*\*([^*\n]+)\*\*/g, '\n\n**$1**');
    
    // Ensure there's proper spacing between paragraphs
    content = content.replace(/\n\n\n+/g, '\n\n');
    content = content.replace(/([^\n])\n([^\n])/g, '$1\n\n$2');
    
    // Style section headers with larger font and background color
    content = content.replace(/#+\s+([^\n]+)/g, (match, title) => {
      return `<div class="bg-primary/10 p-2 rounded-md mb-3 mt-4"><span class="font-bold text-primary">${title}</span></div>`;
    });
    
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
    
    // Make messages more upbeat with emojis if they're from the assistant
    if (!content.includes('__SUGGESTION__') && messageId !== -1) {
      // Add emojis to common phrases if not already present
      const emojifyPhrases = [
        { phrase: /\b(hello|hi|hey)\b/i, emoji: '👋' },
        { phrase: /\b(great|awesome|excellent|amazing)\b/i, emoji: '🎉' },
        { phrase: /\b(try|attempt)\b/i, emoji: '💪' },
        { phrase: /\b(code|coding|program)\b/i, emoji: '💻' },
        { phrase: /\b(javascript|js)\b/i, emoji: '🟨' },
        { phrase: /\b(python)\b/i, emoji: '🐍' },
        { phrase: /\b(html)\b/i, emoji: '🌐' },
        { phrase: /\b(css)\b/i, emoji: '🎨' },
        { phrase: /\b(learn|understand)\b/i, emoji: '🧠' },
        { phrase: /\b(lesson|tutorial)\b/i, emoji: '📚' },
        { phrase: /\b(challenge|exercise|practice)\b/i, emoji: '🏋️‍♀️' },
        { phrase: /\b(fun|enjoy|cool)\b/i, emoji: '😎' },
        { phrase: /\b(good job|well done)\b/i, emoji: '👏' },
        { phrase: /\b(tip|hint|advice)\b/i, emoji: '💡' },
        { phrase: /\b(error|bug|issue|problem)\b/i, emoji: '🐛' },
        { phrase: /\b(fix|solve|solution)\b/i, emoji: '🔧' },
        { phrase: /\b(interactive)\b/i, emoji: '🎮' },
        { phrase: /\b(data|variable|value)\b/i, emoji: '📊' },
        { phrase: /\b(function|method)\b/i, emoji: '⚙️' },
        { phrase: /\b(array|list)\b/i, emoji: '📋' }
      ];
      
      formattedContent = formattedContent.replace(/^\s*I'd be happy to/i, "I'd be super happy to 🤩");
      formattedContent = formattedContent.replace(/\b(sure|certainly)\b/i, "Absolutely! 🙌");
      
      // Replace common phrases with emojified versions if they don't already have emojis
      emojifyPhrases.forEach(({ phrase, emoji }) => {
        formattedContent = formattedContent.replace(phrase, (match) => {
          // Check if there's already an emoji within 2 characters of the match
          const surroundingText = formattedContent.slice(
            Math.max(0, formattedContent.indexOf(match) - 2), 
            Math.min(formattedContent.length, formattedContent.indexOf(match) + match.length + 2)
          );
          
          // If there's already an emoji, don't add another one
          // Simple emoji check using specific common emojis
          if (surroundingText.includes('😀') || surroundingText.includes('🐻') || 
              surroundingText.includes('🐯') || surroundingText.includes('✨')) {
            return match;
          }
          
          return `${match} ${emoji}`;
        });
      });
      
      // Add random enthusiastic phrases at the end of messages
      if (Math.random() < 0.3 && !formattedContent.includes('__SUGGESTION__')) {
        const enthusiasticPhrases = [
          " Super duper! 🎊",
          " Woohoo! 🥳",
          " Let's rock this! 🤘",
          " That's pawsome! 🐾",
          " Tiger-tastic! 🐯✨",
          " Coding magic! ✨",
          " High five! 🙌"
        ];
        
        // Only add to ends of paragraphs that don't have emojis
        const lastParagraphIndex = formattedContent.lastIndexOf('\n\n');
        if (lastParagraphIndex > -1) {
          const lastParagraph = formattedContent.slice(lastParagraphIndex);
          // Simple emoji check using common emojis
          if (!lastParagraph.includes('😀') && !lastParagraph.includes('🐻') && 
              !lastParagraph.includes('🐯') && !lastParagraph.includes('✨') &&
              !lastParagraph.includes('🎊') && !lastParagraph.includes('🚀')) {
            const randomPhrase = enthusiasticPhrases[Math.floor(Math.random() * enthusiasticPhrases.length)];
            formattedContent = formattedContent.slice(0, lastParagraphIndex) + 
                               lastParagraph.replace(/([.!?])(\s*)$/, `$1${randomPhrase}$2`);
          }
        }
      }
    }
    
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
        <div className="bg-white rounded-lg shadow-lg w-[400px] max-h-[600px] flex flex-col overflow-hidden">
          <div className="bg-primary/40 text-white p-3 flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center mr-2">
                <span className="text-primary text-xl">{agentPersona === 'mumu' ? '🐯' : '🐻'}</span>
              </div>
              <h3 className="font-display font-medium leading-tight">
                <select
                  value={agentPersona}
                  onChange={(e) => setAgentPersona(e.target.value as 'mumu' | 'baloo')}
                  className="text-white font-medium border-none outline-none bg-transparent cursor-pointer focus:ring-0 appearance-none hover:opacity-80"
                  style={{ padding: '0 12px 0 2px', background: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'8\' height=\'8\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23ffffff\' stroke-width=\'3\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E") no-repeat right center' }}
                >
                  <option value="mumu">Mumu the Coding Ninja</option>
                  <option value="baloo">Baloo the Lesson Creator</option>
                </select>
              </h3>
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
                  <p>{agentPersona === 'mumu' 
                      ? "Welcome to Mumu the Coding Ninja! 🐯" 
                      : "Welcome to Baloo the Lesson Creator! 🐻"}</p>
                  <p className="text-sm mt-2">
                    {agentPersona === 'mumu' 
                      ? "Ask me to help with coding challenges or explain programming concepts." 
                      : "Ask me to create or improve interactive coding lessons for your students."}
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div key={index} className={`flex items-start ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role !== 'user' && (
                    <div className="flex-shrink-0 mr-3">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary text-xl">{agentPersona === 'mumu' ? '🐯' : '🐻'}</span>
                      </div>
                    </div>
                  )}
                  <div className={`rounded-lg p-3 max-w-[85%] ${
                    msg.role === 'user' 
                      ? 'bg-primary-100' 
                      : 'bg-gray-100'
                  }`}>
                    <div className="text-sm text-gray-800">
                      {/* Render the message content with HTML */}
                      <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content, msg.id) }} />
                      
                      {/* Check if this message contains a style selection request */}
                      {msg.content.includes('__SUGGESTION__:STYLE_SELECT:') && (
                        <div className="mt-3">
                          <div className="mb-2 text-center">
                            <span className="text-sm font-semibold text-primary">Choose a style for your lesson:</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {/* Extract the topic from the suggestion */}
                            {(() => {
                              const match = msg.content.match(/__SUGGESTION__:STYLE_SELECT:([^_]+)$/);
                              const topic = match ? match[1] : 'programming';
                              
                              return (
                                <>
                                  <button 
                                    className="bg-amber-100 border border-amber-200 hover:bg-amber-200 text-amber-800 py-2 px-3 rounded-md text-xs transition-colors flex flex-col items-center"
                                    onClick={() => sendMessage(`Use the Brown Markdown 🏖️ style for the lesson about ${topic}`, 'baloo')}
                                  >
                                    <span className="text-lg mb-1">🏖️</span>
                                    <span className="font-medium">Brown Markdown</span>
                                    <span className="text-xs text-amber-600 mt-1">Relaxed & earthy</span>
                                  </button>
                                  
                                  <button 
                                    className="bg-indigo-100 border border-indigo-200 hover:bg-indigo-200 text-indigo-800 py-2 px-3 rounded-md text-xs transition-colors flex flex-col items-center"
                                    onClick={() => sendMessage(`Use the Neon Racer 🏎️ style for the lesson about ${topic}`, 'baloo')}
                                  >
                                    <span className="text-lg mb-1">🏎️</span>
                                    <span className="font-medium">Neon Racer</span>
                                    <span className="text-xs text-indigo-600 mt-1">Vibrant & energetic</span>
                                  </button>
                                  
                                  <button 
                                    className="bg-pink-100 border border-pink-200 hover:bg-pink-200 text-pink-800 py-2 px-3 rounded-md text-xs transition-colors flex flex-col items-center"
                                    onClick={() => sendMessage(`Use the Interaction Galore 💃🏽 style for the lesson about ${topic}`, 'baloo')}
                                  >
                                    <span className="text-lg mb-1">💃🏽</span>
                                    <span className="font-medium">Interaction Galore</span>
                                    <span className="text-xs text-pink-600 mt-1">Interactive & fun</span>
                                  </button>
                                  
                                  <button 
                                    className="bg-blue-100 border border-blue-200 hover:bg-blue-200 text-blue-800 py-2 px-3 rounded-md text-xs transition-colors flex flex-col items-center"
                                    onClick={() => sendMessage(`Use the Practical Project Building 🚀 style for the lesson about ${topic}`, 'baloo')}
                                  >
                                    <span className="text-lg mb-1">🚀</span>
                                    <span className="font-medium">Practical Project</span>
                                    <span className="text-xs text-blue-600 mt-1">Progressive & hands-on</span>
                                  </button>
                                </>
                              )
                            })()}
                          </div>
                          
                          {/* "You decide!" option spans the full width */}
                          {(() => {
                            const match = msg.content.match(/__SUGGESTION__:STYLE_SELECT:([^_]+)$/);
                            const topic = match ? match[1] : 'programming';
                            
                            return (
                              <div className="mt-2">
                                <button 
                                  className="w-full bg-green-100 border border-green-200 hover:bg-green-200 text-green-800 py-2 px-3 rounded-md text-xs transition-colors flex flex-col items-center"
                                  onClick={() => sendMessage(`You decide the best style for the lesson about ${topic}`, 'baloo')}
                                >
                                  <span className="text-lg mb-1">✨</span>
                                  <span className="font-medium">You decide!</span>
                                  <span className="text-xs text-green-600 mt-1">Pick the best style for this topic</span>
                                </button>
                              </div>
                            )
                          })()}
                        </div>
                      )}
                    </div>
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
                    <span className="text-primary text-xl">{agentPersona === 'mumu' ? '🐯' : '🐻'}</span>
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
          
          <div className="pt-1 px-3 pb-3">
            {((!lessonId || messages.length === 0) || (lessonId && messages.length > 0)) && (
              <div className="mb-2 py-1 bg-gray-50 rounded-md">
                {(!lessonId || messages.length === 0) && (
                  <div className="flex flex-wrap px-1">
                    {/* Persona-specific suggestion buttons */}
                    {agentPersona === 'baloo' ? (
                      <>
                        <button 
                          className="bg-primary/5 hover:bg-primary/10 text-primary py-1 px-2 rounded-md text-xs transition-colors mr-1 mb-1"
                          onClick={() => {
                            setMessage("Create a new lesson about ");
                            setTimeout(() => inputRef.current?.focus(), 0);
                          }}
                        >
                          Create a new lesson
                        </button>
                        <button 
                          className="bg-primary/5 hover:bg-primary/10 text-primary py-1 px-2 rounded-md text-xs transition-colors mr-1 mb-1"
                          onClick={() => {
                            setMessage("Generate an interactive lesson with lots of challenges on ");
                            setTimeout(() => inputRef.current?.focus(), 0);
                          }}
                        >
                          Interactive lesson
                        </button>
                        <button 
                          className="bg-primary/5 hover:bg-primary/10 text-primary py-1 px-2 rounded-md text-xs transition-colors mr-1 mb-1"
                          onClick={() => {
                            setMessage("Create a curriculum for learning ");
                            setTimeout(() => inputRef.current?.focus(), 0);
                          }}
                        >
                          Create curriculum
                        </button>
                        <button 
                          className="bg-primary/5 hover:bg-primary/10 text-primary py-1 px-2 rounded-md text-xs transition-colors mr-1 mb-1"
                          onClick={() => {
                            setMessage("How to create more engaging lessons with ");
                            setTimeout(() => inputRef.current?.focus(), 0);
                          }}
                        >
                          Teaching tips
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          className="bg-primary/5 hover:bg-primary/10 text-primary py-1 px-2 rounded-md text-xs transition-colors mr-1 mb-1"
                          onClick={() => {
                            setMessage("Help me understand ");
                            setTimeout(() => inputRef.current?.focus(), 0);
                          }}
                        >
                          Explain concept
                        </button>
                        <button 
                          className="bg-primary/5 hover:bg-primary/10 text-primary py-1 px-2 rounded-md text-xs transition-colors mr-1 mb-1"
                          onClick={() => {
                            setMessage("Fix this code for me: ");
                            setTimeout(() => inputRef.current?.focus(), 0);
                          }}
                        >
                          Debug code
                        </button>
                        <button 
                          className="bg-primary/5 hover:bg-primary/10 text-primary py-1 px-2 rounded-md text-xs transition-colors mr-1 mb-1"
                          onClick={() => {
                            setMessage("Give me a coding challenge for ");
                            setTimeout(() => inputRef.current?.focus(), 0);
                          }}
                        >
                          Coding challenge
                        </button>
                        <button 
                          className="bg-primary/5 hover:bg-primary/10 text-primary py-1 px-2 rounded-md text-xs transition-colors mr-1 mb-1"
                          onClick={() => {
                            setMessage("How can I use this platform to ");
                            setTimeout(() => inputRef.current?.focus(), 0);
                          }}
                        >
                          Platform help
                        </button>
                      </>
                    )}
                  </div>
                )}
                
                {/* Action buttons for when in a lesson context */}
                {lessonId && messages.length > 0 && (
                  <div className="flex flex-wrap px-1">
                    {/* Baloo-specific lesson suggestions */}
                    {agentPersona === 'baloo' && (
                      <>
                        <button 
                          className="bg-primary/5 hover:bg-primary/10 text-primary py-1 px-2 rounded-md text-xs transition-colors mr-1 mb-1"
                          onClick={() => {
                            setMessage("Update this slide with more interactive elements ");
                            setTimeout(() => inputRef.current?.focus(), 0);
                          }}
                        >
                          Improve this slide
                        </button>
                        <button 
                          className="bg-primary/5 hover:bg-primary/10 text-primary py-1 px-2 rounded-md text-xs transition-colors mr-1 mb-1"
                          onClick={() => {
                            setMessage("Add a more challenging exercise to this slide ");
                            setTimeout(() => inputRef.current?.focus(), 0);
                          }}
                        >
                          Add challenge
                        </button>
                        <button 
                          className="bg-primary/5 hover:bg-primary/10 text-primary py-1 px-2 rounded-md text-xs transition-colors mr-1 mb-1"
                          onClick={() => {
                            setMessage("Create a new slide after this one about ");
                            setTimeout(() => inputRef.current?.focus(), 0);
                          }}
                        >
                          Add new slide
                        </button>
                      </>
                    )}
                    
                    {/* Mumu-specific lesson suggestions */}
                    {agentPersona === 'mumu' && (
                      <>
                        <button 
                          className="bg-primary/5 hover:bg-primary/10 text-primary py-1 px-2 rounded-md text-xs transition-colors mr-1 mb-1"
                          onClick={() => {
                            setMessage("Help me understand this code: ");
                            setTimeout(() => inputRef.current?.focus(), 0);
                          }}
                        >
                          Explain this code
                        </button>
                        <button 
                          className="bg-primary/5 hover:bg-primary/10 text-primary py-1 px-2 rounded-md text-xs transition-colors mr-1 mb-1"
                          onClick={() => {
                            setMessage("Give me a hint for this challenge ");
                            setTimeout(() => inputRef.current?.focus(), 0);
                          }}
                        >
                          Get a hint
                        </button>
                        <button 
                          className="bg-primary/5 hover:bg-primary/10 text-primary py-1 px-2 rounded-md text-xs transition-colors mr-1 mb-1"
                          onClick={() => {
                            setMessage("What's a real-world example of this concept? ");
                            setTimeout(() => inputRef.current?.focus(), 0);
                          }}
                        >
                          Real-world example
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
            
            <form className="flex flex-col" onSubmit={handleSubmit}>
              <div className="flex">
                <textarea 
                  ref={inputRef}
                  className="flex-1 border border-gray-300 rounded-l-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[60px] resize-none" 
                  placeholder={agentPersona === 'mumu' ? "Ask Mumu for coding help..." : "Ask Baloo to create a lesson..."} 
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