# リンク表示方式の比較分析

**作成日**: 2025 年 10 月 14 日  
**目的**: outgoing/incoming 方式 vs シンプルな使用ページ一覧方式の比較

## 1. 提案されたシンプル方式

### 1.1 表示イメージ

```
リンク一覧
├─ [ページタイトルA]
│  └─ このリンクを含むページ: 5件
│     • ページ1, ページ2, ページ3, ページ4, ページ5
│
├─ [ページタイトルB]
│  └─ このリンクを含むページ: 3件
│     • ページ6, ページ7, ページ8
│
└─ [未設定リンク: TypeScript基礎]
   └─ このリンクを含むページ: 2件
      • ページ9, ページ10
```

### 1.2 メリット

#### ✅ シンプルで理解しやすい

- ユーザーは「どこでこのリンクが使われているか」だけを知りたい
- outgoing/incoming の概念を理解する必要がない
- 初心者にも直感的

#### ✅ 実装がシンプル

```typescript
interface LinkInfo {
  linkTitle: string; // or linkText for missing
  isResolved: boolean; // 設定済みか未設定か
  usagePages: Array<{
    id: string;
    title: string;
    count: number; // このページでの出現回数
  }>;
  totalUsageCount: number;
}
```

#### ✅ 一貫性がある

- 設定済みリンクも未設定リンクも同じ形式で表示
- UI の統一性が高い

#### ✅ 現在のページとの関係が明確

```
現在のページ: "React入門"

リンク一覧:
- [Next.js実践] ← 含むページ: React入門, JavaScript基礎, TypeScript入門
  → 現在のページからもリンクしている
```

## 2. outgoing/incoming 方式

### 2.1 表示イメージ

```
リンク一覧
├─ [ページタイトルA]
│  ├─ このページから (outgoing): 3回
│  └─ このページへ (incoming): 2ページ
│     • ページX, ページY
│
└─ [ページタイトルB]
   ├─ このページから (outgoing): なし
   └─ このページへ (incoming): 5ページ
      • ページZ, ...
```

### 2.2 メリット

#### ✅ 関連性の高いリンクが分かる

```
現在のページ: "React入門"

[Next.js実践]
├─ このページから: 3回 ← 頻繁に参照している
└─ このページへ: 0回 ← 参照されていない

[JavaScript基礎]
├─ このページから: 1回 ← たまに参照
└─ このページへ: 5回 ← 頻繁に参照されている（依存関係が高い）
```

**解釈**:

- "Next.js 実践"は参考資料として使っている
- "JavaScript 基礎"は前提知識として重要（多くのページから参照されている）

#### ✅ 依存関係の可視化

- **outgoing が多い** = このページは他のページに依存している（参照が多い）
- **incoming が多い** = このページは他のページから重要視されている（基礎的な内容）

#### ✅ 編集時の影響範囲が分かる

```
[TypeScript基礎] を編集する場合
└─ incoming: 10ページ
   → 10ページに影響が及ぶ可能性
```

### 2.3 デメリット

#### ❌ 複雑

- 概念の理解が必要
- 初心者には難しい

#### ❌ 実装が複雑

```typescript
interface LinkInfo {
  page: PageInfo;
  outgoing: {
    fromCurrentPage: boolean;
    count: number;
  };
  incoming: {
    toCurrentPage: boolean;
    pages: PageInfo[];
    totalCount: number;
  };
}
```

#### ❌ 情報の重複

```
ページA → ページB (outgoing)
ページB → ページA (incoming)

両方を表示すると、同じリンクが2回表示される可能性
```

## 3. ユースケース別の比較

### 3.1 「このリンクがどこで使われているか知りたい」

#### シンプル方式: ⭐⭐⭐⭐⭐

```
[React入門]
└─ 使用ページ: ページA, ページB, ページC
```

→ 一目瞭然

#### outgoing/incoming 方式: ⭐⭐⭐

```
[React入門]
├─ このページから: なし
└─ このページへ: 3ページ
```

→ incoming だけ見れば分かるが、余計な情報も表示される

### 3.2 「このページの依存関係を把握したい」

#### シンプル方式: ⭐⭐

```
リンク一覧: [Next.js], [TypeScript], [JavaScript]
```

→ どれが参照している/されているか分からない

