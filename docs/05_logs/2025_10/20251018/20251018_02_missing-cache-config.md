# Next.js Dynamic Route キャッシング設定の欠落

## 概要

複数のページコンポーネントで、明示的なキャッシング設定（`export const dynamic` または `export const revalidate`）が欠落しており、Next.js の自動判定に任されている状態です。

## 発見場所

`app/(protected)/` 配下の以下のページ：

```
/settings/page.tsx
/learn/page.tsx
/goals/page.tsx
/search/page.tsx
/decks/[deckId]/ocr/page.tsx
/decks/[deckId]/pdf/page.tsx
/decks/[deckId]/audio/page.tsx
/decks/[deckId]/page.tsx
/decks/page.tsx
/dashboard/page.tsx
/notes/explorer/page.tsx
/notes/page.tsx
/notes/[slug]/[id]/page.tsx
/notes/[slug]/page.tsx
/profile/page.tsx
/pages/[id]/generate-cards/page.tsx
/pages/page.tsx
```

## 問題の詳細

### 何が起きているか

**キャッシング設定がないページ**では、Next.js が以下のロジックで動作します：

```
1. ページリクエスト受信
   ↓
2. Server Component が実行（全クエリ実行）
   ↓
3. キャッシング可能か判定：
   - 動的 API 使用（cookies, headers等）→ dynamic
   - 明示設定なし → 不確定状態
   ↓
4. 自動判定が不安定 → dynamic/static を切り替え
   ↓
5. キャッシング戦略がコロコロ変わる
```

### 影響範囲

- **ページ読み込み**: 不安定になる可能性
- **DevTools パネル**: route status が変わる
- **パフォーマンス**: キャッシング効果が不安定
- **デバッグ難度**: 原因が特定しにくい

## 推奨される解決策

### 優先度：高

**常に dynamic であるべきページ** （ユーザー固有データ）：

```
❌ /dashboard/page.tsx - ユーザーのダッシュボード
❌ /profile/page.tsx - ユーザープロフィール
❌ /pages/[id]/page.tsx - ページエディタ（既に修正済）
```

👉 `export const dynamic = "force-dynamic"` を追加

### 優先度：中

**部分的にキャッシュ可能なページ** （参照データが混在）：

```
⚠️ /decks/[deckId]/page.tsx - デッキ詳細
⚠️ /notes/[slug]/[id]/page.tsx - ノート詳細
⚠️ /pages/page.tsx - ページリスト
```

👉 `export const revalidate = 3600` など、適切な revalidate 時間を設定

### 優先度：低

**ほぼ静的なページ** （参照データのみ）：

```
ℹ️ /search/page.tsx - サーチ結果（検索条件に依存）
ℹ️ /goals/page.tsx - ゴール管理
```

👉 `export const revalidate = 300` など短い revalidate 時間で OK

## テスト項目

- [ ] 修正前後でページ読み込み速度を比較
- [ ] DevTools パネルで route status が安定しているか確認
- [ ] Network タブでリクエスト数が増えていないか確認
- [ ] コンソールにエラーが出ていないか

## 実装計画

1. **最初**：ユーザー固有ページから `dynamic = "force-dynamic"` を適用
2. **その次**：各ページの役割を分析して、適切な `revalidate` を設定
3. **最後**：キャッシング戦略をドキュメント化

## 関連ドキュメント

- 修正例：`docs/08_worklogs/2025_10/20251018_39_dynamic-route-fix-validation.md`
- 無限ループ修正：`docs/08_worklogs/2025_10/20251018_34_final-summary.md`

## 重要度

**High** - キャッシング挙動の不安定さはパフォーマンスと可観測性に大きく影響

## 作成日

2025-10-18
