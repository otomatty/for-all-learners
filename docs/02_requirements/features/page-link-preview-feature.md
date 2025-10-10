# 製品要件書 (PRD): ページリンクプレビュー機能

## 1. プロジェクト概要

### 1.1 製品名
- **機能名**: ページリンクプレビュー機能 (Page Link Preview Feature)
- **対象システム**: For All Learners 学習アプリ

### 1.2 目的
- **解決する課題**: 現在のページ間リンクでは、リンク先の内容が不明なため、ユーザーがリンクをクリックする際に迷いや不安を感じる
- **存在意義**: Wikiライクなナビゲーション体験を提供し、学習効率を向上させる
- **期待される効果**: 
  - リンククリック前に内容把握が可能
  - 学習フローの向上
  - ページ間の関連性の可視化

### 1.3 対象範囲
- **対象**: tiptapエディター内のページ間リンク（ブラケットリンク `[ページ名]`）
- **対象ページ**: 通常ページ（`/pages/[id]`）およびnote内ページ（`/notes/[slug]/[id]`）
- **除外**: 外部リンク、未設定リンク（赤文字リンク）
- **将来拡張**: タグリンク（`#タグ名`）、画像プレビュー

## 2. 製品目標

1. **ユーザビリティ向上**: ホバー時に0.5秒以内でプレビューを表示し、直感的なナビゲーション体験を提供
2. **学習効率向上**: リンク先の概要把握により、不要なページ遷移を30%削減
3. **パフォーマンス維持**: プレビュー機能追加によるページ表示速度の劣化を5%以内に抑制
4. **技術債務削減**: 既存のtippy.js実装を活用し、新たな依存関係を最小化

## 3. ユーザーストーリー

1. **学習者として**、ページ内のリンクにホバーしたときに内容プレビューを見たい。それにより、リンク先の内容を事前に把握でき、効率的な学習ができる。

2. **note作成者として**、note内のページリンクプレビューでnote情報も表示したい。それにより、関連ページの整理や管理が容易になる。

3. **復習者として**、過去に学習したページへのリンクで更新日時を確認したい。それにより、情報の新しさを判断できる。

## 4. 機能要件

### 4.1 コア機能（P0）

#### データモデル
```typescript
interface PagePreview {
  id: string;
  title: string;
  content_preview: string; // 先頭200文字のプレーンテキスト
  thumbnail_url?: string | null;
  updated_at: string;
  // note関連情報（note内ページの場合）
  note_info?: {
    title: string;
    slug: string;
  };
}

interface PreviewCache {
  data: Map<string, PagePreview>;
  timestamps: Map<string, number>;
  maxAge: number; // 5分間
}
```

#### 主要機能
1. **ホバー検出**
   - 有効なページリンク（青文字）のhover開始検出
   - 500ms のdelay後にプレビュー表示開始
   - マウスアウト時の即座に非表示

2. **プレビューデータ取得**
   - ページIDに基づくSupabaseクエリ
   - note関連情報の付加取得
   - メモリキャッシュによる重複リクエスト防止

3. **プレビューUI表示**
   - tippy.jsによるツールチップ表示
   - レスポンシブ対応（最大幅320px）
   - 読み込み中インジケーター

#### 処理フロー
```
ユーザーホバー → delay(500ms) → キャッシュ確認 → 
  ├─ キャッシュHit: 即座に表示
  └─ キャッシュMiss: API取得 → 表示 → キャッシュ保存
```

### 4.2 重要機能（P1）
- **プレビュー内容の最適化**: 画像を含む場合の適切な表示
- **エラーハンドリング**: 削除済みページや権限エラーの適切な表示
- **キーボードナビゲーション**: ESCキーでのプレビュー非表示

### 4.3 追加機能（P2）
- **プレビュー内リンク**: プレビュー内のリンクのクリック対応
- **アニメーション**: フェードイン・アウト効果
- **設定**: ユーザーによるプレビュー機能のON/OFF

## 5. 技術要件

### 5.1 アーキテクチャ
```
┌─ PageLink Extension (tiptap) - 既存のpage-link.ts拡張
│  ├─ existencePlugin (decoration拡張) - data-page-id属性追加のみ
│  ├─ previewPlugin (新規追加) - suggestionPluginパターン流用
│  └─ tippy.js integration - 既存実装（300-316行目）を参考
├─ Preview Service (新規作成)
│  ├─ Supabase Client - createClient()利用
│  ├─ Cache Manager - 軽量なMap実装
│  └─ Content Processor - extractText関数活用
└─ UI Components (新規作成)
   ├─ PreviewCard - React+TailwindCSS
   ├─ LoadingSpinner - 既存コンポーネント流用
   └─ ErrorFallback - 軽量実装
```

