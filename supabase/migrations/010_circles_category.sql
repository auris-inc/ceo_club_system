-- circles.id に gen_random_uuid() のデフォルトを再設定
-- （Prisma の初期マイグレーションで DEFAULT が外れていたため、
--  Supabase クライアントから直接 INSERT すると id が null になっていた）
ALTER TABLE circles
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- user_circles も念のため同様に修正
ALTER TABLE user_circles
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- circles テーブルに category カラムを追加
-- 'district' = 地区会（事務局のみ管理、会員は最大2つまで選択可）
-- 'club'     = 部活動など（会員が自由に付け外し、上限なし）
ALTER TABLE circles
  ADD COLUMN IF NOT EXISTS category VARCHAR(20) NOT NULL DEFAULT 'club';

-- category の値を制約（既存データは 'club' として扱う）
ALTER TABLE circles
  DROP CONSTRAINT IF EXISTS circles_category_check;

ALTER TABLE circles
  ADD CONSTRAINT circles_category_check
    CHECK (category IN ('district', 'club'));

CREATE INDEX IF NOT EXISTS idx_circles_category ON circles(category);

-- 地区会タグの初期データ
-- 固定UUID で冪等投入（冪等性のため ON CONFLICT で name 重複を回避）
INSERT INTO circles (id, name, category, sort_order, is_active) VALUES
  ('00000000-0000-0000-0000-000000000301', '下町会',       'district', 10, true),
  ('00000000-0000-0000-0000-000000000302', '渋谷・山手会', 'district', 20, true),
  ('00000000-0000-0000-0000-000000000303', '銀座会',       'district', 30, true),
  ('00000000-0000-0000-0000-000000000304', '埼玉会',       'district', 40, true),
  ('00000000-0000-0000-0000-000000000305', '吉祥寺会',     'district', 50, true),
  ('00000000-0000-0000-0000-000000000306', '港区会',       'district', 60, true),
  ('00000000-0000-0000-0000-000000000307', '新宿会',       'district', 70, true)
ON CONFLICT (name) DO UPDATE SET
  category   = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order,
  is_active  = EXCLUDED.is_active;
