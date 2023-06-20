#!/usr/bin/env node

import { Command } from 'commander';
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
  .option('-c, --contractPath <contractPath>', 'Contract Path')
  .option('-s, --skip-build', 'Skip Build', false)
  .action(
    ({
      contractPath,
      skipBuild,
    }: {
      contractPath: string;
      skipBuild: boolean;
    }) => {
      if (!contractPath) {
        console.error('Contract Path is require');
        process.exit(1);
      }
      generateBackend(contractPath, skipBuild);
    },
  );

program.parse();
