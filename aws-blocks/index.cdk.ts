// Node.js - Path
import { join } from 'node:path';

// AWS CDK
import {
  App,
  Mixins,
  RemovalPolicies,
} from 'aws-cdk-lib';

// AWS Blocks - CDK
import {
  BlocksStack,
  Hosting,
  SandboxDisableDeletionProtection,
} from '@aws-blocks/blocks/cdk';

// AWS Blocks - Scripts
import { getStackName } from '@aws-blocks/blocks/scripts';

// Next.jsのウォームアップLambda関数
import { NextjsWarmer } from './constructs/nextjs-warmer';

/**
 * CDKアプリ
 */
const app = new App();

/**
 * サンドボックスモードかどうか
 */
const sandboxMode = app.node.tryGetContext('sandboxMode') === 'true';

/**
 * プロジェクトルート
 */
const projectRoot = app.node.tryGetContext('projectRoot');

/**
 * スタック名
 */
const stackName = getStackName({
  sandbox: sandboxMode,
  projectRoot,
});

/**
 * AWS Blocksスタック
 */
export const blocksStack = await BlocksStack.create(app, stackName, {
  backendHandlerPath: join(import.meta.dirname, 'index.handler.ts'),
  backendCDKPath: join(import.meta.dirname, 'index.ts')
});

/**
 * サンドボックス破棄時に全リソースを削除する
 */
if (sandboxMode) {
  // 全リソースのRemovalPolicyをDESTROYに変更
  RemovalPolicies.of(blocksStack).destroy();

  // 全リソースの削除保護を無効化
  Mixins.of(blocksStack).apply(new SandboxDisableDeletionProtection());
}

/**
 * 本番限定のリソースを追加する
 */
if (!sandboxMode) {
  /**
   * Next.jsのSSRホスティング
   */
  const hosting = new Hosting(blocksStack, 'Hosting', {
    root: join(import.meta.dirname, '..'),
    buildCommand: 'npm run build',
    framework: 'nextjs',
    api: blocksStack,
    compute: {
      memorySize: 1536,
    },
  });

  /**
   * Next.jsのウォームアップLambda関数を追加する
   */
  if (hosting.ssrFunction) {
    new NextjsWarmer(blocksStack, 'NextjsWarmer', {
      root: join(import.meta.dirname, '..'),
      ssrFunction: hosting.ssrFunction,
      concurrency: 5,
    });
  }
}
