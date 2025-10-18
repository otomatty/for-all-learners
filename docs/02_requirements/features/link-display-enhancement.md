# リンク一覧表示機能の改善 - 要件定義書

**作成日**: 2025 年 10 月 14 日  
**対象ファイル**: `app/(protected)/pages/[id]/_components/page-links-grid.tsx`  
**関連ブランチ**: feature/unified-link-migration-and-tdd

## 1. 現状分析

### 1.1 現在の表示仕様

**構成**:

- **リンクしているページ**: `outgoingPages` と `incomingPages` をマージした一覧
- **未設定リンク一覧**: `missingLinks` のリスト

**問題点**:

1. **リンクごとの詳細情報がない**
   - どのページで何回使われているか不明
   - リンクの方向性（outgoing/incoming）が不明確
2. **未設定リンクの情報不足**

   - 未設定リンクがどのページで使われているか表示されない
   - クロスリファレンスができない

3. **統一性の欠如**
   - 設定済みリンクと未設定リンクで情報量が異なる
   - UI の一貫性がない

### 1.2 データ構造

```typescript
interface PageLinksGridProps {
  outgoingPages: Array<{
    id: string;
    title: string;
    thumbnail_url: string | null;
    content_tiptap: JSONContent;
  }>;
  missingLinks: string[]; // リンク名の配列のみ
  incomingPages: Array<{
    id: string;
    title: string;
    thumbnail_url: string | null;
    content_tiptap: JSONContent;
  }>;
  nestedLinks: Record<string, string[]>; // 各ページがリンクしているページのID
  noteSlug?: string;
}
```

## 2. 改善要件

### 2.1 基本方針

#### シンプルな表示方式

- リンク先が存在するかどうかに関わらず、**同じリンクテキスト/タイトルを使用しているページをすべて表示**
- 「このページから」「このページへ」という方向性は表示しない
- カード形式でグリッド配置

#### リンクの分類ルール

1. **通常リンク（設定済み）**
   - リンク先ページが存在する場合
   - **または**、他のページで同じリンクテキストが使われている場合
2. **未設定リンク（真の未設定）**
   - リンク先ページが存在せず
   - **かつ**、他のどのページでも使われていない場合

### 2.2 新しい UI 構成

#### シンプルな階層構造

```
リンク一覧（カードグリッド）

[React入門] ★
├─ このリンクを含むページ: 5件
└─ • JavaScript基礎（現在のページ, 3回）
   • TypeScript入門 (2回)
   • Next.js実践 (1回)
   • +2件...

[Next.js実践]
├─ このリンクを含むページ: 3件
└─ • React入門（現在のページ, 2回）
   • JavaScript基礎 (1回)
   • +1件...

[TypeScript基礎] ⚠️ (真の未設定)
├─ このリンクを含むページ: 1件
└─ • React入門（現在のページ, 1回）
```

### 2.3 表示情報

#### すべてのリンクカード（共通項目）

1. **リンクタイトル/テキスト**
   - ページが存在する場合: ページタイトル
   - 存在しない場合: リンクテキスト
2. **使用ページ一覧**
   - このリンクを含むすべてのページ
   - 現在のページは ★ でハイライト
   - 各ページでの出現回数
   - 5 件以上は「+N 件...」で省略
3. **総使用回数**
   - 全ページでの合計出現回数

#### 真の未設定リンクのみ追加項目

- ⚠️ 警告アイコン
- 「ページを作成」ボタン

### 2.4 インタラクション

#### カードクリック

- **リンク先ページが存在する場合**: そのページへ遷移
- **存在しない場合**: 新規ページ作成ダイアログを開く

#### 詳細表示（オプション）

- カード内の「詳細」ボタン: 全使用ページのリストをモーダル表示

## 3. 技術要件

### 3.1 データ取得の拡張

#### 必要な追加情報

1. **各リンクの使用回数**

   ```typescript
   // エディタのJSONContentを解析して、各リンクの出現回数をカウント
   interface LinkUsage {
     linkText: string;
     count: number;
     positions: Array<{ from: number; to: number }>;
   }
   ```

2. **未設定リンクの使用ページ情報**
   ```sql
   -- 未設定リンクを含むページを検索
   -- content_tiptapをJSONBとして検索
   SELECT
     p.id,
     p.title,
     p.content_tiptap
   FROM pages p
   WHERE p.content_tiptap::text LIKE '%[未設定リンクテキスト]%'
   ```

### 3.2 新しい Props インターフェース（シンプル版）

