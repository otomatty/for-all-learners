# Issue 検証レポート: レガシーデータマイグレーション修正

**対象Issue**: `20251019_01_legacy-data-migration-fix.md`  
**検証日**: 2025-10-19  
**検証状態**: ✅ **指摘が正確であることを確認**

---

## 検証結果概要

Issue #20251019_01 で指摘されている内容は **正確**です。

テスト実行結果:
```
✓ 14 pass
✗ 4 fail
```

失敗テスト（期待値との不一致）:
1. Line 54: `raw = ""` （期待値: `"New Page"`）
2. Line 168: `raw = ""` （期待値: `"Only Title"`）
3. Line 192: `raw = ""` （期待値: `"Display Text"`）
4. Line 234: `key = ""` （期待値: `"new page"`）

---

## 根本原因の詳細分析

### TipTap 属性パース仕様の実装確認

#### 1. `attributes.ts` の属性定義（確認済み）

`raw` 属性の定義（lines 20-25）:
```typescript
raw: {
  default: "",
  parseHTML: (element: HTMLElement) => element.getAttribute("data-raw") || "",
  renderHTML: (attributes: UnifiedLinkAttributes) => ({
    "data-raw": attributes.raw,
  }),
},
```

**問題**: `parseHTML()` 関数は HTML 要素から `data-raw` 属性を探す
- HTML 要素に `data-raw` 属性がない場合、デフォルト値 `""` を返す
- `text`, `key` 属性についても同様

#### 2. `rendering.ts` の getAttrs() 実装（確認済み）

レガシー `data-page-title` 形式のパーサー（lines 120-137）:
```typescript
{
  tag: "a[data-page-title]:not([data-variant])",
  getAttrs: (node: HTMLElement | string) => {
    // ...
    const attrs = {
      variant: "bracket",
      pageId: null,
      state,
      exists: false,
      href: "#",
      key: pageTitle?.toLowerCase() || "",    // ← ここで設定
      raw: pageTitle || "",                   // ← ここで設定
      text: pageTitle || "",                  // ← ここで設定
      // ...
    };
    return attrs;
  },
},
```

**設定内容**: `getAttrs()` は正しく属性値を設定している

#### 3. パース流れの実行順序

```
1. editor.setContent(html)
   ↓
2. TipTap が複数のパーサーを試行
   ↓
3. a[data-page-title]:not([data-variant]) がマッチ
   ↓
4. getAttrs() 実行 → attrs = { raw: "New Page", key: "new page", ... } を返す
   ↓
5. ⚠️ [ここが問題]各属性の parseHTML() が実行される
   ↓
6. parseHTML("data-raw") → HTML に data-raw 属性がない → "" を返す
   parseHTML("data-key") → HTML に data-key 属性がない → "" を返す
   parseHTML("data-text") → HTML に data-text 属性がない → "" を返す
   ↓
7. 最終的な属性 = { raw: "", key: "", text: "", ... } ⚠️ 上書きされた
```

### 動作確認

テスト実行時のログ分析:
```
✗ Line 54: expect(mark?.attrs.raw).toBe("New Page")
  Expected: "New Page"
  Received: ""
```

この動作は Issue で説明されている TipTap の `parseHTML` 仕様による**属性上書き問題**と完全に一致しています。

---

## Issue の指摘の正確性評価

### ✅ 正確な部分

1. **根本原因の特定**
   - Issue: "HTML要素に `data-raw` 属性がないため、デフォルト値が使用される"
   - 実装: 完全に一致 ✓

2. **属性定義の説明**
   - Issue: "`attributes.ts` の `parseHTML()` は HTML 要素から直接データを読む"
   - 実装: `element.getAttribute("data-raw") || ""` で確認 ✓

3. **getAttrs() 実装の説明**
   - Issue: "`getAttrs()` で属性値を設定しているが、その後で `parseHTML()` が上書きする"
   - 実装: 完全に一致 ✓

4. **失敗テストの特定**
   - Issue: 4件のテストが失敗
   - 実行結果: 4件が失敗（Line 54, 168, 192, 234） ✓

### ⚠️ 不正確/不完全な部分

