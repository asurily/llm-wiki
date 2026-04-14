import * as fs from 'fs/promises';
import * as path from 'path';
import * as readline from 'readline';
import { Config, LLMProviderConfig } from '../types/index.js';
import { saveConfig, getDefaultConfig } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { OPENAI_COMPATIBLE_PROVIDERS, OpenAICompatibleProviderKey } from '../providers/index.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

export async function initCommand(options: { template?: string }): Promise<void> {
  logger.info('Initializing LLM Wiki project...');

  const configPath = './llm-wiki.yaml';

  // Check if config already exists
  try {
    await fs.access(configPath);
    const overwrite = await question('Config file already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      logger.info('Aborted.');
      rl.close();
      return;
    }
  } catch {
    // Config doesn't exist, continue
  }

  // Interactive configuration
  console.log('\n--- LLM Provider Configuration ---\n');
  console.log('Available providers:');
  console.log('  1. claude          - Anthropic Claude');
  console.log('  2. openai          - OpenAI GPT');
  console.log('  3. openai-compatible - OpenAI Compatible (智谱/DeepSeek/月之暗面等)');
  console.log('  4. ollama          - Local Ollama\n');

  const providerAnswer = await question('Select LLM provider (1-4) [1]: ');
  const providerMap: Record<string, LLMProviderConfig['provider']> = {
    '1': 'claude',
    '2': 'openai',
    '3': 'openai-compatible',
    '4': 'ollama',
    '': 'claude',
  };
  const provider = providerMap[providerAnswer] || 'claude';

  let modelConfig: LLMProviderConfig = {
    provider,
    name: '',
  };

  switch (provider) {
    case 'claude':
      modelConfig.name = (await question('Model name [claude-sonnet-4-6]: ')) || 'claude-sonnet-4-6';
      modelConfig.apiKey = '$ANTHROPIC_API_KEY';
      break;

    case 'openai':
      modelConfig.name = (await question('Model name [gpt-4-turbo-preview]: ')) || 'gpt-4-turbo-preview';
      modelConfig.apiKey = '$OPENAI_API_KEY';
      break;

    case 'openai-compatible': {
      console.log('\n  Predefined OpenAI Compatible providers:');
      const presetKeys = Object.keys(OPENAI_COMPATIBLE_PROVIDERS) as OpenAICompatibleProviderKey[];
      presetKeys.forEach((key, index) => {
        const preset = OPENAI_COMPATIBLE_PROVIDERS[key];
        console.log(`    ${index + 1}. ${key} (${preset.name}) - Models: ${preset.models.slice(0, 2).join(', ')}...`);
      });
      console.log(`    ${presetKeys.length + 1}. custom (自定义配置)\n`);

      const presetAnswer = await question('Select provider (number) or enter custom: ');
      const presetIndex = parseInt(presetAnswer) - 1;

      if (presetIndex >= 0 && presetIndex < presetKeys.length) {
        // Use predefined preset
        const selectedKey = presetKeys[presetIndex];
        const preset = OPENAI_COMPATIBLE_PROVIDERS[selectedKey];

        console.log(`\n  Models for ${preset.name}: ${preset.models.join(', ')}`);
        const modelAnswer = await question(`Model name [${preset.models[0]}]: `);
        modelConfig.name = modelAnswer || preset.models[0];
        modelConfig.baseUrl = preset.baseUrl;
        modelConfig.apiKey = `$${preset.envKey}`;
      } else {
        // Custom configuration
        modelConfig.name = (await question('Model name: ')) || 'custom-model';
        modelConfig.baseUrl = (await question('Base URL (e.g., https://api.example.com/v1): ')) || '';
        modelConfig.apiKey = (await question('API Key env variable [$API_KEY]: ')) || '$API_KEY';
      }
      break;
    }

    case 'ollama':
      modelConfig.name = (await question('Model name [llama3]: ')) || 'llama3';
      modelConfig.baseUrl = (await question('Ollama URL [http://localhost:11434]: ')) || 'http://localhost:11434';
      break;
  }

  console.log('\n--- Paths Configuration ---\n');

  const sourcePath = (await question('Source directory [./notes]: ')) || './notes';
  const outputPath = (await question('Output directory [./wiki]: ')) || './wiki';

  // Create config
  const config: Config = {
    model: modelConfig,
    paths: {
      source: sourcePath,
      output: outputPath,
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

  // Save config
  await saveConfig(config, configPath);
  logger.success(`Configuration saved to ${configPath}`);

  // Create directories
  await fs.mkdir(sourcePath, { recursive: true });
  logger.success(`Created source directory: ${sourcePath}`);

  await fs.mkdir(outputPath, { recursive: true });
  logger.success(`Created output directory: ${outputPath}`);

  // Create .env reminder
  if (modelConfig.apiKey && modelConfig.apiKey.startsWith('$')) {
    const envVar = modelConfig.apiKey.slice(1);
    console.log(`\n⚠ Don't forget to set your ${envVar} environment variable!`);
    console.log(`  export ${envVar}=your-api-key-here\n`);
  }

  // Create example file
  const exampleFile = path.join(sourcePath, 'example.md');
  const exampleContent = `# Example Note

This is an example note that demonstrates how LLM Wiki works.

## Key Points

- LLM Wiki uses LLMs to extract structured information from your notes
- It creates an Obsidian-compatible wiki with bidirectional links
- Supports incremental updates to only process changed files

## References

- Created by Claude
- Based on Andrej Karpathy's LLM Wiki concept
`;

  try {
    await fs.access(exampleFile);
  } catch {
    await fs.writeFile(exampleFile, exampleContent, 'utf-8');
    logger.success(`Created example file: ${exampleFile}`);
  }

  console.log('\n✨ Initialization complete! Run `llm-wiki build` to compile your notes.\n');

  rl.close();
}
