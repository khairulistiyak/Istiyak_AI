import type { Message, Provider, Model } from "../types";

interface RouteResult {
  model: Model;
  provider: Provider;
}

export const aiService = {
  /**
   * Determine which model to use based on user input and auto-routing settings
   */
  autoRoute(input: string, settings: { models: Model[], providers: Provider[], autoRouteEnabled: boolean, routingRules: any }): RouteResult | null {
    if (settings.models.length === 0 || settings.providers.length === 0) {
      return null;
    }

    let selectedModelId: string | null = null;
    const lowerInput = input.toLowerCase();

    if (settings.autoRouteEnabled) {
      const isCoding = ["react", "typescript", "code", "error", "bug", "debug", "function", "api"].some((k) => lowerInput.includes(k));
      const isCreative = ["design", "logo", "brand", "content", "story", "idea", "creative", "poem"].some((k) => lowerInput.includes(k));

      if (isCoding && settings.routingRules.codingModelId) {
        selectedModelId = settings.routingRules.codingModelId;
      } else if (isCreative && settings.routingRules.creativeModelId) {
        selectedModelId = settings.routingRules.creativeModelId;
      } else if (settings.routingRules.fastModelId) {
        selectedModelId = settings.routingRules.fastModelId;
      }
    }

    if (!selectedModelId) {
      selectedModelId = settings.models[0].id;
    }

    const model = settings.models.find((m) => m.id === selectedModelId);
    if (!model) return null;

    const provider = settings.providers.find((p) => p.id === model.providerId);
    if (!provider) return null;

    return { model, provider };
  },

  /**
   * Fetch stream response from the secure backend proxy.
   * The backend now handles the "Main Brain" context injection.
   */
  async *streamChat(messages: Message[], route: RouteResult, systemPrompt?: string): AsyncGenerator<string, void, unknown> {
    let response: Response;
    try {
      response = await fetch('/api/chat', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          route,
          systemPrompt // This is now a chat-specific prompt
        }),
      });
    } catch (error) {
      throw new Error(`Network Error: Failed to connect to the backend server.`, { cause: error });
    }

    if (!response.ok) {
      let errorMsg = `API Error: ${response.status} ${response.statusText}`;
      try {
        const errorBody = await response.json();
        errorMsg += ` - ${errorBody.error || ''}`;
        if (errorBody.details) {
          errorMsg += ` (${errorBody.details})`;
        }
      } catch (e) { /* Ignore JSON parsing errors */ }
      throw new Error(errorMsg);
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((line) => line.trim() !== "");

      for (const line of lines) {
        if (line.replace(/^data: /, "").trim() === "[DONE]") {
          return;
        }

        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.choices && data.choices.length > 0) {
              const delta = data.choices[0].delta?.content;
              if (delta) {
                yield delta;
              }
            }
          } catch (e) {
            console.warn("Error parsing SSE line", line, e);
          }
        }
      }
    }
  },
};
