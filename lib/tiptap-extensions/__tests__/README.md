# UnifiedLinkMark テストスイート

UnifiedLinkMark とその関連機能の包括的なテストケース

## テストファイル

### 1. `unified-link-mark.test.ts`

UnifiedLinkMark の主要機能をテスト

**カバレッジ:**

- ✅ 基本機能（Mark 登録、priority、inclusive）
- ✅ InputRule（ブラケット記法変換）
- ✅ 外部リンク検出
- ✅ 状態管理（pending → exists/missing/error）
- ✅ キャッシュ機能
- ✅ 正規化（タイトル正規化）
- ✅ コマンド（insertUnifiedLink, refreshUnifiedLinks）
- ✅ 属性定義とデフォルト値
- ✅ HTML レンダリング
- ✅ Mark 優先順位（bold/italic との組み合わせ）
- ✅ エッジケース
- ✅ 完全一致検索

**テストケース数:** 40+

### 2. `utils.test.ts`

Unilink ユーティリティ関数のテスト

**カバレッジ:**

- ✅ `normalizeTitleToKey`（正規化ロジック）
  - 空白の正規化
  - 全角・半角変換
  - アンダースコア変換
  - Unicode NFC 正規化
- ✅ キャッシュ機能
  - `setCachedPageId` / `getCachedPageId`
  - TTL（Time To Live）
  - `clearCache`
- ✅ エッジケース
- ✅ パフォーマンステスト
- ✅ 統合テスト

**テストケース数:** 30+

### 3. `resolver.test.ts`

ページ作成とナビゲーション機能のテスト

**カバレッジ:**

- ✅ `createPageFromMark`（ページ作成）
- ✅ `updateMarkToExists`（マーク状態更新）
- ✅ `navigateToPage`（ページ遷移）
- ✅ `handleMissingLinkClick`（missing リンククリック処理）
- ✅ エラーハンドリング
- ✅ BroadcastChannel 統合
- ✅ エッジケース
- ✅ 統合テスト

**テストケース数:** 25+

## テスト実行

### 全テスト実行

```bash
bun test
```

### 特定ファイルのテスト

```bash
bun test unified-link-mark.test.ts
bun test utils.test.ts
bun test resolver.test.ts
```

### ウォッチモード

```bash
bun test --watch
```

### カバレッジレポート

```bash
bun test --coverage
```

### UI モード

```bash
bun test --ui
```

## モック依存関係

テストでは以下の依存関係をモックしています：

- `searchPages` - ページ検索 API
- `createPage` - ページ作成 Server Action
- `toast` - トースト通知（sonner）
- `metrics` - メトリクス記録関数
- `BroadcastChannel` - クロスタブ通信
- `AutoReconciler` - 自動再解決

## テストデータ

### サンプルページ

```typescript
{
  id: "page-123",
  title: "Test Page",
  content_tiptap: { /* ... */ }
}
```

### サンプル Mark 属性

```typescript
{
  variant: "bracket",
  raw: "Test Page",
  text: "Test Page",
  key: "Test Page",
  pageId: "page-123",
  href: "/pages/page-123",
  state: "exists",
  exists: true,
  markId: "unilink-abc123"
}
```

## カバレッジ目標

- **Line Coverage**: > 80%
- **Branch Coverage**: > 75%
- **Function Coverage**: > 80%

## 既知の制限事項

1. **非同期解決のタイミング**

   - テストで `setTimeout` を使用して非同期処理を待機
   - 実際の実装ではデバウンス時間が可変

2. **TTL テスト**

   - キャッシュ TTL（30 秒）のテストは時間がかかるため、メカニズムの存在のみ確認

3. **BroadcastChannel**

   - モック実装のため、実際のクロスタブ通信は統合テストで検証が必要

4. **Editor インスタンス**
   - 完全な TipTap エディタを初期化するため、テスト実行時間が長め

## トラブルシューティング

### テストが失敗する場合

1. **依存関係の確認**

   ```bash
   bun install
   ```

2. **キャッシュのクリア**

   ```bash
   rm -rf node_modules/.cache
   ```

3. **型エラー**
   - `tsconfig.json` の設定を確認
   - `@tiptap/core` のバージョンを確認

### パフォーマンスの問題

- テストが遅い場合は `--maxWorkers` オプションを調整
  ```bash
  bun test --maxWorkers=4
  ```

## 今後の追加テスト

### Phase 2 実装後

- [ ] サジェスト機能のテスト
- [ ] 自動ブラケット閉じのテスト
- [ ] ページ作成ダイアログのテスト
- [ ] noteSlug 統合のテスト

### Phase 5 実装後

- [ ] #タグ記法のテスト
- [ ] IndexedDB 永続キャッシュのテスト
- [ ] Collaboration 対応のテスト

## 参考資料

- [Vitest Documentation](https://vitest.dev/)
- [TipTap Testing Guide](https://tiptap.dev/guide/testing)
- [実装計画書](../../docs/04_implementation/plans/20251011_unified-link-mark-migration-plan.md)
