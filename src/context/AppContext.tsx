import React, { createContext, useContext, useEffect } from "react";
import type { ReactNode } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import type { Chat, Settings, Provider, Model } from "../types";
import { generateId } from "../utils/generateId";

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

  // Sync with Database on mount
  useEffect(() => {
    const fetchDbSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const dbData = await res.json();
          if (dbData && dbData.active_api_key && dbData.model_name) {
            setSettings(prev => {
              let updatedProviders = [...prev.providers];
              let updatedModels = [...prev.models];

              if (updatedProviders.length === 0) {
                const newProvider: Provider = { id: generateId(), name: "Default Provider", baseUrl: "https://openrouter.ai/api/v1", apiKey: dbData.active_api_key };
                updatedProviders.push(newProvider);
              } else {
                updatedProviders[0] = { ...updatedProviders[0], apiKey: dbData.active_api_key };
              }

              if (updatedModels.length === 0) {
                const newModel: Model = { id: generateId(), name: dbData.model_name, providerId: updatedProviders[0].id };
                updatedModels.push(newModel);
              } else {
                updatedModels[0] = { ...updatedModels[0], name: dbData.model_name };
              }

              return { ...prev, providers: updatedProviders, models: updatedModels };
            });
          }
        }
      } catch (error) {
        console.error("Failed to load settings from DB:", error);
      }
    };

    fetchDbSettings();
  }, [setSettings]);

  return <AppContext.Provider value={{ chats, setChats, settings, setSettings, activeChatId, setActiveChatId }}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
