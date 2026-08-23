-- 公開済みチューン一覧取得用インデックス
CREATE INDEX ASYNC ON tunes (status, deleted_at, published_at);