1. **パース流れの説明**
   - Issue: "`getAttrs()` で設定した値は上書きされない" （不正確）
   - 実装: 実際には **上書きされている** ✓
   - 正しくは: "`getAttrs()` で設定した値が、その後の `parseHTML()` で上書きされる"

2. **解決策の提案**
   - Issue: "オプション A" → "HTML に属性を出力する必要"と記述
   - 実装: これは解決策ではなく、むしろ **症状の説明**になっている
   - 理由: `renderHTML()` は Mark 属性から HTML へ変換するもので、HTML パース時の `parseHTML()` の動作には影響しない

---

## 推奨される正しい修正方法

### 問題の本質

TipTap の Mark パース仕様:
1. `getAttrs()` で返す属性オブジェクトはマークの初期属性
2. その後、各属性の `parseHTML()` が実行される
3. `parseHTML()` が HTML 要素から属性値を取得でき、`getAttrs()` より優先度が高い

### 修正オプション

#### **オプション 1: 属性を HTML に埋め込む（推奨）**

`rendering.ts` の `getAttrs()` で返すオブジェクトを、HTML 属性として追加する必要があります。

ただし、`getAttrs()` の戻り値は**属性値を返すものであり、HTML 生成には関わらない**ため、HTML 属性を設定するには別の方法が必要:

- **方法**: `getAttrs()` が返す前に、ノードに直接 `data-*` 属性を設定
- **課題**: `getAttrs()` で HTML を修正するのは設計上問題

#### **オプション 2: parseHTML() をレガシー形式に対応させる（推奨）**

各属性の `parseHTML()` をより強力にして、HTML 要素にデータ属性がない場合は代替データから取得:

```typescript
raw: {
  default: "",
  parseHTML: (element: HTMLElement) => {
    // 1. data-raw 属性を優先
    const dataRaw = element.getAttribute("data-raw");
    if (dataRaw !== null) return dataRaw;
    
    // 2. レガシー data-page-title から取得
    const pageTitle = element.getAttribute("data-page-title");
    if (pageTitle !== null) return pageTitle;
    
    // 3. テキストコンテンツから取得
    return element.textContent || "";
  },
  renderHTML: ...
},
```

**メリット**: 
- 既存の HTML 構造を変更しない
- レガシーデータも正しくパースできる
- テストも通る

#### **オプション 3: マイグレーション時に属性を追加**

`rendering.ts` の `getAttrs()` 内で、ノードに `data-*` 属性を動的に設定:

```typescript
getAttrs: (node: HTMLElement | string) => {
  if (typeof node === "string") return false;
  
  const pageTitle = node.getAttribute("data-page-title");
  
  // HTML 要素に属性を追加
  if (pageTitle) {
    node.setAttribute("data-raw", pageTitle);
    node.setAttribute("data-key", pageTitle.toLowerCase());
    node.setAttribute("data-text", pageTitle);
  }
  
  return {
    variant: "bracket",
    key: pageTitle?.toLowerCase() || "",
    raw: pageTitle || "",
    text: pageTitle || "",
    // ...
  };
},
```

**メリット**: 
- 次回のパース時に属性が存在するため、再度の上書きを防止

---

## 検証結論

| 項目 | 状態 | 詳細 |
|------|------|------|
| **テスト失敗の確認** | ✅ 正確 | 4件のテストが正確に失敗（期待値と不一致） |
| **根本原因の特定** | ✅ 正確 | TipTap parseHTML 仕様による属性上書きで説明できる |
| **パース仕様の理解** | ⚠️ 部分的 | `getAttrs()` の値が実際に上書きされることの説明が不十分 |
| **修正方法の提案** | ❌ 不正確 | オプション A は症状の説明であり、解決策ではない |
| **実装への影響** | 🔴 Critical | テストが失敗している状態は許容できない |

---

## 次のステップ

1. **修正方法の決定**: 上記の3つのオプション中から最適なものを選択
2. **実装**: 選択した方法で `attributes.ts` または `rendering.ts` を修正
3. **テスト**: 4つのテストが通ることを確認
4. **統合テスト**: レガシーデータの実際のマイグレーション動作を確認

---

**検証者**: GitHub Copilot  
**検証日時**: 2025-10-19  
**ステータス**: Issue の指摘は正確。修正の優先度は 🔴 Critical
