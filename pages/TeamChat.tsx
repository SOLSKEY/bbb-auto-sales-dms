import React, { useState, useRef, useEffect, useContext } from 'react';
import { CHAT_MESSAGES } from '../constants';
import type { ChatMessage } from '../types';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { queryAI } from '../services/geminiService';
import { DataContext } from '../App';

const TeamChat: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>(CHAT_MESSAGES);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const dataContext = useContext(DataContext);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async () => {
        if (!input.trim() || !dataContext) return;

        const newMessage: ChatMessage = {
            id: Date.now(),
            sender: 'Admin User',
            isAI: false,
            message: input,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, newMessage]);

        if (input.toLowerCase().startsWith('@ai')) {
            setIsLoading(true);
            const question = input.substring(3).trim();
            const aiResponseText = await queryAI(question, dataContext.inventory, dataContext.sales);
            const aiMessage: ChatMessage = {
                 id: Date.now() + 1,
                 sender: 'AI',
                 isAI: true,
                 message: aiResponseText,
                 timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            setMessages(prev => [...prev, aiMessage]);
            setIsLoading(false);
        }
        
        setInput('');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full glass-card overflow-hidden">
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex items-start gap-3 ${msg.sender === 'Admin User' ? 'justify-end' : ''}`}>
                         {msg.sender !== 'Admin User' && (
                             <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${msg.isAI ? 'bg-gradient-to-br from-lava-warm to-lava-cool' : 'bg-glass-panel border border-border-low'}`}>
                                 {msg.isAI ? 'AI' : msg.sender.charAt(0)}
                             </div>
                         )}
                         <div className={`p-4 rounded-lg max-w-lg ${msg.sender === 'Admin User' ? 'bg-gradient-to-br from-lava-warm to-lava-core text-white rounded-br-none' : 'bg-glass-panel text-secondary rounded-bl-none border border-border-low'}`}>
                            <div className="flex items-baseline gap-2">
                                <p className="font-bold text-sm">{msg.sender}</p>
                                <p className="text-xs text-muted">{msg.timestamp}</p>
                            </div>
                            <p className="mt-1">{msg.message}</p>
                         </div>
                    </div>
                ))}
                 {isLoading && (
                     <div className="flex items-start gap-3">
                         <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white bg-gradient-to-br from-lava-warm to-lava-cool animate-pulse">AI</div>
                         <div className="p-4 rounded-lg max-w-lg bg-glass-panel text-secondary rounded-bl-none border border-border-low">
                             <p className="text-muted italic">AI is thinking...</p>
                         </div>
                     </div>
                 )}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-border-low">
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type message... use @AI to ask a question"
                        className="w-full bg-glass-panel border border-border-low focus:border-lava-core text-primary rounded-lg p-3 pr-12 focus:outline-none transition-colors"
                    />
                    <button onClick={handleSend} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full btn-lava disabled:bg-gray-500 transition-colors">
                        <PaperAirplaneIcon className="h-5 w-5 text-white" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TeamChat;