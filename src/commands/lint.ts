import * as path from 'path';
import * as fs from 'fs/promises';
import matter from 'gray-matter';
import { Config, LintOptions, WikiPage } from '../types/index.js';
import { loadConfig, resolveConfigPath } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { IndexManager } from '../wiki/index.js';

interface LintIssue {
  file: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  fix?: () => Promise<void>;
}

export async function lintCommand(wikiDir: string | undefined, options: LintOptions): Promise<void> {
  logger.setVerbose(options.verbose || false);

  // Load config
  const configPath = await resolveConfigPath(options.config);
  const config = await loadConfig(configPath);

  const wikiPath = wikiDir || config.paths.output;
  const indexer = new IndexManager(wikiPath);

  logger.startSpinner('Scanning wiki...');

  const issues: LintIssue[] = [];
  const index = await indexer.load();

  // Check all pages
  const allPages = [
    ...[...index.entities.entries()].map(([name, page]) => ({ name, page, type: 'entities' as const })),
    ...[...index.concepts.entries()].map(([name, page]) => ({ name, page, type: 'concepts' as const })),
    ...[...index.sources.entries()].map(([name, page]) => ({ name, page, type: 'sources' as const })),
    ...[...index.synthesis.entries()].map(([name, page]) => ({ name, page, type: 'synthesis' as const })),
  ];

  for (const { name, page, type } of allPages) {
    // Check frontmatter
    if (!page.frontmatter || Object.keys(page.frontmatter).length === 0) {
      issues.push({
        file: page.path,
        type: 'warning',
        message: `Missing frontmatter in ${type}/${name}`,
      });
    }

    // Check for broken links
    for (const link of page.links) {
      const linkExists = checkLinkExists(link, index);
      if (!linkExists) {
        issues.push({
          file: page.path,
          type: 'warning',
          message: `Broken link to [[${link}]]`,
        });
      }
    }

    // Check for empty content
    if (!page.content.trim()) {
      issues.push({
        file: page.path,
        type: 'error',
        message: `Empty page content in ${type}/${name}`,
      });
    }
  }

  // Check for orphan pages (pages with no incoming links)
  const linkedPages = new Set<string>();
  for (const { page } of allPages) {
    for (const link of page.links) {
      linkedPages.add(link.toLowerCase());
    }
  }

  for (const { name, type } of allPages) {
    if (!linkedPages.has(name.toLowerCase()) && type !== 'sources') {
      issues.push({
        file: name,
        type: 'info',
        message: `Orphan page: ${type}/${name} (no incoming links)`,
      });
    }
  }

  // Check for duplicate entities
  const entityNames = [...index.entities.keys()].map(n => n.toLowerCase());
  const duplicates = entityNames.filter((name, idx) => entityNames.indexOf(name) !== idx);
  for (const dup of [...new Set(duplicates)]) {
    issues.push({
      file: dup,
      type: 'warning',
      message: `Potential duplicate entity: ${dup}`,
    });
  }

  logger.stopSpinner(true, 'Scan complete');

  // Output results
  if (issues.length === 0) {
    logger.success('No issues found!');
    return;
  }

  console.log('\n--- Lint Results ---\n');

  const errors = issues.filter(i => i.type === 'error');
  const warnings = issues.filter(i => i.type === 'warning');
  const infos = issues.filter(i => i.type === 'info');

  if (errors.length > 0) {
    console.log(`Errors (${errors.length}):`);
    for (const err of errors) {
      console.log(`  ✗ ${err.file}: ${err.message}`);
    }
    console.log('');
  }

  if (warnings.length > 0) {
    console.log(`Warnings (${warnings.length}):`);
    for (const warn of warnings) {
      console.log(`  ⚠ ${warn.file}: ${warn.message}`);
    }
    console.log('');
  }

  if (infos.length > 0 && options.verbose) {
    console.log(`Info (${infos.length}):`);
    for (const info of infos) {
      console.log(`  ℹ ${info.file}: ${info.message}`);
    }
    console.log('');
  }

  console.log(`Total: ${errors.length} errors, ${warnings.length} warnings, ${infos.length} info`);

  // Fix issues if requested
  if (options.fix) {
    logger.info('\nAttempting to fix issues...');

    for (const issue of issues) {
      if (issue.fix) {
        try {
          await issue.fix();
          logger.success(`Fixed: ${issue.message}`);
        } catch (error) {
          logger.error(`Failed to fix: ${issue.message}`);
        }
      }
    }
  }
}

function checkLinkExists(link: string, index: Awaited<ReturnType<IndexManager['load']>>): boolean {
  const linkLower = link.toLowerCase();

  return (
    index.entities.has(link) ||
    index.entities.has(linkLower) ||
    index.concepts.has(link) ||
    index.concepts.has(linkLower) ||
    index.sources.has(link) ||
    index.sources.has(linkLower) ||
    index.synthesis.has(link) ||
    index.synthesis.has(linkLower)
  );
}
