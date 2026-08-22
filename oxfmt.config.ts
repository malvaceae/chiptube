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
    '!aws-blocks/scripts/github.ts',
    'cdk.context.json',
    'cdk.json',
    'components.json',
    'components/ui/**',
    'hooks/use-mobile.ts',
    'lib/utils.ts',
  ],
  singleQuote: true,
  sortTailwindcss: {
    functions: ['clsx', 'cn', 'cva'],
    stylesheet: 'app/globals.css',
  },
});

export default config;
