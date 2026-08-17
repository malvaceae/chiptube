// Node.js - Crypto
import { createHash } from 'node:crypto';

// Node.js - File system
import { readFileSync } from 'node:fs';

// Node.js - Path
import { join } from 'node:path';

// AWS CDK
import {
  App,
  CfnOutput,
  DefaultStackSynthesizer,
  Fn,
  Stack,
} from 'aws-cdk-lib';

// AWS CDK - IAM
import {
  PolicyStatement,
  Role,
  WebIdentityPrincipal,
} from 'aws-cdk-lib/aws-iam';

/**
 * CDKアプリ
 */
const app = new App();

/**
 * 所有者およびリポジトリの名前 (owner/repo)
 */
const repository = app.node.getContext('repository');

/**
 * ブランチの名前
 */
const branchName = app.node.getContext('branchName');

/**
 * アプリの名前
 */
const { name: appName }: { name: string } = JSON.parse(
  readFileSync(
    join(import.meta.dirname, '..', 'package.json'),
    'utf-8',
  ),
);

/**
 * スタックの名前
 */
const stackName = [
  appName,
  'github-deployment',
  createHash('sha256').update(repository).digest('hex').slice(0, 12),
  createHash('sha256').update(branchName).digest('hex').slice(0, 12),
].join('-');

/**
 * スタック
 */
const stack = new Stack(app, stackName);

/**
 * GitHub OIDCプロバイダーの発行者
 */
const githubOidcProviderIssuer = 'token.actions.githubusercontent.com';

/**
 * GitHub OIDCプロバイダーのARN
 */
const githubOidcProviderArn = `arn:aws:iam::${stack.account}:oidc-provider/${githubOidcProviderIssuer}`;

/**
 * audクレーム
 */
const aud = 'sts.amazonaws.com';

/**
 * subクレーム
 */
const sub = `repo:${repository}:ref:refs/heads/${branchName}`;

/**
 * GitHubデプロイロール
 */
const role = new Role(stack, 'Role', {
  assumedBy: new WebIdentityPrincipal(githubOidcProviderArn, {
    StringEquals: {
      [`${githubOidcProviderIssuer}:aud`]: aud,
      [`${githubOidcProviderIssuer}:sub`]: sub,
    },
  }),
});

/**
 * CDKブートストラップ修飾子
 */
const qualifier = stack.synthesizer.bootstrapQualifier ??
  DefaultStackSynthesizer.DEFAULT_QUALIFIER;

// CDKブートストラップロールのAssumeRole権限を付与
role.addToPolicy(new PolicyStatement({
  actions: [
    'sts:AssumeRole',
  ],
  resources: [
    Fn.sub(DefaultStackSynthesizer.DEFAULT_DEPLOY_ROLE_ARN, {
      Qualifier: qualifier,
    }),
    Fn.sub(DefaultStackSynthesizer.DEFAULT_FILE_ASSET_PUBLISHING_ROLE_ARN, {
      Qualifier: qualifier,
    }),
    Fn.sub(DefaultStackSynthesizer.DEFAULT_IMAGE_ASSET_PUBLISHING_ROLE_ARN, {
      Qualifier: qualifier,
    }),
    Fn.sub(DefaultStackSynthesizer.DEFAULT_LOOKUP_ROLE_ARN, {
      Qualifier: qualifier,
    }),
  ],
}));

// GitHubデプロイロールのARNを出力
new CfnOutput(stack, 'RoleArn', {
  value: role.roleArn,
});
