-- ユーザー
CREATE TABLE users (
  -- ID
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- OIDCユーザーID
  oidc_user_id TEXT NOT NULL UNIQUE,
  -- ユーザー名
  username TEXT NOT NULL,
  -- メールアドレス
  email TEXT,
  -- プロフィール写真
  picture TEXT,
  -- 表示名
  display_name TEXT,
  -- 作成日時
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- 更新日時
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
