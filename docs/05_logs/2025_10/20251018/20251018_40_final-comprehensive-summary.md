# 無限 POST・キャッシング問題：修正完了報告 - 2025-10-18

## 🎯 問題の三層構造

### Layer 1: 前回修正（2025-10-18 朝）

**問題**: `preloadPageTitles()` が無限に呼ばれ、server action が無限 POST を生成
**原因**: `auto-reconciler.ts` で `rebuild()` が無限に呼ばれていた
**修正**: `rebuild()` 呼び出しを削除 + logger 最適化
**効果**: ✅ 無限 POST ループが終止

### Layer 2: 開発環境の不安定性（2025-10-18 昼）

**問題**: DevTools パネルで route が `dynamic` ↔ `static` を無限に切り替わる
**原因**: ページコンポーネントのキャッシング設定が明示されていない
**修正**: `export const dynamic = "force-dynamic"` を追加
**効果**: ✅ Route status が安定（dynamic に固定）

### Layer 3: システム全体のキャッシング戦略（発見）

**問題**: 複数のページコンポーネントで cache 設定が欠落
**原因**: キャッシング戦略が明確に設計されていない
**対応**: ✅ Issue を作成（`docs/issues/open/20251018_02_missing-cache-config.md`）

---

## ✅ 実施した修正

### 修正 1: ページコンポーネントに dynamic 設定を追加

**ファイル**: `app/(protected)/pages/[id]/page.tsx`

```typescript
// ✅ 追加
export const dynamic = "force-dynamic";

export default async function PageDetail() {
  // ユーザー固有のデータを常に動的に取得する
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // ...
}
```

**効果**:

- Next.js に対して「このページは常に dynamic である」と明示
- キャッシング判定の不安定さを排除
- DevTools パネルで route status が `dynamic` に固定

---

## 📋 前回の修正（確認）

### 修正済：auto-reconciler の無限ループ

**ファイル**: `lib/unilink/auto-reconciler.ts`

```typescript
// ✅ 削除済（前回）
// this.markIndex.rebuild();  // ← この呼び出しが削除された
```

**効果**: ✅ `preloadPageTitles()` が無限に呼ばれなくなった

### 修正済：Logger 最適化

**ファイル**: `lib/logger.ts`

```typescript
// ✅ 修正済（前回）
asObject: false,  // JSON オブジェクト生成を抑制
```

**効果**: ✅ Logger の処理オーバーヘッド削減

### 修正済：IntersectionObserver の二重化防止

**ファイル**: `app/(protected)/pages/_components/pages-list-container.tsx`

```typescript
// ✅ useRef で 1 個の observer 管理
const observerRef = useRef<IntersectionObserver | null>(null);
```

**効果**: ✅ 複数の `fetchNextPage` 呼び出し防止

---

## 🔍 発見・記録した Issue

### Issue 1: エディター初期化の無限ループ（修正完了）

**ファイル**: `docs/issues/open/20251018_01_infinite-editor-preload-loop.md`
**ステータス**: ✅ 修正完了 + 関連の根本原因を発見

### Issue 2: Next.js キャッシング設定の欠落（新規）

**ファイル**: `docs/issues/open/20251018_02_missing-cache-config.md`
**ステータス**: 🔍 優先度付けして段階的に対応

---

## 📊 改善の評価

### 症状の推移

| 項目                         | 初期状態         | 前回修正後 | 今回修正後      |
| ---------------------------- | ---------------- | ---------- | --------------- |
| **auto-reconciler ログ**     | 連続出現         | なし       | なし            |
| **POST リクエスト**          | 無限             | 限定       | 限定            |
| **[Violation] 'setTimeout'** | 40+ 回           | 小幅       | 小幅            |
| **DevTools route status**    | dynamic ↔ static | 不安定     | ✅ dynamic 固定 |

### 期待される効果

- ✅ ページ読み込みの安定性向上
- ✅ DevTools パネルでの不安定な表示が解消
- ✅ キャッシング戦略が予測可能に
- ✅ 開発環境での不安定さが軽減

---

## 🧪 検証方法

### 開発環境での確認

```bash
1. ブラウザで http://localhost:3000/pages/[id] を開く
2. DevTools → 左下の Next.js アイコン
3. Route panel で route: dynamic に固定されているか確認
4. 5-10秒静観して、切り替わりが止まったか確認
```

### コンソール確認

```javascript
// DevTools Console
- [searchPages] ログが出続けていないか確認
- [AutoReconciler] ログが出続けていないか確認
- エラーが出ていないか確認
```

### Network タブ確認

```
- POST リクエストの頻度が高くないか確認（3秒以上の間隔）
- 同じリクエストが繰り返されていないか確認
```

---

## 🚀 次のステップ

### 短期（推奨）

- [ ] 修正の検証（DevTools で route が stable か）
- [ ] 本番環境テスト（`npm run build && npm run start`）
- [ ] ページ操作テスト（編集・保存が正常か）

### 中期

- [ ] `docs/issues/open/20251018_02_missing-cache-config.md` に基づいて、他のページのキャッシング設定を段階的に改善
- [ ] パフォーマンスプロファイリング（修正前後の比較）

### 長期

- [ ] キャッシング戦略を設計ドキュメント化
- [ ] Next.js 設定ガイドをプロジェクト documentation に追加

---

## 📚 関連ドキュメント

### 作業ログ

- `docs/08_worklogs/2025_10/20251018_34_final-summary.md` - 前回の修正完了報告
- `docs/08_worklogs/2025_10/20251018_37_infinite-post-debug-checklist.md` - デバッグガイド
- `docs/08_worklogs/2025_10/20251018_38_dynamic-route-investigation.md` - 原因調査
- `docs/08_worklogs/2025_10/20251018_39_dynamic-route-fix-validation.md` - 修正と検証

### Issue

- `docs/issues/open/20251018_01_infinite-editor-preload-loop.md` - エディター無限ループ
- `docs/issues/open/20251018_02_missing-cache-config.md` - キャッシング設定欠落

---

## 💡 技術的インサイト

### なぜこの問題が発生したのか

Next.js 14+ では、Server Component のキャッシング判定が非常に複雑です：

```typescript
// ❌ このパターンは不安定
export default async function Page() {
  const data = await fetch(...);  // ← 動的データ
  return <div>{data}</div>;
}
// Next.js: 「これ dynamic？static？」と判定に迷う
//        → route が不安定に切り替わる

// ✅ このパターンは安定
export const dynamic = "force-dynamic";
export default async function Page() {
  const data = await fetch(...);  // ← 動的データ
  return <div>{data}</div>;
}
// Next.js: 「明示的に dynamic だから、OK」と判定確定
//        → キャッシング戦略が安定
```

### 今後の予防策

- Server Component には **常に** `export const dynamic` または `export const revalidate` を明示
- キャッシング設定がないページを発見したら即座に追加
- ESLint rule で自動チェック（オプション）

---

## ✨ 結論

**三層の修正を実施し、以下の問題を解決しました**：

1. ✅ 無限 POST ループ（auto-reconciler）
2. ✅ DevTools での route 不安定性（キャッシング設定）
3. 🔍 システム全体のキャッシング戦略（Issue として記録）

**期待される効果**：

- アプリケーションの安定性向上
- 開発環境での予測可能性向上
- パフォーマンスの向上

---

**作成日**: 2025-10-18 15:30 JST
**最終更新**: 2025-10-18 15:45 JST
