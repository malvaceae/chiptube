// Oxlint
import { defineConfig } from 'oxlint';

/**
 * Oxlintの設定
 */
const config = defineConfig({
  plugins: ['eslint', 'jsx-a11y', 'nextjs', 'oxc', 'react', 'typescript', 'unicorn'],
  ignorePatterns: ['aws-blocks/scripts/**'],
  options: {
    typeAware: true,
    typeCheck: true,
  },
});

export default config;
