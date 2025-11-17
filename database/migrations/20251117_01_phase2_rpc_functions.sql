-- Phase 2: トランザクション管理とパフォーマンス改善のためのRPC関数
-- 作成日: 2025-11-17
-- 説明: レビューコメント対応として、複数DB書き込みをトランザクション化し、クライアントサイド集計をDB側に移行

-- ============================================================================
-- 1. review_card: カードレビュー処理のトランザクション化
-- ============================================================================
-- カード取得 → FSRS計算 → カード更新 → 学習ログ作成を単一トランザクションで実行
-- エラーが発生した場合は自動的にロールバックされ、データ整合性が保証される

CREATE OR REPLACE FUNCTION public.review_card(
  p_card_id uuid,
  p_quality integer,
  p_practice_mode text DEFAULT 'review'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_card public.cards%ROWTYPE;
  v_user_id uuid;
  v_prev_stability numeric;
  v_prev_difficulty numeric;
  v_last_reviewed_at timestamp with time zone;
  v_elapsed_days numeric;
  v_new_stability numeric;
  v_new_difficulty numeric;
  v_interval_days numeric;
  v_next_review_at timestamp with time zone;
  v_review_interval integer;
  v_now timestamp with time zone;
  v_inserted_log public.learning_logs%ROWTYPE;
  v_result json;
BEGIN
  -- 現在時刻を取得
  v_now := NOW();
  
  -- 1. カードの現在の進捗を取得
  SELECT * INTO v_card
  FROM public.cards
  WHERE id = p_card_id;
  
  IF v_card IS NULL THEN
    RAISE EXCEPTION 'Card with id % not found', p_card_id;
  END IF;
  
  v_user_id := v_card.user_id;
  v_prev_stability := COALESCE(v_card.stability, 0);
  v_prev_difficulty := COALESCE(v_card.difficulty, 1.0);
  v_last_reviewed_at := v_card.last_reviewed_at;
  
  -- 経過日数を計算
  IF v_last_reviewed_at IS NOT NULL THEN
    v_elapsed_days := EXTRACT(EPOCH FROM (v_now - v_last_reviewed_at)) / 86400.0;
  ELSE
    v_elapsed_days := 0;
  END IF;
  
  -- 2. FSRSアルゴリズムで新しい進捗を計算
  -- qualityを0-5の範囲に制限
  DECLARE
    q numeric := GREATEST(0, LEAST(5, p_quality));
  BEGIN
    -- 難易度調整
    v_new_difficulty := GREATEST(
      0.1,
      v_prev_difficulty + 0.1 - (5 - q) * (0.02 + (5 - q) * 0.01)
    );
    
    -- 安定性調整
    v_new_stability := GREATEST(
      0.1,
      v_prev_stability * EXP(((q - 3) * v_elapsed_days) / (v_new_difficulty * 10))
    );
    
    -- インターバル（日数）
    v_interval_days := v_new_stability * v_new_difficulty;
  END;
  
  -- 次回レビュー日時を計算
  v_next_review_at := v_now + (v_interval_days || ' days')::interval;
  v_review_interval := CEIL(v_interval_days);
  
  -- 3. cardsテーブルの更新
  UPDATE public.cards
  SET
    review_interval = v_review_interval,
    stability = v_new_stability,
    difficulty = v_new_difficulty,
    last_reviewed_at = v_now,
    next_review_at = v_next_review_at
  WHERE id = p_card_id;
  
  -- 4. learning_logsへの記録
  INSERT INTO public.learning_logs (
    user_id,
    card_id,
    question_id,
    answered_at,
    is_correct,
    user_answer,
    practice_mode,
    review_interval,
    next_review_at
  )
  VALUES (
    v_user_id,
    p_card_id,
    NULL,
    v_now,
    p_quality >= 3,
    NULL,
    p_practice_mode,
    v_review_interval,
    v_next_review_at
  )
  RETURNING * INTO v_inserted_log;
  
  -- 結果をJSON形式で返す
  v_result := json_build_object(
    'interval', v_review_interval,
    'nextReviewAt', v_next_review_at,
    'log', row_to_json(v_inserted_log)
  );
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.review_card(uuid, integer, text) IS 
'カードの復習結果に基づき、FSRSアルゴリズムを適用してカードと学習ログを更新する関数。すべての処理を単一のトランザクション内で実行し、エラーが発生した場合は自動的にロールバックされる。';

-- ============================================================================
-- 2. update_goals_priority: 学習目標の優先順位一括更新のトランザクション化
-- ============================================================================
-- 複数の目標の優先順位を配列で受け取り、単一トランザクション内で一括更新
-- エラーが発生した場合は自動的にロールバックされ、データ整合性が保証される

CREATE OR REPLACE FUNCTION public.update_goals_priority(
  p_user_id uuid,
  p_goal_ids uuid[]
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_goal_id uuid;
  v_index integer;
BEGIN
  -- 配列の各要素に対して優先順位を更新
  FOR v_index IN 1..array_length(p_goal_ids, 1) LOOP
    v_goal_id := p_goal_ids[v_index];
    
    -- 目標が存在し、ユーザーが所有者であることを確認
    UPDATE public.study_goals
    SET priority_order = v_index
    WHERE id = v_goal_id
      AND user_id = p_user_id;
    
    -- 更新された行がない場合はエラー
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Goal with id % not found or does not belong to user %', v_goal_id, p_user_id;
    END IF;
  END LOOP;
  
  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.update_goals_priority(uuid, uuid[]) IS 
'学習目標の優先順位を一括更新する関数。配列で受け取った目標IDの順序に従って優先順位を設定し、すべての処理を単一のトランザクション内で実行する。エラーが発生した場合は自動的にロールバックされる。';

-- ============================================================================
-- 3. get_today_review_counts_by_deck: デッキごとの当日レビュー数集計
-- ============================================================================
-- クライアントサイド集計をDB側に移行し、パフォーマンスを改善
-- GROUP BY句を使用して効率的に集計

CREATE OR REPLACE FUNCTION public.get_today_review_counts_by_deck(
  p_user_id uuid
)
RETURNS TABLE(deck_id uuid, review_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.deck_id,
    COUNT(*)::bigint as review_count
  FROM public.learning_logs ll
  INNER JOIN public.cards c ON c.id = ll.card_id
  WHERE ll.user_id = p_user_id
    AND ll.answered_at >= CURRENT_DATE
    AND ll.answered_at < CURRENT_DATE + INTERVAL '1 day'
  GROUP BY c.deck_id;
END;
$$;

COMMENT ON FUNCTION public.get_today_review_counts_by_deck(uuid) IS 
'ユーザーが当日レビュー済みのカード数をデッキごとに集計して返す関数。GROUP BY句を使用してデータベース側で効率的に集計を行う。';

