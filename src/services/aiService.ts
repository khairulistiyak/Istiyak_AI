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
   * Fetch relevant context from active journals (RAG Ready Architecture)
   * This is currently a basic implementation but designed modularly 
   * to easily plug in MongoDB Vector Search or LangChain in the future.
   */
  async getRelevantContext(query: string): Promise<string> {
    try {
      // Fetch only active journals. Later, this endpoint can be updated
      // to perform true semantic vector search on the backend.
      const response = await fetch(`/api/journals/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) return '';
      
      const journals = await response.json();
      if (!journals || journals.length === 0) return '';

      // Format the context for the LLM
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contextStr = journals.map((j: any) => {
        return `[Context Note - Tags: ${j.tags?.join(', ') || 'None'}]\n${j.content}`;
      }).join('\n\n---\n\n');

      return `\n\n=== RELEVANT CONTEXT (Use this to inform your answer if helpful) ===\n${contextStr}\n======================\n`;
    } catch (error) {
      console.error('Failed to fetch relevant context:', error);
      return '';
    }
  },

  /**
   * Fetch stream response from secure backend proxy
   */
  async *streamChat(messages: Message[], route: RouteResult, systemPrompt?: string): AsyncGenerator<string, void, unknown> {
    let response: Response;
    try {
      // call our backend proxy instead of the external API directly
      response = await fetch('/api/chat', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages,
          route,
          systemPrompt
        }),
      });
    } catch (error) {
      throw new Error(
        `Network Error: Failed to connect to the backend server. Please check your internet connection or ensure the server is running.`,
        { cause: error },
      );
    }

    if (!response.ok) {
      let errorMsg = `API Error: ${response.status} ${response.statusText}`;
      try {
        const errorBody = await response.json();
        if (errorBody?.error) {
          errorMsg += ` - ${errorBody.error}`;
        }
        if (errorBody?.details) {
            try {
                const detailsJson = JSON.parse(errorBody.details);
                if (detailsJson.error && detailsJson.error.message) {
                    errorMsg += ` (${detailsJson.error.message})`;
                }
            } catch(e) {
                errorMsg += ` (${errorBody.details})`;
            }
        }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
