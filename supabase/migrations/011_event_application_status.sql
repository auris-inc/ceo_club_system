-- イベント参加表明の3状態化（上書き型）
--   旧: 'applied' / 'cancelled'
--   新: 'attending' / 'not_attending' / 'undecided'
--
-- 「未回答」は event_applications にレコードが存在しない状態で表現する。
-- ボタン押下時は (event_id, user_id) で upsert して status を上書きする。

-- 既存 'applied' を 'attending' に移行
UPDATE event_applications
   SET status = 'attending'
 WHERE status = 'applied';

-- 既存 'cancelled' は「未回答」相当として扱うため、レコードを削除する。
-- 仕様（上書き型）では cancelled は使用しない。
DELETE FROM event_applications WHERE status = 'cancelled';

-- 整合性のため CHECK 制約を導入
ALTER TABLE event_applications
  DROP CONSTRAINT IF EXISTS event_applications_status_check;

ALTER TABLE event_applications
  ADD CONSTRAINT event_applications_status_check
    CHECK (status IN ('attending', 'not_attending', 'undecided'));

-- event_applications.id にデフォルト UUID を設定（Prisma が外していたら復元）
ALTER TABLE event_applications
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- ステータスでの絞り込みを高速化
CREATE INDEX IF NOT EXISTS idx_event_applications_event_status
  ON event_applications(event_id, status);
