import { LLMProvider } from '../types/index.js';

export interface LinkSuggestion {
  from: string;
  to: string;
  confidence: number;
}

export class LinkManager {
  private provider: LLMProvider;
  private threshold: number;

  constructor(provider: LLMProvider, threshold: number = 0.7) {
    this.provider = provider;
    this.threshold = threshold;
  }

  async findRelatedLinks(
    pageName: string,
    pageContent: string,
    existingLinks: string[],
    allPages: string[]
  ): Promise<LinkSuggestion[]> {
    // Filter out already linked pages
    const candidatePages = allPages.filter(p => !existingLinks.includes(p) && p !== pageName);

    if (candidatePages.length === 0) {
      return [];
    }

    const suggestions: LinkSuggestion[] = [];

    // Use embeddings if available, otherwise use LLM
    if (this.provider.embed) {
      const pageEmbedding = await this.provider.embed(pageContent);

      for (const candidate of candidatePages) {
        const candidateEmbedding = await this.provider.embed(candidate);
        const similarity = this.cosineSimilarity(pageEmbedding, candidateEmbedding);

        if (similarity >= this.threshold) {
          suggestions.push({
            from: pageName,
            to: candidate,
            confidence: similarity,
          });
        }
      }
    }

    // Sort by confidence
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  insertLinksIntoContent(content: string, links: LinkSuggestion[]): string {
    // Find a good place to add related links
    const relatedSection = `\n## 相关链接\n${links
      .map(l => `- [[${l.to}]]`)
      .join('\n')}\n`;

    // Check if there's already a related links section
    const relatedRegex = /^## 相关链接/m;

    if (relatedRegex.test(content)) {
      // Append to existing section
      return content.replace(relatedRegex, relatedSection.trim());
    }

    // Add before the last section or at the end
    const sections = content.split(/^## /m);

    if (sections.length > 1) {
      // Insert before the last section
      const lastSection = sections.pop();
      sections.push(relatedSection.replace('## ', ''));
      sections.push(lastSection!);
      return sections.join('## ');
    }

    // Just append
    return content + '\n' + relatedSection;
  }
}
