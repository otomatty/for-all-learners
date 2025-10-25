# 🚨 無限 POST ループ問題：総合調査報告書 - 2025-10-18

## 📋 概要

**問題**: ページエディタで無限に POST リクエストが発生し、アプリケーションが応答不可能な状態になる

**状態**: **未解決**（複数の修正を試みたが、問題は継続）

**調査期間**: 2025-10-18（本日、複数回の iteration）

---

## 🔍 問題の症状

### ユーザーが報告した現象

1. **無限 POST リクエスト**

   ```
   POST /api/pages → 数秒に複数回
   POST /api/notes → 数秒に複数回
   ```

2. **ブラウザコンソール警告**

   ```
   [Violation] 'setTimeout' handler took XXXms
   [Violation] 'message' handler took XXXms
   [Violation] Forced reflow while executing JavaScript took XXXms
   ```

3. **TypeError**

   ```
   Failed to execute 'observe' on 'MutationObserver': parameter 1 is not of type 'Node'
   ```

4. **ハイドレーション警告**
   ```
   A tree hydrated but some attributes of the server rendered HTML didn't match the client properties
   ```

### 影響範囲

- ページエディタが完全に応答不可能
- 無限 POST により DataBase に過負荷
- ブラウザが頻繁に CPU スパイク

---

## 📊 実施した修正（9 個）

### 修正 1: updatePage の無限ループ調査（失敗）

**日時**: 2025-10-18 早朝
**仮説**: updatePage が無限に自分自身を呼び出している

**実装**: updatePage にログを追加
**結果**: ❌ ログが出ない → updatePage は犯人ではない

---

### 修正 2: useAutoSave の依存配列修正（失敗）

**日時**: 2025-10-18 午前
**仮説**: useAutoSave の useEffect が無限ループしている

**実装**:

- MIN_SAVE_INTERVAL を 1000ms に設定
- attemptSave を useCallback で安定化
- 複数の依存配列パターンを試行

**結果**: ❌ すべてのバリエーション失敗 → useAutoSave は犯人ではない

---

### 修正 3-7: HMR と useEffect 最適化（失敗）

**日時**: 2025-10-18 午前〜午後
**仮説**: HMR リロード中に useEffect が何度も実行される

**実装**:

- editor を依存配列から削除
- editorRef パターンを導入
- useRef で editor を管理
- rebuild() の呼び出しを削除

**結果**: ❌ すべて失敗 → HMR は犯人ではない

---

### 修正 8: Logger 最適化（部分成功？）

**日時**: 2025-10-18 午後
**仮説**: Pino logger が JSON シリアライゼーションで主スレッドを占有

**実装**: `browser: { asObject: false }` に変更

**結果**: ⚠️ Logger の処理は削減されたが、**無限 POST ループは継続**

---

### 修正 9: IntersectionObserver cleanup（部分成功？）

**日時**: 2025-10-18 午後
**仮説**: IntersectionObserver が複数化して複数の fetchNextPage() を呼び出し

**実装**:

- `useRef` で observer を 1 個管理
- 明示的な cleanup を実装
- processingKeys チェック強化

**結果**: ⚠️ Observer の管理は改善されたが、**無限 POST ループは継続**

---

### 修正 10: auto-reconciler の rebuild() 削除（部分成功？）

**日時**: 2025-10-18 午後
**仮説**: reconcileStaleKeys() が毎回 rebuild() を呼び出し、同じキーが無限に enqueue される

**実装**:

- `reconcileStaleKeys()` から `rebuild()` を削除
- `processingKeys` チェック追加

**結果**: ⚠️ auto-reconciler のログは出ていないが、**無限 POST ループは継続**

---

### 修正 11: site-logo.tsx の Image 修正

**日時**: 2025-10-18 午後
**仮説**: Image コンポーネントのレンダリング不一致がハイドレーションエラーを引き起こす

**実装**:

- `className="w-[72px] h-[64px]"` を追加
- `priority` 属性を追加
- `suppressHydrationWarning` を追加

**結果**: ⚠️ Image 警告は軽減したが、**無限 POST ループは継続**

---

## 🔎 調査結果の時系列

### 段階 1：仮説のカスケード（失敗）

```
仮説 A: updatePage → ❌
  ↓
仮説 B: useAutoSave → ❌
  ↓
仮説 C: HMR useEffect → ❌（7 回試行）
```

### 段階 2：Logger の最適化

**発見**: Pino の `asObject: true` が JSON 処理で重い
**修正**: `asObject: false` に変更
**効果**: [Violation] 削減、ただし **POST ループは継続**

### 段階 3：IntersectionObserver の安定化

**発見**: IntersectionObserver が複数化する可能性
**修正**: useRef で 1 個管理
**効果**: Observer の管理改善、ただし **POST ループは継続**

### 段階 4：auto-reconciler の最適化

**発見**: reconcileStaleKeys() が rebuild() を何度も呼び、同じキーが無限に enqueue
**修正**: rebuild() を削除
**効果**: auto-reconciler ログが出なくなったが、**POST ループは継続**

---

## ❓ 残存する謎

### なぜ POST が無限に続くのか？

修正後のログ分析から：

```
auto-reconciler.ts: ← ログなし（rebuild() 削除後）
reconcile-queue.ts: ← ログなし
searchPages.ts: ← ログなし（呼ばれていない？）
```

**謎 ①**: POST が無限に続いているのに、ログが出ていない

- Logger が実装されていないエリアからの POST？
- Console ログが非表示？

**謎 ②**: どこから POST が発生しているのか不明

- Network タブで POST を見ると API パスは何か？
- Request body は何か？

**謎 ③**: なぜすべての修正が無効なのか

