-- チューン閲覧数
CREATE TABLE tune_views (
  -- ID
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- チューンID
  tune_id VARCHAR(11) NOT NULL,
  -- IPアドレス
  ip_address TEXT NOT NULL,
  -- 作成日時
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- 更新日時
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
