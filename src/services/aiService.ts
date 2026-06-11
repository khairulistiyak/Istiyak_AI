import type { Message, Provider, Model, Settings } from "../types";

interface RouteResult {
  model: Model;
  provider: Provider;
}

export const aiService = {
  /**
   * Determine which model to use based on user input and auto-routing settings
   */
  autoRoute(input: string, settings: Settings): RouteResult | null {
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

    // Fallback to first available model if no rule matched or auto-route is off
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
   * Fetch stream response from OpenAI compatible endpoints
   */
  async *streamChat(messages: Message[], route: RouteResult, systemPrompt?: string): AsyncGenerator<string, void, unknown> {
    const { model, provider } = route;

    const apiMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    if (systemPrompt) {
      apiMessages.unshift({ role: "system", content: systemPrompt });
    }

    const normalizedBaseUrl = provider.baseUrl.replace(/\/+$/, "").replace(/\/chat\/completions$/, "");
    const endpoint = `${normalizedBaseUrl}/chat/completions`;

    let response: Response;
    try {
      // CORS ও Network Error এড়াতে লোকালহোস্টের জন্য ক্লিন হেডার
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (provider.apiKey) {
        headers["Authorization"] = `Bearer ${provider.apiKey}`;
      }

      response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: model.name, // UI থেকে দেওয়া মডেল আইডিটি এখানেই আসবে
          messages: apiMessages,
          stream: true,
        }),
      });
    } catch (error: any) {
      if (error.name === "TypeError" && error.message.includes("Failed to fetch")) {
        throw new Error(
          `Network Error: Connection closed or failed to reach API. 
         \n\n**Hints:**
         1. If using Local AI (like Ollama): Ensure the app is running and the Base URL is correct (e.g., http://localhost:11434/v1).
         2. If using Cloud API: Your antivirus, VPN, or adblocker might be blocking the connection, or the Base URL is invalid.`,
          { cause: error },
        );
      }
      throw error;
    }

    if (!response.ok) {
      let errorMsg = `API Error: ${response.status} ${response.statusText}`;
      try {
        const errorBody = await response.json();
        if (errorBody?.error?.message) {
          errorMsg += ` - ${errorBody.error.message}`;
        } else if (typeof errorBody === "string") {
          errorMsg += ` - ${errorBody}`;
        }
      } catch (e) {
        // Fallback to basic error if JSON parsing fails
      }

      if (response.status === 429) {
        errorMsg +=
          " \n\n**Hint:** A 429 error usually means 'Too Many Requests' or 'Insufficient Credits'. Please check your OpenRouter billing/credits dashboard or wait a moment before trying again.";
      }

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
