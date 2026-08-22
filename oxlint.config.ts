// Oxlint
import { defineConfig } from 'oxlint';

/**
 * Oxlintの設定
 */
const config = defineConfig({
  ignorePatterns: [
    'aws-blocks/scripts/cleanup.ts',
    'aws-blocks/scripts/console.ts',
    'aws-blocks/scripts/deploy.ts',
    'aws-blocks/scripts/destroy.ts',
    'aws-blocks/scripts/sandbox-destroy.ts',
    'aws-blocks/scripts/sandbox.ts',
    'aws-blocks/scripts/server.ts',
  ],
  plugins: ['eslint', 'jsx-a11y', 'nextjs', 'oxc', 'react', 'typescript', 'unicorn'],
  options: {
    typeAware: true,
    typeCheck: true,
  },
});

export default config;
