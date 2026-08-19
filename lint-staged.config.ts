// lint-staged
import type { Configuration } from 'lint-staged';

/**
 * lint-stagedの設定
 */
const config: Configuration = {
  '*': ['oxlint --fix --no-error-on-unmatched-pattern', 'oxfmt --no-error-on-unmatched-pattern'],
};

export default config;
