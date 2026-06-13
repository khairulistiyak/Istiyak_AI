import React, { useRef, useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { MessageBubble } from "./MessageBubble";
import { aiService } from "../services/aiService";
import { generateId } from "../utils/generateId";

export const ChatWindow: React.FC<{ toggleSidebar: () => void; onOpenSettings: () => void }> = ({ toggleSidebar, onOpenSettings }) => {
    const { chats, setChats, activeChatId, setActiveChatId, settings, updateChatTitle } = useAppContext();
    const [input, setInput] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const activeChat = chats.find((c) => c.id === activeChatId);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [activeChat?.messages, isStreaming]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [input]);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const command = input.trim();
        if (!command || isStreaming) return;

        setError(null);

        if (command.toLowerCase() === "open settings" || command.toLowerCase() === "config" || command.toLowerCase() === "settings") {
            setInput("");
            onOpenSettings();
            return;
        }

        const ts = Date.now();
        const userMessage = {
            id: generateId(),
            role: "user" as const,
            content: command,
            timestamp: ts,
        };

        let currentChatId = activeChatId;
        let newMessages;
        let isFirstMessage = false;

        if (!currentChatId) {
            currentChatId = generateId();
            isFirstMessage = true;
            const fallbackTitle = command.split(' ').slice(0, 5).join(' ') + (command.split(' ').length > 5 ? '...' : '');
            const newSession = {
                id: currentChatId,
                title: fallbackTitle,
                messages: [userMessage],
                createdAt: ts,
                updatedAt: ts,
            };
            try {
                await fetch('/api/chats/metadata', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: currentChatId, title: fallbackTitle, createdAt: ts, updatedAt: ts })
                });
            } catch (err) {
                console.error("Failed to save initial chat metadata:", err);
            }
            setChats((prev) => [newSession, ...prev]);
            setActiveChatId(currentChatId);
            newMessages = [userMessage];
        } else {
            newMessages = [...(activeChat?.messages || []), userMessage];
            setChats((prev) => prev.map((c) => (c.id === currentChatId ? { ...c, messages: newMessages, updatedAt: ts } : c)));
            try {
                await fetch(`/api/chats/metadata/${currentChatId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ updatedAt: ts })
                });
            } catch (err) {
                console.error("Failed to update chat metadata:", err);
            }
        }

        setIsStreaming(true);
        setInput("");

        if (isFirstMessage) {
            fetch('/api/chats/generate-title', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatId: currentChatId, userMessage: command })
            })
            .then(res => res.json())
            .then(data => {
                if (data.title && currentChatId) {
                    updateChatTitle(currentChatId, data.title);
                }
            })
            .catch(err => console.error("Background title generation failed:", err));
        }

        try {
            const route = aiService.autoRoute(userMessage.content, settings);
            if (!route) throw new Error("No valid model or provider configured. Please check your settings.");

            const assistantMessageId = generateId();
            setChats((prev) =>
                prev.map((c) =>
                    c.id === currentChatId ? { ...c, messages: [...c.messages, { id: assistantMessageId, role: "assistant", content: "", timestamp: Date.now() }] } : c
                )
            );

            const chatSpecificSystemPrompt = activeChat?.systemPrompt;
            const stream = aiService.streamChat(newMessages, route, chatSpecificSystemPrompt);

            let fullContent = "";
            for await (const chunk of stream) {
                fullContent += chunk;
                setChats((prev) =>
                    prev.map((c) =>
                        c.id === currentChatId ? { ...c, messages: c.messages.map((m) => (m.id === assistantMessageId ? { ...m, content: fullContent } : m)) } : c
                    )
                );
            }
        } catch (error) {
            console.error(error);
            const errorObj = error as Error;
            setError(`**Error:** ${errorObj.message || 'An unknown error occurred.'}`);
            setChats((prev) =>
                prev.map((c) =>
                    c.id === currentChatId ? { ...c, messages: c.messages.slice(0, c.messages.length - 2) } : c
                )
            );
        } finally {
            setIsStreaming(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <main className="flex-1 flex flex-col bg-[#1c1c1e] h-screen relative text-slate-300 font-mono text-sm md:text-[13px]">
            <header className="h-8 bg-[#2d2d2d] border-b border-black flex items-center px-3 gap-2 shrink-0 relative z-10">
                <div className="flex gap-2 relative z-10">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f56] shadow-[0_0_2px_rgba(0,0,0,0.5)]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e] shadow-[0_0_2px_rgba(0,0,0,0.5)]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#27c93f] shadow-[0_0_2px_rgba(0,0,0,0.5)]"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="font-sans font-medium text-xs text-slate-400 flex items-center gap-2 truncate px-16">
                        <span>Istiyak — -zsh</span>
                    </div>
                </div>
                <div className="absolute right-3">
                    <button onClick={toggleSidebar} className="md:hidden text-slate-500 hover:text-white">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-2 sm:p-4 custom-scrollbar">
                {(!activeChat || activeChat.messages.length === 0) && !error ? (
                    <div className="break-words">
                        <div>Last login: {new Date().toString().split(" ").slice(0, 5).join(" ")} on ttys001</div>
                        <br />
                        <div className="break-all">
                            <span className="text-yellow-400 font-bold">istiyak@local_breach</span>
                            <span className="text-white">:</span>
                            <span className="text-emerald-400 font-bold">~/memory</span>
                            <span className="text-white"> $ </span>
                            ssh -i ~/.ssh/id_rsa root@istiyak-ai
                        </div>
                        <div>Warning: Permanently added 'istiyak-ai' (RSA) to the list of known hosts.</div>
                        <div>Welcome to Istiyak AI Server v2.0.4.</div>
                        <div>Terminal ready. Type a command or question to initiate a connection. (Hint: type 'open settings' to config)</div>
                        <br />
                    </div>
                ) : (
                    <div className="w-full pb-8">
                        <div className="break-words">Last login: {new Date().toString().split(" ").slice(0, 5).join(" ")} on ttys001</div>
                        <br />
                        {activeChat?.messages.map((msg) => (
                            <MessageBubble key={msg.id} message={msg} />
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                )}

                {error && (
                    <div className="mt-4 text-red-400">
                        <p dangerouslySetInnerHTML={{ __html: error.replace(/\n/g, "<br />") }} />
                    </div>
                )}

                <div className="mt-4 flex items-start">
                    <div className="mr-2 pt-1 font-bold whitespace-nowrap break-all">
                        <span className="text-yellow-400 font-bold">☠️ istiyak@local_breach</span>
                        <span className="text-white">:</span>
                        <span className="text-emerald-400 font-bold">~/memory</span>
                        <span className="text-white"> ❯ </span>
                    </div>
                    <div className="flex-1 relative">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full bg-transparent text-slate-300 font-mono resize-none focus:outline-none pt-1 pr-5"
                            rows={1}
                            autoFocus
                            disabled={isStreaming}
                            placeholder={isStreaming ? "Waiting for response..." : "Type a command..."}
                        />
                        {!isStreaming && <span className="absolute top-1 right-0 blinking-cursor text-slate-300"></span>}
                    </div>
                </div>
            </div>
        </main>
    );
};
