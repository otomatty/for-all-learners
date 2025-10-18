# 無限 POST 問題：Next.js Dynamic/Static 切り替え循環の根本原因と対策 - 2025-10-18

## 🔍 問題の整理

### 症状

- 開発モード（`bun dev`）でページエディタ（`/pages/[id]`）を開く
- Next.js DevTools パネルで `route` が `dynamic` ↔ `static` を**高速で無限に切り替わる**

### 実装した修正

- `app/(protected)/pages/[id]/page.tsx` に `export const dynamic = "force-dynamic"` を追加
- `.next/cache` をリセット

## 🎯 期待される効果

この修正により、以下の結果が期待されます：

### ✅ route が `dynamic` に固定される

```
Before: dynamic → static → dynamic → static → ... (無限循環)
After: dynamic (固定)
```

### ✅ DevTools での不安定な表示が解消

```
Before: route status が高速で切り替わる
After: route status が安定して表示される
```

### ✅ 予測不可能なキャッシング動作が排除

```
Before: キャッシング戦略が不安定
After: キャッシング戦略が明確（always dynamic）
```

## 📊 検証チェックリスト

### STEP 1: 開発環境での動作確認

- [ ] **DevTools パネルの確認**

  ```
  ウィンドウ左下の Next.js アイコン → パネルを開く
  Route: [status] が dynamic に固定されているか確認
  ```

- [ ] **コンソールログの確認**

  ```
  DevTools → Console
  [searchPages] ログが出続けていないか
  [AutoReconciler] ログが出続けていないか
  エラーが出ていないか
  ```

- [ ] **Network タブの確認**

  ```
  DevTools → Network
  POST リクエストの頻度が高くないか（3秒以上の間隔があるか）
  同じリクエストが繰り返されていないか
  ```

- [ ] **ページ操作のテスト**
  ```
  - テキストを編集 → 3秒後に自動保存される
  - ページを切り替える → 正常に読み込まれる
  - リロードボタンを押す → キャッシュ無効化されて再読み込みされる
  ```

### STEP 2: パフォーマンス測定

- [ ] **ページ読み込み時間**

  ```
  lighthouse または DevTools → Performance タブ
  - First Contentful Paint (FCP)
  - Largest Contentful Paint (LCP)
  - Time to Interactive (TTI)
  の改善を確認
  ```

- [ ] **メモリ使用量**
  ```
  DevTools → Memory
  メモリリークがないか確認
  ```

### STEP 3: 本番環境での確認

- [ ] **ビルドとサーバー起動**

  ```bash
  npm run build
  npm run start
  ```

  - エラーが出ていないか
  - ページが正常に読み込まれるか

- [ ] **本番環境での route status**
  ```
  本番環境でも route が stable に見えるか
  ただし、本番では通常 static がある程度キャッシュされる
  ```

## 🔧 技術的背景

### Next.js の Dynamic Route 判定ロジック

Next.js 14+ では、以下の条件で route が **dynamic** と判定されます：

```typescript
// ❌ Dynamic になる（キャッシング不安定）
export default async function Page() {
  const user = await getUser(); // 動的データ取得
  return <div>{user.name}</div>;
}

// ✅ Static になる可能性（明示化）
export const revalidate = 3600; // 1時間ごとにrevalidate
export default async function Page() {
  // ...
}

// ✅ 明示的に Dynamic（推奨）
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await getUser(); // キャッシング挙動が明確
  return <div>{user.name}</div>;
}
```

### なぜ問題が発生したのか

このアプリケーションの `/pages/[id]` では：

```typescript
// 🔴 問題のあるパターン
export default async function PageDetail() {
  // これらのクエリは毎回実行される
  const user = await supabase.auth.getUser();
  const pages = await getPagesByUser(user.id);
  const sharedPages = await getSharedPagesByUser(user.id);
  // ... さらに複数のクエリ
}
```

キャッシング設定が明示されていないため、Next.js は以下のように判定：

1. **初回**: 「動的データだ」と判定 → `dynamic` に決定
2. **次のリクエスト**: 「あ、キャッシングしなくていいのか」と再判定 → `static` に候補
3. **その次**: 「でも動的データだし」... → `dynamic` に戻る
4. 無限ループ

### 修正後のパターン

```typescript
// 🟢 修正後
export const dynamic = "force-dynamic";

export default async function PageDetail() {
  // 動的データ取得
  const user = await supabase.auth.getUser();
  const pages = await getPagesByUser(user.id);
  // ...キャッシング戦略が明確になった
}
```

これにより：

- Next.js は `route: dynamic` に固定
- キャッシング動作が予測可能に
- 不安定な切り替わりが排除

## 📝 関連ドキュメント

- 前回修正（infinite POST loop）: `docs/08_worklogs/2025_10/20251018_34_final-summary.md`
- auto-reconciler バグ: `docs/issues/open/20251018_01_infinite-editor-preload-loop.md`
- 無限 POST デバッグガイド: `docs/08_worklogs/2025_10/20251018_37_infinite-post-debug-checklist.md`

## ⚠️ 注意事項

### このアプローチが適切な理由

```typescript
// ✅ 適切: ユーザー固有のページエディタは常にdynamic
export const dynamic = "force-dynamic";
export default async function PageDetail() {
  // user-specific data
}
```

### 慎重が必要な他のページ

以下のページについては、個別に検討が必要：

- `/pages` - ページリスト（一部キャッシュ可能）
- `/dashboard` - ダッシュボード（一部キャッシュ可能）
- `/decks/[deckId]` - デッキ詳細（キャッシュ可能）

これらは `revalidate` オプションで段階的にキャッシュ戦略を適用できます。

## 🚀 次のステップ

### 短期（今日中）

- [ ] 修正の検証（DevTools パネルで route が stable か確認）
- [ ] 本番環境でのテスト
- [ ] 他の `/pages` 関連コンポーネントの確認

### 中期（今週中）

- [ ] システム全体の cache strategy レビュー
- [ ] 他の protected route に対する `export const dynamic` の適用検討
- [ ] パフォーマンスプロファイリング

### 長期

- [ ] Next.js 15 への upgrade 検討（ISR の改善など）
- [ ] キャッシング戦略の文書化
- [ ] 開発ガイドラインに cache strategy を追加

## 作成日時

2025-10-18 15:00 JST
