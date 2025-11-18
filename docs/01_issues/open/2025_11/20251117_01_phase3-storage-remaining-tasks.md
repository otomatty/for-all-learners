# Phase 3: ストレージ移行の残タスク

**GitHub Issue**: [#168](https://github.com/otomatty/for-all-learners/issues/168)

## 概要

Phase 3（ファイルアップロード・ストレージの移行）の主要な実装は完了しましたが、以下の機能は今後対応が必要です。

## 関連ドキュメント

- 実装計画: `docs/03_plans/tauri-migration/20251109_01_implementation-plan.md`
- Phase 3セクションを参照

## 残タスク

### 1. `useGetSignedUrl()` フックの作成（オプション）

**優先度**: 低

**説明**: 
現在、各フック（`useUploadImage`, `useUploadPdf`, `useUploadAudio`）内でSigned URL取得を実装していますが、汎用的な`useGetSignedUrl()`フックを作成することで、コードの再利用性を向上させることができます。

**実装内容**:
- `lib/hooks/storage/useGetSignedUrl.ts` を作成
- バケット名、ファイルパス、有効期限をパラメータとして受け取る
- Signed URLを返す

**参照**:
- `lib/hooks/storage/useUploadPdf.ts` - Signed URL取得の実装例
- `lib/hooks/storage/useUploadAudio.ts` - Signed URL取得の実装例

### 2. 進捗表示の実装

**優先度**: 中

**説明**:
ファイルアップロード時に進捗を表示する機能を実装します。特に大きなファイル（PDF、音声ファイル）のアップロード時に、ユーザーに進捗状況を視覚的に表示することで、UXを向上させます。

**実装内容**:
- TanStack Queryの`onProgress`コールバックを使用
- 進捗バーコンポーネントの作成または既存コンポーネントの活用
- 各ストレージフックに進捗コールバックを追加

**参照**:
- `lib/hooks/storage/useUploadPdf.ts` - PDFアップロード（50MB制限）
- `lib/hooks/storage/useUploadAudio.ts` - 音声ファイルアップロード（100MB制限）

**実装例**:
```typescript
// 進捗コールバックを追加
export function useUploadPdf() {
  return useMutation({
    mutationFn: async ({ file, userId, onProgress }: UploadPdfOptions) => {
      // ... アップロード処理
      // onProgress?.(progress) を呼び出す
    },
  });
}
```

## 完了条件

- [ ] `useGetSignedUrl()` フックの作成とテスト
- [ ] 進捗表示機能の実装
- [ ] 各ストレージフックへの進捗コールバック追加
- [ ] UIコンポーネントでの進捗表示実装

## 関連ファイル

- `lib/hooks/storage/useUploadImage.ts`
- `lib/hooks/storage/useUploadPdf.ts`
- `lib/hooks/storage/useUploadAudio.ts`
- `lib/hooks/storage/useAudioRecordings.ts`
- `components/tiptap-editor.tsx`
- `app/(protected)/decks/[deckId]/audio/_components/AudioCardGenerator.tsx`

## 備考

これらの機能は、Phase 3の主要な機能（ファイルアップロード）が動作するためには必須ではありませんが、UX向上のために実装を推奨します。

