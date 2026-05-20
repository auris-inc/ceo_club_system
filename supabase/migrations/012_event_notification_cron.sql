-- 8日前リマインド・10日前再案内の日次バッチを pg_cron で実行する。
--
-- 前提:
--   1. 拡張機能 pg_cron / pg_net を Supabase Dashboard で有効化済み
--      ( Database > Extensions で pg_cron, pg_net を ON )
--   2. Vault に以下のシークレットを登録済み
--      SELECT vault.create_secret('https://xxxx.supabase.co', 'project_url');
--      SELECT vault.create_secret('<notification_shared_secret>', 'notification_secret');
--   3. Edge Function は --no-verify-jwt でデプロイされ、
--      NOTIFICATION_SECRET シークレットが同じ値で登録済み
--
-- 動作:
--   毎日 00:00 UTC (= 09:00 JST) に notify_upcoming_events() を実行
--   - 開催日が 8日後のイベント → reminder_attending を Edge Function 経由で送信
--   - 開催日が10日後のイベント → reinvite_undecided を Edge Function 経由で送信
--   いずれも status='published' (event_status の id = 202) かつ未来のイベントが対象

-- 拡張機能の有効化（既に有効なら no-op）
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- リマインド送信関数
CREATE OR REPLACE FUNCTION public.notify_upcoming_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  v_project_url           text;
  v_notification_secret   text;
  v_8d                    date := (CURRENT_DATE + INTERVAL '8 days')::date;
  v_10d                   date := (CURRENT_DATE + INTERVAL '10 days')::date;
  r                       record;
BEGIN
  -- Vault からシークレット取得
  SELECT decrypted_secret INTO v_project_url
  FROM vault.decrypted_secrets WHERE name = 'project_url';

  SELECT decrypted_secret INTO v_notification_secret
  FROM vault.decrypted_secrets WHERE name = 'notification_secret';

  IF v_project_url IS NULL OR v_notification_secret IS NULL THEN
    RAISE WARNING '[notify_upcoming_events] Vault secrets not configured (project_url / notification_secret)';
    RETURN;
  END IF;

  -- 8日後のイベントに対して reminder_attending
  FOR r IN
    SELECT id FROM events
     WHERE event_date = v_8d
       AND status_id = '00000000-0000-0000-0000-000000000202'
  LOOP
    PERFORM net.http_post(
      url     := v_project_url || '/functions/v1/send-event-notification',
      headers := jsonb_build_object(
        'content-type',          'application/json',
        'x-notification-secret', v_notification_secret
      ),
      body    := jsonb_build_object(
        'kind',    'reminder_attending',
        'eventId', r.id::text
      )
    );
  END LOOP;

  -- 10日後のイベントに対して reinvite_undecided
  FOR r IN
    SELECT id FROM events
     WHERE event_date = v_10d
       AND status_id = '00000000-0000-0000-0000-000000000202'
  LOOP
    PERFORM net.http_post(
      url     := v_project_url || '/functions/v1/send-event-notification',
      headers := jsonb_build_object(
        'content-type',          'application/json',
        'x-notification-secret', v_notification_secret
      ),
      body    := jsonb_build_object(
        'kind',    'reinvite_undecided',
        'eventId', r.id::text
      )
    );
  END LOOP;
END;
$$;

-- 既存のスケジュール定義があれば一旦解除（冪等）
DO $$
BEGIN
  PERFORM cron.unschedule('daily-event-reminders');
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- 未登録なら無視
END $$;

-- 毎日 00:00 UTC (= 09:00 JST) に実行
SELECT cron.schedule(
  'daily-event-reminders',
  '0 0 * * *',
  $$SELECT public.notify_upcoming_events();$$
);
