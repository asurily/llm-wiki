// LLM Provider types
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentBlock[];
}

export interface ContentBlock {
  type: 'text' | 'image';
  text?: string;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

export interface LLMProvider {
  name: string;
  chat(messages: Message[]): Promise<string>;
  embed?(text: string): Promise<number[]>;
}

export interface LLMProviderConfig {
  provider: 'claude' | 'openai' | 'openai-compatible' | 'ollama';
  name: string;
  apiKey?: string;
  baseUrl?: string;
}

// Document parsing types
export interface ParsedDocument {
  content: string;
  metadata: DocumentMetadata;
  images?: ImageContent[];
}

export interface DocumentMetadata {
  path: string;
  title: string;
  created: Date;
  modified: Date;
  type: string;
  originalName?: string;
}

export interface ImageContent {
  buffer: Buffer;
  mediaType: string;
}

// Parser interface
export interface Parser {
  parse(filePath: string): Promise<ParsedDocument>;
  supports(filePath: string): boolean;
}

// Wiki types
export interface ExtractedInfo {
  title: string;
  summary: string;
  entities: Entity[];
  concepts: Concept[];
  relations: Relation[];
}

export interface Entity {
  name: string;
  type: 'person' | 'org' | 'place' | 'event' | 'product' | 'other';
  description: string;
}

export interface Concept {
  name: string;
  description: string;
}

export interface Relation {
  from: string;
  to: string;
  relation: string;
}

export interface WikiStructure {
  index: string;
  log: string;
  overview: string;
  entities: Map<string, string>;
  concepts: Map<string, string>;
  sources: Map<string, string>;
  synthesis: Map<string, string>;
}

export interface WikiPage {
  path: string;
  content: string;
  frontmatter: Record<string, unknown>;
  links: string[];
}

// Cache types
export interface FileCache {
  path: string;
  hash: string;
  processedAt: Date;
  outputFiles: string[];
}

export interface CacheData {
  version: string;
  files: Record<string, FileCache>;
}

// Config types
export interface Config {
  model: LLMProviderConfig;
  paths: PathsConfig;
  wiki: WikiConfig;
  incremental: IncrementalConfig;
  schema?: string;
}

export interface PathsConfig {
  source: string;
  output: string;
  cache: string;
}

export interface WikiConfig {
  naming: 'kebab-case' | 'camelCase' | 'PascalCase';
  pages: PageType[];
  linking: LinkingConfig;
}

export type PageType = 'entities' | 'concepts' | 'sources' | 'synthesis';

export interface LinkingConfig {
  auto: boolean;
  threshold: number;
}

export interface IncrementalConfig {
  enabled: boolean;
}

// CLI types
export interface BuildOptions {
  output?: string;
  incremental?: boolean;
  full?: boolean;
  model?: string;
  config?: string;
  verbose?: boolean;
}

export interface QueryOptions {
  save?: boolean;
  model?: string;
  config?: string;
  verbose?: boolean;
}

export interface LintOptions {
  fix?: boolean;
  config?: string;
  verbose?: boolean;
}

export interface InitOptions {
  template?: string;
}
