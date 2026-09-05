-- チューン閲覧数集計用インデックス
CREATE INDEX ASYNC ON tune_views (tune_id, created_at);
