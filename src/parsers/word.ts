import * as fs from 'fs/promises';
import * as path from 'path';
import mammoth from 'mammoth';
import { ParsedDocument, DocumentMetadata, Parser } from '../types/index.js';

export class WordParser implements Parser {
  private extensions = ['.docx', '.doc'];

  supports(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.extensions.includes(ext);
  }

  async parse(filePath: string): Promise<ParsedDocument> {
    const buffer = await fs.readFile(filePath);
    const stats = await fs.stat(filePath);

    const result = await mammoth.extractRawText({ buffer });

    const metadata: DocumentMetadata = {
      path: filePath,
      title: path.basename(filePath, path.extname(filePath)),
      created: stats.birthtime,
      modified: stats.mtime,
      type: 'word',
      originalName: path.basename(filePath),
    };

    return {
      content: result.value,
      metadata,
    };
  }
}
