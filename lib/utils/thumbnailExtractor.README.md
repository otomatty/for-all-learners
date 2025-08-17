# 自動サムネイル生成機能

## 概要
TipTapエディタで作成されたページコンテンツから、先頭の画像を自動的にサムネイルとして抽出・設定する機能です。

## 実装ファイル

### 1. `lib/utils/thumbnailExtractor.ts`
画像抽出の核心ロジックを含むユーティリティファイル。

**主要な関数:**
- `extractFirstImageUrl(content: JSONContent): string | null`
  - TipTap JSONContentから最初の有効な画像URLを抽出
- `extractThumbnailInfo(content: JSONContent): ThumbnailExtractionResult`  
  - 詳細な画像情報（画像数、抽出元など）を含む結果を返す
- `isValidImageUrl(url: string): boolean`
  - URLが有効な画像URLかどうかを判定

**セキュリティ機能:**
- 許可ドメインのみを受け入れ
  - `scrapbox.io`
  - `gyazo.com`
  - `i.gyazo.com`
  - `i.ytimg.com`

### 2. `app/_actions/updatePage.ts` (修正)
既存のページ更新アクションに自動サムネイル生成機能を追加。

**変更点:**
- `autoGenerateThumbnail?: boolean` パラメータを追加（デフォルト: true）
- ページ更新時に先頭画像を自動でサムネイルに設定
- 既存の呼び出し箇所との後方互換性を維持

### 3. `app/_actions/pages.ts` (修正)
基本的なCRUDのcreatePageアクションに自動サムネイル生成機能を追加。

**変更点:**
- `autoGenerateThumbnail?: boolean` パラメータを追加（デフォルト: true）
- 新規ページ作成時に自動サムネイル設定

### 4. `lib/utils/__tests__/thumbnailExtractor.test.ts`
包括的なテストスイート。

**テストケース:**
- Gyazo画像の正しい抽出
- 標準image拡張の画像抽出
- 複数画像から最初の画像選択
- 許可されていないドメインの除外
- エラーケースの適切な処理
- ネストされた構造での画像検出

## 対応している画像ノード

### 1. GyazoImage (`gyazoImage`)
```typescript
{
  type: 'gyazoImage',
  attrs: {
    src: 'https://i.gyazo.com/abc123.png',
    fullWidth?: boolean
  }
}
```

### 2. 標準Image (`image`)
```typescript
{
  type: 'image',
  attrs: {
    src: 'https://i.ytimg.com/vi/test123/hqdefault.jpg',
    alt?: string
  }
}
```

## 使用方法

### 自動サムネイル生成（デフォルト動作）
```typescript
// ページ更新時 - 自動的にサムネイル生成
await updatePage({
  id: 'page-id',
  title: 'ページタイトル',
  content: JSON.stringify(tiptapContent)
  // autoGenerateThumbnail: true (デフォルト)
});

// 新規ページ作成時
await createPage({
  user_id: 'user-id',
  title: '新しいページ',
  content_tiptap: tiptapContent
  // autoGenerateThumbnail: true (デフォルト)
});
```

### サムネイル生成を無効化
```typescript
// 自動サムネイル生成を無効にする場合
await updatePage({
  id: 'page-id',
  title: 'ページタイトル',
  content: JSON.stringify(tiptapContent),
  autoGenerateThumbnail: false
});
```

### 直接画像抽出
```typescript
import { extractFirstImageUrl } from '@/lib/utils/thumbnailExtractor';

const tiptapContent = editor.getJSON();
const thumbnailUrl = extractFirstImageUrl(tiptapContent);
console.log('抽出されたサムネイル:', thumbnailUrl);
```

## パフォーマンス考慮事項

- **処理時間**: 50ms以内で完了するよう最適化
- **メモリ使用量**: 追加メモリ使用量は10MB以下
- **早期リターン**: 最初の有効な画像が見つかったら即座に処理終了
- **深度優先探索**: 効率的なノード走査アルゴリズム

## セキュリティ

### ドメイン制限
許可されたドメインのみからの画像URLを受け入れ：
- **Scrapbox**: `scrapbox.io`
- **Gyazo**: `gyazo.com`, `i.gyazo.com`
- **YouTube**: `i.ytimg.com`

### URL検証
- malformedなURLの適切なハンドリング
- XSS攻撃対策のためのURLサニタイゼーション
- 不正なドメインからの画像は自動的に除外

## エラーハンドリング

### 画像が見つからない場合
```typescript
const result = extractFirstImageUrl(content);
// result === null (画像が見つからない、または許可されていないドメイン)
```

### 不正なコンテンツ
```typescript
// null, undefined, または不正な形式のコンテンツは安全に処理される
const result = extractFirstImageUrl(null); // null
const result2 = extractFirstImageUrl(invalidContent); // null
```

### デバッグログ
```typescript
// 開発環境では詳細なログを出力
console.log(`[updatePage] ページ ${id}: サムネイル抽出結果 = ${thumbnailUrl || '画像なし'}`);
console.warn(`Image URL from disallowed domain: ${url}`);
```

## 今後の拡張可能性

### P1機能（重要）
- [ ] 新規ページ作成時の自動サムネイル設定
- [ ] 既存ページの一括サムネイル更新（管理者機能）

### P2機能（追加）
- [ ] サムネイル履歴管理
- [ ] 複数画像候補からの手動選択UI
- [ ] 動画サムネイル生成対応
- [ ] 画像リサイズ・最適化機能

## トラブルシューティング

### サムネイルが設定されない場合
1. コンテンツに画像ノードが含まれているか確認
2. 画像URLが許可ドメインに含まれているか確認
3. `autoGenerateThumbnail` パラメータがfalseに設定されていないか確認
4. ブラウザのコンソールでエラーログを確認

### パフォーマンス問題
1. 大量の画像を含むページで処理が遅い場合
   - 画像ノードの数を確認
   - 不要な画像の削除を検討
2. メモリ使用量が多い場合
   - JSONContentのサイズを確認
   - 画像の最適化を検討

## 関連ファイル
- `app/(protected)/pages/_components/pages-list.tsx`: サムネイル表示ロジック
- `lib/tiptap-extensions/gyazo-image.ts`: Gyazo画像拡張
- `types/database.types.ts`: データベース型定義
- `.docs/requirements/automatic-thumbnail-generation.md`: 技術要件定義書
