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

  /**
   * チューンテーブル
   */
  tunes: TuneTable;

  /**
   * チューンコメントテーブル
   */
  tuneComments: TuneCommentTable;
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

/**
 * チューンテーブル
 */
export interface TuneTable {
  /**
   * ID
   */
  id: string;

  /**
   * ユーザーID
   */
  userId: string;

  /**
   * タイトル
   */
  title: string;

  /**
   * 説明
   */
  description: string;

  /**
   * ステータス
   */
  status: 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED';

  /**
   * MIDIファイルのS3キー
   */
  midiS3Key: string;

  /**
   * サムネイルファイルのS3キー
   */
  thumbnailS3Key: string | null;

  /**
   * 公開日時
   */
  publishedAt: Date | null;

  /**
   * 削除日時
   */
  deletedAt: Date | null;

  /**
   * 作成日時
   */
  createdAt: Generated<Date>;

  /**
   * 更新日時
   */
  updatedAt: Generated<Date>;
}

/**
 * チューンコメントテーブル
 */
export interface TuneCommentTable {
  /**
   * ID
   */
  id: Generated<string>;

  /**
   * チューンID
   */
  tuneId: string;

  /**
   * ユーザーID
   */
  userId: string;

  /**
   * 本文
   */
  body: string;

  /**
   * 作成日時
   */
  createdAt: Generated<Date>;

  /**
   * 更新日時
   */
  updatedAt: Generated<Date>;
}
