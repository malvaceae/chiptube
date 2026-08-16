// Kysely
import type { Generated } from 'kysely';

/**
 * データベース
 */
export interface Database {
  /**
   * ユーザーテーブル
   */
  users: UserTable;
}

/**
 * ユーザーテーブル
 */
export interface UserTable {
  /**
   * ID
   */
  id: Generated<string>;

  /**
   * OIDCユーザーID
   */
  oidcUserId: string;

  /**
   * ユーザー名
   */
  username: string;

  /**
   * メールアドレス
   */
  email: string | null;

  /**
   * プロフィール写真
   */
  picture: string | null;

  /**
   * 表示名
   */
  displayName: string | null;

  /**
   * 作成日時
   */
  createdAt: Generated<Date>;

  /**
   * 更新日時
   */
  updatedAt: Generated<Date>;
}
