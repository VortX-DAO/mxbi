#!/usr/bin/env node

const { Command } = require('commander');
const fs = require('fs');
const path = require('path');
const figlet = require('figlet');

import { generateBackend } from './generator/backendGenerator';

const program = new Command();

console.log(figlet.textSync('mxbi'));
program
  .name('mxbi')
  .description(
    'mxbi is a command-line interface (CLI) tool that generates backend code for MX smart contract endpoints. The tool generates TypeScript code that can be used to implement the server-side logic for smart contract endpoints.',
  )
  .version('0.8.0');

program
  .command('generate-backend')
  .description('Generate Backend for MX Smartcontract endpoints')
  .option('-n, --name <name>', 'Project name')
  .option('-g, --generatedPath <generatedPath>', 'Generated Path')
  .action(
    ({ name, generatedPath }: { name: string; generatedPath: string }) => {
      const _name = name ?? path.basename(process.cwd());
      const _generatedPath = generatedPath ?? process.cwd();
      generateBackend(_name, _generatedPath);
    },
  );

program.parse();
