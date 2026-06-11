import React, { useRef, useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { MessageBubble } from "./MessageBubble";
import { Send, Loader2, Settings2, X, Check } from "lucide-react";
import { aiService } from "../services/aiService";
import { generateId } from "../utils/generateId";

export const ChatWindow: React.FC = () => {
  const { chats, setChats, activeChatId, settings, setSettings } = useAppContext();
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [routingInfo, setRoutingInfo] = useState<{ modelName: string; providerName: string } | null>(null);
  const [manualModelId, setManualModelId] = useState<string>("");
  const [showSystemPromptDialog, setShowSystemPromptDialog] = useState(false);
  const [tempSystemPrompt, setTempSystemPrompt] = useState("");

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

  useEffect(() => {
    if (settings.models.length > 0 && !manualModelId) {
      setManualModelId(settings.models[0].id);
    }
  }, [settings.models, manualModelId]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isStreaming || !activeChatId) return;

    const userMessage = {
      id: generateId(),
      role: "user" as const,
      content: input.trim(),
      timestamp: Date.now(),
    };

    const newMessages = [...(activeChat?.messages || []), userMessage];

    setChats((prev) => prev.map((c) => (c.id === activeChatId ? { ...c, messages: newMessages, updatedAt: Date.now() } : c)));
    setInput("");
    setIsStreaming(true);
    setRoutingInfo(null);

    try {
      let route;
      if (settings.autoRouteEnabled) {
        route = aiService.autoRoute(userMessage.content, settings);
      } else {
        const selectedModel = settings.models.find((m) => m.id === manualModelId);
        const selectedProvider = settings.providers.find((p) => p.id === selectedModel?.providerId);
        if (selectedModel && selectedProvider) {
          route = { model: selectedModel, provider: selectedProvider };
        } else {
          route = aiService.autoRoute(userMessage.content, settings); // fallback
        }
      }

      if (!route) {
        throw new Error("No available model/provider configured. Please check your settings.");
      }

      setRoutingInfo({ modelName: route.model.name, providerName: route.provider.name });

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

      const stream = aiService.streamChat(newMessages, route, activeChat?.systemPrompt || settings.globalSystemPrompt);

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
    } catch (error: any) {
      console.error(error);
      const errorMessage = {
        id: generateId(),
        role: "assistant" as const,
        content: `**Error:** ${error.message || "Failed to fetch response."}`,
        timestamp: Date.now(),
      };
      setChats((prev) => prev.map((c) => (c.id === activeChatId ? { ...c, messages: [...c.messages, errorMessage] } : c)));
    } finally {
      setIsStreaming(false);
      setRoutingInfo(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const openSystemPromptDialog = () => {
    setTempSystemPrompt(activeChat?.systemPrompt || "");
    setShowSystemPromptDialog(true);
  };

  const saveSystemPrompt = () => {
    if (activeChatId) {
      setChats((prev) => prev.map((c) => (c.id === activeChatId ? { ...c, systemPrompt: tempSystemPrompt } : c)));
    }
    setShowSystemPromptDialog(false);
  };

  if (!activeChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950 text-slate-500">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2 text-slate-300">Istiyak AI </h2>
          <p>Select or create a chat to begin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-950 h-screen relative">
      {/* Top Header */}
      <div className="h-14 border-b border-slate-800 bg-slate-900/50 flex items-center px-4 justify-between z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Auto-Route</span>
            <button
              onClick={() => setSettings((s) => ({ ...s, autoRouteEnabled: !s.autoRouteEnabled }))}
              className={`w-10 h-5 rounded-full relative transition-colors ${settings.autoRouteEnabled ? "bg-indigo-600" : "bg-slate-700"}`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${settings.autoRouteEnabled ? "translate-x-5" : "translate-x-1"}`}
              />
            </button>
          </div>

          {!settings.autoRouteEnabled && settings.models.length > 0 && (
            <select
              value={manualModelId}
              onChange={(e) => setManualModelId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded px-2 py-1 outline-none focus:border-indigo-500 max-w-xs"
            >
              {settings.models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <button
            onClick={openSystemPromptDialog}
            className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded transition-colors ${activeChat.systemPrompt ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"}`}
          >
            <Settings2 size={16} />
            <span className="hidden sm:inline">{activeChat.systemPrompt ? "Custom Prompt Set" : "Set System Prompt"}</span>
          </button>
        </div>
      </div>

      {routingInfo && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-slate-800 text-xs px-3 py-1.5 rounded-full border border-slate-700 text-slate-300 flex items-center gap-2 z-10 shadow-lg">
          <Loader2 size={12} className="animate-spin text-indigo-400" />
          Routing to: <span className="font-semibold text-indigo-300">{routingInfo.modelName}</span> via{" "}
          <span className="font-semibold text-emerald-300">{routingInfo.providerName}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {activeChat.messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center max-w-md mx-auto">
            <h3 className="text-2xl font-bold mb-4 text-slate-300">How can I help you today?</h3>
            <p className="text-sm">
              Type your prompt below.{" "}
              {settings.autoRouteEnabled
                ? "The system will automatically route your request to the best model based on your query context."
                : "Your request will be sent to the manually selected model."}
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto w-full pb-32 pt-4">
            {activeChat.messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent">
        <div className="max-w-3xl mx-auto relative">
          <form
            onSubmit={handleSubmit}
            className="relative flex items-end bg-slate-800 border border-slate-700 rounded-xl overflow-hidden focus-within:border-indigo-500 transition-colors shadow-xl"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Istiyak AI ..."
              className="w-full max-h-48 min-h-[56px] py-4 pl-4 pr-12 bg-transparent text-slate-200 placeholder-slate-400 resize-none focus:outline-none"
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming || settings.models.length === 0}
              className="absolute right-2 bottom-2 p-2 text-slate-400 hover:text-white disabled:opacity-50 disabled:hover:text-slate-400 transition-colors bg-indigo-600 hover:bg-indigo-500 rounded-lg"
            >
              <Send size={18} />
            </button>
          </form>
          <div className="text-center mt-2 text-[10px] text-slate-500">Istiyak AI can make mistakes. Consider verifying important information.</div>
        </div>
      </div>

      {/* System Prompt Modal for specific chat */}
      {showSystemPromptDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h3 className="font-semibold text-slate-200">Chat System Prompt</h3>
              <button onClick={() => setShowSystemPromptDialog(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 flex-1">
              <p className="text-xs text-slate-400 mb-3">
                This prompt applies only to the current conversation. If left empty, the Global System Prompt from Settings will be used.
              </p>
              <textarea
                value={tempSystemPrompt}
                onChange={(e) => setTempSystemPrompt(e.target.value)}
                placeholder="e.g. You are a senior frontend developer specializing in React."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 h-32 resize-none focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="p-4 border-t border-slate-800 flex justify-end gap-2">
              <button onClick={() => setShowSystemPromptDialog(false)} className="px-4 py-2 text-sm text-slate-300 hover:text-white">
                Cancel
              </button>
              <button
                onClick={saveSystemPrompt}
                className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-2"
              >
                <Check size={16} /> Save Prompt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
