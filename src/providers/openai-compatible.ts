import OpenAI from 'openai';
import { BaseLLMProvider } from './base.js';
import { Message } from '../types/index.js';

/**
 * OpenAI Compatible Provider
 *
 * Supports any service that implements the OpenAI API format, including:
 * - Zhipu AI (智谱): https://open.bigmodel.cn/
 * - DeepSeek: https://platform.deepseek.com/
 * - Moonshot (月之暗面): https://platform.moonshot.cn/
 * - SiliconFlow: https://siliconflow.cn/
 * - Any other OpenAI-compatible API
 *
 * Configuration example:
 * ```yaml
 * model:
 *   provider: openai-compatible
 *   name: glm-4  # or deepseek-chat, moonshot-v1-8k, etc.
 *   apiKey: $ZHIPU_API_KEY
 *   baseUrl: https://open.bigmodel.cn/api/paas/v4
 * ```
 */
export class OpenAICompatibleProvider extends BaseLLMProvider {
  name = 'openai-compatible';
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, baseUrl: string, model: string) {
    super();
    this.client = new OpenAI({
      apiKey,
      baseURL: baseUrl,
    });
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
    try {
      const response = await this.client.embeddings.create({
        model: 'embedding-3-small',
        input: text,
      });
      return response.data[0].embedding;
    } catch {
      // If embedding model is not available, return hash-based embedding
      const hash = (await import('crypto')).createHash('sha256').update(text).digest();
      const embedding: number[] = [];
      for (let i = 0; i < 64; i += 2) {
        embedding.push(hash.readInt16BE(i) / 32768);
      }
      return embedding;
    }
  }
}

/**
 * Predefined configurations for popular OpenAI-compatible providers
 */
export const OPENAI_COMPATIBLE_PROVIDERS = {
  zhipu: {
    name: '智谱 AI',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4', 'glm-4-flash', 'glm-4-plus', 'glm-4-air'],
    envKey: 'ZHIPU_API_KEY',
  },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-coder'],
    envKey: 'DEEPSEEK_API_KEY',
  },
  moonshot: {
    name: '月之暗面',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    envKey: 'MOONSHOT_API_KEY',
  },
  siliconflow: {
    name: 'SiliconFlow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    models: ['Qwen/Qwen2.5-7B-Instruct', 'Qwen/Qwen2.5-72B-Instruct', 'deepseek-ai/DeepSeek-V2.5'],
    envKey: 'SILICONFLOW_API_KEY',
  },
  aliyun: {
    name: '阿里云百炼',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: ['qwen-turbo', 'qwen-plus', 'qwen-max'],
    envKey: 'DASHSCOPE_API_KEY',
  },
  baidu: {
    name: '百度千帆',
    baseUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat',
    models: ['ernie-4.0-8k', 'ernie-3.5-8k', 'ernie-speed-8k'],
    envKey: 'BAIDU_API_KEY',
  },
} as const;

export type OpenAICompatibleProviderKey = keyof typeof OPENAI_COMPATIBLE_PROVIDERS;
