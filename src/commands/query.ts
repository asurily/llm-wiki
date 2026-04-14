import * as path from 'path';
import * as fs from 'fs/promises';
import { Config, QueryOptions } from '../types/index.js';
import { loadConfig, resolveConfigPath } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { createProvider } from '../providers/index.js';
import { IndexManager } from '../wiki/index.js';

export async function queryCommand(question: string, options: QueryOptions): Promise<void> {
  logger.setVerbose(options.verbose || false);

  // Load config
  const configPath = await resolveConfigPath(options.config);
  const config = await loadConfig(configPath);

  if (options.model) {
    config.model.name = options.model;
  }

  // Initialize components
  const provider = createProvider(config.model);
  const indexer = new IndexManager(config.paths.output);

  // Load wiki index
  logger.startSpinner('Loading wiki...');
  const index = await indexer.load();
  logger.stopSpinner(true, 'Wiki loaded');

  // Build context from wiki
  let context = '';
  const allPages = [
    ...index.entities.entries(),
    ...index.concepts.entries(),
    ...index.sources.entries(),
  ];

  // Use embeddings to find relevant pages if available
  if (provider.embed) {
    logger.startSpinner('Finding relevant pages...');
    const questionEmbedding = await provider.embed(question);

    const similarities: { name: string; similarity: number; content: string; type: string }[] = [];

    for (const [name, page] of allPages) {
      const pageEmbedding = await provider.embed(page.content);
      const similarity = cosineSimilarity(questionEmbedding, pageEmbedding);
      similarities.push({ name, similarity, content: page.content, type: page.path.split('/').slice(-2, -1)[0] });
    }

    // Sort by similarity and take top pages
    similarities.sort((a, b) => b.similarity - a.similarity);
    const topPages = similarities.slice(0, 5);

    context = topPages
      .map(p => `## ${p.name} (${p.type})\n\n${p.content.substring(0, 1000)}...`)
      .join('\n\n---\n\n');

    logger.stopSpinner(true, `Found ${topPages.length} relevant pages`);
  } else {
    // Without embeddings, use all pages (limited)
    context = allPages
      .slice(0, 10)
      .map(([name, page]) => `## ${name}\n\n${page.content.substring(0, 500)}...`)
      .join('\n\n---\n\n');
  }

  // Query LLM
  logger.startSpinner('Generating answer...');

  const systemPrompt = `你是一个知识库助手。根据以下 Wiki 内容回答问题。

如果问题与 Wiki 内容相关，请基于内容回答，并在适当的地方使用 [[页面名]] 格式引用相关页面。
如果问题与 Wiki 内容无关，请如实告知。

Wiki 内容：
${context}`;

  const response = await provider.chat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: question },
  ]);

  logger.stopSpinner(true, 'Answer generated');

  // Output answer
  console.log('\n' + '='.repeat(60) + '\n');
  console.log(response);
  console.log('\n' + '='.repeat(60) + '\n');

  // Save if requested
  if (options.save) {
    const synthesisDir = path.join(config.paths.output, 'synthesis');
    await fs.mkdir(synthesisDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `query-${timestamp}.md`;
    const filePath = path.join(synthesisDir, fileName);

    const content = `---
type: synthesis
query: ${question}
created: ${new Date().toISOString()}
---

# Query: ${question}

## Question

${question}

## Answer

${response}
`;

    await fs.writeFile(filePath, content, 'utf-8');
    logger.success(`Answer saved to: ${filePath}`);
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
