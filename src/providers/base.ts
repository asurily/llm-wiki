import { LLMProvider, Message } from '../types/index.js';

export abstract class BaseLLMProvider implements LLMProvider {
  abstract name: string;

  abstract chat(messages: Message[]): Promise<string>;

  async embed?(text: string): Promise<number[]>;

  protected formatMessages(messages: Message[]): { system?: string; conversation: Array<{ role: 'user' | 'assistant'; content: string }> } {
    let system: string | undefined;
    const conversation: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        system = typeof msg.content === 'string' ? msg.content : msg.content.map(b => b.text || '').join('\n');
      } else {
        const content = typeof msg.content === 'string' ? msg.content : msg.content.map(b => b.text || '').join('\n');
        conversation.push({ role: msg.role, content });
      }
    }

    return { system, conversation };
  }
}
