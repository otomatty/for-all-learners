# Issue: Duplicate # appearing in tag links (#テスト → ##テスト)

## 概要
タグ入力機能（`#タグ`）において、Enter キーまたは Space キー押下時に # が重複して表示される問題。

## 問題の詳細

### 現象
- 入力: ` #テスト` + Enter キー
- 期待: `#テスト`（単一の#）
- 実際: `##テスト`（重複した#）

### 根本原因

ProseMirror の InputRule は、IME（日本語入力）完了後に入力バッファをスキャンし直す際、同じパターンが複数回マッチすることがある。

**具体例**:
```
Call #1: "#テスト" (1-5) → 処理実行、マークを付与
Call #2: "#テスト" (2-5) → 再度処理実行、重複の # を作成

なぜ？ 
- Call #1 の処理後、"#テスト" が 位置1-5 にある状態
- Call #2 のマッチが 位置2-5 で発火（"テスト" 部分の再マッチ）
- Call #2 の処理: 位置2-5 を削除して "#テスト" を挿入
  結果: 位置1の "#" + 新たに挿入された "#テスト" = "##テスト"
```

## 解決策

### 実装内容

**概念**: 同じマッチ（テキスト + 位置）に対して複数回処理されるのを防ぐ

**実装**:
1. マッチの一意識別子を作成: `${key}:${from}:${to}`（テキスト + 開始位置 + 終了位置）
2. 処理済みマッチを `Set` で記録: `processedMatches` または `processedBracketMatches`
3. InputRule handler 実行時、既に処理済みなら `return null` でスキップ
4. 処理完了後、matchId を Set に追加

### 修正ファイル

#### `tag-rule.ts`
```typescript
// グローバル変数で処理済みマッチを記録
let processedMatches = new Set<string>();

// handler 内
const matchId = `${currentKey}:${range.from}:${range.to}`;
const isDuplicate = processedMatches.has(matchId);

if (isDuplicate) {
  return null; // スキップ
}

// 処理完了後
processedMatches.add(matchId);
```

#### `bracket-rule.ts`
同様の実装を適用

### Debug ログ

修正前のログ:
```
Call #1: isDuplicate=false, range: from=1, to=5
  → 処理実行、"#テスト" 挿入

Call #2: isDuplicate=false, range: from=2, to=5
  → 処理実行、"#テスト" 再度挿入 → "##テスト" 生成
```

修正後の予想ログ:
```
Call #1: isDuplicate=false, matchId="テスト:1:5"
  → 処理実行、matchId を Set に追加

Call #2: isDuplicate=true, matchId="テスト:2:5"
  → スキップ（return null）
  → "##テスト" は生成されない
```

## テスト手順

1. ブラウザ更新: `Cmd+R`
2. エディターで入力: ` #テスト`
3. Enter キー押下
4. コンソールで確認:
   - Call #1 で処理実行
   - Call #2 で isDuplicate=true となってスキップ
5. 結果: `#テスト`（単一の#）のみ表示されること

## 検証状況

- [x] InputRule の double-trigger を確認
- [x] Composition イベントリスナー実装（クリーンアップ）
- [x] matchId ベースの重複検出実装
- [x] tag-rule.ts に修正適用
- [x] bracket-rule.ts に修正適用
- [ ] ブラウザテストで動作確認
- [ ] テストケース追加
- [ ] DEBUG_TAG_DUPLICATION フラグの無効化

## 関連ドキュメント

- `docs/issues/open/20251019_07_tag-duplication-on-enter-space-keys.md` - 初期問題分析
