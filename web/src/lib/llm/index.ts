import { OllamaProvider } from "./ollama-provider";
import type { LLMProvider } from "./types";

const providerName = (process.env.LLM_PROVIDER ?? "ollama").toLowerCase();

function createProvider(): LLMProvider {
  switch (providerName) {
    case "openai":
    case "anthropic":
      // For now, default to Ollama until cloud adapters are added in Phase 6.
      return new OllamaProvider();
    case "ollama":
    default:
      return new OllamaProvider();
  }
}

export const llmProvider = createProvider();
