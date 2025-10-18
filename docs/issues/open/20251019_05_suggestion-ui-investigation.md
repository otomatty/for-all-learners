# Issue: サジェスト UI 問題の詳細調査

**優先度**: 🟡 Medium  
**推定難度**: ⭐⭐ 中（2-3時間）  
**推奨期限**: 4-5日以内  
**作成日**: 2025-10-19

---

## 概要

事前レポートで「サジェスト UI が空クエリで表示されないケース」が指摘されていますが、具体的な根拠が不明確です。

実装の詳細を調査し、実際に問題が存在するか、あるいはこれが仕様通りか確認する必要があります。

---

## 指摘されていた問題

### 原レポートの記述

> **Issue 9: サジェスト UI の問題**
> 
> サジェスト UI が空クエリ（`[` だけ、`#` だけ）の状態で表示されない可能性
>
> 候補がない場合、UI が表示されないのか、候補が 0 件で表示されるのか不明確

---

## 調査が必要な項目

### 1. サジェスト UI の実装場所

**候補ファイル**:

```
lib/tiptap-extensions/unified-link-mark/
├── plugins/
│   └── suggestion-plugin.ts       ← 実装候補
├── components/
│   └── SuggestionPopup.tsx        ← UI 実装候補
└── __tests__/
    ├── suggestion-plugin.test.ts
    └── suggestion-popup.test.ts
```

**確認すべき**:
- [ ] `suggestion-plugin.ts` が存在するか
- [ ] サジェスト表示ロジックはどこに実装されているか
- [ ] 最小文字数チェックが実装されているか

---

### 2. 空クエリ時の動作

**テストシナリオ**:

| 入力 | 期待される動作 | 実装の状態 |
|------|--------------|----------|
| `[` だけ | サジェスト表示？ | 確認中 |
| `[a` | サジェスト表示 | ✅ 確認済 |
| `#` だけ | サジェスト表示？ | 確認中 |
| `#a` | サジェスト表示 | ✅ 確認済 |

**確認内容**:
```typescript
// サジェスト表示の条件
if (props.query.length < 1) {
  // ← 空クエリを不正として扱うのか？
  // それとも空クエリでも候補を表示すべきか？
  return [];
}
```

---

### 3. サジェストフィルター実装の確認

**対象ファイル**: `lib/unilink/resolver/index.ts`

**確認項目**:

```typescript
export function searchAndResolvePages(
  query: string,  // ← 空文字列の場合どうなる？
  options?: SearchOptions
): Promise<PageInfo[]> {
  // 1. クエリが空の場合の処理
  if (!query.trim()) {
    // A. 全ページ候補を返す？
    // B. 空配列を返す？
    // C. エラーを投げる？
    return [];
  }
```

**実装の検証**:
- [ ] `searchPages()` に空クエリが渡された場合の処理
- [ ] データベース検索に最小文字数制限があるか
- [ ] キャッシュでフィルタリングされているか

---

## 実装コード調査チェックリスト

### ステップ 1: サジェスト UI 実装の確認

```bash
# サジェスト関連ファイルの検索
find lib/tiptap-extensions/unified-link-mark -name "*suggestion*" -type f

# 出力結果を確認:
# - suggestion-plugin.ts が存在するか
# - SuggestionPopup.tsx が存在するか
# - __tests__/suggestion-plugin.test.ts が存在するか
```

**確認結果**:
- [ ] ファイル一覧：
  - ___

---

### ステップ 2: サジェスト表示条件の確認

**ファイル**: `lib/tiptap-extensions/unified-link-mark/plugins/suggestion-plugin.ts` （推定）

```typescript
// 以下を確認
1. サジェスト表示の最小文字数
   - const minChars = 1;  // ← この値を確認

2. 空クエリ時の処理
   if (props.query.length < minChars) {
     // UI を表示するか、しないか
   }

3. 候補がない場合の処理
   if (items.length === 0) {
     // UI を表示するか、しないか
   }
```

