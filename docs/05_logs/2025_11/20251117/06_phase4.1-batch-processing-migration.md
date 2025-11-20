# Phase 4.1: バッチ処理の移行 - 実装ログ

**日付**: 2025-11-17  
**Issue**: #153  
**関連計画**: `docs/03_plans/tauri-migration/20251109_01_implementation-plan.md` (Phase 4.1)

## 概要

Tauri移行のPhase 4.1として、バッチ処理をServer ActionsからAPI Routes + クライアント側フックに移行しました。

## 実装内容

### 1. API Routes実装

以下の5つのAPI Routesを作成しました：

1. **`app/api/batch/audio/route.ts`**
   - 音声ファイルのバッチ文字起こし処理
   - Base64エンコードされた音声ファイルを受け取り、`processAudioFilesBatch`を呼び出し

2. **`app/api/batch/images/route.ts`**
   - 画像のバッチOCR処理
   - 画像URLの配列を受け取り、`transcribeImagesBatch`を呼び出し

3. **`app/api/batch/pdf/route.ts`**
   - PDFページのバッチOCR処理
   - 単一PDFモードとデュアルPDFモードの両方に対応
   - Base64エンコードされた画像Blobを受け取り、`processPdfBatchOcr`または`processDualPdfBatchOcr`を呼び出し

4. **`app/api/batch/unified/route.ts`**
   - 統合バッチプロセッサー
   - 複数のバッチタイプ（multi-file, audio-batch, image-batch）を統合的に処理
   - `processUnifiedBatch`を呼び出し

5. **`app/api/batch/multi-file/route.ts`**
   - 複数ファイルのバッチ処理
   - PDF、画像、音声ファイルを一括処理
   - Base64エンコードされたファイルBlobを受け取り、`processMultiFilesBatch`を呼び出し

### 2. クライアント側フック実装

以下の5つのカスタムフックを作成しました：

1. **`hooks/batch/useAudioBatchProcessing.ts`**
   - 音声バッチ処理用フック
   - BlobをBase64に変換してAPIに送信
   - TanStack Queryの`useMutation`を使用

2. **`hooks/batch/useImageBatchProcessing.ts`**
   - 画像バッチOCR用フック
   - 画像URLの配列をAPIに送信

3. **`hooks/batch/usePdfBatchProcessing.ts`**
   - PDFバッチOCR用フック
   - `usePdfBatchProcessing`（単一PDFモード）と`useDualPdfBatchProcessing`（デュアルPDFモード）を提供
   - BlobをBase64に変換してAPIに送信

4. **`hooks/batch/useUnifiedBatchProcessing.ts`**
   - 統合バッチ処理用フック
   - 複数のバッチタイプに対応
   - 必要に応じてBlobをBase64に変換

5. **`hooks/batch/useMultiFileBatchProcessing.ts`**
   - マルチファイルバッチ処理用フック
   - 複数ファイルを一括処理

6. **`hooks/batch/index.ts`**
   - すべてのフックと型をエクスポート

### 3. 実装の特徴

- **認証**: すべてのAPI RoutesでSupabase認証をチェック
- **エラーハンドリング**: 適切なエラーレスポンスとログ記録を実装
- **Base64エンコード**: クライアント側でBlobをBase64に変換してAPIに送信（サーバー側でデコード）
- **型安全性**: TypeScriptの型定義を適切に使用
- **ログ記録**: 処理開始・完了時にログを記録

## 移行パターン

**採用パターン**: API Routes（パターン2）

**判断理由**:
- すべてのバッチ処理が外部API（Gemini API）との連携を必要とする
- 機密情報（APIキー）をサーバー側で管理する必要がある
- Tauri Commandはオフライン処理が必要な場合に適しているが、今回は該当しない

## 進捗管理について

現在は基本的な進捗通知（処理開始・完了）のみ実装しています。リアルタイム進捗表示は、将来的にWebSocketやServer-Sent Events (SSE) を使用して実装する予定です。

## 次のステップ

1. **テスト実装**: 各API Routeとフックのテストを作成
2. **既存コードの置き換え**: Server Actions呼び出し箇所をカスタムフックに置き換え
3. **進捗管理の強化**: リアルタイム進捗表示の実装（将来）
4. **PDF Job Manager**: `pdfJobManager.ts`の移行（後で対応）

## 関連ファイル

### 新規作成
- `app/api/batch/audio/route.ts`
- `app/api/batch/images/route.ts`
- `app/api/batch/pdf/route.ts`
- `app/api/batch/unified/route.ts`
- `app/api/batch/multi-file/route.ts`
- `hooks/batch/useAudioBatchProcessing.ts`
- `hooks/batch/useImageBatchProcessing.ts`
- `hooks/batch/usePdfBatchProcessing.ts`
- `hooks/batch/useUnifiedBatchProcessing.ts`
- `hooks/batch/useMultiFileBatchProcessing.ts`
- `hooks/batch/index.ts`

### 更新
- `docs/03_plans/tauri-migration/20251109_01_implementation-plan.md` - Phase 4.1の進捗を更新

## 注意事項

- Base64エンコード/デコードは大きなファイルの場合にメモリ使用量が増加する可能性がある
- リアルタイム進捗表示は将来実装予定
- `pdfJobManager.ts`は後で対応予定（非同期ジョブ管理のため、別の実装パターンが必要）
