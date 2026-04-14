import * as fs from 'fs/promises';
import * as path from 'path';
import pdfParse from 'pdf-parse';
import { ParsedDocument, DocumentMetadata, Parser } from '../types/index.js';

interface PDFMetadata extends DocumentMetadata {
  author?: string;
  subject?: string;
}

export class PDFParser implements Parser {
  private extensions = ['.pdf'];

  supports(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.extensions.includes(ext);
  }

  async parse(filePath: string): Promise<ParsedDocument> {
    const buffer = await fs.readFile(filePath);
    const stats = await fs.stat(filePath);

    const data = await pdfParse(buffer);

    const metadata: PDFMetadata = {
      path: filePath,
      title: data.info?.Title || path.basename(filePath, '.pdf'),
      created: stats.birthtime,
      modified: stats.mtime,
      type: 'pdf',
      originalName: path.basename(filePath),
    };

    // Add PDF metadata if available
    if (data.info) {
      if (data.info.Author) {
        metadata.author = data.info.Author;
      }
      if (data.info.Subject) {
        metadata.subject = data.info.Subject;
      }
    }

    return {
      content: data.text,
      metadata,
    };
  }
}
