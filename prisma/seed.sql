-- 会員ステータスの初期データ
INSERT INTO member_statuses (id, name, description) VALUES
    ('00000000-0000-0000-0000-000000000001', 'pending', '承認待ち'),
    ('00000000-0000-0000-0000-000000000002', 'active', '有効'),
    ('00000000-0000-0000-0000-000000000003', 'suspended', '停止中'),
    ('00000000-0000-0000-0000-000000000004', 'rejected', '却下')
ON CONFLICT (name) DO NOTHING;

-- お知らせステータスの初期データ
INSERT INTO news_statuses (id, name) VALUES
    ('00000000-0000-0000-0000-000000000101', 'draft'),
    ('00000000-0000-0000-0000-000000000102', 'published'),
    ('00000000-0000-0000-0000-000000000103', 'archived')
ON CONFLICT (name) DO NOTHING;

-- イベントステータスの初期データ
INSERT INTO event_statuses (id, name) VALUES
    ('00000000-0000-0000-0000-000000000201', 'draft'),
    ('00000000-0000-0000-0000-000000000202', 'published'),
    ('00000000-0000-0000-0000-000000000203', 'closed'),
    ('00000000-0000-0000-0000-000000000204', 'cancelled')
ON CONFLICT (name) DO NOTHING;

-- 地区会タグの初期データ（circles テーブル・category='district'）
-- 事務局のみ管理。会員は最大2つまで選択可。
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

-- 既存のテストデータを削除
DELETE FROM event_applications;
DELETE FROM guest_applications;
DELETE FROM events;
DELETE FROM news;

-- お知らせのテストデータ（HTML形式）
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- 最初のアクティブユーザーを取得（存在する場合）
    SELECT id INTO test_user_id FROM users WHERE status_id = '00000000-0000-0000-0000-000000000002' LIMIT 1;
    
    -- ユーザーが存在する場合のみお知らせを作成
    IF test_user_id IS NOT NULL THEN
        -- テストお知らせ1
        INSERT INTO news (id, title, body, thumbnail_url, status_id, publish_at, created_by)
        VALUES (
            gen_random_uuid(),
            'CEO倶楽部アプリがリリースされました',
            '<h1>CEO倶楽部アプリがリリースされました</h1><p>CEO倶楽部イベント管理アプリがリリースされました。今後、イベント情報やお知らせをこちらで配信いたします。</p><h2>主な機能</h2><ul><li>イベント情報の確認</li><li>イベントへの申し込み</li><li>お知らせの閲覧</li><li>会員情報の管理</li></ul><p>ご利用いただき、ありがとうございます。</p>',
            'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
            '00000000-0000-0000-0000-000000000102', -- published
            NOW(),
            test_user_id
        )
        ON CONFLICT DO NOTHING;

        -- テストお知らせ2
        INSERT INTO news (id, title, body, thumbnail_url, status_id, publish_at, created_by)
        VALUES (
            gen_random_uuid(),
            '次回イベントのご案内',
            '<h1>次回イベントのご案内</h1><p>次回のCEO倶楽部イベントを開催いたします。詳細はイベントページをご確認ください。</p><h2>開催予定イベント</h2><ol><li>CEO倶楽部新年会 2026</li><li>経営者セミナー「DX推進の最前線」</li><li>CEO倶楽部定例会</li></ol><p><strong>お申し込みはお早めに！</strong></p>',
            'https://images.unsplash.com/photo-1540575467063-178a50c2e87c?w=800&h=600&fit=crop',
            '00000000-0000-0000-0000-000000000102', -- published
            NOW() - INTERVAL '1 day',
            test_user_id
        )
        ON CONFLICT DO NOTHING;

        -- テストお知らせ3
        INSERT INTO news (id, title, body, thumbnail_url, status_id, publish_at, created_by)
        VALUES (
            gen_random_uuid(),
            'システムメンテナンスのお知らせ',
            '<h1>システムメンテナンスのお知らせ</h1><p>来週、システムメンテナンスを実施いたします。ご不便をおかけいたしますが、よろしくお願いいたします。</p><h2>メンテナンス日時</h2><p><strong>2026年1月15日（月） 2:00 ～ 6:00</strong></p><h3>影響範囲</h3><ul><li>アプリの一時的な利用不可</li><li>イベント申し込み機能の停止</li></ul><p><em>メンテナンス中はご利用いただけませんので、ご注意ください。</em></p>',
            'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=600&fit=crop',
            '00000000-0000-0000-0000-000000000102', -- published
            NOW() - INTERVAL '2 days',
            test_user_id
        )
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- イベントのテストデータ（HTML形式）
DO $$
DECLARE
    test_user_id UUID;
    published_status_id UUID := '00000000-0000-0000-0000-000000000202'; -- published
