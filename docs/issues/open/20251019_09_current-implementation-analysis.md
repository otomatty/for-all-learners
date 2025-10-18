# 現在のタグ機能実装分析レポート

**作成日**: 2025-10-19  
**目的**: タグ機能の重複 # 問題を解決するため、現在の実装メカニズムを詳細に分析する

## 概要

タグ入力で `#テスト` + Enter キーで `##テスト` が生成される問題。
原因特定のため、サジェスト機能をオフにしてシンプルなロジックで検証する。

---

## 現在の実装アーキテクチャ

### 1. タグ入力のフロー

```
ユーザー入力: " #テスト" + Enter
     ↓
[InputRule] tag-rule.ts
  - PATTERNS.tag で " #テスト" を検出
  - Mark 付与して text を挿入
  - state: "pending"
     ↓
[Suggestion Plugin] suggestion-plugin.ts
  - "#" を検出し、候補ページを検索
  - UI 表示（サジェスト）
     ↓
[Resolver Queue] resolver-queue.ts
  - searchPages() で DB 検索
  - Mark 状態を "exists"/"missing" に更新
```

### 2. tag-rule.ts の処理

**主要処理**:
```typescript
// 1. PATTERNS.tag で " #テスト" にマッチ
// 2. Mark を付与してテキスト挿入

// 重複検出メカニズム
const matchId = `${currentKey}:${range.from}:${range.to}`;
const isDuplicate = processedMatches.has(matchId);
```

**問題箇所**:
- InputRule が複数回トリガーされる可能性あり
- IME 確定後、同じマッチパターンが再度マッチする場合がある
- 現在の `processedMatches` はメモリ内セットで、複数呼び出しでリセットされる

### 3. suggestion-plugin.ts の処理

**主要処理**:
```typescript
// 1. " #テスト" を検出
// 2. 空クエリ時も UI を表示
const shouldShowSuggestions = query.length > 0 || variant === "tag";

// 3. Enter キー押下時
if (event.key === "Enter") {
  insertUnifiedLinkWithQuery(view, state);
}
```

**複雑な点**:
- サジェスト UI の表示/非表示ロジック
- キーボードナビゲーション
- 複数の insert 関数（`insertUnifiedLink`、`insertUnifiedLinkWithQuery` など）

---

## 問題分析

### 仮説 1: 順序の問題

```
時系列:
1. tag-rule.ts の InputRule が " #テスト" を処理
   → Mark 付与、text = "#テスト" を挿入
   
2. suggestion-plugin.ts が Enter キーを検出
   → insertUnifiedLinkWithQuery() 実行
   → 既存の "#テスト" を削除して、新たに "#テスト" を挿入
   
3. の結果、"##テスト" が生成される可能性
```

### 仮説 2: Double Processing

```
InputRule が複数回トリガー:
  Call #1: range 1-5 で "#テスト" 挿入
  Call #2: range 2-5（?)で再度 "#テスト" 挿入 → "##テスト"
```

---

## 検証計画

### ステップ 1: サジェスト機能完全オフ

**目的**: suggestion-plugin.ts を無効化して、InputRule だけで動作確認

**実装**:
```typescript
// suggestion-plugin.ts の state view 関数を無効化
// サジェスト検出ロジックをスキップ
const ENABLE_SUGGESTION = false;
```

### ステップ 2: シンプルなタグ検出ロジック

**目的**: tag-rule.ts のみで、以下を確認
1. " #テスト" の検出
2. Mark 付与
3. 重複 # の生成なし

### ステップ 3: テスト実行

```bash
bun test lib/tiptap-extensions/unified-link-mark/input-rules/__tests__/tag-rule.test.ts
```

### ステップ 4: ブラウザ確認

```
条件: suggestion-plugin.ts を無効化
入力: " #テスト" + Enter
期待: "#テスト"（単一の#）
```

---

## 実装方針

### Phase 1: 最小変更（サジェスト無効化）

- `suggestion-plugin.ts` にフラグを追加
- サジェスト検出部分を全体的にスキップ
- キーボードハンドラーも無効化

### Phase 2: ロジック単純化（必要に応じて）

- InputRule に搾り込む
- suggestion-plugin.ts の複雑さを軽減

---

## ファイル一覧

### 修正対象

1. **suggestion-plugin.ts**
   - `ENABLE_SUGGESTION` フラグを追加
   - サジェスト検出ロジックを条件分岐で無効化
   - 現在の行数: 727

2. **tag-rule.ts**（確認のみ）
   - 現在の行数: 173
   - 重複検出ロジックの妥当性を確認

### テストファイル

1. **tag-rule.test.ts**
   - 実行して確認

---

## 関連 Issue

- Issue #20251019_08: 重複 # 解決策提案
- Issue #20251019_07: タグ重複初期報告

---

## 次のステップ

1. suggestion-plugin.ts に ENABLE_SUGGESTION フラグを追加
2. ユニットテスト実行
3. ブラウザ確認（サジェスト無効状態）
4. 結果分析に基づいて Phase 2 実装判断
