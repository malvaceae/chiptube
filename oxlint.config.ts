// Oxlint
import { defineConfig } from 'oxlint';

/**
 * Oxlintの設定
 */
const config = defineConfig({
  ignorePatterns: ['aws-blocks/scripts/**'],
  plugins: ['eslint', 'jsx-a11y', 'nextjs', 'oxc', 'react', 'typescript', 'unicorn'],
  options: {
    typeAware: true,
    typeCheck: true,
  },
});

export default config;
