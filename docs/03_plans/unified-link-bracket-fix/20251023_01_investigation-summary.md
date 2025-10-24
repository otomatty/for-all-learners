# UnifiedLink ブラケット重複バグ - 調査サマリー

**調査日**: 2025-10-23
**報告者**: AI (GitHub Copilot)
**状態**: 調査完了 → 修正実装待ち

---

## 🔴 問題の説明

### 現象

ブラケットの外にカーソルがある状態で **Enterキー** または **Spaceキー** を入力すると、ブラケットの先頭が重複して増殖する。

**例**:
```
入力: [テスト]
カーソル: [テスト]|  (ブラケット外)

↓ Enterキー入力

結果: [[[[[[テスト]  (ブラケットが6つに増えている)
↓ さらにEnter
結果: [[[[[[[[テスト]  (ブラケットがさらに増える)
```

### 重要度

🔴 **High** - ユーザーが入力できなくなる致命的なバグ

---

## 📊 調査結果

### 実装の現状

```
auto-bracket-plugin ([ → [] を自動作成)
    ↓
bracket-rule InputRule (PATTERNS.bracket マッチング)
    ↓
insertContent チェーン ([ テキスト ] を3分割挿入)
    ↓
bracket-cursor-plugin (カーソル移動を検出)
    ↓
suggestion-plugin (キープレスハンドリング)
```

### 根本原因の仮説

1. **InputRule が重複実行される**
   - Enterキー入力後、テキストが変更される
   - ProseMirror が複数回 InputRule をトリガーする
   - 毎回 `deleteRange` → `insertContent` が実行される

2. **insertContent の3分割挿入が問題**
   - `[` を挿入 → テキストを挿入 → `]` を挿入
   - 何度も実行されると括弧が増殖
   - **現在、重複実行を防ぐ仕組みがない**

3. **PATTERNS.bracket が常にマッチ**
   - パターン: `/\[([^[\]]+)\]/`
   - 改行後も既存の `[テスト]` にマッチし続ける

### 証拠

**ファイル**: `lib/tiptap-extensions/unified-link-mark/input-rules/bracket-rule.ts`

```typescript
// 重複チェック機構が存在しない
const raw = match[1];
const text = raw;
const key = normalizeTitleToKey(raw);

// 毎回、以下を実行:
chain()
  .focus()
  .deleteRange({ from, to })        // 範囲削除
  .insertContent({ type: "text", text: "[" })      // "[" を挿入
  .insertContent({ type: "text", text: text, ... }) // テキストを挿入
  .insertContent({ type: "text", text: "]" })      // "]" を挿入
  .run();

// → 何度も実行されると [ [ [ [ [ [ テスト ] ] ] ] ] ] になる
```

---

## 🛠️ 推奨される解決策

### 案1: 重複実行チェック（シンプル・推奨）

```typescript
let lastMatch: { raw: string; timestamp: number } | null = null;
const DEBOUNCE_MS = 100;

handler: ({ state, match, range, chain }) => {
  const raw = match[1];
  const now = Date.now();
  
  // 同じマッチが 100ms 以内に重複したらスキップ
  if (lastMatch && lastMatch.raw === raw && now - lastMatch.timestamp < DEBOUNCE_MS) {
    return null;  // 重複を無視
  }
  
  lastMatch = { raw, timestamp: now };
  
  // ... 既存の処理 ...
}
```

**メリット**:
- ✅ シンプル、コード量少ない
- ✅ 既存ロジックを変更しない
- ✅ パフォーマンスへの影響なし

**デメリット**:
- ⚠️ 根本的な原因を解決していない
- ⚠️ 同じテキストを短時間に2回入力できない

---

### 案2: Match Position トラッキング（精密）

```typescript
const processedMatches = new Map<string, Set<number>>();

handler: ({ state, match, range, chain }) => {
  const raw = match[1];
  const key = `${raw}:${range.from}`;
  
  if (!processedMatches.has(raw)) {
    processedMatches.set(raw, new Set());
  }
  
  const positions = processedMatches.get(raw)!;
  if (positions.has(range.from)) {
    return null;  // 同じ位置で既に処理済み
  }
  
  positions.add(range.from);
  
  // ... 既存の処理 ...
  
  // 100ms 後にクリア
  setTimeout(() => positions.delete(range.from), 100);
}
```

**メリット**:
- ✅ より精密なトラッキング
- ✅ 異なる位置のマッチは別々に処理

**デメリット**:
- ⚠️ メモリ管理が必要
- ⚠️ コード量が増える

---

### 案3: PATTERNS.bracket を改善（根本的）

```typescript
// 現在
bracket: /\[([^[\]]+)\]/

// 改善案1: 改行を含まない
bracket: /\[([^\[\]\n]+)\]/

// 改善案2: 行末のブラケットのみ
bracket: /\[([^[\]]+)\]$/
```

**メリット**:
- ✅ 根本的な原因を解決
- ✅ 改行時の誤マッチを防止

**デメリット**:
- ⚠️ パターンの意図を再確認が必要
- ⚠️ 他の機能への影響を確認する必要

---

## 📋 実装チェックリスト

- [ ] **デバッグ**: `docs/guides/debug-bracket-duplication.md` の手順でログ確認
- [ ] **テスト**: TC-001, TC-002 をテスト実装
- [ ] **修正**: 案1-3 から最適なものを実装
- [ ] **テスト実行**: `npm run test` で全テスト PASS
- [ ] **手動確認**: ブラウザで Enterキー/Spaceキー入力を確認
- [ ] **ドキュメント更新**: 修正内容をコミットメッセージに記録

---

## 📁 参考ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| `docs/01_issues/open/2025_10/20251023_01_bracket-duplication-bug.md` | 問題報告書 |
| `docs/02_research/2025_10/20251023_01_bracket-duplication-research.md` | 技術調査レポート |
| `docs/guides/debug-bracket-duplication.md` | デバッグガイド |
| `lib/tiptap-extensions/unified-link-mark/input-rules/bracket-rule.ts` | 実装ファイル |
| `lib/tiptap-extensions/unified-link-mark/config.ts` | パターン定義 |

---

## 📞 次のステップ

### 今すぐできること

1. **デバッグガイドの実施**
   ```bash
   # docs/guides/debug-bracket-duplication.md の
   # セクション2-5を実行して、ログを確認
   ```

2. **ブラウザコンソールでテスト**
   - エディタで `[テスト]` を入力
   - ブラケット外でEnterキーを押す
   - Console に `[BracketRule] Handler called` が複数出力されるか確認

### 実装フェーズ

1. **修正案の決定** (案1推奨)
2. **テストケース実装**
3. **修正コード実装**
4. **統合テスト実行**
5. **デプロイ**

---

## 🎯 推奨アクション

### 優先度: 🔴 High

1. **今日中**: デバッグガイドを実行して根本原因を確定
2. **明日**: 修正案の実装
3. **翌日**: テスト実行と確認

---

## 補足

### なぜこのバグが発生している？

ProseMirror の仕様では、テキスト入力によってドキュメント状態が変わるたびに InputRule が評価されます。

```
ユーザー入力 "\n"
  ↓
ProseMirror 内部: トランザクション処理
  ↓
新しい状態でテキストをスキャン
  ↓
PATTERNS.bracket が複数回マッチ
  ↓
各マッチで handler が実行
  ↓
[ [ [ [ [ [ テスト ] ] ] ] ] ] になる
```

**解決策**: 同じマッチを何度も処理しないようにチェック機構を追加

---

**作成者**: AI (GitHub Copilot)
**最終更新**: 2025-10-23
**次回見直し予定**: 修正実装後