```typescript
interface SimplifiedPageLinksGridProps {
  // すべてのリンク（設定済み + 未設定）
  links: Array<{
    // リンクの識別情報
    linkText: string; // リンクテキスト/タイトル

    // リンク先ページ情報（存在する場合）
    targetPage?: {
      id: string;
      title: string;
      thumbnail_url: string | null;
      content_tiptap: JSONContent;
    };

    // リンクの状態
    status: "resolved" | "cross-referenced" | "missing";
    // resolved: リンク先ページが存在
    // cross-referenced: リンク先ページはないが他のページで使用されている → 最初の使用ページへ遷移
    // missing: どこでも使われていない（真の未設定） → ページ作成

    // cross-referencedの場合の遷移先（最初の使用ページ）
    firstUsagePage?: {
      id: string;
      title: string;
      thumbnail_url: string | null;
      content_tiptap: JSONContent;
    };
  }>;

  currentPageId: string;
  noteSlug?: string;
}
```

**シンプル化のポイント**:

- カード表示に必要な最小限の情報のみ
- 使用ページ一覧、出現回数などの詳細情報は削除
- ページ情報は既存のページカードと同じ構造

### 3.3 コンポーネント構成

```
PageLinksGrid (メインコンポーネント)
└─ Link[] または Card[] (シンプルなカード)
   ├─ resolved / cross-referenced の場合
   │  └─ <Link href={pageUrl}>
   │     └─ <Card> (既存のpages-listと同じデザイン)
   │        ├─ CardHeader: タイトル
   │        └─ CardContent: サムネイルまたはテキストプレビュー
   └─ missing の場合
      └─ <Card onClick={handleCreate}> (既存の未設定リンクと同じデザイン)
         ├─ CardHeader: リンクテキスト（グレー）
         └─ CardContent: スケルトンプレースホルダー
```

**コンポーネントの再利用**:

- 既存の `page-links-grid.tsx` のカードデザインをそのまま使用
- 既存の `pages-list.tsx` のカードデザインをそのまま使用
- 新規 UI コンポーネントの作成は不要

**カードの状態による表示の違い**:

- `resolved`: 通常表示、クリックでページ遷移
- `cross-referenced`: 通常表示だがページ遷移はなし、クリックで詳細モーダル
- `missing`: ⚠️ アイコン表示、クリックでページ作成ダイアログ

## 4. UI/UX デザイン

### 4.1 レイアウト

**グリッドレイアウト**:

- デスクトップ: 3-4 カラム
- タブレット: 2-3 カラム
- モバイル: 1 カラム

## 4. UI/UX デザイン

### 4.1 レイアウト

**グリッドレイアウト（既存の page-links-grid と同じ）**:

```css
grid-cols-2 md:grid-cols-3 lg:grid-cols-4
gap-2 md:gap-4
```

- モバイル: 2 カラム
- タブレット: 3 カラム
- デスクトップ: 4 カラム

### 4.2 カードデザイン（既存コンポーネントを活用）

#### 4.2.1 設定済みリンク（resolved / cross-referenced）

**既存の `pages-list.tsx` と同じデザインを使用**:

```tsx
<Card className="h-full overflow-hidden transition-all hover:shadow-md py-4 gap-2">
  <CardHeader className="px-4 py-2">
    <CardTitle>{linkTitle}</CardTitle>
  </CardHeader>
  <CardContent className="px-4">
    {thumbnail_url ? (
      <Image
        src={thumbnail_url}
        alt={title}
        width={400}
        height={200}
        className="w-full h-32 object-contain"
      />
    ) : (
      <p className="line-clamp-5 text-sm text-muted-foreground">
        {contentPreview}
      </p>
    )}
  </CardContent>
</Card>
```

**表示内容**:

- タイトル: リンク先ページのタイトル
- コンテンツプレビュー: サムネイルまたはテキストの最初の 5 行

#### 4.2.2 未設定リンク（missing）

**既存の `page-links-grid.tsx` の未設定リンクと同じデザインを使用**:

```tsx
<Card className="h-full overflow-hidden transition-all hover:shadow-md py-2 md:py-4 gap-2 cursor-pointer">
  <CardHeader className="px-2 md:px-4">
    <CardTitle className="text-muted-foreground">{linkText}</CardTitle>
  </CardHeader>
  <CardContent className="space-y-2 px-2 md:px-4">
    <div className="h-4 bg-gray-200 rounded w-full" />
    <div className="h-4 bg-gray-200 rounded w-full" />
    <div className="h-4 bg-gray-200 rounded w-full" />
    <div className="h-4 bg-gray-200 rounded w-full" />
    <div className="h-4 bg-gray-200 rounded w-3/4" />
  </CardContent>
</Card>
```

**表示内容**:

- タイトル: リンクテキスト（グレー表示）
- スケルトン: プレースホルダーとして 5 本の灰色バー

### 4.3 インタラクション

**クリック動作**:

- **resolved**: リンク先ページへ遷移（`<Link href={...}>`）
- **cross-referenced**: 最初の使用ページへ遷移（`<Link href={...}>`）
- **missing**: ページ作成処理（`onClick={handleMissingLinkClick}`）

**ホバー効果**:

- `hover:shadow-md` - すべてのカードで統一

### 4.4 シンプル化の方針

**削除する要素**:

- ❌ 使用ページカウント表示
- ❌ 使用ページリスト表示
- ❌ 詳細ボタン
- ❌ アイコン表示
- ❌ バッジ表示