BEGIN
    -- 最初のアクティブユーザーを取得（存在する場合）
    SELECT id INTO test_user_id FROM users WHERE status_id = '00000000-0000-0000-0000-000000000002' LIMIT 1;
    
    -- ユーザーが存在する場合のみイベントを作成
    IF test_user_id IS NOT NULL THEN
        -- テストイベント1: 今後のイベント
        INSERT INTO events (
            id, title, body, thumbnail_url, event_date, start_time, end_time, venue, capacity,
            cancel_deadline, status_id, publish_at, allow_guest, created_by
        )
        VALUES (
            gen_random_uuid(),
            'CEO倶楽部新年会 2026',
            '<h1>CEO倶楽部新年会 2026</h1><p>新年を迎え、CEO倶楽部の新年会を開催いたします。会員の皆様との交流の場として、ぜひご参加ください。</p><h2>開催概要</h2><ul><li>日時: 2026年2月（詳細は後日ご案内）</li><li>場所: 東京・ホテルオークラ</li><li>定員: 100名</li></ul><h2>プログラム</h2><p>新年のご挨拶、会員の皆様との交流、懇親会などを予定しております。</p><p><strong>お申し込みはお早めに！</strong></p>',
            'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&h=600&fit=crop',
            (NOW() + INTERVAL '30 days')::DATE,
            '18:00:00',
            '21:00:00',
            '東京・ホテルオークラ',
            100,
            (NOW() + INTERVAL '25 days'),
            published_status_id,
            NOW(),
            true,
            test_user_id
        )
        ON CONFLICT DO NOTHING;

        -- テストイベント2: 来月のイベント
        INSERT INTO events (
            id, title, body, thumbnail_url, event_date, start_time, end_time, venue, capacity,
            cancel_deadline, status_id, publish_at, allow_guest, created_by
        )
        VALUES (
            gen_random_uuid(),
            '経営者セミナー「DX推進の最前線」',
            '<h1>経営者セミナー「DX推進の最前線」</h1><p>デジタルトランスフォーメーション（DX）を推進する経営者のためのセミナーです。最新の事例と実践的なノウハウをお伝えします。</p><h2>セミナー内容</h2><ol><li>DXの基本概念と重要性</li><li>成功事例の紹介</li><li>実践的なノウハウの共有</li><li>質疑応答・ディスカッション</li></ol><h2>講師プロフィール</h2><p><strong>山田太郎氏</strong><br/>デジタル戦略コンサルタント。大手企業のDX推進を多数支援。</p><p>詳細は<a href="https://example.com">こちら</a>をご覧ください。</p>',
            'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=600&fit=crop',
            (NOW() + INTERVAL '45 days')::DATE,
            '14:00:00',
            '17:00:00',
            '東京・大手町サンケイプラザ',
            50,
            (NOW() + INTERVAL '40 days'),
            published_status_id,
            NOW(),
            false,
            test_user_id
        )
        ON CONFLICT DO NOTHING;

        -- テストイベント3: 今週末のイベント
        INSERT INTO events (
            id, title, body, thumbnail_url, event_date, start_time, end_time, venue, capacity,
            cancel_deadline, status_id, publish_at, allow_guest, created_by
        )
        VALUES (
            gen_random_uuid(),
            'CEO倶楽部定例会',
            '<h1>CEO倶楽部定例会</h1><p>定例のCEO倶楽部会合です。会員の皆様の情報交換の場として開催いたします。</p><h2>議題</h2><ul><li>会員紹介・自己紹介タイム</li><li>ビジネストピックの共有</li><li>今後のイベント企画について</li><li>自由な情報交換・ネットワーキング</li></ul><h3>注意事項</h3><p><em>会員限定のイベントです。事前のご予約をお願いいたします。</em></p>',
            'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&h=600&fit=crop',
            (NOW() + INTERVAL '7 days')::DATE,
            '19:00:00',
            '21:00:00',
            '東京・六本木ヒルズ',
            30,
            (NOW() + INTERVAL '5 days'),
            published_status_id,
            NOW(),
            false,
            test_user_id
        )
        ON CONFLICT DO NOTHING;

        -- テストイベント4: 過去のイベント（参考用）
        INSERT INTO events (
            id, title, body, thumbnail_url, event_date, start_time, end_time, venue, capacity,
            cancel_deadline, status_id, publish_at, allow_guest, created_by
        )
        VALUES (
            gen_random_uuid(),
            'CEO倶楽部忘年会 2025',
            '<h1>CEO倶楽部忘年会 2025</h1><p>2025年の忘年会を開催いたしました。多くの会員の皆様にご参加いただき、ありがとうございました。</p><h2>開催報告</h2><p>本年も多くの会員の皆様にご参加いただき、大変盛況のうちに終了いたしました。</p><ul><li>参加者数: 80名</li><li>会場: 東京・帝国ホテル</li><li>開催日: 2025年12月</li></ul><p>来年も引き続き、皆様と共にCEO倶楽部を盛り上げていきたいと思います。</p>',
            'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&h=600&fit=crop',
            (NOW() - INTERVAL '15 days')::DATE,
            '18:00:00',
            '21:00:00',
            '東京・帝国ホテル',
            80,
            (NOW() - INTERVAL '20 days'),
            published_status_id,
            (NOW() - INTERVAL '30 days'),
            true,
            test_user_id
        )
        ON CONFLICT DO NOTHING;

        -- テストイベント5: 2026年2月
        INSERT INTO events (
            id, title, body, thumbnail_url, event_date, start_time, end_time, venue, capacity,
            cancel_deadline, status_id, publish_at, allow_guest, created_by
        )
        VALUES (
            gen_random_uuid(),
            'CEO倶楽部2月定例会（テスト）',
            '<h1>CEO倶楽部2月定例会</h1><p>2月の定例CEO倶楽部会合です。会員の皆様の情報交換の場として開催いたします。</p><h2>議題</h2><ul><li>会員紹介・自己紹介タイム</li><li>ビジネストピックの共有</li><li>今後のイベント企画について</li><li>自由な情報交換・ネットワーキング</li></ul><h3>注意事項</h3><p><em>会員限定のイベントです。事前のご予約をお願いいたします。</em></p>',
            'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&h=600&fit=crop',
            DATE '2026-02-15',
            '19:00:00',
            '21:00:00',
            '東京・六本木ヒルズ',
            30,
            DATE '2026-02-10',
            published_status_id,
            NOW(),
            false,
            test_user_id
        )
        ON CONFLICT DO NOTHING;

        -- テストイベント6: 2026年3月
        INSERT INTO events (
            id, title, body, thumbnail_url, event_date, start_time, end_time, venue, capacity,
            cancel_deadline, status_id, publish_at, allow_guest, created_by
        )
        VALUES (
            gen_random_uuid(),
            '経営者セミナー「春の戦略会議」（テスト）',
            '<h1>経営者セミナー「春の戦略会議」</h1><p>新年度を迎える前に、経営戦略を見直すセミナーです。最新の事例と実践的なノウハウをお伝えします。</p><h2>セミナー内容</h2><ol><li>年度末振り返りと次年度計画</li><li>成功事例の紹介</li><li>質疑応答・ディスカッション</li></ol><p>詳細はお申し込み後ご案内いたします。</p>',
            'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=600&fit=crop',
            DATE '2026-03-15',
            '14:00:00',
            '17:00:00',
            '東京・大手町サンケイプラザ',
            50,
            DATE '2026-03-10',
            published_status_id,
            NOW(),
            true,
            test_user_id
        )
        ON CONFLICT DO NOTHING;

        -- テストイベント7: 2026年4月
        INSERT INTO events (
            id, title, body, thumbnail_url, event_date, start_time, end_time, venue, capacity,
            cancel_deadline, status_id, publish_at, allow_guest, created_by
        )
        VALUES (
            gen_random_uuid(),
            'CEO倶楽部4月交流会（テスト）',
            '<h1>CEO倶楽部4月交流会</h1><p>新年度のスタートを祝い、CEO倶楽部の交流会を開催いたします。会員の皆様との交流の場として、ぜひご参加ください。</p><h2>開催概要</h2><ul><li>日時: 2026年4月</li><li>場所: 東京・ホテルオークラ</li><li>定員: 80名</li></ul><h2>プログラム</h2><p>新年度のご挨拶、会員の皆様との交流、懇親会などを予定しております。</p><p><strong>お申し込みはお早めに！</strong></p>',
            'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&h=600&fit=crop',
            DATE '2026-04-15',
            '18:00:00',
            '21:00:00',
            '東京・ホテルオークラ',
            80,
            DATE '2026-04-10',
            published_status_id,
            NOW(),
            true,
            test_user_id
        )
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 申込済のテストデータ（指定ユーザーが既存イベントに申し込む）
DO $$
DECLARE
    target_user_id UUID := '673de11c-259b-46e0-b6eb-5ea7413ca220';
    event1_id UUID;
    event2_id UUID;
    event3_id UUID;
    event4_id UUID;
