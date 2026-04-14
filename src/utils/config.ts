import * as fs from 'fs/promises';
import * as path from 'path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { Config, LLMProviderConfig, PathsConfig, WikiConfig, IncrementalConfig } from '../types/index.js';

const DEFAULT_CONFIG: Config = {
  model: {
    provider: 'claude',
    name: 'claude-sonnet-4-6',
  },
  paths: {
    source: './notes',
    output: './wiki',
    cache: '.llm-wiki/cache.json',
  },
  wiki: {
    naming: 'kebab-case',
    pages: ['entities', 'concepts', 'sources', 'synthesis'],
    linking: {
      auto: true,
      threshold: 0.7,
    },
  },
  incremental: {
    enabled: true,
  },
};

export async function loadConfig(configPath: string = './llm-wiki.yaml'): Promise<Config> {
  const absolutePath = path.resolve(configPath);

  try {
    const content = await fs.readFile(absolutePath, 'utf-8');
    const parsed = parseYaml(content) as Partial<Config>;

    // Merge with defaults
    const config: Config = {
      model: { ...DEFAULT_CONFIG.model, ...parsed.model },
      paths: { ...DEFAULT_CONFIG.paths, ...parsed.paths },
      wiki: { ...DEFAULT_CONFIG.wiki, ...parsed.wiki },
      incremental: { ...DEFAULT_CONFIG.incremental, ...parsed.incremental },
      schema: parsed.schema,
    };

    // Resolve environment variables in API key
    if (config.model.apiKey?.startsWith('$')) {
      const envVar = config.model.apiKey.slice(1);
      config.model.apiKey = process.env[envVar];
    }

    return config;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return DEFAULT_CONFIG;
    }
    throw error;
  }
}

export async function saveConfig(config: Config, configPath: string = './llm-wiki.yaml'): Promise<void> {
  const absolutePath = path.resolve(configPath);
  const dir = path.dirname(absolutePath);

  await fs.mkdir(dir, { recursive: true });
  const content = stringifyYaml(config);
  await fs.writeFile(absolutePath, content, 'utf-8');
}

export function getDefaultConfig(): Config {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

export async function resolveConfigPath(explicitPath?: string): Promise<string> {
  if (explicitPath) {
    return path.resolve(explicitPath);
  }

  // Look for config file in current directory
  const candidates = ['llm-wiki.yaml', 'llm-wiki.yml', '.llm-wiki.yaml'];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return path.resolve(candidate);
    } catch {
      // Continue to next candidate
    }
  }

  return path.resolve('llm-wiki.yaml');
}
