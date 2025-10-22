# 自動サムネイル生成機能 - 技術要件定義書

## 1. プロジェクト概要

### 1.1 機能名
- **自動サムネイル生成機能** (Automatic Thumbnail Generation)
- 機能コード: `auto-thumbnail-gen`

### 1.2 目的
- ページ作成/更新時にコンテンツの先頭画像を自動的にサムネイルとして設定する
- ページ一覧での視認性向上とユーザーエクスペリエンスの改善
- 手動でのサムネイル設定作業の自動化

### 1.3 対象範囲
- **対象**: TipTapエディタで作成された全ページのサムネイル自動生成
- **含む**: Gyazo画像、標準Image拡張による画像の自動検出
- **除外**: 動画、音声、その他のメディアファイル
- **将来拡張**: 画像以外のメディアファイルのサムネイル生成

## 2. 機能目標

1. **自動化の実現**: ページ保存時に先頭画像を自動でサムネイルに設定（100%自動化）
2. **パフォーマンス**: サムネイル抽出処理は50ms以内で完了
3. **精度**: 画像ノードの検出精度99%以上
4. **セキュリティ**: 許可ドメイン外画像の適切な除外（100%ブロック）

## 3. ユーザーストーリー

1. **学習者として**、ページに画像を追加したとき、自動的にその画像がサムネイルに設定されることで、ページ一覧での識別が容易になる。

2. **コンテンツ作成者として**、手動でサムネイルを設定する手間を省くことで、コンテンツ作成に集中できる。

3. **システム管理者として**、一貫したサムネイル表示により、システム全体の視覚的統一性を保てる。

## 4. 機能要件

### 4.1 コア機能（P0）

#### データモデル
```typescript
interface ThumbnailExtractionResult {
  thumbnailUrl: string | null;
  imageCount: number;
  extractedFrom: 'gyazoImage' | 'image' | null;
}

interface PageUpdateParams {
  id: string;
  title: string;
  content: string;
  autoGenerateThumbnail?: boolean; // デフォルト: true
}
```

#### 主要機能

**1. TipTap画像ノード抽出機能**
- **目的**: TipTap JSONContent から画像URLを抽出
- **入力**: TipTap JSONContent
- **出力**: 最初の画像のURL（文字列またはnull）
- **処理フロー**:
  1. JSONContentを再帰的に走査
  2. `gyazoImage` ノードと `image` ノードを検出
  3. 先頭の画像ノードのsrc属性を取得
  4. ドメイン許可チェック実行
- **制約条件**: 許可ドメイン以外の画像は除外

**2. ページ更新時自動サムネイル設定**
- **目的**: ページ保存時の自動サムネイル更新
- **入力**: ページID、タイトル、TipTapコンテンツ
- **出力**: 更新されたページデータ
- **処理フロー**:
  1. コンテンツから先頭画像抽出
  2. データベースのthumbnail_urlフィールド更新
  3. エラーハンドリング
- **制約条件**: 既存サムネイルの上書き

### 4.2 重要機能（P1）

**1. 新規ページ作成時対応**
- 新規ページ作成時の自動サムネイル設定
- createPage アクションの拡張

**2. バッチ更新機能**
- 既存ページの一括サムネイル更新
- 管理者向け機能として実装

### 4.3 追加機能（P2）

**1. サムネイル履歴管理**
- 過去のサムネイルURL保持
- ユーザーによる手動選択機能

**2. 画像プレビュー機能**
- サムネイル候補の複数表示
- ユーザーによる選択UI

## 5. 技術要件

### 5.1 アーキテクチャ

#### システム構成
```typescript
// 新規実装が必要なモジュール
lib/utils/
├── thumbnailExtractor.ts    // 画像抽出ロジック
└── imageValidator.ts        // ドメイン検証ロジック

app/_actions/
├── updatePage.ts           // 修正: サムネイル自動生成追加
└── createPage.ts           // 修正: サムネイル自動生成追加
```

#### 使用技術
- **フロントエンド**: Next.js 15.x、TypeScript 5.x、TipTap
- **バックエンド**: Supabase PostgreSQL
- **実行環境**: Bun 1.x

### 5.2 パフォーマンス要件
- **抽出処理時間**: 50ms以内
- **メモリ使用量**: JSONContent解析時の追加メモリ使用量は10MB以下
- **データベース**: 単一クエリでの更新（バッチ処理なし）

### 5.3 セキュリティ要件
- **ドメイン制限**: 現在の許可ドメインリスト維持
  ```typescript
  const ALLOWED_DOMAINS = [
    "scrapbox.io",    // Scrapbox
    "gyazo.com",      // Gyazo
    "i.ytimg.com",    // YouTubeサムネイル
  ];
  ```
- **URL検証**: malformedなURLの適切なハンドリング
- **XSS対策**: URLサニタイゼーション

## 6. 実装計画

### 6.1 フェーズ1: コア機能実装
- [ ] 画像抽出ユーティリティ作成 (`thumbnailExtractor.ts`)
- [ ] updatePage アクション修正
- [ ] 基本テストケース作成
- **期間**: 3日
- **成功基準**: 手動テストで先頭画像がサムネイルに設定される

### 6.2 フェーズ2: 新規作成対応
- [ ] createPage アクション修正  
- [ ] エラーハンドリング強化
- [ ] 自動テスト追加
- **期間**: 2日
- **成功基準**: 新規ページ作成時もサムネイル自動生成される

### 6.3 フェーズ3: 最適化・監視
- [ ] パフォーマンス最適化
- [ ] ロギング追加
- [ ] 管理者向けバッチ機能
- **期間**: 2日
- **成功基準**: 本番環境でのパフォーマンス要件達成

