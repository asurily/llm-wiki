import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { FileCache, CacheData } from '../types/index.js';

const CACHE_VERSION = '1.0.0';

export class CacheManager {
  private cachePath: string;
  private cache: CacheData;

  constructor(cachePath: string) {
    this.cachePath = path.resolve(cachePath);
    this.cache = {
      version: CACHE_VERSION,
      files: {},
    };
  }

  async load(): Promise<void> {
    try {
      const content = await fs.readFile(this.cachePath, 'utf-8');
      const parsed = JSON.parse(content) as CacheData;

      if (parsed.version === CACHE_VERSION) {
        this.cache = parsed;
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      // Cache file doesn't exist, use empty cache
    }
  }

  async save(): Promise<void> {
    const dir = path.dirname(this.cachePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.cachePath, JSON.stringify(this.cache, null, 2), 'utf-8');
  }

  async computeHash(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  async needsProcessing(filePath: string): Promise<boolean> {
    const absolutePath = path.resolve(filePath);

    if (!this.cache.files[absolutePath]) {
      return true;
    }

    const currentHash = await this.computeHash(absolutePath);
    return this.cache.files[absolutePath].hash !== currentHash;
  }

  getProcessedFiles(): string[] {
    return Object.keys(this.cache.files);
  }

  getOutputFiles(filePath: string): string[] {
    const absolutePath = path.resolve(filePath);
    return this.cache.files[absolutePath]?.outputFiles || [];
  }

  async markProcessed(filePath: string, outputFiles: string[]): Promise<void> {
    const absolutePath = path.resolve(filePath);
    const hash = await this.computeHash(absolutePath);

    this.cache.files[absolutePath] = {
      path: absolutePath,
      hash,
      processedAt: new Date(),
      outputFiles,
    };
  }

  remove(filePath: string): void {
    const absolutePath = path.resolve(filePath);
    delete this.cache.files[absolutePath];
  }

  clear(): void {
    this.cache = {
      version: CACHE_VERSION,
      files: {},
    };
  }

  getStats(): { totalFiles: number; lastProcessed: Date | null } {
    const files = Object.values(this.cache.files);
    const dates = files.map(f => new Date(f.processedAt)).filter(d => !isNaN(d.getTime()));

    return {
      totalFiles: files.length,
      lastProcessed: dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null,
    };
  }
}
