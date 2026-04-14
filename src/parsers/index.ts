import * as path from 'path';
import * as fs from 'fs/promises';
import { glob } from 'glob';
import { ParsedDocument, Parser, LLMProvider } from '../types/index.js';
import { MarkdownParser } from './markdown.js';
import { PDFParser } from './pdf.js';
import { WordParser } from './word.js';
import { ImageParser } from './image.js';

export { MarkdownParser } from './markdown.js';
export { PDFParser } from './pdf.js';
export { WordParser } from './word.js';
export { ImageParser } from './image.js';

export class ParserManager {
  private parsers: Parser[] = [];
  private imageParser: ImageParser;

  constructor() {
    this.imageParser = new ImageParser();
    this.parsers = [
      new MarkdownParser(),
      new PDFParser(),
      new WordParser(),
      this.imageParser,
    ];
  }

  setLLMProvider(provider: LLMProvider): void {
    this.imageParser.setProvider(provider);
  }

  getParser(filePath: string): Parser | null {
    for (const parser of this.parsers) {
      if (parser.supports(filePath)) {
        return parser;
      }
    }
    return null;
  }

  supports(filePath: string): boolean {
    return this.parsers.some(parser => parser.supports(filePath));
  }

  async parse(filePath: string): Promise<ParsedDocument> {
    const parser = this.getParser(filePath);
    if (!parser) {
      throw new Error(`No parser found for file: ${filePath}`);
    }
    return parser.parse(filePath);
  }

  async scanDirectory(
    dirPath: string,
    options: { incremental?: boolean; cache?: Set<string> } = {}
  ): Promise<string[]> {
    const files = await glob('**/*', {
      cwd: dirPath,
      nodir: true,
      absolute: true,
    });

    const supportedFiles = files.filter(file => this.supports(file));

    if (options.incremental && options.cache) {
      return supportedFiles.filter(file => !options.cache!.has(file));
    }

    return supportedFiles;
  }
}
