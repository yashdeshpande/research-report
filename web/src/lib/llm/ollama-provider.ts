import type { ChatMessageInput, ChatResult, EmbedResult, LLMProvider } from "./types";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
const OLLAMA_CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL ?? "llama3.1";
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text";

export class OllamaProvider implements LLMProvider {
  name = "ollama" as const;

  async chat(messages: ChatMessageInput[]): Promise<ChatResult> {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_CHAT_MODEL,
        stream: false,
        messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama chat failed with status ${response.status}`);
    }

    const data = (await response.json()) as { message?: { content?: string } };
    return { text: data.message?.content ?? "" };
  }

  async embed(input: string): Promise<EmbedResult> {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_EMBED_MODEL,
        prompt: input,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama embeddings failed with status ${response.status}`);
    }

    const data = (await response.json()) as { embedding?: number[] };
    return { vector: data.embedding ?? [] };
  }
}
