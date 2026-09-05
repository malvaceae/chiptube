-- チューン高評価
CREATE TABLE tune_likes (
  -- チューンID
  tune_id VARCHAR(11) NOT NULL,
  -- ユーザーID
  user_id UUID NOT NULL,
  -- 作成日時
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- 更新日時
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- チューンIDとユーザーIDの複合主キー
  PRIMARY KEY (tune_id, user_id)
);
