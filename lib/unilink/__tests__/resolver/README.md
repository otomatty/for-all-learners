# Resolver Test Suite

このディレクトリには、`lib/unilink/resolver/` モジュールの各機能に対応するテストファイルが含まれています。

## テストファイル構成

### broadcast.test.ts (~10 tests)

**テスト対象**: `resolver/broadcast.ts`

- BroadcastChannel のシングルトンパターン
- ページ作成・更新通知
- エラーハンドリング

### mark-operations.test.ts (~15 tests)

**テスト対象**: `resolver/mark-operations.ts`

- TipTap マークの状態更新
- 一括解決(将来実装)
- エラーハンドリング

### navigation.test.ts (~15 tests)

**テスト対象**: `resolver/navigation.ts`

- ページナビゲーション
- コンテキスト保持
- Toast 通知

### link-types.test.ts (~50 tests)

**テスト対象**: `resolver/link-types.ts`

- Icon 記法の解決
- ブラケット内容の解析
- 外部リンク判定・処理
- Missing link クリック処理

### page-creation.test.ts (~50 tests)

**テスト対象**: `resolver/page-creation.ts`

- TipTap Editor からのページ作成
- DOM クリックハンドラーからのページ作成
- ノートリンク
- エラーハンドリング

---

## テストの実行

### すべての Resolver テストを実行

```bash
bun test lib/unilink/__tests__/resolver/
```

### 特定のモジュールのテストのみ実行

```bash
bun test lib/unilink/__tests__/resolver/broadcast.test.ts
bun test lib/unilink/__tests__/resolver/mark-operations.test.ts
bun test lib/unilink/__tests__/resolver/navigation.test.ts
bun test lib/unilink/__tests__/resolver/link-types.test.ts
bun test lib/unilink/__tests__/resolver/page-creation.test.ts
```

### ウォッチモードで実行

```bash
bun test --watch lib/unilink/__tests__/resolver/
```

---

## モックの設定

各テストファイルでは以下の共通モックを使用しています:

### Supabase Client

- `getPageByTitle()`: ページの存在確認
- `from("pages").insert()`: ページの作成
- `from("notes").select()`: ノートの検索
- `from("note_page_links").insert()`: リンクの作成

### Toast Notifications

- `toast.success()`: 成功通知
- `toast.error()`: エラー通知
- `toast.info()`: 情報通知

### Next.js Router

- `router.push()`: ページ遷移

### BroadcastChannel

- `emitPageCreated()`: ページ作成イベント
- `emitPageUpdated()`: ページ更新イベント

---

## テストの方針

### 単体テスト

- 各モジュールの関数を独立してテスト
- 依存関係は適切にモック
- エッジケースとエラーハンドリングをカバー

### 統合テスト

- 複数モジュール間の連携をテスト
- より実際の使用に近いシナリオ
- `resolver-phase3.test.ts` で実施

### テストの独立性

- 各テストは他のテストに依存しない
- `beforeEach` / `afterEach` で状態をクリーンアップ
- モックは各テストで適切にリセット

---

## カバレッジ

目標カバレッジ:

- **Line Coverage**: 90%以上
- **Branch Coverage**: 85%以上
- **Function Coverage**: 95%以上

カバレッジレポートの生成:

```bash
bun test --coverage lib/unilink/__tests__/resolver/
```

---

## トラブルシューティング

### テストが失敗する場合

1. **モックの問題**

   - `vi.clearAllMocks()` が `beforeEach` で呼ばれているか確認
   - モック関数が正しく設定されているか確認

2. **非同期処理**

   - `async/await` を適切に使用しているか確認
   - Promise が resolve/reject されているか確認

3. **環境設定**
   - `@vitest-environment jsdom` が設定されているか確認
   - 必要な環境変数が設定されているか確認

### デバッグ方法

```typescript
// コンソール出力を確認
console.log("Debug:", value);

// モックの呼び出しを確認
expect(mockFunction).toHaveBeenCalledWith(expectedArgs);
expect(mockFunction).toHaveBeenCalledTimes(1);

// スナップショットテスト
expect(result).toMatchSnapshot();
```

---

## 関連ドキュメント

- [Phase R1 完了ログ](../../../../docs/08_worklogs/2025_10/20251012/20251012_13_resolver-refactoring-complete.md)
- [Phase R2 作業ログ](../../../../docs/08_worklogs/2025_10/20251012/20251012_14_phase-r2-test-splitting.md)
- [Resolver リファクタリング計画書](../../../../docs/04_implementation/plans/unified-link-mark/20251012_11_resolver-refactoring-plan.md)

---

**作成日**: 2025-10-12  
**最終更新日**: 2025-10-12
