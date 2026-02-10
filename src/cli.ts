#!/usr/bin/env node

import pc from 'picocolors';

import { runCLI } from './cli-utils';

runCLI(process.argv).catch((error: Error) => {
  console.error(pc.red(`Error: ${error.message}`));
  process.exit(1);
});
