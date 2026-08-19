// lint-staged
import type { Configuration } from 'lint-staged';

/**
 * lint-stagedの設定
 */
const config: Configuration = {
  '*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}': ['oxfmt', 'oxlint --fix'],
  '*.{json,jsonc,json5,css,scss,less,pcss,postcss,graphql,gql,graphqls,toml,yml,yaml,html,htm,xhtml,vue,svelte,md,markdown,mdx,hbs,handlebars,mjml}':
    'oxfmt --no-error-on-unmatched-pattern',
};

export default config;
