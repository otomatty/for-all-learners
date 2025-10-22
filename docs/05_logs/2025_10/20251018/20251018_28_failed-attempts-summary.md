# 無限 POST ループ調査・修正の全記録 - 失敗した試みのまとめ - 2025-10-18

## 📋 調査期間

2025-10-18 初期調査から現在まで

## 🎯 最終結論

**すべての修正が無効だった**。[Violation] 'setTimeout' は依然として大量出力されている。

つまり、`useAutoSave.ts` の修正は**真の原因ではなかった**。

---

## 🔴 実施した修正と結果

### 修正 1: updatePage にログ追加

**ファイル**: `app/_actions/updatePage.ts`

**仮説**: updatePage が無限に呼ばれているのではないか

**実施内容**:

- start/end logging を追加
- タイムスタンプと実行時間を記録

**結果**: ❌ **ログが出ない** → updatePage は呼ばれていない

---

### 修正 2: useAutoSave に MIN_SAVE_INTERVAL を追加

**ファイル**: `app/(protected)/pages/[id]/_hooks/useAutoSave.ts`

**仮説**: useAutoSave が短い間隔で何度も save を試みているのではないか

**実施内容**:

- MIN_SAVE_INTERVAL = 3000ms (3 秒) を設定
- save 試行前に最後の save から 3 秒経過しているか確認

**結果**: ❌ **[Violation] は相変わらず大量出力** → 効果なし

---

### 修正 3: auto-reconciler.ts の rebuild() を削除

**ファイル**: `lib/unilink/auto-reconciler.ts`

**仮説**: markIndex.rebuild() が何度も呼ばれることで、大量の処理が発生しているのではないか

**実施内容**:

- markIndex.rebuild() の呼び出しを削除
- markIndex.updateToExists() で個別更新に変更
- processingKeys Set を追加して重複処理を防止

**結果**: ❌ **[Violation] は相変わらず大量出力** → 効果なし

---

### 修正 4: searchPages.ts にキャッシュ機能を追加

**ファイル**: `lib/utils/searchPages.ts`

**仮説**: searchPages() が大量の API 呼び出しをしているのではないか

**実施内容**:

- 10 秒 TTL のキャッシュ機能を実装
- API 呼び出しカウンター (`apiCallCount`, `cacheHitCount`) を追加
- キャッシュ検証ロジックを実装

**結果**: ❌ **[Violation] は相変わらず大量出力** → 効果なし

---

### 修正 5: ログレベルを debug から info に変更

**ファイル**: 複数ファイル (4 箇所)

- `lib/unilink/auto-reconciler.ts`
- `lib/utils/searchPages.ts`
- `app/(protected)/pages/[id]/_hooks/useAutoSave.ts`
- `lib/unilink/reconcile-queue.ts`

**仮説**: ブラウザコンソールに debug ログが出ていないから、真の問題が見えていないのではないか

**実施内容**:

- logger.debug() → logger.info() に変更

**結果**: ❌ **[Violation] は相変わらず大量出力** → 効果なし

（ログは見えるようになったが、[Violation] の原因は特定できず）

---

### 修正 6: useAutoSave - attemptSave を useCallback から useRef に変更

**ファイル**: `app/(protected)/pages/[id]/_hooks/useAutoSave.ts`

**仮説**: attemptSave が useCallback で毎回新しく作成されることで、無限ループが起きているのではないか

**実装内容**:

```typescript
// 修正前
const attemptSave = useCallback(async () => { ... }, []);
useEffect(() => { ... }, [editor, attemptSave]); // ← attemptSave が依存配列に

// 修正後
const attemptSaveRef = useRef(async () => { ... });
useEffect(() => { ... }, [editor]); // ← attemptSave を依存配列から削除
```

**結果**: ❌ **[Violation] は相変わらず大量出力** → 効果なし

---

### 修正 7: useAutoSave - useEffect に [] 依存配列を追加

**ファイル**: `app/(protected)/pages/[id]/_hooks/useAutoSave.ts`

**仮説**: attemptSaveRef を更新する useEffect に依存配列がないので、毎回実行されているのではないか

**実装内容**:

```typescript
useEffect(() => {
    attemptSaveRef.current = async () => { ... };
}, []); // ← 空の依存配列を追加
```

**結果**: ❌ **[Violation] は相変わらず大量出力** → 効果なし

---

### 修正 8: useAutoSave - editor を editorRef に変更して依存配列から削除

**ファイル**: `app/(protected)/pages/[id]/_hooks/useAutoSave.ts`

**仮説**: HMR (Hot Module Replacement) 中に editor 依存関係が変わったと認識されて、useEffect が再実行されているのではないか

