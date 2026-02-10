#!/usr/bin/env node

import { runCLI } from './cli-utils';

runCLI(process.argv).catch((error: Error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