- 実は複数の loop が同時に存在？
- 修正が実際に適用されていない？

---

## 🛠️ 提案する調査方法

### 1. 詳細なネットワークログ

**実施内容**:

```javascript
// DevTools Network タブで以下を記録
- Request URL
- Request Method
- Request Body
- Response Status
- Timing
```

**質問**:

- POST リクエストの API エンドポイントは何ですか？
- Request body には何が含まれていますか？
- POST 間隔のパターンは？（例: 1 秒、2 秒、ランダム）

### 2. ブラウザプロファイリング

**実施方法**:

```
DevTools → Performance → Record → 10秒間操作 → Stop
↓
Flame chart で CPU 消費の詳細を確認
```

**確認項目**:

- どの関数が CPU を占有しているか
- 呼び出し順序は
- 呼び出し頻度は

### 3. ログ挿入ポイント

現在のログでは捕捉されていない可能性があるため、以下に logger を追加：

```typescript
// app/api/pages/route.ts
export async function POST(request: Request) {
  logger.info({ timestamp: Date.now() }, "[API] POST /api/pages called");
  // ...
}

// app/api/notes/route.ts
export async function POST(request: Request) {
  logger.info({ timestamp: Date.now() }, "[API] POST /api/notes called");
  // ...
}

// lib/utils/searchPages.ts
export async function searchPages(query: string) {
  logger.info({ query, timestamp: Date.now() }, "[searchPages] Called");
  // ...
}

// lib/services/* の fetch 呼び出し
logger.info({ url, method }, "[fetch] Request initiated");
```

### 4. 修正の検証

修正が実際に適用されているか確認：

```typescript
// lib/logger.ts
console.log("[Logger] Browser mode:", isBrowser);
console.log("[Logger] asObject setting:", logger.settings);

// lib/unilink/auto-reconciler.ts
console.log("[AutoReconciler] rebuild() removed");
console.log("[AutoReconciler] reconcileStaleKeys called", Date.now());

// app/(protected)/pages/_components/pages-list-container.tsx
console.log("[PagesListContainer] observerRef created");
```

---

## 📝 修正ファイル一覧

### 実施済み修正

| #   | ファイル                                                     | 修正内容                                         | 効果                       |
| --- | ------------------------------------------------------------ | ------------------------------------------------ | -------------------------- |
| 1   | `lib/logger.ts`                                              | asObject: false                                  | Logger 処理軽量化          |
| 2   | `app/(protected)/pages/_components/pages-list-container.tsx` | useRef observer                                  | Observer 管理改善          |
| 3   | `lib/unilink/auto-reconciler.ts`                             | rebuild() 削除                                   | auto-reconciler ループ防止 |
| 4   | `components/site-logo.tsx`                                   | Image 修正 + priority + suppressHydrationWarning | Warnings 軽減              |

### 潜在的な関連ファイル

```
app/api/pages/route.ts          ← POST エンドポイント
app/api/notes/route.ts          ← POST エンドポイント
lib/utils/searchPages.ts         ← 検索 API
lib/services/*                   ← その他 API 呼び出し
app/(protected)/pages/[id]/*    ← ページエディタ UI
```

---

## 🎯 次のステップ

### 優先順位 1: ネットワークの詳細化

1. DevTools Network タブを開く
2. POST リクエストをフィルタリング
3. 以下を記録：
   - URL
   - Body
   - Timing
   - Response

### 優先順位 2: API エンドポイントの調査

```typescript
// POST されている API エンドポイントはどこか？
// - /api/pages?
// - /api/notes?
// - 別の /api/...?
```

### 優先順位 3: 詳細ログの挿入

API エンドポイントと searchPages に logger.info() を追加

### 優先順位 4: Performance profiling

DevTools Performance タブで 10 秒の記録を取得、分析

---

## 💾 参考ドキュメント

已存の調査ドキュメント：

- `20251018_28_failed-attempts-summary.md` - 最初の 8 つの修正の詳細
- `20251018_29_logger-root-cause.md` - Logger 問題の詳細
- `20251018_30_intersectionobserver-cleanup-fix.md` - Observer 問題の詳細
- `20251018_31_observer-ref-fix.md` - Observer useRef 修正の詳細
- `20251018_32_autoreconciler-infinite-loop-fix.md` - auto-reconciler ループの詳細
- `20251018_34_final-summary.md` - 最終的な修正まとめ

---

## 📌 重要な洞察

### 何が成功したか

✅ Logger の処理軽量化 - [Violation] 削減
✅ IntersectionObserver の安定化 - 複数化防止
✅ auto-reconciler の最適化 - ログ出力停止

### 何が失敗したか

❌ **POST ループは継続**
❌ **根本原因はまだ特定されていない**
❌ **複数の修正が有効ではない可能性**

### 仮説

1. **POST を発生させている主体がまだ存在**

   - auto-reconciler ではない（ログがない）
   - IntersectionObserver でもない（cleanup 完了）
   - Logger でもない（asObject: false で軽量化）

2. **別のループ機構がある可能性**

   - useEffect の無限ループ（未検出）
   - useState の setter が無限トリガー（未検出）
   - Realtime listener からの callback（未調査）

3. **API エンドポイント側の問題**
   - POST handler が response でデータ変更を返す
   - 変更がクライアント側で再度 POST をトリガー

---

## ✍️ まとめ

**現状**:

- 複数の最適化を実施したが、無限 POST ループは**継続**
- 根本原因は**未特定**
- さらなる詳細な調査が必要

**推奨アクション**:

1. ネットワークログの詳細化
2. POST されている API エンドポイントの特定
3. Performance profiling による詳細分析
4. API response の確認

修正完了日時：なし（**未解決**）
