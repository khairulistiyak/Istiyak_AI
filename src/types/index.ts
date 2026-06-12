export interface Provider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
}

export interface Model {
  id: string;
  name: string;
  providerId: string;
}

export type Role = 'system' | 'user' | 'assistant';

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  systemPrompt?: string;
}

export interface RoutingRules {
  codingModelId: string | null;
  creativeModelId: string | null;
  fastModelId: string | null;
}

export interface Settings {
  providers: Provider[];
  models: Model[];
  routingRules: RoutingRules;
  autoRouteEnabled: boolean;
  globalSystemPrompt: string;
}

export interface Journal {
  _id: string;
  content: string;
  tags: string[];
  isActive: boolean;
  createdAt: string;
}
