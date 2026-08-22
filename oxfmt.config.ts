// Oxfmt
import { defineConfig } from 'oxfmt';

/**
 * Oxfmtの設定
 */
const config = defineConfig({
  ignorePatterns: [
    '.blocks/config.json',
    'aws-blocks/package.json',
    'aws-blocks/scripts/**',
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
