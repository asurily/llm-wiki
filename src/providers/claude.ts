import Anthropic from '@anthropic-ai/sdk';
import { BaseLLMProvider } from './base.js';
import { Message } from '../types/index.js';

export class ClaudeProvider extends BaseLLMProvider {
  name = 'claude';
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-sonnet-4-6') {
    super();
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async chat(messages: Message[]): Promise<string> {
    const { system, conversation } = this.formatMessages(messages);

    const formattedMessages: Anthropic.MessageParam[] = [];

    // Convert messages to Anthropic format
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];

      if (msg.role === 'system') {
        continue; // System is handled separately
      }

      if (typeof msg.content === 'string') {
        formattedMessages.push({
          role: msg.role,
          content: msg.content,
        });
      } else {
        // Handle multimodal content (text + images)
        const blocks: Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam> = [];

        for (const block of msg.content) {
          if (block.type === 'text') {
            blocks.push({
              type: 'text',
              text: block.text || '',
            });
          } else if (block.type === 'image' && block.source) {
            blocks.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: block.source.media_type as Anthropic.ImageBlockParam['source']['media_type'],
                data: block.source.data,
              },
            });
          }
        }

        formattedMessages.push({
          role: msg.role,
          content: blocks,
        });
      }
    }

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: system,
      messages: formattedMessages,
    });

    const textContent = response.content.find(block => block.type === 'text');
    return textContent ? (textContent as Anthropic.TextBlock).text : '';
  }

  async embed(text: string): Promise<number[]> {
    // Note: Anthropic doesn't provide a native embedding API
    // For now, we'll return a simple hash-based embedding for compatibility
    // In production, you might want to use a separate embedding service
    const hash = (await import('crypto')).createHash('sha256').update(text).digest();
    const embedding: number[] = [];
    for (let i = 0; i < 64; i += 2) {
      embedding.push(hash.readInt16BE(i) / 32768);
    }
    return embedding;
  }
}
