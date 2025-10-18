# 🔴 未解決問題：無限 POST ループ - 詳細記録 - 2025-10-18

## 問題 ID

`INFINITE_POST_2025_10_18`

## 重要度

**CRITICAL**（アプリケーション完全不可）

## 状態

🔴 **OPEN** - 未解決

## 発見日

2025-10-18

## 最終更新

2025-10-18

---

## 問題の詳細説明

### 症状

ユーザーがページエディタで任意のテキストを編集した際に、以下の現象が発生：

1. **無限 POST リクエスト**

   - Network タブで POST リクエストが数秒ごとに発生
   - API エンドポイント: 未特定
   - Request body: 未確認
   - 続ける限りループは止まらない

2. **ブラウザパフォーマンス低下**

   ```
   [Violation] 'setTimeout' handler took XXXms
   [Violation] 'message' handler took XXXms
   [Violation] Forced reflow while executing JavaScript took XXXms
   ```

3. **TypeError（副次的）**

   ```
   TypeError: Failed to execute 'observe' on 'MutationObserver':
   parameter 1 is not of type 'Node'
   ```

4. **ハイドレーション警告（副次的）**
   ```
   A tree hydrated but some attributes didn't match
   ```

### 発生環境

- **OS**: macOS
- **ブラウザ**: Chrome DevTools
- **Next.js**: 15.3.1
- **環境**: 開発環境（`bun dev`）
- **ページ**: `/pages/[id]` エディタ

### 再現手順

1. 保護されたページ (`/pages/[id]`) に移動
2. ページエディタを開く
3. テキストを編集開始
4. DevTools Network タブを確認
5. **POST リクエストが無限に発生**

### 影響

- ページエディタ完全不可
- Database への過負荷
- ブラウザ CPU スパイク（50-100%）
- ユーザー体験悪化

---

## 実施した対応

### 対応 1: updatePage 無限ループ調査

**日時**: 2025-10-18 09:00
**方法**: updatePage にログを追加
**結果**: ❌ ログが出ない → updatePage は犯人ではない

### 対応 2: useAutoSave 最適化

**日時**: 2025-10-18 10:00
**方法**:

- MIN_SAVE_INTERVAL = 1000ms
- attemptSave を useCallback で安定化
- 依存配列パターン複数試行

**結果**: ❌ すべて失敗

### 対応 3-7: HMR と useEffect 最適化

**日時**: 2025-10-18 11:00-14:00
**方法**:

- editor 依存配列削除
- editorRef パターン導入
- rebuild() 削除

**結果**: ❌ すべて失敗

### 対応 8: Logger 最適化

**日時**: 2025-10-18 14:30
**方法**: Pino `asObject: false`
**結果**: ⚠️ Logger 処理軽量化だが **POST ループ継続**

### 対応 9: IntersectionObserver 安定化

**日時**: 2025-10-18 15:00
**方法**: useRef で observer 1 個管理
**結果**: ⚠️ Observer 管理改善だが **POST ループ継続**

### 対応 10: auto-reconciler 最適化

**日時**: 2025-10-18 15:30
**方法**: rebuild() 削除
**結果**: ⚠️ ログ出力停止だが **POST ループ継続**

### 対応 11: site-logo.tsx Image 修正

**日時**: 2025-10-18 16:00
**方法**: Image priority + suppressHydrationWarning
**結果**: ⚠️ Warnings 軽減だが **POST ループ継続**

---

## 現在の状態

### 修正済みファイル

```
lib/logger.ts
app/(protected)/pages/_components/pages-list-container.tsx
lib/unilink/auto-reconciler.ts
components/site-logo.tsx
```

### 検証結果

✅ Logger の処理が軽量化
✅ auto-reconciler のログが出ていない
✅ IntersectionObserver が適切に cleanup
❌ **POST ループは変わらず継続**

---

## 根本原因の仮説

### 仮説 A: 別のループ機構

**根拠**:

- auto-reconciler ログが出ていない（ループでないなら当然）
- Logger も軽量化したのに POST は続く
- IntersectionObserver も cleanup したのに POST は続く
- **→ 別の何かが POST をトリガー**

**可能性**:

- useEffect の別の無限ループ
- useState の setter 連鎖
- Realtime listener からの callback

### 仮説 B: API エンドポイント側の問題

**根拠**:

- API response が新しいデータを返す
- クライアント側が自動的に再度 POST をトリガー
- **→ API 側で response が変わり続けている**

**可能性**:

- POST handler が毎回異なるデータを返す
- Realtime が頻繁に更新を通知
- キャッシュ無効化の loop

### 仮説 C: 修正が実際に適用されていない

**根拠**:

- すべての修正が無効に見える
- ログが出ていない
- **→ 修正が反映されていない可能性**

**可能性**:

- HMR でコンパイルエラー（silent failure）
- ブラウザキャッシュで古いコードが実行
- 修正が別の条件分岐で無視されている

---

## 次のステップ

### STEP 1: ネットワークログの詳細化

```
DevTools → Network →
- POST filter
- 詳細確認:
  - Request URL
  - Request Body
  - Response Status
  - Response Body
  - Headers
```

**質問**:

- POST されている API エンドポイントは？
- Request body には何が含まれているか？
- POST 間隔のパターンは？

### STEP 2: 詳細ログの挿入

```typescript
// 以下のファイルに logger.info() を追加

// lib/utils/searchPages.ts
export async function searchPages(query: string) {
  logger.info({ query, timestamp: Date.now() }, "[searchPages] Called");
  // ...
}

// lib/services/*.ts
logger.info({ url, method, body }, "[fetch] Initiated");

// app/api/*/route.ts
export async function POST(request: Request) {
  logger.info({ path, timestamp: Date.now() }, "[API] POST called");
  // ...
}
```

### STEP 3: Performance profiling

```
DevTools → Performance → Record 10sec → Analyze
- どの関数が CPU を占有？
- 呼び出し順序は？
- 呼び出し頻度は？
```

### STEP 4: 修正の検証

```typescript
// Console で確認
console.log("[Logger] isBrowser:", typeof window !== "undefined");
console.log("[Logger] asObject:" /* logger settings */);
console.log("[AutoReconciler] initialized");
```

---

## 解決に必要な情報

### 必須情報

1. **POST リクエストの詳細**

   - どの API エンドポイント？
   - Request body は何？
   - Response は何？

2. **ページ編集時の操作**

   - 何を編集している？
   - 毎回同じパターン？
   - 特定の文字列だけ？

3. **修正が適用されているか**
   - `lib/logger.ts` の asObject は false？
   - `auto-reconciler.ts` に rebuild() はない？
   - ブラウザコンソールにエラーある？

### オプション情報

- DevTools Network の全ログ
- DevTools Performance の記録
- Console のエラー/警告
- ページ編集画面のスクリーンショット

---

## 調査記録

### 2025-10-18 09:00 - 17:00

**実施**: 9 個の修正を試行
**結果**: すべて無効（POST ループ継続）
**次のアクション**: 詳細な原因調査

---

## 参考ドキュメント

- `20251018_28_failed-attempts-summary.md`
- `20251018_29_logger-root-cause.md`
- `20251018_30_intersectionobserver-cleanup-fix.md`
- `20251018_32_autoreconciler-infinite-loop-fix.md`
- `20251018_36_infinite-post-unresolved-comprehensive-report.md`

---

**作成日**: 2025-10-18
**最終更新**: 2025-10-18
**状態**: 🔴 OPEN（未解決）