BEGIN
    -- 公開済みのイベントを取得（未来のイベント）
    SELECT id INTO event1_id FROM events 
    WHERE status_id = '00000000-0000-0000-0000-000000000202' 
    AND event_date >= CURRENT_DATE
    ORDER BY event_date ASC
    LIMIT 1;

    -- 2つ目のイベント
    SELECT id INTO event2_id FROM events 
    WHERE status_id = '00000000-0000-0000-0000-000000000202' 
    AND event_date >= CURRENT_DATE
    ORDER BY event_date ASC
    OFFSET 1
    LIMIT 1;

    -- 3つ目のイベント
    SELECT id INTO event3_id FROM events 
    WHERE status_id = '00000000-0000-0000-0000-000000000202' 
    AND event_date >= CURRENT_DATE
    ORDER BY event_date ASC
    OFFSET 2
    LIMIT 1;

    -- 過去のイベント（1つ）
    SELECT id INTO event4_id FROM events 
    WHERE status_id = '00000000-0000-0000-0000-000000000202' 
    AND event_date < CURRENT_DATE
    ORDER BY event_date DESC
    LIMIT 1;

    -- ユーザーが存在する場合のみ申込みデータを作成
    IF EXISTS (SELECT 1 FROM users WHERE id = target_user_id) THEN
        -- 未来のイベント1に申し込み
        IF event1_id IS NOT NULL THEN
            INSERT INTO event_applications (id, event_id, user_id, status, applied_at)
            VALUES (
                gen_random_uuid(),
                event1_id,
                target_user_id,
                'applied',
                NOW() - INTERVAL '5 days'
            )
            ON CONFLICT (event_id, user_id) DO NOTHING;
        END IF;

        -- 未来のイベント2に申し込み
        IF event2_id IS NOT NULL THEN
            INSERT INTO event_applications (id, event_id, user_id, status, applied_at)
            VALUES (
                gen_random_uuid(),
                event2_id,
                target_user_id,
                'applied',
                NOW() - INTERVAL '3 days'
            )
            ON CONFLICT (event_id, user_id) DO NOTHING;
        END IF;

        -- 未来のイベント3に申し込み
        IF event3_id IS NOT NULL THEN
            INSERT INTO event_applications (id, event_id, user_id, status, applied_at)
            VALUES (
                gen_random_uuid(),
                event3_id,
                target_user_id,
                'applied',
                NOW() - INTERVAL '1 day'
            )
            ON CONFLICT (event_id, user_id) DO NOTHING;
        END IF;

        -- 過去のイベントに申し込み（参加済み）
        IF event4_id IS NOT NULL THEN
            INSERT INTO event_applications (id, event_id, user_id, status, applied_at)
            VALUES (
                gen_random_uuid(),
                event4_id,
                target_user_id,
                'applied',
                NOW() - INTERVAL '20 days'
            )
            ON CONFLICT (event_id, user_id) DO NOTHING;
        END IF;
    END IF;
END $$;

-- 管理者のテストデータ
-- 注意: パスワードは "admin123" です（現在のログイン実装ではパスワード検証が実装されていないため、任意の文字列でも動作します）
INSERT INTO administrators (id, email, password_hash, name, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@example.com',
    '$2a$10$placeholder_hash_for_testing', -- テスト用のプレースホルダー（実際の検証は未実装）
    '管理者',
    true
)
ON CONFLICT (email) DO NOTHING;

