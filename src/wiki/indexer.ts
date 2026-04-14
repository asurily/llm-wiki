import * as path from 'path';
import * as fs from 'fs/promises';
import matter from 'gray-matter';
import { WikiPage, Entity, Concept } from '../types/index.js';

export interface WikiIndex {
  entities: Map<string, WikiPage>;
  concepts: Map<string, WikiPage>;
  sources: Map<string, WikiPage>;
  synthesis: Map<string, WikiPage>;
}

export class IndexManager {
  private wikiPath: string;

  constructor(wikiPath: string) {
    this.wikiPath = path.resolve(wikiPath);
  }

  async load(): Promise<WikiIndex> {
    const index: WikiIndex = {
      entities: new Map(),
      concepts: new Map(),
      sources: new Map(),
      synthesis: new Map(),
    };

    // Load entities
    const entitiesPath = path.join(this.wikiPath, 'entities');
    await this.loadPages(entitiesPath, index.entities);

    // Load concepts
    const conceptsPath = path.join(this.wikiPath, 'concepts');
    await this.loadPages(conceptsPath, index.concepts);

    // Load sources
    const sourcesPath = path.join(this.wikiPath, 'sources');
    await this.loadPages(sourcesPath, index.sources);

    // Load synthesis
    const synthesisPath = path.join(this.wikiPath, 'synthesis');
    await this.loadPages(synthesisPath, index.synthesis);

    return index;
  }

  private async loadPages(dirPath: string, map: Map<string, WikiPage>): Promise<void> {
    try {
      const files = await fs.readdir(dirPath);

      for (const file of files) {
        if (!file.endsWith('.md')) continue;

        const filePath = path.join(dirPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const { data: frontmatter, content: body } = matter(content);

        const links = this.extractLinks(body);
        const name = path.basename(file, '.md');

        map.set(name, {
          path: filePath,
          content: body,
          frontmatter,
          links,
        });
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      // Directory doesn't exist, that's fine
    }
  }

  async getExistingPage(type: 'entities' | 'concepts' | 'sources' | 'synthesis', name: string): Promise<string | null> {
    const pagePath = path.join(this.wikiPath, type, `${name}.md`);

    try {
      return await fs.readFile(pagePath, 'utf-8');
    } catch {
      return null;
    }
  }

  async savePage(type: 'entities' | 'concepts' | 'sources' | 'synthesis', name: string, content: string): Promise<string> {
    const dirPath = path.join(this.wikiPath, type);
    await fs.mkdir(dirPath, { recursive: true });

    const pagePath = path.join(dirPath, `${name}.md`);
    await fs.writeFile(pagePath, content, 'utf-8');

    return pagePath;
  }

  async updateIndexPage(content: string): Promise<void> {
    const indexPath = path.join(this.wikiPath, 'index.md');
    await fs.writeFile(indexPath, content, 'utf-8');
  }

  async appendToLog(content: string): Promise<void> {
    const logPath = path.join(this.wikiPath, 'log.md');

    let existing = '';
    try {
      existing = await fs.readFile(logPath, 'utf-8');
    } catch {
      existing = '# Wiki Log\n\n记录所有处理历史。\n\n';
    }

    await fs.writeFile(logPath, content + existing, 'utf-8');
  }

  async getStats(): Promise<{
    totalPages: number;
    entitiesCount: number;
    conceptsCount: number;
    sourcesCount: number;
    synthesisCount: number;
  }> {
    const index = await this.load();

    return {
      totalPages: index.entities.size + index.concepts.size + index.sources.size + index.synthesis.size,
      entitiesCount: index.entities.size,
      conceptsCount: index.concepts.size,
      sourcesCount: index.sources.size,
      synthesisCount: index.synthesis.size,
    };
  }

  private extractLinks(content: string): string[] {
    const linkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
    const links: string[] = [];
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      links.push(match[1]);
    }

    return [...new Set(links)];
  }

  slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\u4e00-\u9fa5-]/g, '');
  }
}
