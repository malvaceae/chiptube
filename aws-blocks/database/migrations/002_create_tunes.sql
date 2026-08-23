-- チューン
CREATE TABLE tunes (
  -- ID
  id VARCHAR(11) PRIMARY KEY,
  -- ユーザーID
  user_id UUID NOT NULL,
  -- タイトル
  title TEXT NOT NULL,
  -- 説明
  description TEXT NOT NULL,
  -- ステータス
  status TEXT NOT NULL DEFAULT 'DRAFT',
  -- MIDIファイルのS3キー
  midi_s3_key TEXT NOT NULL,
  -- サムネイルファイルのS3キー
  thumbnail_s3_key TEXT,
  -- 公開日時
  published_at TIMESTAMPTZ,
  -- 削除日時
  deleted_at TIMESTAMPTZ,
  -- 作成日時
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- 更新日時
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