**行番号を記録**:
- 最小文字数チェック: Line ___
- 空クエリ時の処理: Line ___
- 候補フィルタリング: Line ___

---

### ステップ 3: サジェスト UI の実装確認

**ファイル**: `lib/tiptap-extensions/unified-link-mark/components/SuggestionPopup.tsx` （推定）

```typescript
export function SuggestionPopup(props: {
  items: PageInfo[];
  command: (item: PageInfo) => void;
  editor: Editor;
}) {
  // 1. items が空の場合、UI を返すか？
  if (props.items.length === 0) {
    return null;  // ← または何か表示？
  }

  // 2. 候補表示の実装
  return (
    <div className="suggestion-popup">
      {props.items.map(item => (
        <SuggestionItem key={item.id} item={item} />
      ))}
    </div>
  );
}
```

**確認項目**:
- [ ] 候補が 0 件の場合、UI が表示されるか？
- [ ] UI が表示される場合、「候補なし」メッセージがあるか？

---

### ステップ 4: テストケースの確認

**ファイル**: `lib/tiptap-extensions/unified-link-mark/__tests__/suggestion-plugin.test.ts`

```typescript
describe("SuggestionPlugin", () => {
  // 以下のテストが存在するか確認
  
  it("should show suggestions for non-empty query", () => {
    // ✅ これは存在する可能性高い
  });

  it("should NOT show suggestions for empty query", () => {
    // ⚠️ この行動が定義されているか確認
  });

  it("should handle zero results gracefully", () => {
    // ⚠️ 候補なし時の動作が定義されているか確認
  });

  it("should show all pages for empty query", () => {
    // ⚠️ または全ページ候補を表示すべきか確認
  });
});
```

**テスト結果**:
```bash
bun test lib/tiptap-extensions/unified-link-mark/__tests__/suggestion-plugin.test.ts
```

---

## ブラウザでの検証手順

### セットアップ

```bash
cd /Users/sugaiakimasa/apps/for-all-learners
bun run dev
# http://localhost:3000 でアプリ起動
```

---

### テストケース 1: 空クエリでのサジェスト表示

1. メモを作成
2. エディタで `[` と入力（それ以上入力しない）
3. **観察**: サジェスト UI が表示される？

**期待される結果**:
- A. サジェスト UI が表示される（候補なし）
- B. サジェスト UI が表示されない
- C. 全ページ候補が表示される

**実装との照合**:
- **A の場合**: 仕様通り、UI コンポーネントが候補なしを表示
- **B の場合**: `if (query.length < 1) return []` で処理
- **C の場合**: UX 改善として全ページ候補を表示

---

### テストケース 2: 1文字以上でのサジェスト表示

1. 同様に新規メモ
2. エディタで `[a` と入力
3. **観察**: サジェスト UI が表示される？
4. **入力続ける**: `[abc` → サジェスト更新される？

**期待される結果**:
- ✅ サジェスト UI が表示される
- ✅ クエリ変更で候補が更新される

---

### テストケース 3: ハッシュタグでの空クエリ

1. メモを作成
2. エディタで `#` と入力（それ以上入力しない）
3. **観察**: サジェスト UI が表示される？

**期待される結果**:
- 同じく、`[` の時と同じ動作

---

## 判定フロー

```
┌─ サジェスト表示条件の実装を確認
│
├─ if (query.length < 1) 処理あり？
│  ├─ YES → 空クエリでサジェスト表示「されない」（仕様通り）
│  │        → Issue: 不要（設計通り）
│  │
│  └─ NO → 空クエリでサジェスト表示「される」？
│      ├─ YES → UI 表示動作を確認
│      │       ├─ 候補なし UI が表示される → Issue: 不要（UX OK）
│      │       └─ 全ページ候補が表示される → Issue: 軽微（候補多い）
│      │
│      └─ NO → 異常発生
│             → Issue: Critical（サジェスト機能の不具合）
```

---

## 実装の修正提案（問題がある場合）

### シナリオ A: 空クエリでサジェスト表示されるべき

