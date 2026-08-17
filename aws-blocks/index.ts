// AWS Blocks
import {
  ApiNamespace,
  AppSetting,
  AuthOIDC,
  DistributedDatabase,
  FileBucket,
  Scope,
  google,
} from '@aws-blocks/blocks';

// AWS Blocks - Distributed Database
import { createKyselyAdapter } from '@aws-blocks/bb-distributed-data';

// Kysely
import {
  CamelCasePlugin,
  sql,
} from 'kysely';

// データベーススキーマ
import type { Database } from '@/database/schema';

// For coding agents: Leave these comments in place for future reference.
// Read node_modules/@aws-blocks/blocks/README.md for all available Building Blocks
// Hover over Scope below to see the docstring with complete Building Block index

/**
 * ChipTubeスコープ
 */
const scope = new Scope('chiptube');

/**
 * チューンファイル
 */
const tunes = new FileBucket(scope, 'tunes');

/**
 * データベース
 */
const db = new DistributedDatabase(scope, 'main', {
  migrationsPath: 'aws-blocks/database/migrations',
});

/**
 * Kyselyクエリビルダー
 */
const kysely = createKyselyAdapter<Database>(db)
  .withPlugin(new CamelCasePlugin());

/**
 * GoogleクライアントID・Googleクライアントシークレット
 */
const [googleClientId, googleClientSecret] = ['id', 'secret'].map((name) => {
  return new AppSetting(scope, `google-client-${name}`, { secret: true });
});

/**
 * 認証
 */
const auth = new AuthOIDC(scope, 'auth', {
  providers: [
    google({
      clientId: () => googleClientId.get(),
      clientSecret: () => googleClientSecret.get(),
      scopes: ['openid', 'email', 'profile'],
    }),
  ],
  async onSignIn(user) {
    // プロフィール写真
    const picture = typeof user.claims.picture === 'string'
      ? user.claims.picture
      : null;

    // ユーザーを作成
    await kysely
      .insertInto('users')
      .values({
        oidcUserId: user.userId,
        username: user.username,
        email: user.email,
        picture,
      })
      .onConflict((builder) => {
        return builder
          .column('oidcUserId')
          .doUpdateSet({
            username: user.username,
            email: user.email,
            picture,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          });
      })
      .execute();
  },
});

/**
 * API
 */
export const api = new ApiNamespace(scope, 'api', (context) => ({
  /**
   * ログインユーザーの情報を取得する
   */
  async me() {
    // ログインユーザー
    const user = await auth.requireAuth(context);

    // ログインユーザーの情報を取得
    return await kysely
      .selectFrom('users')
      .selectAll()
      .where('oidcUserId', '=', user.userId)
      .executeTakeFirstOrThrow();
  },
}));

/**
 * 認証API
 */
export const authApi = auth.createApi();
