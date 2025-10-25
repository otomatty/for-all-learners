# 統合テスト最適化分析レポート

**作成日**: 2025-10-12  
**カテゴリ**: テスト最適化  
**関連ブランチ**: feature/unified-link-migration-and-tdd

## 概要

Unified Link Mark 機能の統合テストの現状を分析し、最適化の余地を調査しました。

## 現状分析

### 1. テストの実行状況

#### 成功率

- **総テスト数**: 590 テスト
- **成功**: 561 テスト (95.1%)
- **失敗**: 29 テスト (4.9%)
- **エラー**: 2 件

#### 実行時間

- **総実行時間**: 1352ms (約 1.35 秒)
- **平均実行時間**: 約 2.3ms/テスト
- **最も遅いテスト**: OCR テスト (約 2960 秒 = タイムアウト)

### 2. カバレッジ状況

#### 全体カバレッジ

- **関数カバレッジ**: 50.11%
- **行カバレッジ**: 51.98%

#### Unified Link Mark 関連の高カバレッジモジュール

| モジュール                          | 関数   | 行     | 状態    |
| ----------------------------------- | ------ | ------ | ------- |
| `commands/insert-unified-link.ts`   | 100%   | 100%   | ✅ 優秀 |
| `commands/refresh-unified-links.ts` | 100%   | 100%   | ✅ 優秀 |
| `commands/index.ts`                 | 100%   | 100%   | ✅ 優秀 |
| `attributes.ts`                     | 100%   | 100%   | ✅ 優秀 |
| `config.ts`                         | 100%   | 100%   | ✅ 優秀 |
| `index.ts`                          | 100%   | 100%   | ✅ 優秀 |
| `lifecycle.ts`                      | 100%   | 100%   | ✅ 優秀 |
| `plugins/index.ts`                  | 100%   | 100%   | ✅ 優秀 |
| `rendering.ts`                      | 100%   | 100%   | ✅ 優秀 |
| `resolver-queue.ts`                 | 85.71% | 100%   | ✅ 良好 |
| `state-manager.ts`                  | 100%   | 92.06% | ✅ 良好 |
| `types.ts`                          | 100%   | 100%   | ✅ 優秀 |

#### カバレッジが低いモジュール

| モジュール                        | 関数   | 行     | 未カバー行                           |
| --------------------------------- | ------ | ------ | ------------------------------------ |
| `input-rules/bracket-rule.ts`     | 50%    | 18.75% | 26-77                                |
| `input-rules/tag-rule.ts`         | 50%    | 18.97% | 23-69                                |
| `plugins/auto-bracket-plugin.ts`  | 50%    | 25.81% | 16-38                                |
| `plugins/click-handler-plugin.ts` | 16.67% | 6.44%  | 32-78,85-111,119-182,198-269,274-281 |
| `plugins/suggestion-plugin.ts`    | 50%    | 21.90% | 79-342                               |

### 3. 統合テストの配置

#### 現在の統合テストの場所

統合テストは以下のファイルに含まれています:

1. **`lib/tiptap-extensions/unified-link-mark/plugins/__tests__/index.test.ts`**

   - プラグイン全体の統合
   - 178 行目から「Integration」セクション
   - エディタインスタンスとオプションの組み合わせテスト

2. **`lib/unilink/__tests__/resolver.test.ts`**

   - ページ作成とナビゲーションの統合フロー
   - 453 行目から「Integration」セクション
   - 実際のユースケースのエンドツーエンドテスト

3. **`lib/unilink/__tests__/utils.test.ts`**

   - ユーティリティ関数とキャッシュの統合
   - 303 行目から「Integration」セクション

4. **個別プラグインファイル内**
   - `click-handler-plugin.test.ts`: 複数の「integration」セクション
   - `auto-bracket-plugin.test.ts`: Integration requirements
   - `suggestion-plugin.test.ts`: Integration requirements

### 4. 統合テストの課題

#### 4.1 テストの散在

- 統合テストが複数のファイルに分散
- 単体テストと統合テストが混在
- テストの意図が不明確

#### 4.2 テストのセットアップの重複

```typescript
beforeEach(() => {
  vi.clearAllMocks();
  mockEditor = {} as Editor;
  mockOptions = {
    HTMLAttributes: {},
    autoReconciler: null,
    noteSlug: null,
    userId: "test-user-id",
    onShowCreatePageDialog: () => {},
  };
});
```

このパターンが複数のファイルで繰り返されている。

#### 4.3 モックの不統一

- 各ファイルで独自のモック実装
- モックの動作が一貫していない
- テスト間でモックの状態が共有される可能性

#### 4.4 失敗しているテスト

1. **CreatePageDialog (17 テスト失敗)**

   - 原因: `document is not defined`
   - JSDOM 環境の設定問題

2. **OCR Client (12 テスト失敗/タイムアウト)**
   - 原因: 非同期処理のタイムアウト (2960 秒)
   - テストの実行時間が異常に長い

### 5. テストの構造分析

#### 良い点

1. **高いカバレッジ**: コア機能は 100%カバレッジ
2. **テストの組織化**: describe ブロックで論理的にグループ化
3. **明確な命名**: テストケースの意図が明確
4. **エッジケースのカバー**: 境界値や異常系のテスト

