import OpenAI from 'openai';
import { BaseLLMProvider } from './base.js';
import { Message } from '../types/index.js';

export class OpenAIProvider extends BaseLLMProvider {
  name = 'openai';
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-4-turbo-preview') {
    super();
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async chat(messages: Message[]): Promise<string> {
    const { system, conversation } = this.formatMessages(messages);

    const formattedMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (system) {
      formattedMessages.push({ role: 'system', content: system });
    }

    for (const msg of conversation) {
      formattedMessages.push({ role: msg.role, content: msg.content });
    }

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: formattedMessages,
      max_tokens: 4096,
    });

    return response.choices[0]?.message?.content || '';
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  }
}
