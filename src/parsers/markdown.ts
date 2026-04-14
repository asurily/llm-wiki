import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import { ParsedDocument, DocumentMetadata, Parser } from '../types/index.js';

export class MarkdownParser implements Parser {
  private extensions = ['.md', '.markdown', '.mdown', '.mkd'];

  supports(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.extensions.includes(ext);
  }

  async parse(filePath: string): Promise<ParsedDocument> {
    const content = await fs.readFile(filePath, 'utf-8');
    const stats = await fs.stat(filePath);
    const { data: frontmatter, content: body } = matter(content);

    const title = frontmatter.title || this.extractTitle(body) || path.basename(filePath, path.extname(filePath));

    const metadata: DocumentMetadata = {
      path: filePath,
      title,
      created: stats.birthtime,
      modified: stats.mtime,
      type: 'markdown',
      originalName: path.basename(filePath),
    };

    // Merge frontmatter into metadata
    Object.assign(metadata, frontmatter);

    return {
      content: body.trim(),
      metadata,
    };
  }

  private extractTitle(content: string): string | null {
    // Extract title from first heading
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : null;
  }
}
