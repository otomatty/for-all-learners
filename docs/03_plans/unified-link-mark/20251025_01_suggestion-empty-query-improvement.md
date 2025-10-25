# サジェストUI空クエリ動作改善実装計画

**関連Issue**: #21 - research: Investigate suggestion UI empty query behavior
**ブランチ**: `feature/improve-suggestion-empty-query`
**実装日**: 2025-10-25

---

## 背景

現在、UnifiedLinkMarkのサジェスト機能は以下の問題があります：

1. **機能が無効化されている**: `ENABLE_SUGGESTION_FEATURE = false` により、タグ重複問題調査のため一時的に無効化
2. **空クエリの挙動が不明**: `[` または `#` のみを入力した際の動作が仕様化されていない
3. **ユーザーフィードバック不足**: 候補なし時のメッセージがない

---

## 調査結果（Issue #21より）

### 現在の実装状況

**ファイル**: `lib/tiptap-extensions/unified-link-mark/plugins/suggestion-plugin.ts`

```typescript
// Line 13: Feature flag - Currently DISABLED
const ENABLE_SUGGESTION_FEATURE = false;

// Line 178: Current logic for bracket pattern
// Only show suggestions when bracket is closed
if (closeBracketIndex !== -1) {
  // ... suggestions are shown
}

// Line 179: Current logic for tag pattern  
// Show suggestions for tag pattern even with empty query (#)
const shouldShowSuggestions =
  query.length > 0 || variant === "tag";
```

**判明した仕様**:
- ブラケットパターン (`[text]`): 閉じブラケットが必要
- タグパターン (`#tag`): 空クエリでもサジェスト表示（行179）
- デバウンス: 300ms

---

## 実装方針

### Phase 1: 機能の再有効化とテスト修正

1. **`ENABLE_SUGGESTION_FEATURE` を `true` に変更**
2. **テストコードの修正**
   - JSDOMセットアップの問題を解決
   - 実際の動作を確認できる統合テストに変更

### Phase 2: 空クエリ時のUX改善

#### パターンA: 空クエリメッセージの表示（推奨）

```typescript
// SuggestionPopup component (new file or inline)
function SuggestionPopup(props: {
  items: PageInfo[];
  query: string;
  variant: "bracket" | "tag";
}) {
  if (props.items.length === 0) {
    if (props.query.trim() === "") {
      return (
        <div className="suggestion-empty">
          キーワードを入力してください
        </div>
      );
    }
    return (
      <div className="suggestion-no-results">
        「{props.query}」に該当するページが見つかりません
      </div>
    );
  }

  return (
    <div className="suggestion-results">
      {props.items.map(item => (
        <SuggestionItem key={item.id} item={item} />
      ))}
    </div>
  );
}
```

**メリット**:
- ユーザーに明確なフィードバック
- 空クエリと検索結果なしを区別できる
- 既存ロジックへの影響最小

#### パターンB: 最小文字数の設定（代替案）

```typescript
// suggestion-plugin.ts
const MIN_QUERY_LENGTH = 2;

if (query.length < MIN_QUERY_LENGTH && variant === "bracket") {
  // Don't show suggestions
  return;
}
```

**デメリット**:
- ユーザーが2文字入力するまでサジェスト非表示
- UXが低下する可能性

---

## 実装手順（TDD）

### Step 1: RED - 失敗するテストの作成 ✅

```bash
# 既に完了
git log -1
# test: Add failing tests for empty query suggestion behavior (RED)
```

**テストファイル**:
- `lib/tiptap-extensions/unified-link-mark/plugins/__tests__/suggestion-empty-query.test.ts`

**テストケース**:
- TC-001: 空ブラケットクエリでサジェストUI表示
- TC-002: 空タグクエリでサジェストUI表示
- TC-003: 1文字クエリでフィルタ済みサジェスト表示
- TC-004: 結果なしクエリで「見つかりません」メッセージ
- TC-005: 空クエリと結果なしの区別

### Step 2: GREEN - テストをパスする最小実装

```bash
# 実装予定
1. ENABLE_SUGGESTION_FEATURE を true に変更
2. 空クエリ時のUI表示ロジック追加
3. テストが全てpassすることを確認
```

**変更ファイル**:
- `lib/tiptap-extensions/unified-link-mark/plugins/suggestion-plugin.ts`
  - Line 13: `ENABLE_SUGGESTION_FEATURE = true`
  - Line 200-250: Tippy.js のコンテンツ生成ロジック改善

### Step 3: REFACTOR - コード品質改善

```bash
# 実装予定
1. サジェストUI表示ロジックをコンポーネント化
2. テストコード整理
3. ドキュメント更新
```

**リファクタリング内容**:
- サジェストポップアップのReactコンポーネント化（オプション）
- デバッグフラグの削除
- コメント整理

---

## テストコマンド

```bash
# 単体テスト
bun test lib/tiptap-extensions/unified-link-mark/plugins/__tests__/suggestion-empty-query.test.ts

# 関連テスト全体
bun test lib/tiptap-extensions/unified-link-mark/plugins/__tests__/

# 統合テスト（手動）
bun dev
# http://localhost:3000 でエディタを開いて動作確認
```

---

## 期待される効果

1. **UX向上**: ユーザーが空クエリ時に何をすべきか明確
2. **一貫性**: 空クエリと検索結果なしを明確に区別
3. **パフォーマンス**: 不要な検索リクエストを削減（空クエリ時）

---

## リスク

### リスク 1: タグ重複問題の再発

**対策**:
- 機能再有効化前に、タグ重複問題が解決されているか確認
- InputRuleとSuggestion Pluginの競合がないか検証

### リスク 2: パフォーマンス影響

**対策**:
- デバウンス時間を適切に設定（現在300ms）
- 空クエリ時は検索APIを呼ばない

---

## 次のステップ

1. **Phase 1実装**: 機能再有効化とテスト修正
2. **Phase 2実装**: 空クエリUX改善
3. **ドキュメント更新**: 仕様書への反映
4. **PR作成**: TDDプロセスを含めたPR

---

**最終更新**: 2025-10-25
**作成者**: AI (GitHub Copilot)