**理由**:

- ページカードと同じシンプルなデザインで統一
- クリックしてページに遷移するのが主要なアクション
- 情報の詰め込みを避け、視覚的なノイズを減らす

### 4.2 カラーとスタイル

**カードの背景色**:

- `resolved`: デフォルト（Card 標準背景）
- `cross-referenced`: 薄い黄色のボーダー（info）
- `missing`: 薄い赤のボーダー（destructive）

**テキストの強調**:

- 現在のページ: ★ + 太字
- 他のページ: 通常

### 4.3 アイコン

- � `Link`: 設定済みリンク（resolved）
- � `RefreshCw`: クロスリファレンスリンク（cross-referenced）
- ⚠️ `AlertCircle`: 真の未設定リンク（missing）
- ➕ `Plus`: ページ作成ボタン

## 5. 実装段階（シンプル版）

### Phase 1: データ取得とロジックの実装

- [ ] リンクの分類ロジック（resolved/cross-referenced/missing）
- [ ] クロスリファレンス検索（他のページで同じリンクテキストが使われているか）
- [ ] サーバーサイドでのデータ前処理

### Phase 2: UI の更新

- [ ] 既存の `page-links-grid.tsx` を更新
- [ ] resolved/cross-referenced: 既存の設定済みリンクカードを使用
- [ ] missing: 既存の未設定リンクカードを使用
- [ ] 新規 UI コンポーネントは不要

### Phase 3: テスト

- [ ] リンク分類ロジックのユニットテスト
- [ ] クロスリファレンス検索のテスト
- [ ] E2E: カードクリックでの遷移テスト

## 6. パフォーマンス考慮事項

### 6.1 データ量の最適化

- **ページネーション**: リンクが多い場合は 10 件ずつ表示
- **遅延ロード**: スクロールに応じて追加ロード
- **キャッシュ**: リンク情報をクライアントサイドでキャッシュ

### 6.2 検索の最適化

```sql
-- インデックスの活用
CREATE INDEX idx_pages_content_gin ON pages USING gin(content_tiptap);

-- 全ページから特定のリンクテキストを含むページを検索
-- UnifiedLinkMarkのbracket variantとtag variantの両方を検索
SELECT
  p.id,
  p.title,
  p.content_tiptap
FROM pages p
WHERE
  p.content_tiptap::text LIKE '%"type":"unilink"%'
  AND (
    p.content_tiptap::text LIKE '%"linkText":"リンクテキスト"%'
    OR p.content_tiptap::text LIKE '%"title":"リンクテキスト"%'
  );
```

## 7. アクセシビリティ

- **キーボードナビゲーション**: Tab/Enter でカード選択
- **スクリーンリーダー**: aria-label でリンク情報を説明
- **フォーカス管理**: モーダル開閉時の適切なフォーカス移動

## 8. 今後の拡張可能性

### 将来的な機能

1. **リンクグラフ**: D3.js を使った可視化
2. **リンク強度**: 使用頻度に応じた重み付け
3. **推奨リンク**: AI によるリンク提案
4. **リンク履歴**: 時系列でのリンク変化追跡
5. **バッチ操作**: 複数リンクの一括編集/削除

## 9. 関連ドキュメント

- [UnifiedLinkMark 仕様書](../../03_design/specifications/unified-link-mark-spec.md)
- [クロスページリンク解決機能](./20251014_03_cross-page-link-resolution.md)
- [リンク機能実装調査](../../07_research/2025_10/20251010/link-implementation-investigation.md)

## 10. 重要な仕様変更（2025 年 10 月 14 日）

### 10.1 シンプル方式の採用

**変更理由**:

- outgoing/incoming の概念は複雑で、初心者には理解しづらい
- ほとんどのユースケースでは「どこで使われているか」が分かれば十分
- 実装がシンプルで、保守性が高い

**新しいロジック**:

```typescript
// リンクの分類
if (リンク先ページが存在する) {
  status = "resolved";
} else if (他のページで同じリンクテキストが使われている) {
  status = "cross-referenced"; // 未設定ではなく通常リンクとして扱う
} else {
  status = "missing"; // 真の未設定
}
```

### 10.2 UI 設計の変更点

**Before**:

- 設定済みと未設定で UI が異なる
- outgoing/incoming を別々に表示

**After**:

- すべてのリンクで統一されたカード UI
- 使用ページをシンプルに一覧表示
- カードクリックで直接ページ遷移（resolved の場合）

## 11. まとめ

この要件定義により、以下が実現されます:

1. **シンプルで直感的**: 誰でも理解できる UI
2. **一貫性の確保**: すべてのリンクで統一されたカードデザイン
3. **クロスリファレンスの活用**: 他のページで使われているリンクは未設定扱いしない
4. **効率的なナビゲーション**: カードクリックで直接遷移
5. **拡張性**: 将来的に詳細情報モーダルを追加可能

次のステップは Phase 1 の実装から開始します。