### 5.2 パフォーマンス要件
- **初回表示**: ホバー後800ms以内
- **キャッシュ表示**: ホバー後100ms以内
- **メモリ使用量**: プレビューキャッシュは最大50件まで
- **API呼び出し**: 同一ページIDの重複リクエスト防止

### 5.3 データ要件
```sql
-- 必要なSupabaseクエリ
SELECT 
  p.id, p.title, p.content_tiptap, p.thumbnail_url, p.updated_at,
  n.title as note_title, n.slug as note_slug
FROM pages p
LEFT JOIN note_page_links npl ON p.id = npl.page_id
LEFT JOIN notes n ON npl.note_id = n.id
WHERE p.id = $1;
```

## 6. 開発計画

### 6.1 フェーズ1: コア機能実装 (2-3日)
- [ ] existencePluginにdata-page-id属性追加（pageId既に取得済みのため簡単）
- [ ] 既存suggestionPluginパターンを参考にpreviewPlugin実装
- [ ] tippy.js統合（既存パターン流用で工数削減）
- [ ] 基本的なPreviewCard UI実装
- [ ] メモリキャッシュ実装

### 6.2 フェーズ2: UI/UX改善 (2-3日)  
- [ ] ローディング状態の実装
- [ ] エラーハンドリング実装
- [ ] note情報表示
- [ ] レスポンシブ対応

### 6.3 フェーズ3: 最適化・テスト (1-2日)
- [ ] パフォーマンス最適化
- [ ] ユニットテスト実装
- [ ] E2Eテスト実装
- [ ] アクセシビリティ対応

## 7. 制約条件

### 7.1 技術的制約
- **必須技術**: 既存のtippy.js v6.x、ProseMirror、Supabase
- **互換性**: 既存のPageLinkExtensionとの共存
- **メモリ制限**: ブラウザメモリ使用量を最小限に抑制

### 7.2 ビジネス制約
- **開発期間**: 最大1週間
- **品質基準**: 既存機能への影響なし
- **保守性**: 既存コードベースとの一貫性

### 7.3 セキュリティ制約
- **認証**: 現在のページアクセス権限を継承
- **プライバシー**: 非公開ページのプレビュー制限
- **XSS対策**: プレビュー内容のサニタイズ

## 8. 成功指標

### 8.1 定量的指標
- **表示速度**: ホバー後500ms以内での表示達成率 >95%
- **キャッシュ効率**: 2回目以降のアクセスでの表示速度 <100ms
- **エラー率**: プレビュー表示失敗率 <1%
- **パフォーマンス**: 既存ページ表示速度の劣化 <5%

### 8.2 定性的指標
- **ユーザビリティ**: 直感的で分かりやすいプレビュー表示
- **一貫性**: 既存UIとの統一感
- **アクセシビリティ**: スクリーンリーダー対応

## 9. リスクと対策

### 9.1 技術リスク
- **リスク**: tippy.jsとProseMirrorの競合
  - **対策**: 既存実装パターンの踏襲、段階的実装
- **リスク**: 大量のAPI呼び出しによるパフォーマンス劣化
  - **対策**: 積極的なキャッシュ利用、debounce実装

### 9.2 UXリスク
- **リスク**: プレビューが邪魔になる
  - **対策**: 適切なdelay設定、ESCキーでの非表示
- **リスク**: プレビュー内容が有用でない
  - **対策**: 表示内容の最適化、ユーザーフィードバック収集

## 10. 実装詳細

### 10.1 主要コンポーネント
```typescript
// lib/tiptap-extensions/page-link-preview.ts
export interface PageLinkPreviewOptions {
  enabled: boolean;
  delay: number;
  maxWidth: number;
  cacheMaxAge: number;
}

// components/page-link-preview-card.tsx
export interface PreviewCardProps {
  preview: PagePreview;
  isLoading: boolean;
  error?: string;
}
```

### 10.2 API設計
```typescript
// lib/services/page-preview-service.ts
export class PagePreviewService {
  async getPreview(pageId: string): Promise<PagePreview>;
  clearCache(): void;
  getCacheStats(): CacheStats;
}
```

### 10.3 スタイル仕様
```css
.page-preview-card {
  max-width: 320px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  padding: 16px;
}
```

## 11. 付録

### 11.1 用語集
- **ブラケットリンク**: `[ページ名]` 形式のページ間リンク
- **tippy.js**: ツールチップライブラリ
- **ProseMirror**: リッチテキストエディタのコアライブラリ
- **decoration**: ProseMirrorの描画拡張機能

### 11.2 参考資料
- [tippy.js Documentation](https://atomiks.github.io/tippyjs/)
- [ProseMirror Plugin API](https://prosemirror.net/docs/ref/#state.Plugin)
- 既存実装: `lib/tiptap-extensions/page-link.ts`
