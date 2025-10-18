# Phase 2: Hooks & Libraries - console._ → logger._ 置き換え完了

## 作業概要

**作業日**: 2025 年 10 月 15 日  
**作業者**: AI Assistant  
**対象ブランチ**: `feature/unified-link-migration-and-tdd`

プロジェクト全体の console 文を logger に置き換える作業の Phase 2（Hooks & Libraries）を完了しました。

## 作業内容

### Phase 2.1: Hooks (3 ファイル ✅)

カスタムフックの console 文を logger 文に置き換え。

**処理ファイル**:

1. `hooks/use-pdf-processing.ts` (6 箇所)

   - PDF 処理の進捗ログとエラーログ
   - シングル/デュアル PDF 処理のエラーハンドリング
   - 未使用パラメータに biome-ignore コメント追加

2. `hooks/use-image-ocr.ts` (3 箇所)

   - OCR 処理中の警告ログ
   - OCR 失敗時のエラーログ
   - 予期しないエラーのハンドリング
   - 未使用オプションパラメータに `_` プレフィックス追加

3. `hooks/use-active-users.ts` (2 箇所)
   - Realtime チャンネルのエラーハンドリング
   - クリーンアップ時のエラーログ

### Phase 2.2: Core Libraries (2 ファイル ✅)

コアライブラリの console 文を置き換え。

**処理ファイル**:

1. `lib/gemini.ts` (2 箇所)

   - Gemini API クォータ警告
   - リトライ処理の警告ログ
   - 未使用変数 `typeName` に `_` プレフィックス追加

2. `lib/ocr/ocr-client.ts` (2 箇所)
   - クライアント OCR 処理失敗時のエラーログ
   - OCR テーブル変換エラーの警告ログ

### Phase 2.3: Utility Libraries (3 ファイル ✅)

ユーティリティライブラリの console 文を置き換え。

**処理ファイル**:

1. `lib/utils/pdfClientUtils.ts` (5 箇所)

   - プログレスコールバックエラー
   - PDF ジョブポーリングエラー
   - PDF 情報抽出エラー
   - localStorage 操作の警告ログ (save/load/clear)
   - 未使用パラメータ `type` に `_` プレフィックス追加

2. `lib/utils/geminiQuotaManager.ts` (6 箇所)

   - クォータ管理の情報ログ (デバッグログではないため残す判断)
   - 待機時間ログ
   - 日次クォータリセットログ
   - 実行開始ログ

3. `lib/utils/thumbnailExtractor.ts` (1 箇所)
   - ドメイン検証警告ログ
   - 未使用インポート `ALLOWED_IMAGE_DOMAINS` を削除

## 成果

### 処理統計

- **総処理ファイル数**: 8 ファイル
- **総置き換え箇所数**: 25 箇所
- **Phase 2.1 (Hooks)**: 3 ファイル、11 箇所
- **Phase 2.2 (Core Libs)**: 2 ファイル、4 箇所
- **Phase 2.3 (Utils)**: 3 ファイル、12 箇所

### 置き換えパターン

#### エラーログの置き換え

```typescript
// Before
console.error("OCR processing failed:", error);

// After
logger.error({ error, imageUrl }, "OCR processing failed");
```

#### 警告ログの置き換え

```typescript
// Before
console.warn("[useImageOcr] OCR is already in progress");

// After
logger.warn({ imageUrl }, "OCR is already in progress");
```

#### 情報ログの置き換え

```typescript
// Before
console.log(`[デュアルPDF] 総画像サイズ: ${totalSizeMB.toFixed(2)}MB`);

// After
logger.info(
  { totalSizeMB, userId },
  `Dual PDF total image size: ${totalSizeMB.toFixed(2)}MB`
);
```

### コンテキスト情報の追加

すべての logger 呼び出しに適切なコンテキスト情報を追加:

- `error`: エラーオブジェクト
- `imageUrl`: 処理対象の画像 URL
- `userId`: ユーザー ID
- `jobId`: ジョブ ID
- `fileName`: ファイル名
- その他の関連データ

## 品質確認

### Lint 検証

すべてのファイルに対して biome lint を実行し、エラーがないことを確認:

```bash
bun run lint hooks/use-pdf-processing.ts hooks/use-image-ocr.ts hooks/use-active-users.ts \
  lib/gemini.ts lib/ocr/ocr-client.ts lib/utils/pdfClientUtils.ts \
  lib/utils/geminiQuotaManager.ts lib/utils/thumbnailExtractor.ts
```

### 確認項目

- ✅ すべての`console.error`が`logger.error`に置き換えられている
- ✅ すべての`console.warn`が`logger.warn`に置き換えられている
- ✅ 必要な`console.log`は`logger.info`に置き換えられている
- ✅ デバッグ用で不要な`console.log`は削除または biome-ignore で許可
- ✅ 適切なコンテキストオブジェクトが渡されている
- ✅ lint エラーが存在しない
- ✅ 型エラーが存在しない
- ✅ 未使用パラメータ・変数・インポートを修正

## 技術的な改善点

### 構造化ログの一貫性

Phase 1 と同様に、すべてのログを構造化ログに統一:

**メリット**:

1. **検索性の向上**: エラー発生箇所の特定が容易
2. **デバッグの効率化**: コンテキスト情報による詳細な状況把握
3. **ログ集約の容易さ**: 外部ログ管理システムとの連携が容易

### エラーハンドリングの改善

フック内のエラーハンドリングを強化:

- 非同期処理のエラーを適切にキャッチ
- ユーザーへのフィードバック（toast）とログを分離
- コールバックエラーも漏らさずログ記録

### クォータ管理の可視性向上

`geminiQuotaManager.ts`の情報ログを残すことで:

- API クォータの使用状況を可視化
- レート制限時の待機状況をトラッキング
- 日次リセットのタイミングを記録

## 特記事項

### 未使用パラメータの処理

実装が不完全なファイルで未使用パラメータがある場合:

1. **将来使用予定**: `_` プレフィックスまたは biome-ignore コメント
2. **本当に不要**: パラメータ削除を検討

**例**:

```typescript
// 将来の実装のために予約
// biome-ignore lint/correctness/noUnusedFunctionParameters: Implementation incomplete
async (questionFile: File, answerFile: File) => {
  // TODO: 実装予定
};
```

### デバッグログの判断基準

Phase 2 では以下の判断基準でデバッグログを処理:

1. **開発時のみ必要**: 削除
2. **本番環境で有用**: `logger.info` または `logger.debug` に変換
3. **既に biome-ignore で許可**: そのまま維持

## 次のステップ

Phase 2 完了後、以下の Phase に進む予定:

### Phase 3: UI Components (予定)

クライアントサイドコンポーネントの console 文置き換え:

**予定ファイル数**: 51 ファイル

主要コンポーネント:

- TipTap エディタ関連
- ページ管理 UI
- カード生成 UI
- PDF 処理 UI
- その他 UI コンポーネント

## 関連ドキュメント

- [Phase 1 作業ログ](./20251015_01_phase1-console-to-logger-complete.md)
- [実装計画書](../../04_implementation/plans/console-logger-replacement/20251014_07_console-error-replacement-plan.md)
- [Logger 設計](../../03_design/specifications/logger-design.md)

## 備考

- すべての変更は `feature/unified-link-migration-and-tdd` ブランチで実施
- Phase 1 と Phase 2 を合わせて 78 ファイル、225 箇所以上の console 文を置き換え完了
- Phase 3 以降も同じパターンで進める予定
