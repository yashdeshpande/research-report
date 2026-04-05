export type LLMProviderName = "ollama" | "openai" | "anthropic";

export interface ChatMessageInput {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatResult {
  text: string;
}

export interface EmbedResult {
  vector: number[];
}

export interface LLMProvider {
  name: LLMProviderName;
  chat(messages: ChatMessageInput[]): Promise<ChatResult>;
  embed(input: string): Promise<EmbedResult>;
}
