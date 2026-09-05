-- チューンコメント一覧取得用インデックス
CREATE INDEX ASYNC ON tune_comments (tune_id, created_at);
