# route.spec.md - Audio Batch Processing API Route Specification

**対象ファイル**: `app/api/batch/audio/route.ts`
**作成日**: 2025-11-17
**フェーズ**: Phase 4.1 - Batch Processing Migration

---

## 概要

音声ファイルのバッチ文字起こし処理をAPI Routesに移行します。既存の `processAudioFilesBatch` Server ActionをAPI Routeに変換し、クライアント側から呼び出せるようにします。

---

## 要件定義

### R-001: バッチ音声処理の実行
- 複数の音声ファイルを一度に文字起こし
- Gemini APIを使用してテキスト抽出
- 3ファイルずつバッチ処理

### R-002: ファイルアップロード
- 音声ファイルをSupabase Storageにアップロード
- Signed URLを生成してGemini APIに送信

### R-003: クォータ管理
- Gemini APIのクォータをチェック
- クォータ不足の場合は適切なエラーメッセージを返す

### R-004: カード生成
- 文字起こし結果からカードを生成
- 各音声ファイルごとにカードを生成

### R-005: エラーハンドリング
- ファイルアップロード失敗の処理
- API呼び出しエラーの処理
- 部分的な成功の処理

### R-006: 認証チェック
- ユーザー認証の確認
- 未認証の場合は401エラーを返す

---

## リクエスト/レスポンス仕様

### リクエストボディ

```typescript
interface AudioBatchRequest {
  audioFiles: Array<{
    audioId: string;
    audioName: string;
    audioBlob: Blob; // Base64エンコードされた文字列として送信
    metadata?: {
      duration?: number;
      language?: string;
      priority?: number;
    };
  }>;
}
```

**注意**: BlobはBase64エンコードされた文字列として送信する必要があります。

### レスポンスボディ（成功）

```typescript
interface AudioBatchResponse {
  success: boolean;
  message: string;
  transcriptions: Array<{
    audioId: string;
    audioName: string;
    success: boolean;
    transcript?: string;
    cards?: Array<{
      front_content: string;
      back_content: string;
      source_pdf_url: string;
    }>;
    error?: string;
    processingTimeMs?: number;
  }>;
  totalCards: number;
  totalProcessingTimeMs: number;
  apiRequestsUsed: number;
}
```

### レスポンスボディ（エラー）

```typescript
interface ErrorResponse {
  error: string;
  message?: string;
}
```

---

## テストケース

### TC-001: 基本的なバッチ音声処理
**入力**:
```json
{
  "audioFiles": [
    {
      "audioId": "audio-1",
      "audioName": "audio1.mp3",
      "audioBlob": "base64encodedstring..."
    }
  ]
}
```
**期待**:
- ステータス: 200
- レスポンス: 文字起こし結果とカードが含まれる
- totalCards > 0

### TC-002: 複数ファイルのバッチ処理
**入力**:
```json
{
  "audioFiles": [
    {
      "audioId": "audio-1",
      "audioName": "audio1.mp3",
      "audioBlob": "base64encodedstring..."
    },
    {
      "audioId": "audio-2",
      "audioName": "audio2.mp3",
      "audioBlob": "base64encodedstring..."
    },
    {
      "audioId": "audio-3",
      "audioName": "audio3.mp3",
      "audioBlob": "base64encodedstring..."
    }
  ]
}
```
**期待**:
- ステータス: 200
- 3ファイルがバッチ処理される
- apiRequestsUsed: 1（3ファイルずつバッチ）

### TC-003: バリデーションエラー（audioFiles未指定）
**入力**:
```json
{}
```
**期待**:
- ステータス: 400
- エラーメッセージ: "audioFiles are required"

### TC-004: バリデーションエラー（空のaudioFiles）
**入力**:
```json
{
  "audioFiles": []
}
```
**期待**:
- ステータス: 400
- エラーメッセージ: "audioFiles must not be empty"

### TC-005: クォータ不足エラー
**入力**:
```json
{
  "audioFiles": [
    {
      "audioId": "audio-1",
      "audioName": "audio1.mp3",
      "audioBlob": "base64encodedstring..."
    }
  ]
}
```
**期待** (クォータ不足の場合):
- ステータス: 200（成功フラグで返す）
- success: false
- エラーメッセージ: クォータ不足のメッセージ

### TC-006: ファイルアップロード失敗
**入力**:
```json
{
  "audioFiles": [
    {
      "audioId": "audio-1",
      "audioName": "audio1.mp3",
      "audioBlob": "invalidbase64..."
    }
  ]
}
```
**期待**:
- ステータス: 200（部分成功）
- transcriptions: エラー情報が含まれる

### TC-007: API呼び出しエラー
**入力**:
```json
{
  "audioFiles": [
    {
      "audioId": "audio-1",
      "audioName": "audio1.mp3",
      "audioBlob": "base64encodedstring..."
    }
  ]
}
```
**期待** (API呼び出し失敗の場合):
- ステータス: 500
- エラーメッセージ: API呼び出しエラーの詳細

### TC-008: 認証エラー
**入力**:
```json
{
  "audioFiles": [
    {
      "audioId": "audio-1",
      "audioName": "audio1.mp3",
      "audioBlob": "base64encodedstring..."
    }
  ]
}
```
**期待** (未認証の場合):
- ステータス: 401
- エラーメッセージ: "Authentication required"

---

## 実装ノート

### 1. Base64デコード

```typescript
// リクエストボディからBase64文字列を受け取り、Blobに変換
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}
```

### 2. 既存関数の呼び出し

```typescript
import { processAudioFilesBatch } from "@/app/_actions/audioBatchProcessing";

// Base64文字列をBlobに変換
const audioFilesWithBlobs = body.audioFiles.map(file => ({
  ...file,
  audioBlob: base64ToBlob(file.audioBlob, "audio/mpeg"),
}));

const result = await processAudioFilesBatch(user.id, audioFilesWithBlobs);
```

---

## 依存関係

### Parents (このファイルを使用)
- フロントエンド: カスタムフック `hooks/batch/useAudioBatchProcessing.ts` (作成予定)

### Dependencies (このファイルが使用)
- `@/app/_actions/audioBatchProcessing`: processAudioFilesBatch
- `@/lib/supabase/server`: createClient
- `@/lib/logger`: logger

---

## 関連ドキュメント

- **実装ファイル**: `app/api/batch/audio/route.ts`
- **移行元**: `app/_actions/audioBatchProcessing.ts`
- **実装計画**: `docs/03_plans/tauri-migration/20251109_01_implementation-plan.md`

---

**最終更新**: 2025-11-17
**作成者**: AI Agent
