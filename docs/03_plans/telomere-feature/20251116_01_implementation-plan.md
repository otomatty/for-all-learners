# TipTapテロメア機能実装計画

**作成日**: 2025-11-16  
**ステータス**: 実装完了  
**関連Issue**: https://github.com/otomatty/for-all-learners/issues/139

## 概要

TipTapエディターにCosense（Scrapbox）のようなテロメア機能を実装しました。行ごとの編集日時を記録し、視覚的に表示する機能です。

## 実装内容

### 1. データベーススキーマの拡張

#### 1.1 ページ訪問履歴テーブルの作成 ✅

- `user_page_visits` テーブルを作成
- `user_id`, `page_id`, `last_visited_at` を記録
- UNIQUE制約: `(user_id, page_id)`

**マイグレーション**: `telomere_feature_user_page_visits`

### 2. テロメア計算ロジック ✅

- `lib/utils/telomere-calculator.ts` を実装
- 対数計算による太さの計算関数
- 未読行判定ロジック
- 時間間隔: 0時間, 1時間, 2時間, 6時間, 8時間, 12時間, 24時間, 72時間, 7日, 30日, 60日, 90日, 180日, 約1年

### 3. TipTap拡張機能の実装 ✅

- `lib/tiptap-extensions/telomere-extension.ts` を実装
- ブロック要素（paragraph, heading, listItem, blockquote, codeBlock）に `updatedAt` 属性を追加
- 編集時に自動的に `updatedAt` を更新するプラグイン
- DOM操作でテロメアの視覚化を適用

### 4. ページ訪問履歴の記録 ✅

- `app/_actions/page-visits.ts` を実装
- `recordPageVisit(userId, pageId)` 関数
- `getLastPageVisit(pageId)` 関数
- ページ表示時に訪問履歴を記録

### 5. エディターへの統合 ✅

- `components/pages/_hooks/usePageEditorLogic.ts` を修正
- テロメア拡張機能をエディターに追加
- 前回訪問時刻を取得して拡張機能に渡す

### 6. ページ表示時の処理 ✅

- `app/(protected)/notes/[slug]/[id]/page.tsx` を修正
- ページ表示時に `recordPageVisit` を呼び出し
- 前回訪問時刻を取得して `EditPageForm` に渡す

## 実装の詳細

### テロメア計算アルゴリズム

```typescript
// 時間間隔の定義（ミリ秒）
const TIME_INTERVALS_MS = [
  0,                    // 0時間
  1 * 60 * 60 * 1000,   // 1時間
  2 * 60 * 60 * 1000,   // 2時間
  // ... 14個の間隔
];

// 太さの計算（最大太さから開始）
function calculateTelomereWidth(updatedAt: Date, now: Date): number {
  const elapsed = now.getTime() - updatedAt.getTime();
  let width = MAX_TELOMERE_WIDTH; // 14px
  
  for (const interval of TIME_INTERVALS_MS) {
    if (elapsed >= interval) {
      width--;
    } else {
      break;
    }
  }
  
  return Math.max(MIN_TELOMERE_WIDTH, width); // 最小1px
}
```

### 未読行の判定

```typescript
function isUnreadLine(updatedAt: Date, lastVisitedAt: Date | null): boolean {
  if (!lastVisitedAt) return false;
  return updatedAt > lastVisitedAt;
}
```

## 実装ファイル

### 新規作成
- `lib/utils/telomere-calculator.ts` - テロメア計算ロジック
- `lib/tiptap-extensions/telomere-extension.ts` - TipTap拡張機能
- `app/_actions/page-visits.ts` - ページ訪問履歴記録
- `lib/tiptap-extensions/telomere-extension.spec.md` - 仕様書

### 修正
- `components/pages/_hooks/usePageEditorLogic.ts` - テロメア拡張機能の統合
- `components/pages/EditPageForm.tsx` - 前回訪問時刻の受け渡し
- `app/(protected)/notes/[slug]/[id]/page.tsx` - ページ訪問履歴の記録

### データベース
- `user_page_visits` テーブル（マイグレーション）

## 注意事項

- 既存のTipTapコンテンツとの互換性を保つ（`updatedAt` がない場合はページの `updated_at` を使用しない）
- パフォーマンスを考慮（大量の行がある場合のレンダリング最適化）
- 編集時の `updatedAt` 更新は `appendTransaction` で処理

## 今後の改善点

- [ ] パフォーマンス最適化（大量の行がある場合）
- [ ] テロメアスタイルのカスタマイズオプション
- [ ] テロメア機能の有効/無効切り替えUI
- [ ] テロメアスタイルのアニメーション

## 関連ドキュメント

- Issue: https://github.com/otomatty/for-all-learners/issues/139
- Spec: `lib/tiptap-extensions/telomere-extension.spec.md`

