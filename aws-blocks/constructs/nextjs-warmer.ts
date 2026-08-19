// Node.js - Path
import { join } from 'node:path';

// AWS CDK
import { Duration } from 'aws-cdk-lib';

// AWS CDK - Lambda
import {
  Architecture,
  Code,
  Function,
  type IFunction,
  LoggingFormat,
  Runtime,
} from 'aws-cdk-lib/aws-lambda';

// AWS CDK - EventBridge
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';

// AWS CDK - EventBridge - Event Targets
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';

// Constructs
import { Construct } from 'constructs';

/**
 * Next.jsのウォームアップLambda関数のプロパティ
 */
export interface NextjsWarmerProps {
  /**
   * プロジェクトルート
   */
  readonly root: string;

  /**
   * SSR Lambda関数
   */
  readonly ssrFunction: IFunction;

  /**
   * 同時実行数
   */
  readonly concurrency: number;
}

/**
 * Next.jsのウォームアップLambda関数
 */
export class NextjsWarmer extends Function {
  /**
   * Next.jsのウォームアップLambda関数を作成する
   */
  constructor(scope: Construct, id: string, props: NextjsWarmerProps) {
    /**
     * Next.jsのウォームアップLambda関数のコードが含まれるディレクトリ
     */
    const codeDir = join(props.root, '.open-next', 'warmer-function');

    // Next.jsのウォームアップLambda関数を作成
    super(scope, id, {
      runtime: Runtime.NODEJS_24_X,
      code: Code.fromAsset(codeDir),
      handler: 'index.handler',
      timeout: Duration.seconds(10),
      environment: {
        WARM_PARAMS: JSON.stringify([
          {
            function: props.ssrFunction.functionName,
            concurrency: props.concurrency,
          },
        ]),
      },
      architecture: Architecture.ARM_64,
      loggingFormat: LoggingFormat.JSON,
    });

    // SSR Lambda関数の呼び出し権限を付与
    props.ssrFunction.grantInvoke(this);

    /**
     * Next.jsのウォームアップLambda関数の定期実行ルール
     */
    const warmerRule = new Rule(this, 'WarmerRule', {
      schedule: Schedule.rate(Duration.minutes(5)),
    });

    // Next.jsのウォームアップLambda関数を対象として追加
    warmerRule.addTarget(new LambdaFunction(this));
  }
}
