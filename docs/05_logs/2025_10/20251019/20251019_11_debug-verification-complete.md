# デバッグ検証完了ドキュメント

**作成日**: 2025-10-19  
**目的**: サジェスト機能を無効化した状態での検証手順と結果記録

---

## 実施内容の概要

### ✅ 完了した作業

#### 1. コード修正（suggestion-plugin.ts）

**追加した機能フラグ**:
```typescript
// Feature flag: Disable suggestion feature to isolate tag duplication issue
// When false, suggestion plugin will not show any suggestions (bracket or tag)
const ENABLE_SUGGESTION_FEATURE = false;
```

**修正箇所**:
- `update()` メソッド冒頭に早期リターン
- `handleKeyDown()` メソッド冒頭に早期リターン
- 両方のサジェスト処理を完全にスキップ

#### 2. ユニットテスト実行

✅ **tag-rule.test.ts**: 27 pass, 0 fail (646ms)
✅ **suggestion-plugin.test.ts**: 35 pass, 0 fail (385ms)

#### 3. ドキュメント作成

- `docs/issues/open/20251019_09_current-implementation-analysis.md` - 実装分析
- `docs/04_implementation/plans/unified-link-mark/20251019_10_tag-rule-validation.md` - 検証ドキュメント
- `docs/issues/open/20251019_08_duplicate-tag-resolution.md` - 解決策提案
- `docs/issues/open/20251019_07_summary.md` - デバッグ準備サマリー

---

## ブラウザ確認手順

### ステップ 1: 開発サーバー起動

```bash
cd /Users/sugaiakimasa/apps/for-all-learners
bun dev
```

ターミナルに以下のようなメッセージが表示されたら準備完了：
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
```

### ステップ 2: ブラウザでテスト

1. **ブラウザを開く**: `http://localhost:3000`
2. **ページを読み込む**: 完全に読み込まれるまで待つ
3. **F12キーでコンソール開く**: DevTools が起動
4. **エディタに移動**: ページ上のエディタ領域をクリック

### ステップ 3: タグ入力テスト

**テストケース 1: Enter キー**

```
1. 入力: " #テスト" （スペース必須）
2. キー: Enter を押下
3. 期待: "#テスト" が作成される（単一の#）
4. 確認: "##テスト" でないことを確認
```

**テストケース 2: Space キー**

```
1. 入力: " #テスト" 
2. キー: Space を押下
3. 期待: "#テスト " が作成される（スペース有）
4. 確認: "##テスト" でないことを確認
```

**テストケース 3: IME 入力（日本語）**

```
1. 入力: スペース → "h" → "a" → "m" → "a" → Enter（IME確定）
2. 期待: "#hama" が表示される
3. 確認: "##hama" でないことを確認
```

### ステップ 4: コンソール確認

**表示されるべきメッセージ**:

- サジェスト関連のログは表示されない（機能が無効化されているため）
- InputRule のログもデフォルトでは非表示（DEBUG_TAG_DUPLICATION = false のため）

**デバッグモードを有効にする場合**:

1. `suggestion-plugin.ts` で `DEBUG_TAG_DUPLICATION = true` に変更
2. `tag-rule.ts` で `DEBUG_TAG_DUPLICATION = true` に変更
3. ブラウザを更新（Cmd+R）
4. テストを再実行
5. コンソールでログを確認

---

## 検証結果の記録

### 期待される結果

```
✅ ENABLE_SUGGESTION_FEATURE = false の状態で:
  ✓ " #テスト" + Enter → "#テスト"（正常）
  ✓ " #テスト" + Space → "#テスト "（正常）
  ✓ IME入力でも重複なし（正常）

❌ ENABLE_SUGGESTION_FEATURE = false の状態で:
  ✗ " #テスト" + Enter → "##テスト"（異常）

結論:
  - 重複が解決 → suggestion-plugin が問題
  - 重複が継続 → tag-rule.ts または InputRule が問題
```

