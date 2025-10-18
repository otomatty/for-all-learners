# 無限 POST ループ原因調査ガイド

**作成日**: 2025-10-18  
**問題**: `/pages/[id]`ページにおける無限 POST ループ  
**原因コミット**: `79cc5f3` (feat: Add legacy link migrator and content sanitization utilities)  
**調査対象**: ページエディター関連の新規・修正ホック、ユーティリティ

---

## 🔴 問題の症状

- ページエディターを開くと POST リクエストが無限に送信される
- サーバー側で`/api/updatePage`が繰り返し呼び出される
- ページが開けない、または操作不可になる

---

## 📊 コミット 79cc5f3 の変更概要

このコミットでは以下の大幅な変更が実施されました：

### 新規作成ファイル

1. **`app/(protected)/pages/[id]/_hooks/usePageSaver.ts`** (194 行)

   - ページ保存ロジックの集約
   - H1 削除処理
   - 保存状態管理

2. **`app/(protected)/pages/[id]/_hooks/useLinkSync.ts`** (207 行)

   - ページリンク同期の集約
   - デバウンス機能
   - 重複リクエスト防止

3. **`app/(protected)/pages/[id]/_hooks/useEditorInitializer.ts`** (137 行)

   - エディター初期化ロジック

4. **ユーティリティ関数群**
   - `lib/utils/editor/content-sanitizer.ts` - コンテンツクリーンアップ
   - `lib/utils/editor/legacy-link-migrator.ts` - レガシーリンク移行
   - `lib/utils/editor/latex-transformer.ts` - LaTeX 変換
   - `lib/utils/editor/heading-remover.ts` - H1 削除

### 修正されたファイル

1. **`app/(protected)/pages/[id]/_hooks/usePageEditorLogic.ts`** (348 行 削減)
   - 約 720 行から削減 → ホックへの分割
2. **`lib/unilink/` 配下** (全体的なリファクタリング)

   - `auto-reconciler.ts`
   - `reconcile-queue.ts`
   - `mark-index.ts`
   - その他

3. **`lib/tiptap-extensions/unified-link-mark/` 配下** (大幅な修正)
   - `plugins/bracket-cursor-plugin.ts` (新規)
   - `resolver-queue.ts`
   - その他プラグイン

---

## 🔍 無限 POST ループの候補箇所

### **優先度 ⭐⭐⭐ (最高) - まずここから調査**

#### 1. `useLinkSync`ホック内の自動同期ロジック

**ファイル**: `app/(protected)/pages/[id]/_hooks/useLinkSync.ts`

**疑いのポイント**:

```typescript
// 以下の部分が無限ループの候補
-エディター更新時の自動同期(debounce有効) -
  同期完了後の状態更新 -
  useEffect依存配列;
```

**調査項目**:

- [ ] `useEffect`の依存配列が不完全でないか
- [ ] デバウンスタイマーがクリアされているか
- [ ] 同期完了後に再度同期がトリガーされていないか
- [ ] `editor`が変更されるたびにリセットされていないか

**チェックコマンド**:

```bash
git show 79cc5f3:app/(protected)/pages/[id]/_hooks/useLinkSync.ts | grep -A 20 "useEffect"
```

---

#### 2. `usePageSaver`ホック内の保存ロジック

**ファイル**: `app/(protected)/pages/[id]/_hooks/usePageSaver.ts`

**疑いのポイント**:

```typescript
// savePage関数が無限に呼ばれる可能性
-savePage呼び出しのきっかけ -
  saveSuccess / saveError後の動作 -
  editor内容が変更されたら再度保存;
```

**調査項目**:

- [ ] `savePage`が複数の場所から呼ばれていないか
- [ ] `onSaveSuccess`コールバックが`savePage`を再度呼ばないか
- [ ] `editor.getJSON()`が毎回異なる値を返していないか
- [ ] `setIsDirty`の状態管理が正しいか

**チェックコマンド**:

```bash
git show 79cc5f3:app/(protected)/pages/[id]/_hooks/usePageSaver.ts | grep -A 5 "savePage\|onSaveSuccess"
```

---

#### 3. `usePageEditorLogic`の統合ロジック

**ファイル**: `app/(protected)/pages/[id]/_hooks/usePageEditorLogic.ts`

**変更内容**: 約 720 行から大幅削減（ホック分割のため）

**疑いのポイント**:

```typescript
// 新しく作られた3つのホックの連携
- useEditorInitializer との連携
- useLinkSync との連携
- usePageSaver との連携
```

**調査項目**:

- [ ] 3 つのホックが互いにトリガーし合わないか
- [ ] 初期化時の処理順序は正しいか
- [ ] エディター内容の変更検知が重複していないか

**チェックコマンド**:

```bash
git show 79cc5f3:app/(protected)/pages/[id]/_hooks/usePageEditorLogic.ts | head -100
```

---

### **優先度 ⭐⭐ (高)**

#### 4. `auto-reconciler.ts`のリファクタリング

**ファイル**: `lib/unilink/auto-reconciler.ts`

**変更**: クラスベース設計から関数ベース（Factory Pattern）への変更

**疑いのポイント**:

```typescript
// 自動調整処理が無限ループする可能性
-reconcile処理が完了しない - 調整後に再度調整がトリガーされる;
```

**調査項目**:

- [ ] Factory 関数の初期化が正しいか
- [ ] クロージャー内の状態が正しく管理されているか
- [ ] `reconcilePageLinks`の終了条件は明確か

**チェックコマンド**:

