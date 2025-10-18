# tag-rule.ts ロジック検証ドキュメント

**作成日**: 2025-10-19  
**目的**: 現在の tag-rule.ts 実装を検証し、シンプルなロジックであることを確認

---

## 現在の実装概要

### tag-rule.ts の処理フロー

```
1. PATTERNS.tag で " #テスト" を検出
   ↓
2. 重複チェック (matchId ベース)
   ↓
3. コード文脈チェック (code block は除外)
   ↓
4. UnifiedLink マーク有無チェック
   ↓
5. テキスト削除 + マーク付きテキスト挿入
   ↓
6. enqueueResolve() で DB 解決キューに登録
```

---

## 実装の妥当性検証

### ✅ シンプルで明確な実装

**長所**:
1. **単一責任**: InputRule は「テキスト検出と Mark 付与」のみ
2. **重複検出**: matchId ベース（`key:from:to`）で明確に識別
3. **段階的チェック**: 
   - コード文脈判定
   - 既存 Mark チェック
4. **解決の非同期化**: `enqueueResolve()` で DB 検索を非同期に

### ⚠️ 潜在的な問題点

#### 1. processedMatches がメモリ内セット

**問題**: 
- グローバルセット変数
- セッション中に永続化
- 古いマッチ ID が残る可能性

**対策**:
```typescript
// 現在の実装
let processedMatches = new Set<string>();

// 改善案
// matchId を tr.meta に記録し、transaction スコープにする
```

#### 2. InputRule の double trigger（仮説）

**ProseMirror の挙動**:
- IME 確定後に同じ pattern が複数回マッチすることがある
- Call #1: range 1-5 で "#テスト" 処理
- Call #2: range 2-5 で再マッチ → processedMatches にない場合は処理される

**例**:
```
入力フロー:
1. ユーザーが " #テスト" を入力し、Enter キー
2. InputRule が " #テスト" を検出
3. IME 確定イベント発火
4. ProseMirror が入力バッファを再スキャン
5. 同じパターンが異なる位置でマッチする

結果:
Call #1: from=1, to=5  → "#テスト" 挿入
Call #2: from=2, to=5  → processedMatches.has(`テスト:2:5`) = false
         → 再度処理実行 → "##テスト" 生成
```

---

## 検証計画

### Phase 1: サジェスト無効化（完了）

✅ suggestion-plugin.ts に `ENABLE_SUGGESTION_FEATURE` フラグを追加
- update() 冒頭で早期リターン
- handleKeyDown() でも早期リターン

### Phase 2: ユニットテスト実行（完了）

✅ **tag-rule.test.ts 実行結果**:
```
27 pass, 0 fail, 116 expect() calls
Ran 27 tests across 1 files. [646.00ms]
```

✅ **suggestion-plugin.test.ts 実行結果**:
```
35 pass, 0 fail, 49 expect() calls
Ran 35 tests across 1 files. [385.00ms]
```

**結論**: 
- InputRule のロジックは正常に動作している
- Suggestion Plugin のロジックも正常に動作している
- 両方のテストが全て pass している

### Phase 3: InputRule のみで動作確認

**目標**: ENABLE_SUGGESTION_FEATURE = false の状態で、ブラウザで実際に動作確認

ProcessedMatches の状態と CallID をログして、Double Trigger を検証

```typescript
// Debug ログで確認する項目
1. Call #1, #2, ... のシーケンス
2. 各 Call の matchId
3. processedMatches.has(matchId) の結果
4. 処理 or スキップ
```

---

## tag-rule.ts の改善案（Phase 2 以降）

### 案 1: Transaction Meta を活用

```typescript
// matchId を tr.meta に記録
const tr = view.state.tr;
const processedInThisTransaction = tr.getMeta("processedMatches") || new Set();

if (processedInThisTransaction.has(matchId)) {
  return null; // Skip
}

// 処理実行

processedInThisTransaction.add(matchId);
tr.setMeta("processedMatches", processedInThisTransaction);
```

### 案 2: InputRule の非同期処理を避ける

```typescript
// 現在: InputRule で同期的に処理
// 改善: InputRule は最小限の処理のみ
//      実際のリンク化は別のフェーズで

// InputRule: Placeholder を挿入
// Resolver: 実際のリンク情報で置換
```

---

## 仮説テスト設計

### テストシナリオ 1: InputRule のみで ## が生成されるか

```typescript
// tag-rule.ts の processedMatches をリセット
// suggestion-plugin を無効化
// " #テスト" + Enter を実行
// 結果を確認

// 期待:
// ✅ "##テスト" が生成されない → suggestion-plugin が問題
// ❌ "##テスト" が生成される → tag-rule.ts が問題
```

### テストシナリオ 2: Double Trigger の検出

```typescript
// DEBUG_TAG_DUPLICATION = true でデバッグログ出力
// コンソールで Call #1, #2 のシーケンスを確認

// ログ例（期待）:
// [XX:XX:XX] [TagRule] [handler] Tag InputRule triggered (call #1)
// [XX:XX:XX] [TagRule] [handler] Tag InputRule triggered (call #2)
// ... isDuplicate=false, matchId="テスト:2:5"

// この場合、Call #2 で処理されて ## が生成される
```

---

## 改善策の優先順

### 優先度 1: Double Trigger の根本解決

**案**: Transaction メタに処理済みマッチを記録

```typescript
// processedMatches を transaction スコープに
const processedInTr = tr.getMeta("inputRuleProcessed") || {};

if (processedInTr[matchId]) {
  return null;
}

// 処理実行

tr.setMeta("inputRuleProcessed", {
  ...processedInTr,
  [matchId]: true
});
```

### 優先度 2: InputRule の複雑さ軽減

**案**: InputRule は最小限、Resolver で詳細処理

```typescript
// 簡略版 InputRule
// - テキスト削除
// - Placeholder Mark 挿入
// - enqueueResolve()

// Resolver で実際のリンク情報を設定
```

---

## 次のステップ

1. ユニットテスト実行（サジェスト無効化後）
2. デバッグログで Double Trigger 検証
3. ブラウザ確認
4. 仮説に基づいて改善案を実装
