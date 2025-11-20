# Issue #153: Phase 4.1 - バッチ処理の移行

**日付**: 2025-11-20
**Issue**: #153
**フェーズ**: Phase 4.1 - バッチ処理の移行

---

## 概要

バッチ処理を適切なパターンに移行するため、既存のServer ActionsをAPI Routesに移行し、クライアント側から呼び出せるようにしました。

---

## 実装内容

### 1. 要件分析

既存のServer Actionsを分析し、以下の6つのファイルが対象であることを確認：

- `app/_actions/audioBatchProcessing.ts` - 音声ファイルのバッチ文字起こし
- `app/_actions/transcribeImageBatch.ts` - 画像のバッチOCR
- `app/_actions/pdfBatchOcr.ts` - PDFページのバッチOCR
- `app/_actions/pdfJobManager.ts` - PDF処理ジョブ管理
- `app/_actions/unifiedBatchProcessor.ts` - 統合バッチプロセッサー
- `app/_actions/multiFileBatchProcessing.ts` - 複数ファイルバッチ処理

すべてのバッチ処理が外部API（Gemini API）との連携が必要なため、**API Routesへの移行**が適切であると判断しました。

### 2. API Routes実装

以下の4つのAPI Routesを作成：

#### 2.1 画像バッチOCR (`/api/batch/image-ocr`)
- **ファイル**: `app/api/batch/image-ocr/route.ts`
- **機能**: 複数の画像を一度にOCR処理
- **テスト**: `app/api/batch/image-ocr/__tests__/route.test.ts`
- **仕様書**: `app/api/batch/image-ocr/route.spec.md`

#### 2.2 音声バッチ処理 (`/api/batch/audio`)
- **ファイル**: `app/api/batch/audio/route.ts`
- **機能**: 複数の音声ファイルを一度に文字起こし
- **特徴**: Base64エンコード/デコード処理を実装

#### 2.3 統合バッチプロセッサー (`/api/batch/unified`)
- **ファイル**: `app/api/batch/unified/route.ts`
- **機能**: すべてのバッチ処理タイプを統合

#### 2.4 PDF処理ジョブ管理 (`/api/batch/pdf-jobs`)
- **ファイル**: `app/api/batch/pdf-jobs/route.ts`
- **機能**: PDF処理ジョブの作成、キャンセル、再試行
- **注意**: `revalidatePath()`はAPI Routesでは使用できないため、クライアント側でキャッシュ無効化が必要

### 3. クライアント側フック実装

以下のカスタムフックを作成：

#### 3.1 `useImageBatchOcr()`
- **ファイル**: `hooks/batch/useImageBatchOcr.ts`
- **機能**: 画像バッチOCR処理を実行

#### 3.2 `useAudioBatchProcessing()`
- **ファイル**: `hooks/batch/useAudioBatchProcessing.ts`
- **機能**: 音声バッチ処理を実行
- **特徴**: BlobをBase64に変換してAPIに送信

#### 3.3 エクスポートファイル
- **ファイル**: `hooks/batch/index.ts`
- **機能**: すべてのバッチ処理フックをエクスポート

### 4. テスト実装

画像バッチOCRのテストケースを作成：
- **ファイル**: `app/api/batch/image-ocr/__tests__/route.test.ts`
- **テストケース数**: 8ケース
  - TC-001: 基本的なバッチOCR処理
  - TC-002: バッチサイズの指定
  - TC-003: バリデーションエラー（pages未指定）
  - TC-004: バリデーションエラー（空のpages）
  - TC-005: クォータ不足エラー
  - TC-006: 画像取得失敗
  - TC-007: API呼び出しエラー
  - TC-008: 認証エラー

---

## 実装パターン

### TDDアプローチ

テスト駆動開発（TDD）のアプローチを採用：

1. **Red（赤）**: テストケースを先に作成（`route.test.ts`）
2. **Green（緑）**: テストが通るようにAPI Routeを実装（`route.ts`）
3. **Refactor（リファクタ）**: コードを改善（今後実施予定）

### API Routesパターン

既存のServer ActionsをAPI Routesに移行する際のパターン：

1. **認証チェック**: Supabaseクライアントでユーザー認証を確認
2. **バリデーション**: リクエストボディの検証
3. **既存関数の呼び出し**: Server Actionの関数をそのまま呼び出し
4. **エラーハンドリング**: 適切なエラーレスポンスを返す

---

## 技術的な考慮事項

### Base64エンコード/デコード

音声ファイルやPDFファイルをAPI Routesに送信する際、BlobをBase64文字列に変換する必要があります：

- **クライアント側**: `blobToBase64()` 関数でBlobをBase64に変換
- **サーバー側**: `base64ToBlob()` 関数でBase64をBlobに変換

### revalidatePath()の扱い

`pdfJobManager.ts`では`revalidatePath()`を使用していますが、API Routesでは使用できません。代わりに、クライアント側でTanStack Queryのキャッシュを無効化する必要があります。

---

## 残りのタスク

1. **進捗管理の実装**: バッチ処理の進捗をリアルタイムで表示する機能
2. **テスト・動作確認**: すべてのAPI Routesのテストを実行し、動作確認
3. **PDFバッチOCRのAPI Route**: `pdfBatchOcr.ts`のAPI Route実装
4. **複数ファイルバッチ処理のAPI Route**: `multiFileBatchProcessing.ts`のAPI Route実装
5. **統合バッチプロセッサーの完全実装**: すべてのバッチ処理タイプに対応

---

## 関連ファイル

### 新規作成ファイル

- `app/api/batch/image-ocr/route.ts`
- `app/api/batch/image-ocr/__tests__/route.test.ts`
- `app/api/batch/image-ocr/route.spec.md`
- `app/api/batch/audio/route.ts`
- `app/api/batch/audio/route.spec.md`
- `app/api/batch/unified/route.ts`
- `app/api/batch/pdf-jobs/route.ts`
- `hooks/batch/useImageBatchOcr.ts`
- `hooks/batch/useAudioBatchProcessing.ts`
- `hooks/batch/index.ts`

### 更新ファイル

- `docs/03_plans/tauri-migration/20251109_01_implementation-plan.md`

---

## 参照ドキュメント

- **実装計画**: `docs/03_plans/tauri-migration/20251109_01_implementation-plan.md`
- **Issue**: #153
- **親Issue**: #120

---

**作成者**: AI Agent
**最終更新**: 2025-11-20
