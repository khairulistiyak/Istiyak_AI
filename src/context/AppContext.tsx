import React, { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import type { Chat, Settings } from "../types";

interface AppContextType {
  chats: Chat[];
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const defaultSettings: Settings = {
  providers: [],
  models: [],
  routingRules: {
    codingModelId: null,
    creativeModelId: null,
    fastModelId: null,
  },
  autoRouteEnabled: true,
  globalSystemPrompt: "You are a helpful AI assistant.",
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [chats, setChats] = useLocalStorage<Chat[]>("Istiyak AI_chats", []);
  const [settings, setSettings] = useLocalStorage<Settings>("Istiyak AI_settings", defaultSettings);
  const [activeChatId, setActiveChatId] = useLocalStorage<string | null>("Istiyak AI_active_chat", null);

  return <AppContext.Provider value={{ chats, setChats, settings, setSettings, activeChatId, setActiveChatId }}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
