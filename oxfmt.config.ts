// Oxfmt
import { defineConfig } from 'oxfmt';

/**
 * Oxfmtの設定
 */
const config = defineConfig({
  ignorePatterns: ['aws-blocks/scripts/**', 'cdk.json'],
  singleQuote: true,
  sortTailwindcss: {
    functions: ['clsx', 'cn', 'cva'],
    stylesheet: 'app/globals.css',
  },
});

export default config;