**実装内容**:

```typescript
const editorRef = useRef<Editor | null>(null);

useEffect(() => {
  editorRef.current = editor;
}, [editor]);

useEffect(() => {
  const currentEditor = editorRef.current;
  // ... editor を ref で使用
}, []); // ← editor を依存配列から削除
```

**結果**: ❌ **[Violation] は相変わらず大量出力** → 効果なし

---

### 修正 9: resolver-queue のログレベルを up

**ファイル**: `lib/tiptap-extensions/unified-link-mark/resolver-queue.ts`

**仮説**: resolver-queue が大量に enqueue していないか確認したい

**実装内容**:

- logger.debug() → logger.info() に変更

**結果**: ❌ **ログ出力なし** → resolver-queue は使われていない

---

## 🔬 発見された情報

### ✅ 判明したこと

1. **updatePage は呼ばれていない**

   - ログが出ない
   - つまり自動保存は成功している

2. **ReconcileQueue は動作していない**

   - keyCount: 0
   - 処理するべきキーがない

3. **resolver-queue は使われていない**

   - ログが出ない

4. **[Violation] はページ初期化時と HMR 時に集中**

   ```
   turbopack-hot-reloader-common.ts:41 [Fast Refresh] rebuilding
   report-hmr-latency.ts:26 [Fast Refresh] done in 173ms
   [Violation] 'setTimeout' handler <N> ミリ秒かかりました ← ここから
   [Violation] 'setTimeout' handler <N> ミリ秒かかりました
   ```

5. **MutationObserver のエラーが先に出ている**
   ```
   TypeError: Failed to execute 'observe' on 'MutationObserver':
   parameter 1 is not of type 'Node'.
   ```

### ❓ 未解明な点

1. **MutationObserver のエラーの出所**

   - スタックトレース: `index.ts-4c633d70.js:1:3292`
   - これはビルド後のコードなので特定困難

2. **[Violation] の真の原因**

   - useAutoSave 修正では効果なし
   - HMR との関連性が不明
   - 他の場所からの setTimeout 呼び出し？

3. **page-link-preview-mark-plugin の 200ms と 500ms setTimeout**
   - マウスオーバー/アウト時に登録
   - 1000 個のリンクがある場合、大量に登録される可能性
   - しかし直接的な無限ループのメカニズムは不明

---

## 📊 修正の効果測定

| 修正番号 | 修正内容               | [Violation] 出力 | POST リクエスト | 結論 |
| -------- | ---------------------- | ---------------- | --------------- | ---- |
| 修正 1   | updatePage ログ追加    | 変わらず         | 変わらず        | 無効 |
| 修正 2   | MIN_SAVE_INTERVAL      | 変わらず         | 変わらず        | 無効 |
| 修正 3   | rebuild() 削除         | 変わらず         | 変わらず        | 無効 |
| 修正 4   | searchPages キャッシュ | 変わらず         | 変わらず        | 無効 |
| 修正 5   | ログレベル up          | 可視化のみ       | 変わらず        | 無効 |
| 修正 6   | attemptSave useRef 化  | 変わらず         | 変わらず        | 無効 |
| 修正 7   | useEffect [] 追加      | 変わらず         | 変わらず        | 無効 |
| 修正 8   | editor ref 化          | 変わらず         | 変わらず        | 無効 |
| 修正 9   | resolver-queue log     | 出力なし         | -               | 無効 |

---

## 💡 得られた学習

### 1. ログドリブン調査の限界

**ログが出ないことから判断できる情報**:

- updatePage は呼ばれていない
- ReconcileQueue に処理キューがない

**しかしログでは判断できない情報**:

- setTimeout の呼び出し元（スタックトレースが圧縮されている）
- MutationObserver エラーの出所
- 実際のイベント発火頻度（ログなしで起きている可能性）

### 2. 推測と仮説検証の危険性

今回の修正は、**ログに基づく推測**から始まった：

- 「updatePage が呼ばれているに違いない」
- 「useAutoSave の依存配列が問題に違いない」
- 「HMR が原因に違いない」

しかし**すべて外れた**。

### 3. 根本原因の可能性

[Violation] 'setTimeout' が依然として出ているということは：

**可能性 A**: TipTap や prosemirror 内部の仕組み

- MutationObserver → 内部で setTimeout を使用？
- TipTap エディタの再構築が毎回 setTimeout を登録？

**可能性 B**: page-link-preview-mark-plugin

- 1000 個のリンク × 2 つの setTimeout（500ms, 200ms）
- マウスイベントが高頻度で発火？

