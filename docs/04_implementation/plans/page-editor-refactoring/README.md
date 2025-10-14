# ページエディターロジックのリファクタリング

## 📋 概要

`usePageEditorLogic.ts` (約 720 行) の巨大なカスタムフックを、責任ごとに分離して保守性とテスタビリティを向上させるリファクタリングプロジェクト。

## 🎯 目標

- コード行数を 720 行から 150 行程度に削減
- ユーティリティ関数を独立してテスト可能に
- 単一責任の原則に基づいた設計
- 重複処理の削減によるパフォーマンス最適化

## 📁 ドキュメント一覧

### 実装計画

- [20251014_01_refactoring-plan.md](./20251014_01_refactoring-plan.md) - メインリファクタリング計画（6 フェーズ）

### 関連設計書

- [設計書](../../../03_design/features/page-editor-refactoring-design.md) (作成予定)

### テスト計画

- [テスト計画](../../../05_testing/test-cases/page-editor-refactoring-tests.md) (作成予定)

## 🚀 実装フェーズ

| Phase   | 内容                       | 優先度 | 見積時間 | ステータス |
| ------- | -------------------------- | ------ | -------- | ---------- |
| Phase 1 | ユーティリティ関数の分離   | 高     | 4-6 時間 | 📝 計画中  |
| Phase 2 | エディター初期化処理の分離 | 高     | 3-4 時間 | 📝 計画中  |
| Phase 3 | リンク同期の統合           | 最高   | 3-4 時間 | 📝 計画中  |
| Phase 4 | 保存処理のリファクタリング | 中     | 2-3 時間 | 📝 計画中  |
| Phase 5 | メインフックのスリム化     | 中     | 2-3 時間 | 📝 計画中  |
| Phase 6 | 統合テスト・ドキュメント   | 中     | 2-3 時間 | 📝 計画中  |

**総見積時間**: 16-23 時間

## 🔍 主要な改善ポイント

### 1. ユーティリティ関数の分離

巨大な内部関数（277 行）を独立したユーティリティに分離:

- `sanitizeContent` (97 行) → `lib/utils/editor/content-sanitizer.ts`
- `transformDollarInDoc` (43 行) → `lib/utils/editor/latex-transformer.ts`
- `migrateBracketsToMarks` (137 行) → `lib/utils/editor/legacy-link-migrator.ts`

### 2. リンク同期の重複削減

- エディター更新時の同期と保存時の同期を統合
- 重複実行を防止してパフォーマンス向上

### 3. カスタムフックの責任分離

- `useEditorInitializer` - エディター初期化
- `useLinkSync` - リンク同期
- `usePageSaver` - 保存処理

## 📊 影響範囲

### 変更対象ファイル

- `app/(protected)/pages/[id]/_hooks/usePageEditorLogic.ts` - メインフック
- `app/(protected)/pages/[id]/_hooks/useAutoSave.ts` - 改善

### 新規作成ファイル

```
lib/utils/editor/
├── content-sanitizer.ts
├── latex-transformer.ts
└── legacy-link-migrator.ts

app/(protected)/pages/[id]/_hooks/
├── useEditorInitializer.ts
├── useLinkSync.ts
└── usePageSaver.ts
```

### テストファイル

各ユーティリティ関数に対応する`__tests__`ディレクトリ配下のテストファイル

## ⚠️ リスク管理

### 主要リスク

1. **既存機能の破壊** → Phase 完了ごとに手動テスト実施
2. **パフォーマンス劣化** → ベンチマークテストで監視
3. **工数超過** → Phase 1-3 を優先実施

### 対策

- 段階的な実装とテスト
- 各 Phase でのロールバックポイント設定
- ステージング環境での十分な検証

## 📅 実装予定

### Week 1 (Phase 1-2)

- ユーティリティ関数の分離とテスト
- エディター初期化処理の分離

### Week 2 (Phase 3-5)

- リンク同期の統合
- 保存処理のリファクタリング
- メインフックのスリム化

### Week 3 (Phase 6)

- 統合テスト・ドキュメント作成
- コードレビュー・修正
- 本番デプロイ

## 📈 進捗管理

進捗状況は[作業ログ](../../../08_worklogs/2025_10/)に記録します。

### チェックリスト

- [ ] Phase 1: ユーティリティ関数の分離
  - [ ] content-sanitizer.ts 作成
  - [ ] latex-transformer.ts 作成
  - [ ] legacy-link-migrator.ts 作成
  - [ ] ユニットテスト作成
- [ ] Phase 2: エディター初期化処理の分離
  - [ ] useEditorInitializer.ts 作成
  - [ ] テスト作成
- [ ] Phase 3: リンク同期の統合
  - [ ] useLinkSync.ts 作成
  - [ ] 重複処理の削除
  - [ ] テスト作成
- [ ] Phase 4: 保存処理のリファクタリング
  - [ ] usePageSaver.ts 作成
  - [ ] テスト作成
- [ ] Phase 5: メインフックのスリム化
  - [ ] usePageEditorLogic.ts リファクタリング
  - [ ] 統合確認
- [ ] Phase 6: 統合テスト・ドキュメント
  - [ ] 統合テスト作成
  - [ ] アーキテクチャ図作成
  - [ ] ドキュメント整備

## 🔗 関連リンク

- [Unified Link Mark 統合実装計画](../unified-link-mark/) - リンク機能全体の実装計画
- [プロジェクト README](../../../../README.md)
- [開発ガイドライン](../../../../.github/copilot-instructions.md)

## 📝 更新履歴

| 日付       | バージョン | 変更内容 |
| ---------- | ---------- | -------- |
| 2025-10-14 | 1.0.0      | 初版作成 |

---

**最終更新**: 2025 年 10 月 14 日  
**ステータス**: 📝 計画策定完了  
**次のアクション**: Phase 1 の実装開始