```typescript
// suggestion-plugin.ts の修正候補

export function createSuggestionPlugin(options: SuggestionOptions) {
  return Suggestion({
    plugin: (props) => {
      // 現在: if (props.query.length < 1) return []
      // 修正: 空クエリでも候補を返す
      
      const query = props.query.trim();
      
      // オプション 1: 空クエリで全ページ候補
      if (query === "") {
        return getAllPages();  // ← 全候補
      }
      
      // オプション 2: 空クエリで空配列（現在の実装）
      if (query === "") {
        return [];
      }
    },
  });
}
```

---

### シナリオ B: 候補なし時に「見つかりません」メッセージ表示

```typescript
// SuggestionPopup.tsx の修正候補

export function SuggestionPopup(props: {
  items: PageInfo[];
  command: (item: PageInfo) => void;
}) {
  return (
    <div className="suggestion-popup">
      {props.items.length > 0 ? (
        props.items.map(item => (
          <SuggestionItem key={item.id} item={item} onClick={() => props.command(item)} />
        ))
      ) : (
        <div className="no-suggestions">
          <p>該当するページが見つかりません</p>
        </div>
      )}
    </div>
  );
}
```

---

## 文書更新内容

### 更新対象

1. **`docs/02_requirements/features/unified-link-mark-spec.md`**
   - サジェスト UI の動作仕様を明記

2. **`docs/04_implementation/plans/unified-link-mark/`**
   - サジェスト UI の実装状況を記載

3. **`docs/03_design/features/suggestion-ui-design.md`** （必要に応じて新規作成）
   - 空クエリ時の UX を定義

---

## チェックリスト

### ファイル確認

- [ ] サジェスト関連ファイルの場所を確認
- [ ] 実装ファイルのコード確認
- [ ] テストファイルのテストケース確認

### 動作確認

- [ ] 空クエリ `[` だけ → サジェスト表示の有無
- [ ] 空クエリ `#` だけ → サジェスト表示の有無
- [ ] 1文字以上 `[a` → サジェスト表示される
- [ ] 0 候補時の UI → 表示内容確認

### 仕様確認

- [ ] 設計書でサジェスト UI の仕様が定義されているか
- [ ] 最小文字数要件が明記されているか
- [ ] 候補なし時の UI が定義されているか

### テスト確認

- [ ] 単体テストで空クエリが テストされているか
- [ ] ブラウザテストで実際に動作確認

---

## 参考ドキュメント

- 📋 [検証報告書](20251019_05_verification-report-memo-link-investigation.md)
- 📝 [元のレポート](20251018_04_memo-link-feature-investigation.md)
- 🔗 [UnifiedLinkMark 仕様書](../../02_requirements/features/unified-link-mark-spec.md)
- 📌 [タグ機能検証](20251019_04_tag-feature-verification.md)

---

## 補足: 調査コマンド

### サジェスト関連ファイルの検索

```bash
# サジェスト関連すべてを検索
grep -r "suggestion" lib/tiptap-extensions/unified-link-mark --include="*.ts" --include="*.tsx" | head -20

# ファイル一覧を取得
find lib/tiptap-extensions/unified-link-mark -name "*suggestion*"

# テストファイルを検索
find lib -name "*.test.ts" | xargs grep -l "suggestion"
```

### 空クエリ処理の検索

```bash
# 最小文字数チェックを検索
grep -r "query.length" lib/tiptap-extensions/unified-link-mark

# 空文字列チェックを検索
grep -r "query.*==.*\"\"" lib/tiptap-extensions/unified-link-mark
grep -r "query.*\.trim()" lib/tiptap-extensions/unified-link-mark
```

### サジェスト UI 表示条件の検索

```bash
# items が空の場合の処理
grep -r "items.length.*===.*0" lib/tiptap-extensions/unified-link-mark

# UI 非表示条件
grep -r "return null" lib/tiptap-extensions/unified-link-mark | grep -i suggestion
```

---

**作成者**: GitHub Copilot  
**作成日**: 2025-10-19  
**最終更新**: 2025-10-19