#### outgoing/incoming 方式: ⭐⭐⭐⭐⭐

```
[Next.js] ← outgoing多い = 依存している
[TypeScript] ← outgoing多い = 依存している
[JavaScript] ← incoming多い = 基礎知識
```

→ 依存関係が明確

### 3.3 「ページを削除/編集したい」

#### シンプル方式: ⭐⭐⭐

```
[このページ]
└─ 使用ページ: 5件
```

→ 影響範囲は分かるが、方向性が不明

#### outgoing/incoming 方式: ⭐⭐⭐⭐

```
[このページ]
├─ outgoing: 3件 ← このページが参照しているページ
└─ incoming: 5件 ← このページを参照しているページ（影響範囲）
```

→ 削除した場合の影響が明確（incoming）

### 3.4 「未設定リンクを探したい」

#### シンプル方式: ⭐⭐⭐⭐⭐

```
未設定リンク
└─ [TypeScript基礎]
   └─ 使用ページ: ページA, ページB
```

→ シンプルで分かりやすい

#### outgoing/incoming 方式: ⭐⭐⭐

```
未設定リンク
└─ [TypeScript基礎]
   ├─ outgoing: ?
   └─ incoming: ?
```

→ 未設定の場合、outgoing/incoming の概念が適用しづらい

## 4. ハイブリッド方式の提案

### 4.1 基本はシンプル方式 + オプションで詳細表示

```
リンク一覧

[Next.js実践] 📊
└─ 使用ページ: 8件
   • React入門（現在のページ, 3回）
   • JavaScript基礎 (2回)
   • TypeScript入門 (1回)
   • +5件...

   [詳細を表示] ← クリックでモーダル展開

   ┌─────────────────────────────┐
   │ Next.js実践 - リンク詳細    │
   ├─────────────────────────────┤
   │ 📤 現在のページから        │
   │   • 3箇所でリンク         │
   │                           │
   │ 📥 このページへの参照     │
   │   • JavaScript基礎 (2回)  │
   │   • TypeScript入門 (1回)  │
   │   • +3件...              │
   └─────────────────────────────┘
```

### 4.2 メリット

✅ **通常はシンプル**: 初心者にも分かりやすい
✅ **詳細も確認可能**: 必要な時だけ詳細を表示
✅ **段階的な学習**: 使い慣れたら詳細機能を活用
✅ **実装の段階的導入**: まずシンプル版、後で詳細追加

## 5. 推奨アプローチ

### Phase 1: シンプル方式（MVP）

```typescript
interface SimpleLinkInfo {
  // 設定済み or 未設定
  type: "resolved" | "missing";

  // リンクの識別情報
  title: string; // 設定済みの場合
  text: string; // 未設定の場合

  // 使用状況
  usagePages: Array<{
    id: string;
    title: string;
    count: number;
    isCurrentPage: boolean; // 現在のページかどうか
  }>;

  totalCount: number;
}
```

**実装優先度**:

1. 基本的な使用ページ一覧
2. 現在のページのハイライト
3. 未設定リンクの一括解決

### Phase 2: 詳細モーダル（オプショナル）

```typescript
interface DetailedLinkInfo extends SimpleLinkInfo {
  // 詳細情報（モーダルでのみ表示）
  outgoing: {
    fromCurrentPage: boolean;
    count: number;
  };

  incoming: {
    pages: Array<{
      id: string;
      title: string;
      count: number;
    }>;
  };

  // 関連性スコア（将来の拡張）
  relevanceScore?: number;
}
```

## 6. 結論

### 推奨: シンプル方式から開始

**理由**:

1. **ユーザビリティ優先**: ほとんどのユースケースで十分
2. **実装コスト低**: 早く提供できる
3. **段階的拡張可能**: 後で詳細機能を追加できる
4. **一貫性**: 設定済み/未設定で同じ UI

**outgoing/incoming 方式が有用なケース**:

- 大規模なドキュメント管理
- 依存関係の可視化が重要なプロジェクト
- 高度なユーザー向け

**採用戦略**:

1. **MVP**: シンプル方式
2. **v1.1**: 詳細モーダル（オプション）
3. **v2.0**: グラフ可視化、依存関係分析

これにより、初心者から上級者まで満足できる設計になります。
