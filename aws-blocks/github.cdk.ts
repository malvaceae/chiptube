// AWS CDK
import { App, CfnOutput, DefaultStackSynthesizer, Fn, Stack } from 'aws-cdk-lib';

// AWS CDK - IAM
import { PolicyStatement, Role, WebIdentityPrincipal } from 'aws-cdk-lib/aws-iam';

// AWS Blocks - Scripts
import { getStackId } from '@aws-blocks/blocks/scripts';

/**
 * CDKアプリケーション
 */
const app = new App();

/**
 * 所有者名とリポジトリ名 (owner/repo)
 */
const repository: string = app.node.getContext('repository');

/**
 * ブランチ名 (main,develop,feature/*)
 */
const branchName: string = app.node.getContext('branchName');

/**
 * ブランチ名の配列
 */
const branchNames = branchName.split(',').map((branchName) => branchName.trim());

/**
 * スタック名
 */
const stackName = `${getStackId()}-github`;

/**
 * GitHubスタック
 */
const stack = new Stack(app, stackName);

/**
 * GitHub OIDCプロバイダーの発行者
 */
const oidcProviderIssuer = 'token.actions.githubusercontent.com';

/**
 * GitHub OIDCプロバイダーのARN
 */
const oidcProviderArn = `arn:aws:iam::${stack.account}:oidc-provider/${oidcProviderIssuer}`;

/**
 * GitHubデプロイロールの信頼ポリシー
 */
const assumedBy = new WebIdentityPrincipal(oidcProviderArn, {
  StringEquals: {
    [`${oidcProviderIssuer}:aud`]: 'sts.amazonaws.com',
  },
  StringLike: {
    [`${oidcProviderIssuer}:sub`]: branchNames.map((branchName) => {
      return `repo:${repository}:ref:refs/heads/${branchName}`;
    }),
  },
});

/**
 * GitHubデプロイロール
 */
const deployRole = new Role(stack, 'DeployRole', { assumedBy });

/**
 * CDKブートストラップ修飾子
 */
const qualifier = stack.synthesizer.bootstrapQualifier ?? DefaultStackSynthesizer.DEFAULT_QUALIFIER;

// CDKブートストラップロールのAssumeRole権限を付与
deployRole.addToPolicy(
  new PolicyStatement({
    actions: ['sts:AssumeRole'],
    resources: [
      Fn.sub(DefaultStackSynthesizer.DEFAULT_DEPLOY_ROLE_ARN, {
        Qualifier: qualifier,
      }),
      Fn.sub(DefaultStackSynthesizer.DEFAULT_FILE_ASSET_PUBLISHING_ROLE_ARN, {
        Qualifier: qualifier,
      }),
      Fn.sub(DefaultStackSynthesizer.DEFAULT_LOOKUP_ROLE_ARN, {
        Qualifier: qualifier,
      }),
    ],
  }),
);

// GitHubデプロイロールのARNを出力
new CfnOutput(stack, 'DeployRoleArn', {
  value: deployRole.roleArn,
});
