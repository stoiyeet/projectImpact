'use client';

import React, { useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatBotProps {
  onStrategyTrigger: (strategy: string) => void;
}

const ChatBot: React.FC<ChatBotProps> = ({ onStrategyTrigger }) => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: 'Welcome to Project NEO! I\'m here to help you test asteroid mitigation strategies. Try typing "kinetic impactor" to deploy a spacecraft!' 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    try {
      // Call your API endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage]
        }),
      });

      const data = await response.json();
      const assistantMessage: Message = { 
        role: 'assistant', 
        content: data.answer || 'Sorry, I encountered an error. Please try again.' 
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Check for strategy triggers
      const lowercaseInput = input.toLowerCase();
      if (lowercaseInput.includes('kinetic impactor') || 
          lowercaseInput.includes('kinetic impact') ||
          lowercaseInput.includes('spacecraft')) {
        onStrategyTrigger('kinetic');
      }

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I\'m having trouble connecting right now. Please try again.' 
      }]);
    }
    
    setIsLoading(false);
    setInput('');
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-black bg-opacity-80 text-white rounded-lg p-4 backdrop-blur-sm">
      <div className="mb-2 text-sm font-bold text-green-400">Project NEO Assistant</div>
      
      {/* Messages */}
      <div className="h-48 overflow-y-auto mb-4 space-y-2 text-sm">
        {messages.map((msg, idx) => (
          <div key={idx} className={`${msg.role === 'user' ? 'text-blue-300' : 'text-gray-200'}`}>
            <strong>{msg.role === 'user' ? 'You: ' : 'Assistant: '}</strong>
            {msg.content}
          </div>
        ))}
        {isLoading && (
          <div className="text-gray-400">Assistant is typing...</div>
        )}
      </div>
      
      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
          placeholder="Type your mitigation strategy..."
          className="flex-1 px-3 py-2 bg-gray-800 rounded text-white text-sm"
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm font-medium disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatBot;