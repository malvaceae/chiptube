// Oxlint
import { defineConfig } from 'oxlint';

/**
 * Oxlintの設定
 */
const config = defineConfig({
  ignorePatterns: [
    'aws-blocks/scripts/**',
    '!aws-blocks/scripts/github.ts',
    'components/ui/**',
    'hooks/use-mobile.ts',
    'lib/utils.ts',
  ],
  plugins: [
    'eslint',
    'jsdoc',
    'jsx-a11y',
    'nextjs',
    'oxc',
    'promise',
    'react',
    'typescript',
    'unicorn',
  ],
});

export default config;