**可能性 C**: 別のライブラリやコンポーネント

- site-logo の画像読み込み（ログに出ている）
- tippy.js による tooltip 管理？
- Realtime subscription による再レンダリング？

---

## 🎓 次に試すべきアプローチ

### 1. **スタックトレース解析**

- ブラウザの Sources タブで breakpoint を設定
- `[Violation]` が出た時点でデバッガを停止
- call stack を確認して真の原因を特定

### 2. **Timeline/Performance profiling**

- Devtools の Performance タブで記録
- setTimeout の呼び出しパターンを可視化
- 時系列でどのイベントが setTimeout を登録しているか把握

### 3. **console.trace() で追跡**

```typescript
// 疑わしい場所に挿入
console.trace("[DEBUG] setTimeout called");
```

### 4. **実装的なフィルタリング**

- page-link-preview-mark-plugin を一時的に無効化
- TipTap の特定の拡張を無効化
- 原因を絞り込む

### 5. **環境分離**

- 新しいページ（ページリンクなし）でテスト
- [Violation] が出るか確認
- リンク数が増えると [Violation] が増えるか確認

---

## 📝 失敗から得た教訓

### ✅ Do

1. **複数の検証手段を並行**

   - ログだけに頼らない
   - Performance profiler を使う
   - Breakpoint を使う

2. **仮説を小分けにする**

   - 「無限ループ」ではなく「setTimeout が NNN 回呼ばれている」
   - 「updatePage が悪い」ではなく「updatePage が N 回呼ばれている」

3. **ネガティブテストを重視**
   - 「修正 X でこれが改善されるはず」
   - 実際に改善されなかったら、仮説が間違っている

### ❌ Don't

1. **推測で修正しない**

   - 「絶対これが原因だ」という確信なしに修正する
   - 修正前に仮説を明確に書く

2. **修正の効果を測定しない**

   - 修正後に本当に改善されたか確認しない
   - 「修正したから効いているはず」という思い込み

3. **複数の修正を同時に行う**
   - どの修正が効果があったか不明確
   - 修正同士が干渉する可能性

---

## 📌 現在のコード状態

### 修正が入ったファイル

| ファイル           | 修正内容                                         | 削除すべき？       |
| ------------------ | ------------------------------------------------ | ------------------ |
| useAutoSave.ts     | editorRef, MIN_SAVE_INTERVAL, attemptSave ref 化 | 要検討             |
| auto-reconciler.ts | rebuild() 削除, processingKeys 追加              | 要検討             |
| searchPages.ts     | キャッシュ機能追加                               | 不要（完全に無効） |
| resolver-queue.ts  | logger.debug → logger.info                       | 可                 |
| その他 3 ファイル  | logger.debug → logger.info                       | 可（ノイズ削減）   |

### 評価

- **有益な修正**: logger レベルの変更（ノイズ削減）
- **害がない修正**: MIN_SAVE_INTERVAL, processingKeys
- **完全に無効な修正**: searchPages キャッシュ, editor ref 化
- **検証が必要**: auto-reconciler の rebuild() 削除

---

## 🎯 次のステップ（推奨）

### 短期（今日）

1. **Performance Profiler で原因特定**

   - Chrome DevTools → Performance タブ
   - Page 読み込みから HMR までを記録
   - setTimeout 呼び出し元を特定

2. **Breakpoint で stack trace 確認**
   - Sources タブで breakpoint
   - [Violation] 発生時に停止
   - Call stack を全部スクリーンショット

### 中期（明日以降）

3. **問題の再現最小化**

   - リンク数を削減してテスト
   - TipTap 拡張を一つずつ無効化
   - 「何が [Violation] を引き起こすか」を特定

4. **根本原因の修正**
   - 実際の原因がわかってから修正
   - 1 回の修正 → 1 回の検証

---

## 📚 参考ドキュメント

- `20251018_17_true-root-cause-discovery.md` - 初期仮説（外れた）
- `20251018_20_true-cause-auto-reconciler.md` - 仮説の修正版（外れた）
- `20251018_24_useautosave-infinite-loop-fix.md` - 修正 1（効果なし）
- `20251018_25_useautosave-critical-fix.md` - 修正 2（効果なし）
- `20251018_27_hmr-violations-fix.md` - 修正 3（効果なし）

---

## 🏁 結論

**ここまでの修正は全て外れ**だった。

真の原因は**Performance Profiler や Breakpoint による直接的な調査が必要**。

ログからの推測では解決できない、より深い層の問題と考えられる。

次の調査は、**デバッグツールを駆使した根本原因の特定**から始めるべき。
