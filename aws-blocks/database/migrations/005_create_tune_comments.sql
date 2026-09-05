-- チューンコメント
CREATE TABLE tune_comments (
  -- ID
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- チューンID
  tune_id VARCHAR(11) NOT NULL,
  -- ユーザーID
  user_id UUID NOT NULL,
  -- 本文
  body TEXT NOT NULL,
  -- 作成日時
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- 更新日時
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
