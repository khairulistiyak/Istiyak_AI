import React, { createContext, useContext, useEffect } from "react";
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

const createLegacyFallbackSettings = (dbData: {
  providers?: Settings["providers"];
  models?: Settings["models"];
  routingRules?: Settings["routingRules"];
  autoRouteEnabled?: boolean;
  globalSystemPrompt?: string;
  active_api_key?: string;
  model_name?: string;
}) => {
  const hasProviders = Array.isArray(dbData.providers) && dbData.providers.length > 0;
  const hasModels = Array.isArray(dbData.models) && dbData.models.length > 0;

  if (hasProviders || hasModels) {
    return {
      providers: dbData.providers || [],
      models: dbData.models || [],
    };
  }

  if (!dbData.active_api_key || !dbData.model_name) {
    return {
      providers: [],
      models: [],
    };
  }

  const providerId = "legacy-db-provider";
  const modelId = "legacy-db-model";

  return {
    providers: [
      {
        id: providerId,
        name: "Legacy DB Provider",
        baseUrl: "https://api.openai.com/v1",
        apiKey: dbData.active_api_key,
      },
    ],
    models: [
      {
        id: modelId,
        name: dbData.model_name,
        providerId,
      },
    ],
  };
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [chats, setChats] = useLocalStorage<Chat[]>("Istiyak AI_chats", []);
  const [settings, setSettings] = useLocalStorage<Settings>("Istiyak AI_settings", defaultSettings);
  const [activeChatId, setActiveChatId] = useLocalStorage<string | null>("Istiyak AI_active_chat", null);

  // Sync with Database on mount
  useEffect(() => {
    let isMounted = true;

    const fetchDbSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const dbData = await res.json();
          if (dbData && isMounted) {
            const legacyFallback = createLegacyFallbackSettings(dbData);
            setSettings((currentSettings) => ({
              ...currentSettings,
              providers: legacyFallback.providers.length > 0 ? legacyFallback.providers : currentSettings.providers,
              models: legacyFallback.models.length > 0 ? legacyFallback.models : currentSettings.models,
              routingRules: dbData.routingRules || currentSettings.routingRules,
              autoRouteEnabled: dbData.autoRouteEnabled ?? currentSettings.autoRouteEnabled,
              globalSystemPrompt: dbData.globalSystemPrompt || currentSettings.globalSystemPrompt,
            }));
          }
        }
      } catch (error) {
        console.error("Failed to load settings from DB:", error);
      }
    };

    fetchDbSettings();
    return () => {
      isMounted = false;
    };
  }, [setSettings]);

  return <AppContext.Provider value={{ chats, setChats, settings, setSettings, activeChatId, setActiveChatId }}>{children}</AppContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
