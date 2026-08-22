// Node.js - Child process
import { execFileSync } from 'node:child_process';

// Node.js - Path
import { join } from 'node:path';

/**
 * gitコマンドを実行する
 */
const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf-8' }).trim();

/**
 * リモートリポジトリの所有者名とリポジトリ名を取得する
 */
const getRemoteOriginRepository = () =>
  git('remote', 'get-url', 'origin').replace(/^(?:https:\/\/|git@)github\.com[/:]|\.git$/g, '');

/**
 * ローカルのカレントブランチ名を取得する
 */
const getLocalCurrentBranchName = () => git('branch', '--show-current');

/**
 * CDKアプリケーションのパス
 */
const cdkAppPath = join(import.meta.dirname, '..', 'github.cdk.ts');

/**
 * 所有者名とリポジトリ名 (owner/repo)
 */
const repository = process.argv[2] ?? getRemoteOriginRepository();

/**
 * ブランチ名 (main,develop,feature/*)
 */
const branchName = process.argv[3] ?? getLocalCurrentBranchName();

// oxfmt-ignore
execFileSync('npx', [
  'cdk', 'deploy',
  '--app', `npx tsx -C cdk ${cdkAppPath}`,
  '--context', `repository=${repository}`,
  '--context', `branchName=${branchName}`,
  '--require-approval', 'never',
], { stdio: 'inherit' });
