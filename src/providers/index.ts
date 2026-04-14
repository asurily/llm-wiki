import { LLMProvider, LLMProviderConfig } from '../types/index.js';
import { ClaudeProvider } from './claude.js';
import { OpenAIProvider } from './openai.js';
import { OllamaProvider } from './ollama.js';
import { OpenAICompatibleProvider, OPENAI_COMPATIBLE_PROVIDERS, OpenAICompatibleProviderKey } from './openai-compatible.js';

export { BaseLLMProvider } from './base.js';
export { ClaudeProvider } from './claude.js';
export { OpenAIProvider } from './openai.js';
export { OllamaProvider } from './ollama.js';
export { OpenAICompatibleProvider, OPENAI_COMPATIBLE_PROVIDERS } from './openai-compatible.js';

export function createProvider(config: LLMProviderConfig): LLMProvider {
  switch (config.provider) {
    case 'claude':
      if (!config.apiKey) {
        throw new Error('Claude provider requires an API key');
      }
      return new ClaudeProvider(config.apiKey, config.name);

    case 'openai':
      if (!config.apiKey) {
        throw new Error('OpenAI provider requires an API key');
      }
      return new OpenAIProvider(config.apiKey, config.name);

    case 'openai-compatible':
      if (!config.apiKey) {
        throw new Error('OpenAI-compatible provider requires an API key');
      }
      if (!config.baseUrl) {
        throw new Error('OpenAI-compatible provider requires a baseUrl');
      }
      return new OpenAICompatibleProvider(config.apiKey, config.baseUrl, config.name);

    case 'ollama':
      return new OllamaProvider(config.baseUrl || 'http://localhost:11434', config.name);

    default:
      throw new Error(`Unknown provider: ${(config as { provider: string }).provider}`);
  }
}

/**
 * Get provider configuration by preset name
 */
export function getPresetConfig(preset: OpenAICompatibleProviderKey, model?: string): {
  baseUrl: string;
  models: readonly string[];
  envKey: string;
} {
  const providerConfig = OPENAI_COMPATIBLE_PROVIDERS[preset];
  if (!providerConfig) {
    throw new Error(`Unknown preset: ${preset}. Available presets: ${Object.keys(OPENAI_COMPATIBLE_PROVIDERS).join(', ')}`);
  }
  return {
    baseUrl: providerConfig.baseUrl,
    models: providerConfig.models,
    envKey: providerConfig.envKey,
  };
}

/**
 * List all available OpenAI-compatible providers
 */
export function listOpenAICompatibleProviders(): void {
  console.log('\n支持的 OpenAI Compatible 提供者:\n');
  for (const [key, config] of Object.entries(OPENAI_COMPATIBLE_PROVIDERS)) {
    console.log(`  ${key} (${config.name})`);
    console.log(`    Base URL: ${config.baseUrl}`);
    console.log(`    Models: ${config.models.join(', ')}`);
    console.log(`    Env Key: ${config.envKey}\n`);
  }
}
