# クロスページリンク解決機能の実装

**作成日**: 2025 年 10 月 14 日
**対応ブランチ**: feature/unified-link-migration-and-tdd
**関連 Issue**: N/A

## 概要

複数のページにまたがる未設定リンクの問題を解決するため、クロスページでのリンク状態共有機能を実装しました。これにより、ページ A で未設定だったリンクが、ページ B で設定済みの場合、ページ A でも自動的に設定済みとして表示されるようになります。

## 背景

### 従来の問題

- 各ページのエディタが独立してリンクを解決していた
- 同じリンクテキストが複数ページに存在する場合、それぞれのページで個別に解決が必要だった
- ページ A で「[既存ページ]」というリンクがあり、実際にそのページが存在しても、ページ A を開いた時点でキャッシュがなければ赤文字（未設定）で表示されていた

### ユーザーへの影響

- 実際にはページが存在するのに、未設定リンク（赤文字）として表示される
- 複数ページで同じリンクを作成する際、各ページで個別に解決を待つ必要がある
- ユーザー体験の低下

## 実装内容

### 1. キャッシュ機構の強化

**ファイル**: `lib/unilink/utils.ts`

#### 変更点

- **SessionStorage 連携**: メモリキャッシュを SessionStorage に永続化
- **TTL 延長**: 30 秒 → 5 分に延長（クロスページ共有を考慮）
- **自動ロード**: モジュール初期化時に SessionStorage からキャッシュを復元
- **キー正規化**: `getCachedPageId`で自動的にキーを正規化して検索

#### 主要な関数

```typescript
// 強化されたキャッシュ取得（自動正規化付き）
export const getCachedPageId = (key: string): string | null => {
  const normalizedKey = normalizeTitleToKey(key);
  // メモリ → SessionStorage の順で検索
  // ...
};

// 一括キャッシュ設定（プリロード用）
export const setCachedPageIds = (
  entries: Array<{ key: string; pageId: string }>
): void => {
  // ...
};
```

### 2. ページタイトルのプリロード機能

**ファイル**: `lib/unilink/page-cache-preloader.ts` (新規作成)

#### 機能

- エディタ起動時に全ページのタイトルと ID をキャッシュにプリロード
- 新しいページが作成されたときにキャッシュに追加

#### 主要な関数

```typescript
// 全ページタイトルをプリロード
export async function preloadPageTitles(userId?: string): Promise<number>;

// 単一ページをキャッシュに追加
export function addPageToCache(pageId: string, title: string): void;
```

#### エディタ統合

**ファイル**: `app/(protected)/pages/[id]/_hooks/usePageEditorLogic.ts`

```typescript
onCreate({ editor }) {
  // エディタ起動時にページタイトルをプリロード
  void preloadPageTitles(page.user_id).catch(() => {
    // プリロードは最適化のため、失敗しても無視
  });
  // ...
}
```

### 3. リアルタイムリスナーの統合

**ファイル**: `lib/unilink/realtime-listener.ts`

#### 変更点

新しいページが作成されたときに、即座にキャッシュに追加する機能を追加:

```typescript
const handlePageInsert = (payload: any): void => {
  // ...
  // 新規ページをキャッシュに即座に追加
  addPageToCache(pageId, newRecord.title);

  // 全エディタに通知（refreshUnifiedLinksを呼び出し可能）
  state.handlers.forEach((handler) => {
    handler(key, pageId);
  });
};
```

### 4. テストの追加

**ファイル**: `lib/unilink/__tests__/page-cache-preloader.test.ts` (新規作成)

#### テストケース

1. **一括プリロード**: 複数ページのタイトルを一度にキャッシュ
2. **正規化されたキー**: 空白やケースが異なる場合でも正しく検索
3. **単一ページ追加**: 新規ページ作成時のキャッシュ追加
4. **クロスページ解決**: 複数エディタ間でのキャッシュ共有
5. **即時認識**: 新規ページが即座に他のエディタで認識される

## 技術的な詳細

### キャッシュの仕組み

```
[ページA] ←→ [メモリキャッシュ] ←→ [SessionStorage] ←→ [メモリキャッシュ] ←→ [ページB]
```

1. **起動時**: 各エディタが SessionStorage からキャッシュをロード
2. **プリロード**: 全ページタイトルを Supabase から取得してキャッシュに保存
3. **リンク解決**: キャッシュを優先的に参照（高速化）
4. **新規ページ作成**: Realtime 経由で全エディタのキャッシュを更新

### データフロー

```
新規ページ作成
  ↓
Supabase Realtime
  ↓
RealtimeListener.handlePageInsert()
  ↓
addPageToCache() → SessionStorageに保存
  ↓
全エディタで利用可能
```

## 効果

### パフォーマンス向上

- **初回ロード**: 全ページタイトルを事前キャッシュ → リンク解決が即座に完了
- **検索削減**: キャッシュヒット率の向上により、Supabase への問い合わせが減少
- **TTL 延長**: 5 分間キャッシュが有効 → ページ間移動時の再検索を削減

### ユーザー体験の改善

- **一貫性**: 同じリンクテキストが全ページで同じ色で表示
- **即時反映**: 新規ページ作成が即座に他のエディタに反映
- **赤文字の削減**: 既存ページへのリンクが正しく青色で表示

## テスト結果

```bash
bun test lib/unilink/__tests__/page-cache-preloader.test.ts
```

- ✅ 8 つのテストケースすべてパス
- ✅ キャッシュの一括設定
- ✅ キー正規化
- ✅ クロスページ解決
- ✅ リアルタイム更新

## 今後の改善案

### 短期

1. **キャッシュサイズ制限**: 大規模プロジェクトでのメモリ使用量管理
2. **TTL 設定のカスタマイズ**: ユーザー設定で TTL を調整可能に

### 中期

3. **IndexedDB 対応**: ブラウザ再起動後もキャッシュを維持
4. **差分更新**: ページタイトル変更時のキャッシュ更新

### 長期

5. **サーバーサイドキャッシュ**: Redis 等を使った全ユーザー共有キャッシュ
6. **機械学習**: よく使われるリンクの優先的プリロード

## 関連ファイル

### 新規作成

- `lib/unilink/page-cache-preloader.ts`
- `lib/unilink/__tests__/page-cache-preloader.test.ts`

### 変更

- `lib/unilink/utils.ts` - キャッシュ機構の強化
- `lib/unilink/realtime-listener.ts` - キャッシュ更新機能の追加
- `lib/unilink/index.ts` - エクスポートの追加
- `app/(protected)/pages/[id]/_hooks/usePageEditorLogic.ts` - プリロード機能の統合

## まとめ

この実装により、複数ページ間でのリンク状態の共有が実現され、ユーザー体験が大幅に向上しました。既存の AutoReconciler や RealtimeListener とシームレスに統合され、パフォーマンスの低下もありません。

SessionStorage を活用することで、ページをまたいだキャッシュ共有が可能になり、同じブラウザセッション内であれば、どのページでも即座にリンクが解決されるようになりました。
