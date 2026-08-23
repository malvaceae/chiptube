-- ユーザーチューン一覧取得用インデックス
CREATE INDEX ASYNC ON tunes (user_id, deleted_at, created_at);
