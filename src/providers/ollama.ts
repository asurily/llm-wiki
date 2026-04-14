import { BaseLLMProvider } from './base.js';
import { Message } from '../types/index.js';

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  stream?: boolean;
}

interface OllamaEmbeddingRequest {
  model: string;
  prompt: string;
}

interface OllamaResponse {
  response: string;
}

interface OllamaEmbeddingResponse {
  embedding: number[];
}

export class OllamaProvider extends BaseLLMProvider {
  name = 'ollama';
  private baseUrl: string;
  private model: string;

  constructor(baseUrl: string = 'http://localhost:11434', model: string = 'llama3') {
    super();
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.model = model;
  }

  async chat(messages: Message[]): Promise<string> {
    const { system, conversation } = this.formatMessages(messages);

    // Build prompt from conversation
    const promptParts: string[] = [];
    for (const msg of conversation) {
      const prefix = msg.role === 'user' ? 'User: ' : 'Assistant: ';
      promptParts.push(prefix + msg.content);
    }
    const prompt = promptParts.join('\n\n') + '\n\nAssistant:';

    const request: OllamaGenerateRequest = {
      model: this.model,
      prompt,
      system,
      stream: false,
    };

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = (await response.json()) as OllamaResponse;
    return data.response;
  }

  async embed(text: string): Promise<number[]> {
    const request: OllamaEmbeddingRequest = {
      model: this.model,
      prompt: text,
    };

    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Ollama embedding API error: ${response.statusText}`);
    }

    const data = (await response.json()) as OllamaEmbeddingResponse;
    return data.embedding;
  }
}
