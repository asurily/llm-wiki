import * as path from 'path';
import * as fs from 'fs/promises';
import matter from 'gray-matter';
import { LLMProvider, ParsedDocument, ExtractedInfo, Entity, Concept, WikiStructure, WikiPage } from '../types/index.js';

const EXTRACT_SYSTEM_PROMPT = `你是一个知识库编译器。你的任务是从源文档中提取结构化信息。

你需要识别并提取：
1. **实体**: 人物、组织、地点、事件、产品等
2. **概念**: 主要主题、关键词、核心观点
3. **关系**: 实体之间、概念之间的关联
4. **摘要**: 文档的核心内容概述

输出格式为 JSON：
{
  "title": "文档标题",
  "summary": "摘要内容",
  "entities": [
    {"name": "实体名", "type": "person|org|place|event|product|other", "description": "描述"}
  ],
  "concepts": [
    {"name": "概念名", "description": "描述"}
  ],
  "relations": [
    {"from": "实体A", "to": "实体B", "relation": "关系描述"}
  ]
}

注意：
- 实体类型必须是: person, org, place, event, product, other 之一
- 提取的名称要简洁明确，便于创建 Wiki 链接
- 关系描述要简洁明了`;

const GENERATE_PAGE_SYSTEM_PROMPT = `你是一个 Wiki 页面生成器。你的任务是将提取的信息整合到 Obsidian 兼容的 Wiki 中。

规则：
1. 使用双向链接 [[页面名]] 创建交叉引用
2. 使用 YAML frontmatter 添加元数据
3. 保持 Markdown 格式整洁
4. 与现有内容合并时，保留有价值的信息，更新过时的内容
5. 使用中文输出内容`;

export class WikiGenerator {
  private provider: LLMProvider;

  constructor(provider: LLMProvider) {
    this.provider = provider;
  }

  async extractInfo(doc: ParsedDocument): Promise<ExtractedInfo> {
    const messages = [
      { role: 'system' as const, content: EXTRACT_SYSTEM_PROMPT },
      { role: 'user' as const, content: `文档标题: ${doc.metadata.title}\n\n文档内容:\n${doc.content}` },
    ];

    const response = await this.provider.chat(messages);

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from LLM response');
    }

