// Oxfmt
import { defineConfig } from 'oxfmt';

/**
 * Oxfmtの設定
 */
const config = defineConfig({
  ignorePatterns: [
    '.blocks/config.json',
    'aws-blocks/package.json',
    'aws-blocks/scripts/cleanup.ts',
    'aws-blocks/scripts/console.ts',
    'aws-blocks/scripts/deploy.ts',
    'aws-blocks/scripts/destroy.ts',
    'aws-blocks/scripts/sandbox-destroy.ts',
    'aws-blocks/scripts/sandbox.ts',
    'aws-blocks/scripts/server.ts',
    'cdk.context.json',
    'cdk.json',
  ],
  singleQuote: true,
  sortTailwindcss: {
    functions: ['clsx', 'cn', 'cva'],
    stylesheet: 'app/globals.css',
  },
});

export default config;