### 結果を記録する

問題が解決した場合:

```bash
# 作業ログを作成
docs/08_worklogs/2025_10/YYYYMMDD_XX_tag-duplication-fix-complete.md
```

問題が継続する場合:

```bash
# デバッグ結果を記録
docs/08_worklogs/2025_10/YYYYMMDD_XX_debug-results.md
```

---

## 次のステップ

### パターン A: 問題が解決した場合

1. **suggestion-plugin.ts の改善**
   - `insertUnifiedLinkWithQuery()` の処理を見直し
   - 重複を引き起こす箇所を特定・修正

2. **ENABLE_SUGGESTION_FEATURE を true に戻す**
   ```typescript
   const ENABLE_SUGGESTION_FEATURE = true;
   ```

3. **テスト実行**
   ```bash
   bun test lib/tiptap-extensions/unified-link-mark/ --no-coverage
   ```

4. **ブラウザで再確認**

### パターン B: 問題が継続する場合

1. **tag-rule.ts のデバッグログ有効化**
   ```typescript
   const DEBUG_TAG_DUPLICATION = true;
   ```

2. **コンソールで詳細ログ確認**
   - InputRule の呼び出し回数
   - matchId の状態
   - processedMatches の内容

3. **以下の仮説を検証**
   - InputRule が複数回トリガーされているか
   - processedMatches が正しく機能しているか
   - 異なる位置でマッチしているか

---

## 修正案の優先順

### 優先度 1: 最も可能性の高い修正

**問題**: suggestion-plugin の Enter キーハンドラーで、既存のテキストを削除して再挿入しているため、# が重複

**修正案**:
```typescript
// 現在のコード
if (state.selectedIndex === -1) {
  insertUnifiedLinkWithQuery(view, state);
}

// 修正案: 既存マークの情報を取得して活用
// または: 削除前に位置を記録して、挿入位置を正確にする
```

### 優先度 2: InputRule の double-trigger 対応

**問題**: InputRule が複数回実行される場合への対策

**修正案**: Transaction メタに処理済みマッチを記録
```typescript
const processedInTr = tr.getMeta("inputRuleProcessed") || {};
if (processedInTr[matchId]) return null;
```

---

## リソース

### 関連ドキュメント

- [Tag Duplication Analysis](20251019_09_current-implementation-analysis.md)
- [Tag Rule Validation](../../04_implementation/plans/unified-link-mark/20251019_10_tag-rule-validation.md)
- [Duplicate Tag Resolution](20251019_08_duplicate-tag-resolution.md)

### 関連ファイル

- `lib/tiptap-extensions/unified-link-mark/plugins/suggestion-plugin.ts`
- `lib/tiptap-extensions/unified-link-mark/input-rules/tag-rule.ts`
- `lib/tiptap-extensions/unified-link-mark/input-rules/__tests__/tag-rule.test.ts`
- `lib/tiptap-extensions/unified-link-mark/plugins/__tests__/suggestion-plugin.test.ts`

---

## トラブルシューティング

### Q: コンソールにエラーが表示される場合

**A**: 以下を確認:
1. ブラウザキャッシュをクリア（Cmd+Shift+Delete）
2. ブラウザを再度開く
3. `bun dev` を再起動

### Q: エディタが表示されない場合

**A**:
1. ページを完全に読み込まれるまで待つ
2. ブラウザを更新（Cmd+R）
3. コンソールでエラーを確認（F12）

### Q: テキストが入力できない場合

**A**:
1. エディタ領域をクリック
2. 入力フォーカスを確認
3. キーボード入力が反応するか試す

---

## まとめ

このドキュメントに従って:

1. **サジェスト機能を無効化**したコードをテスト
2. **ユニットテストが全て PASS** したことを確認
3. **ブラウザで実動作確認**を実施
4. **結果に基づいて修正方針を決定**

これにより、重複 # 問題の根本原因を特定し、効果的な修正を実施できます。