    const info = JSON.parse(jsonMatch[0]) as ExtractedInfo;
    return info;
  }

  async generateEntityPage(
    entity: Entity,
    existingContent: string | null,
    sourceRef: string
  ): Promise<string> {
    const prompt = existingContent
      ? `更新以下实体页面，整合新的信息：

现有页面内容：
${existingContent}

新的来源信息：
- 来源: ${sourceRef}
- 描述: ${entity.description}

请合并内容，保留有价值的信息，添加新的引用。`
      : `为以下实体创建 Wiki 页面：

实体名称: ${entity.name}
类型: ${entity.type}
描述: ${entity.description}
来源: ${sourceRef}

生成一个完整的 Wiki 页面，包含 frontmatter。`;

    const messages = [
      { role: 'system' as const, content: GENERATE_PAGE_SYSTEM_PROMPT },
      { role: 'user' as const, content: prompt },
    ];

    return await this.provider.chat(messages);
  }

  async generateConceptPage(
    concept: Concept,
    existingContent: string | null,
    sourceRef: string
  ): Promise<string> {
    const prompt = existingContent
      ? `更新以下概念页面，整合新的信息：

现有页面内容：
${existingContent}

新的来源信息：
- 来源: ${sourceRef}
- 描述: ${concept.description}

请合并内容，保留有价值的信息，添加新的引用。`
      : `为以下概念创建 Wiki 页面：

概念名称: ${concept.name}
描述: ${concept.description}
来源: ${sourceRef}

生成一个完整的 Wiki 页面，包含 frontmatter。`;

    const messages = [
      { role: 'system' as const, content: GENERATE_PAGE_SYSTEM_PROMPT },
      { role: 'user' as const, content: prompt },
    ];

    return await this.provider.chat(messages);
  }

  async generateSourcePage(doc: ParsedDocument, info: ExtractedInfo): Promise<string> {
    const entityLinks = info.entities.map(e => `- [[${this.slugify(e.name)}|${e.name}]]`).join('\n');
    const conceptLinks = info.concepts.map(c => `- [[${this.slugify(c.name)}|${c.name}]]`).join('\n');

    const frontmatter = {
      type: 'source',
      original_path: doc.metadata.path,
      title: doc.metadata.title,
      created: doc.metadata.created.toISOString(),
      processed: new Date().toISOString(),
    };

    return `---
${Object.entries(frontmatter).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n')}
---

# ${doc.metadata.title}

## 摘要

${info.summary}

## 提取的实体

${entityLinks || '无'}

## 提取的概念

${conceptLinks || '无'}

## 原始内容

${doc.content.substring(0, 2000)}${doc.content.length > 2000 ? '\n\n...(内容已截断)' : ''}
`;
  }

  async updateIndex(
    existingIndex: string | null,
    entities: Map<string, Entity[]>,
    concepts: Map<string, Concept[]>,
    sources: ParsedDocument[]
  ): Promise<string> {
    const date = new Date().toISOString().split('T')[0];

    // Group entities by type
    const entitiesByType = new Map<string, Entity[]>();
    for (const entityList of entities.values()) {
      for (const entity of entityList) {
        const list = entitiesByType.get(entity.type) || [];
        list.push(entity);
        entitiesByType.set(entity.type, list);
      }
    }

    const entityTypeLabels: Record<string, string> = {
      person: '人物',
      org: '组织',
      place: '地点',
      event: '事件',
      product: '产品',
      other: '其他',
    };

    let entitySection = '';
    for (const [type, typeEntities] of entitiesByType) {
      const uniqueNames = [...new Set(typeEntities.map(e => e.name))];
      const links = uniqueNames.map(name => `- [[${this.slugify(name)}|${name}]]`).join('\n');
      entitySection += `### ${entityTypeLabels[type] || type}\n${links}\n\n`;
    }

    const uniqueConcepts = new Map<string, Concept>();
    for (const conceptList of concepts.values()) {
      for (const concept of conceptList) {
        if (!uniqueConcepts.has(concept.name)) {
          uniqueConcepts.set(concept.name, concept);
        }
      }
    }

    const conceptLinks = [...uniqueConcepts.values()]
      .map(c => `- [[${this.slugify(c.name)}|${c.name}]]`)
      .join('\n');

    const sourceLinks = sources
      .map(s => `- [[${this.slugify(s.metadata.title)}|${s.metadata.title}]]`)
      .join('\n');

    return `# Wiki Index

最后更新: ${date}

## 概览
- [[overview|Wiki 总览]]

## 实体

${entitySection || '暂无实体'}

## 概念

${conceptLinks || '暂无概念'}

## 源文件

${sourceLinks || '暂无源文件'}

## 统计
- 总页面数: ${entities.size + concepts.size + sources.length}
- 源文件数: ${sources.length}
- 最后处理: ${date}
`;
  }

  generateLogEntry(doc: ParsedDocument, info: ExtractedInfo): string {
    const date = new Date().toISOString();
    const entityNames = info.entities.map(e => e.name).join(', ');
    const conceptNames = info.concepts.map(c => c.name).join(', ');

    return `## ${date}

处理文件: [[${this.slugify(doc.metadata.title)}]]

提取实体: ${entityNames || '无'}
提取概念: ${conceptNames || '无'}

`;
  }

  slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\u4e00-\u9fa5-]/g, '');
  }

  parseWikiPage(content: string): WikiPage {
    const { data: frontmatter, content: body } = matter(content);
    const links = this.extractLinks(body);

    return {
      path: '',
      content: body,
      frontmatter,
      links,
    };
  }

  extractLinks(content: string): string[] {
    const linkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
    const links: string[] = [];
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      links.push(match[1]);
    }

    return [...new Set(links)];
  }
}
