import React, { useRef, useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { MessageBubble } from "./MessageBubble";
import { aiService } from "../services/aiService";
import { generateId } from "../utils/generateId";

export const ChatWindow: React.FC<{ toggleSidebar: () => void; onOpenSettings: () => void }> = ({ toggleSidebar, onOpenSettings }) => {
  const { chats, setChats, activeChatId, settings } = useAppContext();
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

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
    if (!command || isStreaming || !activeChatId) return;

    if (command.toLowerCase() === "open settings" || command.toLowerCase() === "config" || command.toLowerCase() === "settings") {
      setInput("");
      onOpenSettings();
      return;
    }

    // eslint-disable-next-line react-hooks/purity
    const ts = Date.now();
    const userMessage = {
      id: generateId(),
      role: "user" as const,
      content: command,
      timestamp: ts,
    };

    const newMessages = [...(activeChat?.messages || []), userMessage];

    setChats((prev) => prev.map((c) => (c.id === activeChatId ? { ...c, messages: newMessages, updatedAt: ts } : c)));
    setIsStreaming(true);

    try {
      let route;
      if (settings.autoRouteEnabled) {
        route = aiService.autoRoute(userMessage.content, settings);
      } else {
        const manualModelId = settings.models.length > 0 ? settings.models[0].id : null;
        const selectedModel = settings.models.find((m) => m.id === manualModelId);
        const selectedProvider = settings.providers.find((p) => p.id === selectedModel?.providerId);
        if (selectedModel && selectedProvider) {
          route = { model: selectedModel, provider: selectedProvider };
        } else {
          route = aiService.autoRoute(userMessage.content, settings); // fallback
        }
      }

      if (!route) {
        setChats((prev) =>
          prev.map((c) =>
            c.id === activeChatId
              ? {
                  ...c,
                  messages: c.messages.slice(0, -1),
                  updatedAt: Date.now(),
                }
              : c,
          ),
        );
        setIsStreaming(false);
        onOpenSettings();
        return;
      }

      setInput("");

      const assistantMessageId = generateId();
      setChats((prev) =>
        prev.map((c) =>
          c.id === activeChatId
            ? {
                ...c,
                messages: [...c.messages, { id: assistantMessageId, role: "assistant", content: "", timestamp: Date.now() }],
              }
            : c,
        ),
      );

      const context = await aiService.getRelevantContext(userMessage.content);
      const baseSystemPrompt = activeChat?.systemPrompt || settings.globalSystemPrompt;
      const finalSystemPrompt = context ? `${baseSystemPrompt}\n${context}` : baseSystemPrompt;

      const stream = aiService.streamChat(newMessages, route, finalSystemPrompt);

      let fullContent = "";
      for await (const chunk of stream) {
        fullContent += chunk;
        setChats((prev) =>
          prev.map((c) =>
            c.id === activeChatId
              ? {
                  ...c,
                  messages: c.messages.map((m) => (m.id === assistantMessageId ? { ...m, content: fullContent } : m)),
                }
              : c,
          ),
        );
      }
    } catch (error) {
      console.error(error);
      const errorObj = error as Error;
      // eslint-disable-next-line react-hooks/purity
      const ts = Date.now();
      const errorMessage = {
        id: generateId(),
        role: "assistant" as const,
        content: `**zsh: command not found or connection refused:** ${errorObj.message || 'Unknown error'}`,
        timestamp: ts,
      };
      setChats((prev) => prev.map((c) => (c.id === activeChatId ? { ...c, messages: [...c.messages, errorMessage] } : c)));
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

  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col bg-[#1c1c1e] text-slate-300 font-mono text-[13px] relative">
        <div className="h-8 bg-[#2d2d2d] border-b border-black flex items-center px-3 gap-2 w-full absolute top-0 left-0">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
          <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
          <div className="flex-1 text-center font-sans font-medium text-xs text-slate-400 absolute left-0 w-full pointer-events-none">
            khairulistiyak — -zsh — 80x24
          </div>
        </div>
        <div className="p-4 pt-12 flex-1">
          <div className="md:hidden mb-4">
            <button onClick={toggleSidebar} className="text-blue-400 hover:text-blue-300">
              [ls -la]
            </button>
          </div>
          <div>Last login: {new Date().toString().split(" ").slice(0, 5).join(" ")} on ttys001</div>
          <br />
          <div className="animate-pulse">Awaiting connection... Select or create a session to begin.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#1c1c1e] h-screen relative text-slate-300 font-mono text-[13px]">
      <div className="h-8 bg-[#2d2d2d] border-b border-black flex items-center px-3 gap-2 shrink-0 relative">
        <div className="flex gap-2 relative z-10">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56] shadow-[0_0_2px_rgba(0,0,0,0.5)]"></div>
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e] shadow-[0_0_2px_rgba(0,0,0,0.5)]"></div>
          <div className="w-3 h-3 rounded-full bg-[#27c93f] shadow-[0_0_2px_rgba(0,0,0,0.5)]"></div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="font-sans font-medium text-xs text-slate-400 flex items-center gap-2">
            <span>khairulistiyak — -zsh</span>
          </div>
        </div>
        <div className="absolute right-3">
          <button onClick={toggleSidebar} className="md:hidden text-slate-500 hover:text-white">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {activeChat.messages.length === 0 ? (
          <div>
            <div>Last login: {new Date().toString().split(" ").slice(0, 5).join(" ")} on ttys001</div>
            <br />
            <div>
              <span className="text-emerald-400 font-bold">khairulistiyak@MacBook-Pro</span>
              <span className="text-white">:</span>
              <span className="text-blue-400 font-bold">~</span>
              <span className="text-white"> % </span>
              ssh -i ~/.ssh/id_rsa root@istiyak-ai
            </div>
            <div>Warning: Permanently added 'istiyak-ai' (RSA) to the list of known hosts.</div>
            <div>Welcome to Istiyak AI Server v2.0.4.</div>
            <div>Terminal ready. Type a command or question. (Hint: type 'open settings' to config)</div>
            <br />
          </div>
        ) : (
          <div className="w-full pb-8">
            <div>Last login: {new Date().toString().split(" ").slice(0, 5).join(" ")} on ttys001</div>
            <br />
            {activeChat.messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Terminal Input Line */}
        <div className="mt-4 flex items-start">
          <div className="mr-2 pt-1 font-bold whitespace-nowrap">
            <span className="text-emerald-400 font-bold">khairulistiyak@MacBook-Pro</span>
            <span className="text-white">:</span>
            <span className="text-blue-400 font-bold">~</span>
            <span className="text-white"> % </span>
          </div>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-slate-300 font-mono resize-none focus:outline-none pt-1"
            rows={1}
            autoFocus
            disabled={isStreaming}
          />
        </div>
      </div>
    </div>
  );
};
