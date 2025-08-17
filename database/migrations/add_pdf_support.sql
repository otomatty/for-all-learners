-- PDF処理機能のサポート追加
-- 2025-01-20: PDF カード生成機能

-- cardsテーブルにPDFソースURL列を追加
ALTER TABLE cards ADD COLUMN source_pdf_url text NULL;

-- pdf-filesバケットをStorage設定に追加するためのSQL
-- 注意: Supabase Storage バケットの作成は管理画面またはSupabase CLIで行う必要があります

-- raw_inputsテーブルのtypeにpdfを追加（既存のenum制約がある場合）
-- 注意: type列に制約がない場合、このコメントは無視してください

-- インデックスの追加（PDFソースURLでの検索用）
CREATE INDEX IF NOT EXISTS idx_cards_source_pdf_url ON cards(source_pdf_url) WHERE source_pdf_url IS NOT NULL;

-- コメント追加
COMMENT ON COLUMN cards.source_pdf_url IS 'PDF生成元ファイルのURL（PDF機能使用時のみ）';
