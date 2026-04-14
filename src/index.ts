#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand, buildCommand, queryCommand, lintCommand } from './commands/index.js';
import 'dotenv/config';

const program = new Command();

program
  .name('llm-wiki')
  .description('CLI tool to compile raw files into structured Wiki knowledge base using LLM')
  .version('0.1.0');

// init command
program
  .command('init')
  .description('Initialize a new LLM Wiki project')
  .option('-t, --template <name>', 'Use a template for initialization')
  .action(async (options) => {
    await initCommand(options);
  });

// build command
program
  .command('build [source]')
  .description('Build Wiki from source files')
  .option('-o, --output <dir>', 'Output directory')
  .option('--incremental', 'Incremental update (only process new/changed files)')
  .option('--full', 'Full rebuild (process all files)')
  .option('-m, --model <name>', 'Model to use')
  .option('-c, --config <path>', 'Config file path')
  .option('-v, --verbose', 'Verbose output')
  .action(async (source, options) => {
    await buildCommand(source, options);
  });

// query command
program
  .command('query <question>')
  .description('Query the Wiki and generate an answer')
  .option('-s, --save', 'Save the answer to the wiki')
  .option('-m, --model <name>', 'Model to use')
  .option('-c, --config <path>', 'Config file path')
  .option('-v, --verbose', 'Verbose output')
  .action(async (question, options) => {
    await queryCommand(question, options);
  });

// lint command
program
  .command('lint [wiki]')
  .description('Check Wiki health and find issues')
  .option('-f, --fix', 'Automatically fix issues where possible')
  .option('-c, --config <path>', 'Config file path')
  .option('-v, --verbose', 'Verbose output')
  .action(async (wiki, options) => {
    await lintCommand(wiki, options);
  });

program.parse();