```bash
git show 79cc5f3:lib/unilink/auto-reconciler.ts | head -150
```

---

#### 5. `reconcile-queue.ts`のキュー管理

**ファイル**: `lib/unilink/reconcile-queue.ts`

**疑いのポイント**:

```typescript
// キューが永遠に処理される可能性
-キュー内のアイテムが削除されない -
  dequeueが完了しない -
  同じアイテムが再度enqueueされる;
```

**調査項目**:

- [ ] キューのアイテム削除処理は正しいか
- [ ] 処理完了フラグがセットされているか
- [ ] エラーハンドリング後のクリアは正しいか

**チェックコマンド**:

```bash
git show 79cc5f3:lib/unilink/reconcile-queue.ts | grep -A 10 "dequeue\|remove"
```

---

#### 6. `bracket-cursor-plugin.ts`（新規）

**ファイル**: `lib/tiptap-extensions/unified-link-mark/plugins/bracket-cursor-plugin.ts`

**新規機能**: カーソル移動監視

**疑いのポイント**:

```typescript
// カーソル移動イベント処理の無限ループ
-appendTransaction内でまたエディター更新 -
  エディター更新がカーソル移動をトリガー -
  無限な変更検知ループ;
```

**調査項目**:

- [ ] `appendTransaction`でエディター変更が行われていないか
- [ ] mark の適用後に再度処理されないか

**チェックコマンド**:

```bash
git show 79cc5f3:lib/tiptap-extensions/unified-link-mark/plugins/bracket-cursor-plugin.ts
```

---

### **優先度 ⭐ (中)**

#### 7. `updatePageLinks`アクション

**ファイル**: `app/_actions/updatePageLinks.ts`

**調査項目**:

- [ ] レスポンス時に再度 POST をトリガーしていないか
- [ ] エラーリトライが無限に続いていないか

---

#### 8. `usePageEditorLogic`の`useEffect`依存配列

**ファイル**: `app/(protected)/pages/[id]/_hooks/usePageEditorLogic.ts`

**調査項目**:

- [ ] エディター内容が依存配列に含まれていないか
- [ ] `syncLinks`や`savePage`が無限に再実行されないか

---

## 🛠️ 調査手順

### ステップ 1: ブラウザの開発者ツールで確認

```javascript
// コンソールで以下を実行
// Network タブを見て、どの POST リクエストが繰り返されているか確認
// - /api/updatePage → ページ更新
// - /app/_actions/updatePageLinks → リンク同期
```

### ステップ 2: サーバーサイドログを確認

```bash
# bun dev の出力を確認
# POST /pages/[id] のリクエストシーケンスを追跡
# 同じ内容が繰り返されているかチェック
```

### ステップ 3: React DevTools で確認

```javascript
// React DevTools の Profiler タブで
// usePageSaver, useLinkSync, usePageEditorLogic の再レンダリング回数を確認
// 依存配列の変更を追跡
```

### ステップ 4: コミット前後の差分を比較

```bash
# 前のコミット (2163059) との差分を確認
git diff 2163059 79cc5f3 app/(protected)/pages/[id]/_hooks/

# 特定の行数差分を見る
git show 79cc5f3:app/(protected)/pages/[id]/_hooks/usePageEditorLogic.ts | wc -l
git show 2163059:app/(protected)/pages/[id]/_hooks/usePageEditorLogic.ts | wc -l
```

---

## 📝 調査ログテンプレート

調査結果を以下のテンプレートで記録してください：

```markdown
## 調査レポート: [調査項目]

**日時**: YYYY-MM-DD HH:MM
**ファイル**: [ファイルパス]
**行番号**: [該当行]

### 問題点

[発見した問題を記述]

### 原因

[根本原因を分析]

### 解決策

[修正方法を提案]

### 修正前

\`\`\`typescript
[修正前のコード]
\`\`\`

### 修正後

\`\`\`typescript
[修正後のコード]
\`\`\`
```

---

## 🔗 参考資料

### 関連ドキュメント

- [コミット 79cc5f3 の詳細](../20251012_16_bug-fixes-plan.md)
- [ページエディター リファクタリング計画](../20251014_01_refactoring-plan.md)

### チェックコマンド集

```bash
# このコミットの全変更を確認
git show 79cc5f3 --stat

# 特定ファイルの変更内容を確認
git show 79cc5f3:app/(protected)/pages/[id]/_hooks/useLinkSync.ts

# 前のコミットとの差分を確認
git diff 2163059 79cc5f3 -- app/(protected)/pages/[id]/_hooks/

# 行数の増減を確認
git show 79cc5f3 --shortstat
```

---

## ✅ チェックリスト

調査時に以下の項目を確認してください：

- [ ] ブラウザ開発者ツール で POST リクエストの繰り返しを確認
- [ ] どの POST エンドポイントが無限呼び出しされているかを特定
- [ ] `useLinkSync` の `useEffect` 依存配列を確認
- [ ] `usePageSaver` の `savePage` 呼び出し箇所を全検索
- [ ] `bracket-cursor-plugin.ts` の `appendTransaction` を確認
- [ ] `auto-reconciler.ts` の 終了条件を確認
- [ ] `reconcile-queue.ts` の キュー削除処理を確認
- [ ] React DevTools でコンポーネント再レンダリング回数を確認
- [ ] `usePageEditorLogic` の 3 つのホック連携を確認

---

**ステータス**: 🔍 調査開始  
**最終更新**: 2025-10-18  
**次のステップ**: 上記の優先度に従って調査を進めてください
