// Node.js - Child process
import type {
  SpawnSyncOptions,
  SpawnSyncOptionsWithStringEncoding,
  SpawnSyncReturns,
} from 'node:child_process';

// Node.js - Path
import { join } from 'node:path';

// cross-spawn
import { sync } from 'cross-spawn';

/**
 * コマンドを実行する
 */
const runSync = <T extends SpawnSyncOptions>(command: string, args: string[], options?: T) => {
  const result = sync(command, args, options) as T extends SpawnSyncOptionsWithStringEncoding
    ? SpawnSyncReturns<string>
    : SpawnSyncReturns<Buffer>;

  if (result.error) {
    throw result.error;
  }

  if (result.signal) {
    throw new Error(`${command} ${args.join(' ')} was terminated by signal ${result.signal}`);
  }

  if (result.status) {
    throw new Error(`${command} ${args.join(' ')} exited with code ${result.status}`);
  }

  return result;
};

/**
 * gitコマンドを実行する
 */
const git = (...args: string[]) => runSync('git', args, { encoding: 'utf-8' }).stdout.trim();

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
runSync('npx', [
  'cdk', 'deploy',
  '--app', `npx tsx -C cdk ${cdkAppPath}`,
  '--context', `repository=${repository}`,
  '--context', `branchName=${branchName}`,
  '--require-approval', 'never',
], { stdio: 'inherit' });
