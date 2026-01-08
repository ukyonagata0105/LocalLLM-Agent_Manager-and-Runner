import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Terminal, AlertCircle, CheckCircle } from 'lucide-react';
import { getLLMManager } from '../M02_llm/LLMManager';
import { getAgentEngine } from '../M01_core/AgentEngine';

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
}

export const AgentChat: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'system', content: 'System initialized. Ready to test LLM and Agent capabilities.', timestamp: Date.now() }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [openHandsStatus, setOpenHandsStatus] = useState<'unknown' | 'testing' | 'success' | 'failure'>('unknown');
    const logsEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg: Message = { role: 'user', content: input, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const llm = getLLMManager();
            // Force reload config to ensure we use the latest settings
            await llm.loadFromStore();

            // Get language preference
            let language = 'Japanese';
            try {
                // @ts-expect-error
                if (window.ipcRenderer) {
                    // @ts-expect-error
                    language = await window.ipcRenderer.invoke('get-config', 'app.llm_language') || 'Japanese';
                } else {
                    language = JSON.parse(localStorage.getItem('config:app.llm_language') || '"Japanese"');
                }
            } catch (e) {
                // ignore
            }

            const systemPrompt = `You are a helpful assistant. Please respond in ${language}.`;

            // Filter out internal system logs from the context sent to LLM
            const contextMessages = messages.filter(m => m.role !== 'system' || !m.content.startsWith('System initialized'));

            const response = await llm.chat({
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...contextMessages,
                    { role: 'user', content: userMsg.content }
                ]
            });

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: response.content,
                timestamp: Date.now()
            }]);
        } catch (e: any) {
            setMessages(prev => [...prev, {
                role: 'system',
                content: `Error: ${e.message}. Please check Settings > LLM Providers.`,
                timestamp: Date.now()
            }]);
        } finally {
            setLoading(false);
        }
    };

    const testOpenHands = async () => {
        setOpenHandsStatus('testing');
        setMessages(prev => [...prev, { role: 'system', content: 'Testing OpenHands Core Integration...', timestamp: Date.now() }]);

        try {
            const engine = getAgentEngine();
            // Create a simple echo task
            const result = await engine.executeTask("echo 'OpenHands is active'");

            if (result.success) {
                setOpenHandsStatus('success');
                setMessages(prev => [...prev, {
                    role: 'system',
                    content: `OpenHands Test Passed!\nOutput: ${result.output}`,
                    timestamp: Date.now()
                }]);
            } else {
                throw new Error(result.error || 'Unknown failure');
            }
        } catch (e: any) {
            setOpenHandsStatus('failure');
            setMessages(prev => [...prev, {
                role: 'system',
                content: `OpenHands Test Failed: ${e.message}\nMake sure Docker is running and OpenHands wrapper is configured.`,
                timestamp: Date.now()
            }]);
        }
    };

    return (
        <div className="h-full flex flex-col bg-gray-900 text-white">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Bot className="text-purple-500" />
                        Agent Chat / Debugger
                    </h2>
                    <p className="text-xs text-gray-500">Direct interface to configured LLM & OpenHands runtime</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={testOpenHands}
                        disabled={openHandsStatus === 'testing'}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 border transition-colors ${openHandsStatus === 'success' ? 'bg-green-900/30 border-green-600 text-green-400' :
                            openHandsStatus === 'failure' ? 'bg-red-900/30 border-red-600 text-red-400' :
                                'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                            }`}
                    >
                        <Terminal size={14} />
                        {openHandsStatus === 'testing' ? 'Testing...' : 'Test OpenHands'}
                        {openHandsStatus === 'success' && <CheckCircle size={14} />}
                        {openHandsStatus === 'failure' && <AlertCircle size={14} />}
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role !== 'user' && (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'system' ? 'bg-gray-700' : 'bg-purple-600'}`}>
                                {msg.role === 'system' ? <Terminal size={14} /> : <Bot size={16} />}
                            </div>
                        )}

                        <div className={`max-w-[80%] rounded-lg p-3 ${msg.role === 'user' ? 'bg-blue-600 text-white' :
                            msg.role === 'system' ? 'bg-gray-800 text-gray-400 font-mono text-sm border border-gray-700' :
                                'bg-gray-800/80 text-gray-200'
                            }`}>
                            <div className="whitespace-pre-wrap">
                                {(() => {
                                    // Parse for <think> tags
                                    const thinkMatch = msg.content.match(/<think>([\s\S]*?)<\/think>/);
                                    if (thinkMatch) {
                                        const thought = thinkMatch[1].trim();
                                        const rest = msg.content.replace(/<think>[\s\S]*?<\/think>/, '').trim();
                                        return (
                                            <>
                                                <details className="mb-2 group text-xs text-gray-500">
                                                    <summary className="cursor-pointer hover:text-gray-300 list-none flex items-center gap-1 select-none opacity-60 hover:opacity-100 transition-opacity">
                                                        <span className="font-mono">▶ Thinking Process</span>
                                                    </summary>
                                                    <div className="mt-2 pl-3 border-l-2 border-gray-700/50 text-gray-500 italic whitespace-pre-wrap font-mono text-[10px] leading-relaxed">
                                                        {thought}
                                                    </div>
                                                </details>
                                                <div>{rest}</div>
                                            </>
                                        );
                                    }
                                    return msg.content;
                                })()}
                            </div>
                            <div className="text-[10px] opacity-50 mt-1 uppercase">{msg.role}</div>
                        </div>

                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                                <User size={16} />
                            </div>
                        )}
                    </div>
                ))}
                {loading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center shrink-0 animate-pulse">
                            <Bot size={16} />
                        </div>
                        <div className="bg-gray-800/80 p-3 rounded-lg text-gray-400 text-sm">Thinking...</div>
                    </div>
                )}
                <div ref={logsEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-800 bg-gray-900/50 backdrop-blur-sm">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Send a message to the active LLM..."
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors"
                        disabled={loading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={loading || !input.trim()}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};
