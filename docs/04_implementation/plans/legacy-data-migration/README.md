# レガシーデータマイグレーション属性修正計画

## 概要

UnifiedLinkMark への属性マイグレーション時に、TipTap の parseHTML 仕様により、`raw`, `text`, `key` 属性が正しく設定されない問題を修正します。

## 計画文書

- [20251019_01_implementation-plan.md](20251019_01_implementation-plan.md) - 実装計画と修正方法の詳細

## 対応タスク

- Issue: `docs/issues/open/20251019_01_legacy-data-migration-fix.md`
- テスト: 4件の失敗テストを修正
- ブランチ: `fix/legacy-data-migration-attributes`

## 関連ドキュメント

- [検証レポート](../../issues/open/20251019_02_issue-verification-report.md) - 根本原因分析
- [元の Issue](../../issues/open/20251019_01_legacy-data-migration-fix.md) - 問題報告