#### 改善が必要な点

1. **統合テストの分離**: 単体テストと統合テストの明確な分離が必要
2. **共通ヘルパーの欠如**: テストヘルパー関数の共有化
3. **モックの標準化**: 一貫したモック戦略
4. **非同期処理**: タイムアウト設定の見直し
5. **環境設定**: JSDOM 環境の適切な設定

## 最適化の方向性

### Phase 1: 基盤整備 (優先度: 高)

#### 1.1 共通テストヘルパーの作成

```typescript
// __tests__/helpers/test-utils.ts
export function createMockEditor(overrides?: Partial<Editor>): Editor {
  return {
    // 標準的なモックEditor実装
    ...overrides,
  } as Editor;
}

export function createMockOptions(
  overrides?: Partial<UnifiedLinkMarkOptions>
): UnifiedLinkMarkOptions {
  return {
    HTMLAttributes: {},
    autoReconciler: null,
    noteSlug: null,
    userId: "test-user-id",
    onShowCreatePageDialog: () => {},
    ...overrides,
  };
}
```

#### 1.2 共通モックの整理

```typescript
// __tests__/helpers/mocks.ts
export const createStandardMocks = () => {
  return {
    createPage: vi.fn(),
    toast: {
      /* ... */
    },
    emitPageCreated: vi.fn(),
  };
};
```

#### 1.3 環境設定の修正

- `vitest.config.ts`の環境設定を確認
- JSDOM 環境の適切な初期化
- OCR テストのタイムアウト設定

### Phase 2: 統合テストの再構成 (優先度: 中)

#### 2.1 統合テストの分離

```
lib/tiptap-extensions/unified-link-mark/
  __tests__/
    unit/           # 単体テスト
    integration/    # 統合テスト
    helpers/        # 共通ヘルパー
```

#### 2.2 統合テストのカテゴリ化

1. **プラグイン統合テスト**

   - 複数プラグインの連携
   - エディタとの統合

2. **リゾルバ統合テスト**

   - ページ作成フロー
   - ナビゲーション
   - ブロードキャスト

3. **エンドツーエンドシナリオ**
   - ユーザー操作のシミュレーション
   - 実際のユースケース

### Phase 3: パフォーマンス最適化 (優先度: 中)

#### 3.1 並列実行の最適化

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    maxConcurrency: 5,
    isolate: true, // テスト間の分離
  },
});
```

#### 3.2 遅いテストの最適化

- OCR テストのモック化
- 非同期処理のタイムアウト調整
- 大規模データのフィクスチャ化

### Phase 4: カバレッジ向上 (優先度: 低)

#### 4.1 低カバレッジモジュールの改善

優先順位:

1. `click-handler-plugin.ts` (6.44%)
2. `suggestion-plugin.ts` (21.90%)
3. `bracket-rule.ts` (18.75%)
4. `tag-rule.ts` (18.97%)

#### 4.2 統合テストでカバーすべき領域

- 実際の DOM 操作
- プラグイン間の相互作用
- エディタの状態変更

## 推奨される実装順序

### ステップ 1: 失敗テストの修正 (即座に実施)

1. CreatePageDialog テストの JSDOM 設定修正
2. OCR テストのタイムアウト設定修正

### ステップ 2: 共通ヘルパーの作成 (1-2 時間)

1. `test-utils.ts`の作成
2. `mocks.ts`の作成
3. 既存テストでの利用開始

### ステップ 3: 統合テストの再構成 (3-4 時間)

1. `integration/`ディレクトリの作成
2. 統合テストの移動と整理
3. 重複コードの削減

### ステップ 4: パフォーマンス最適化 (2-3 時間)

1. 並列実行設定の調整
2. 遅いテストの最適化
3. ベンチマーク測定

### ステップ 5: カバレッジ向上 (継続的に実施)

1. 低カバレッジモジュールの優先順位付け
2. 段階的なテスト追加
3. リファクタリングと並行して実施

## メトリクス目標

### 短期目標 (1 週間)

- [ ] 失敗テスト: 0 件
- [ ] 実行時間: < 1000ms
- [ ] カバレッジ: 関数 > 60%, 行 > 60%

### 中期目標 (2 週間)

- [ ] 統合テストの分離完了
- [ ] 実行時間: < 800ms
- [ ] カバレッジ: 関数 > 70%, 行 > 70%

### 長期目標 (1 ヶ月)

- [ ] カバレッジ: 関数 > 80%, 行 > 80%
- [ ] テストメンテナンス時間: 50%削減
- [ ] CI 実行時間: < 500ms

## 関連ドキュメント

- [Phase R2.2 完了レポート](./20251012_17_phase-r2.2-complete-summary.md)
- [テスト計画](../../../04_implementation/plans/unified-link-mark/testing-plan.md)
- [実装計画](../../../04_implementation/plans/unified-link-mark/)

## 次のアクション

1. このレポートをレビュー
2. 優先順位の確認と調整
3. ステップ 1 の実施開始
4. 進捗の定期的な記録

---

**更新履歴**

- 2025-10-12: 初版作成 - 統合テスト分析完了
