-- デッキと関連データをトランザクション内で削除するRPC関数
-- 作成日: 2025-11-16
-- 説明: デッキ削除時にすべての関連データを単一のトランザクション内で削除し、データ整合性を保証

CREATE OR REPLACE FUNCTION public.delete_deck_with_transaction(p_deck_id uuid)
RETURNS public.decks
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_deck public.decks;
BEGIN
  -- トランザクション内で削除処理を実行
  -- エラーが発生した場合は自動的にロールバックされる
  
  -- 1. カードの削除
  DELETE FROM public.cards WHERE deck_id = p_deck_id;
  
  -- 2. 目標デッキリンクの削除
  DELETE FROM public.goal_deck_links WHERE deck_id = p_deck_id;
  
  -- 3. ノートデッキリンクの削除
  DELETE FROM public.note_deck_links WHERE deck_id = p_deck_id;
  
  -- 4. 共有情報の削除
  DELETE FROM public.deck_shares WHERE deck_id = p_deck_id;
  
  -- 5. 学習ログの削除
  DELETE FROM public.deck_study_logs WHERE deck_id = p_deck_id;
  
  -- 6. 音声記録の削除
  DELETE FROM public.audio_transcriptions WHERE deck_id = p_deck_id;
  
  -- 7. 最後にデッキ本体を削除（削除前のデータを取得）
  DELETE FROM public.decks
  WHERE id = p_deck_id
  RETURNING * INTO v_deleted_deck;
  
  -- デッキが存在しない場合はエラーを発生
  IF v_deleted_deck IS NULL THEN
    RAISE EXCEPTION 'Deck with id % not found', p_deck_id;
  END IF;
  
  -- 削除されたデッキを返す
  RETURN v_deleted_deck;
END;
$$;

-- 関数のコメント
COMMENT ON FUNCTION public.delete_deck_with_transaction(uuid) IS 
'デッキとすべての関連データ（cards, goal_deck_links, note_deck_links, deck_shares, deck_study_logs, audio_transcriptions）を単一のトランザクション内で削除する関数。エラーが発生した場合は自動的にロールバックされ、データ整合性が保証される。';

-- RLSポリシー: デッキの所有者のみが削除可能
-- 注意: この関数はSECURITY DEFINERで実行されるため、呼び出し元の権限チェックが必要
-- クライアント側でユーザー認証を確認してから呼び出すこと

