import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
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
  fetchSettings: () => Promise<void>;
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

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const dbData = await res.json();
        if (dbData) {
          // Overwrite local settings with server-side settings
          setSettings({
            providers: dbData.providers || [],
            models: dbData.models || [],
            routingRules: dbData.routingRules || defaultSettings.routingRules,
            autoRouteEnabled: dbData.autoRouteEnabled ?? defaultSettings.autoRouteEnabled,
            globalSystemPrompt: dbData.globalSystemPrompt || defaultSettings.globalSystemPrompt,
          });
        }
      }
    } catch (error) {
      console.error("Failed to load settings from DB:", error);
    }
  }, [setSettings]);

  // Fetch settings from the database when the app first loads
  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  return (
    <AppContext.Provider value={{ chats, setChats, settings, setSettings, activeChatId, setActiveChatId, fetchSettings }}>
      {children}
    </AppContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
