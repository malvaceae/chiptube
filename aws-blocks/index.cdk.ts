// Node.js - Path
import { join } from 'node:path';

// AWS CDK
import { App } from 'aws-cdk-lib';

// AWS Blocks - CDK
import { BlocksPresets, BlocksStack, Hosting } from '@aws-blocks/blocks/cdk';

// AWS Blocks - Scripts
import { getStackName } from '@aws-blocks/blocks/scripts';

// Next.jsのウォームアップLambda関数
import { NextjsWarmer } from './constructs/nextjs-warmer';

/**
 * CDKアプリケーション
 */
const app = new App();

/**
 * サンドボックスモードかどうか
 */
const sandboxMode = app.node.tryGetContext('sandboxMode') === 'true';

/**
 * プロジェクトルート
 */
const projectRoot = app.node.tryGetContext('projectRoot') || process.cwd();

/**
 * RemovalPolicyと削除保護のプリセット
 */
const defaults = sandboxMode ? BlocksPresets.sandbox : BlocksPresets.production;

/**
 * スタック名
 */
const stackName = getStackName({ sandbox: sandboxMode, projectRoot });

/**
 * AWS Blocksスタック
 */
export const blocksStack = await BlocksStack.create(app, stackName, {
  backendHandlerPath: join(import.meta.dirname, 'index.handler.ts'),
  backendCDKPath: join(import.meta.dirname, 'index.ts'),
  defaults,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

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
    ...(process.env.DOMAIN_NAME && {
      domain: {
        domainName: process.env.DOMAIN_NAME,
        hostedZone: process.env.DOMAIN_NAME,
      },
    }),
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