## 7. 実装詳細

### 7.1 画像抽出ロジック

```typescript
// lib/utils/thumbnailExtractor.ts
import type { JSONContent } from "@tiptap/core";

interface ImageNode {
  type: 'gyazoImage' | 'image';
  attrs: {
    src: string;
    fullWidth?: boolean;
  };
}

/**
 * TipTap JSONContent から最初の画像URLを抽出
 */
export function extractFirstImageUrl(content: JSONContent): string | null {
  // 再帰的にノードを探索
  function traverse(node: JSONContent): string | null {
    // 画像ノードの場合
    if (node.type === 'gyazoImage' || node.type === 'image') {
      const src = node.attrs?.src;
      if (typeof src === 'string' && isAllowedDomain(src)) {
        return src;
      }
    }
    
    // 子ノードを再帰的に探索
    if (node.content && Array.isArray(node.content)) {
      for (const child of node.content) {
        const result = traverse(child);
        if (result) return result;
      }
    }
    
    return null;
  }
  
  return traverse(content);
}

/**
 * ドメイン許可チェック
 */
function isAllowedDomain(url: string): boolean {
  const ALLOWED_DOMAINS = [
    "scrapbox.io",
    "gyazo.com", 
    "i.ytimg.com",
  ];
  
  try {
    const { hostname } = new URL(url);
    return ALLOWED_DOMAINS.includes(hostname);
  } catch {
    return false;
  }
}
```

### 7.2 updatePage アクション修正

```typescript
// app/_actions/updatePage.ts (修正版)
import { extractFirstImageUrl } from "@/lib/utils/thumbnailExtractor";

export async function updatePage({ 
  id, 
  title, 
  content,
  autoGenerateThumbnail = true 
}: UpdatePageParams) {
  let parsedContent: JSONContent;
  try {
    parsedContent = JSON.parse(content) as JSONContent;
  } catch (err) {
    console.error("Failed to parse content JSON in updatePage:", err);
    throw err;
  }

  const supabase = await createClient();

  // 自動サムネイル生成
  const thumbnailUrl = autoGenerateThumbnail 
    ? extractFirstImageUrl(parsedContent)
    : null;

  // ページ更新
  const { error: pageErr } = await supabase
    .from("pages")
    .update({
      title,
      content_tiptap: parsedContent,
      thumbnail_url: thumbnailUrl,
    })
    .eq("id", id);
    
  if (pageErr) {
    throw pageErr;
  }

  // リンクデータ同期は既存通り
  const { outgoingIds } = extractLinkData(parsedContent);
  // ... 既存のリンク同期処理

  return { success: true };
}
```

## 8. テスト要件

### 8.1 単体テスト
- [ ] `extractFirstImageUrl` 関数のテスト
  - 正常ケース: 先頭画像の正しい抽出
  - 異常ケース: 画像なし、不正URL、許可外ドメイン
- [ ] ドメイン検証ロジックのテスト

### 8.2 統合テスト
- [ ] updatePage アクションのテスト
- [ ] データベース更新の確認
- [ ] エラーハンドリングのテスト

### 8.3 E2Eテスト
- [ ] ページ作成→画像追加→保存→サムネイル確認
- [ ] 複数画像がある場合の先頭画像選択
- [ ] ページ一覧でのサムネイル表示確認

## 9. 制約条件

### 9.1 技術的制約
- **TipTap互換性**: 現在のTipTap拡張との互換性維持
- **JSONContent構造**: 既存のJSONContent構造への依存
- **ドメイン制限**: セキュリティ上の許可ドメインリスト

### 9.2 ビジネス制約
- **既存データ**: 既存ページのサムネイルは手動更新のみ
- **パフォーマンス**: ページ保存時の体感速度への影響なし

### 9.3 法的制約
- **著作権**: 外部画像の利用における著作権遵守
- **プライバシー**: ユーザーがアップロードした画像の適切な取り扱い

## 10. 成功指標

### 10.1 定量的指標
- **自動化率**: 画像を含むページの95%以上でサムネイル自動生成
- **処理時間**: サムネイル抽出処理50ms以内
- **エラー率**: サムネイル生成エラー1%未満
- **精度**: 画像検出精度99%以上

### 10.2 定性的指標
- **ユーザビリティ**: ページ一覧の視認性向上
- **作業効率**: 手動サムネイル設定作業の削減
- **システム一貫性**: 統一されたサムネイル表示

## 11. リスクと対策

### 11.1 技術リスク
- **リスク**: TipTap JSONContent構造の変更
  - **対策**: バージョン固定、後方互換性の確保
- **リスク**: 大量画像による処理時間増加
  - **対策**: 先頭画像のみの処理、早期リターン実装

### 11.2 ビジネスリスク
- **リスク**: 既存ユーザーのワークフロー変更
  - **対策**: オプトアウト機能の提供
- **リスク**: 外部画像サービスの仕様変更
  - **対策**: エラーハンドリングの強化、フォールバック機能

## 12. 付録

### 12.1 用語集
- **TipTap**: リッチテキストエディタライブラリ
- **JSONContent**: TipTapの内部データ形式
- **サムネイル**: ページ一覧表示用の代表画像
- **Gyazo**: 画像共有サービス

### 12.2 参考資料
- [TipTap Documentation](https://tiptap.dev/)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- 既存実装: `app/(protected)/pages/_components/pages-list.tsx`
- 現在のサムネイル表示ロジック: lines 69-95

### 12.3 関連ドキュメント
- `.docs/reverse/for-all-learners-database.md`: データベース設計
- `lib/tiptap-extensions/`: TipTap拡張機能
- `types/database.types.ts`: 型定義
