import React, { createContext, useContext, useEffect, useCallback } from "react";
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
  updateChatTitle: (chatId: string, title: string) => void;
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

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const updateChatTitle = useCallback((chatId: string, title: string) => {
    setChats(prevChats => 
      prevChats.map(c => c.id === chatId ? { ...c, title } : c)
    );
  }, [setChats]);

  useEffect(() => {
    const syncChats = async () => {
      try {
        const res = await fetch('/api/chats/metadata');
        if (res.ok) {
          const dbChatsMetadata = await res.json();
          
          setChats(prevChats => {
            const updatedChats = [...prevChats];
            let hasChanges = false;

            dbChatsMetadata.forEach((dbMeta: any) => {
              const localChatIndex = updatedChats.findIndex(c => c.id === dbMeta._id);
              if (localChatIndex !== -1) {
                if (dbMeta.isTitleGenerated && updatedChats[localChatIndex].title !== dbMeta.title) {
                  updatedChats[localChatIndex].title = dbMeta.title;
                  hasChanges = true;
                }
              }
            });

            return hasChanges ? updatedChats : prevChats;
          });
        }
      } catch (error) {
        console.error("Failed to sync chat metadata:", error);
      }
    };
    
    syncChats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppContext.Provider value={{ chats, setChats, settings, setSettings, activeChatId, setActiveChatId, fetchSettings, updateChatTitle }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
