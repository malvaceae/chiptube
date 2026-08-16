// AWS Blocks - Lambda Handler
import { createLambdaHandler } from '@aws-blocks/blocks/lambda-handler';

/**
 * AWS Blocksバックエンド用のLambdaハンドラー
 */
export const handler = createLambdaHandler(() => import('./index.js'));
