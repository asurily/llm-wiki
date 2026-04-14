import * as path from 'path';
import { Config, BuildOptions, ParsedDocument, ExtractedInfo } from '../types/index.js';
import { loadConfig, resolveConfigPath } from '../utils/config.js';
import { CacheManager } from '../utils/cache.js';
import { logger } from '../utils/logger.js';
import { createProvider } from '../providers/index.js';
import { ParserManager } from '../parsers/index.js';
import { WikiGenerator, IndexManager } from '../wiki/index.js';

export async function buildCommand(sourceDir: string | undefined, options: BuildOptions): Promise<void> {
  logger.setVerbose(options.verbose || false);

  // Load config
  const configPath = await resolveConfigPath(options.config);
  const config = await loadConfig(configPath);

  // Override config with CLI options
  if (options.output) {
    config.paths.output = options.output;
  }
  if (options.model) {
    config.model.name = options.model;
  }

  // Use source dir from CLI or config
  const sourcePath = sourceDir || config.paths.source;
  config.paths.source = sourcePath;

  logger.debug(`Config loaded from: ${configPath}`);
  logger.debug(`Source: ${config.paths.source}`);
  logger.debug(`Output: ${config.paths.output}`);

  // Initialize components
  const provider = createProvider(config.model);
  const parserManager = new ParserManager();
  parserManager.setLLMProvider(provider);

  const cache = new CacheManager(config.paths.cache);
  await cache.load();

  const generator = new WikiGenerator(provider);
  const indexer = new IndexManager(config.paths.output);

  // Determine if incremental mode
  const incremental = options.incremental || (!options.full && config.incremental.enabled);
  logger.debug(`Incremental mode: ${incremental}`);

  // Scan source files
  logger.startSpinner('Scanning source files...');
  const files = await parserManager.scanDirectory(config.paths.source);

  let filesToProcess = files;
  if (incremental) {
    const cachedFiles = new Set(cache.getProcessedFiles());
    filesToProcess = files.filter(f => !cachedFiles.has(path.resolve(f)) || cache.needsProcessing(f));
  }

  logger.stopSpinner(true, `Found ${files.length} files, ${filesToProcess.length} to process`);

  if (filesToProcess.length === 0) {
    logger.info('No files to process. Use --full for complete rebuild.');
    return;
  }

  // Process each file
  const allEntities = new Map<string, ExtractedInfo['entities']>();
  const allConcepts = new Map<string, ExtractedInfo['concepts']>();
  const processedDocs: ParsedDocument[] = [];

  for (let i = 0; i < filesToProcess.length; i++) {
    const file = filesToProcess[i];
    logger.startSpinner(`Processing (${i + 1}/${filesToProcess.length}): ${path.basename(file)}`);

    try {
      // Parse file
      const doc = await parserManager.parse(file);
      logger.debug(`Parsed: ${doc.metadata.title}`);

      // Extract information
      const info = await generator.extractInfo(doc);
      logger.debug(`Extracted ${info.entities.length} entities, ${info.concepts.length} concepts`);

      // Store for later
      allEntities.set(doc.metadata.path, info.entities);
      allConcepts.set(doc.metadata.path, info.concepts);
      processedDocs.push(doc);

      // Generate/update entity pages
      const outputFiles: string[] = [];
      const sourceRef = generator.slugify(doc.metadata.title);

      for (const entity of info.entities) {
        const entitySlug = generator.slugify(entity.name);
        const existing = await indexer.getExistingPage('entities', entitySlug);
        const page = await generator.generateEntityPage(entity, existing, sourceRef);
        const savedPath = await indexer.savePage('entities', entitySlug, page);
        outputFiles.push(savedPath);
        logger.debug(`Updated entity: ${entity.name}`);
      }

      // Generate/update concept pages
      for (const concept of info.concepts) {
        const conceptSlug = generator.slugify(concept.name);
        const existing = await indexer.getExistingPage('concepts', conceptSlug);
        const page = await generator.generateConceptPage(concept, existing, sourceRef);
        const savedPath = await indexer.savePage('concepts', conceptSlug, page);
        outputFiles.push(savedPath);
        logger.debug(`Updated concept: ${concept.name}`);
      }

      // Generate source page
      const sourcePage = await generator.generateSourcePage(doc, info);
      const sourcePath = await indexer.savePage('sources', sourceRef, sourcePage);
      outputFiles.push(sourcePath);

      // Update cache
      await cache.markProcessed(file, outputFiles);

      logger.stopSpinner(true);
    } catch (error) {
      logger.stopSpinner(false);
      logger.error(`Failed to process ${file}: ${error}`);
    }
  }

  // Update index and log
  logger.startSpinner('Updating index...');

  const indexContent = await generator.updateIndex(
    null,
    allEntities,
    allConcepts,
    processedDocs
  );
  await indexer.updateIndexPage(indexContent);

  // Append to log
  for (const doc of processedDocs) {
    const info: ExtractedInfo = {
      title: doc.metadata.title,
      summary: '',
      entities: allEntities.get(doc.metadata.path) || [],
      concepts: allConcepts.get(doc.metadata.path) || [],
      relations: [],
    };
    const logEntry = generator.generateLogEntry(doc, info);
    await indexer.appendToLog(logEntry);
  }

  logger.stopSpinner(true, 'Index updated');

  // Save cache
  await cache.save();
  logger.debug('Cache saved');

  // Summary
  const stats = await indexer.getStats();
  logger.success(`Build complete!`);
  console.log(`\n  Entities: ${stats.entitiesCount}`);
  console.log(`  Concepts: ${stats.conceptsCount}`);
  console.log(`  Sources: ${stats.sourcesCount}`);
  console.log(`  Total pages: ${stats.totalPages}\n`);
}
