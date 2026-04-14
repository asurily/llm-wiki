import * as fs from 'fs/promises';
import * as path from 'path';
import { LLMProvider, ParsedDocument, DocumentMetadata, Parser, Message, ContentBlock } from '../types/index.js';

const SUPPORTED_IMAGE_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

export class ImageParser implements Parser {
  private extensions = Object.keys(SUPPORTED_IMAGE_TYPES);
  private provider: LLMProvider | null = null;

  setProvider(provider: LLMProvider): void {
    this.provider = provider;
  }

  supports(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.extensions.includes(ext);
  }

  async parse(filePath: string): Promise<ParsedDocument> {
    const buffer = await fs.readFile(filePath);
    const stats = await fs.stat(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mediaType = SUPPORTED_IMAGE_TYPES[ext] || 'image/png';

    const base64Data = buffer.toString('base64');

    // If LLM provider is available, use vision to extract content
    let content = `[Image: ${path.basename(filePath)}]`;

    if (this.provider) {
      content = await this.extractTextFromImage(base64Data, mediaType);
    }

    const metadata: DocumentMetadata = {
      path: filePath,
      title: path.basename(filePath, ext),
      created: stats.birthtime,
      modified: stats.mtime,
      type: 'image',
      originalName: path.basename(filePath),
    };

    return {
      content,
      metadata,
      images: [
        {
          buffer,
          mediaType,
        },
      ],
    };
  }

  private async extractTextFromImage(base64Data: string, mediaType: string): Promise<string> {
    if (!this.provider) {
      return '[Image content - LLM provider not configured for vision]';
    }

    const imageBlock: ContentBlock = {
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaType,
        data: base64Data,
      },
    };

    const messages: Message[] = [
      {
        role: 'system',
        content: 'You are an image analysis assistant. Extract and describe all text, information, and relevant content from images. Be comprehensive and structured in your description.',
      },
      {
        role: 'user',
        content: [
          imageBlock,
          { type: 'text', text: 'Please analyze this image and extract all text and relevant information. Describe the content in a structured format.' },
        ],
      },
    ];

    try {
      const response = await this.provider.chat(messages);
      return response;
    } catch (error) {
      console.error('Failed to extract text from image:', error);
      return '[Image content - Failed to extract]';
    }
  }
}
