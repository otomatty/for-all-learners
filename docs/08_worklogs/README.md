# 作業ログ

日々の開発作業の記録を管理するディレクトリです。

## ディレクトリ構造

```
08_worklogs/
├── 2025_10/
│   ├── 20251010/
│   │   ├── 20251010_feature-implementation.md
│   │   ├── 20251010_bug-fix.md
│   │   └── ...
│   ├── 20251011/
│   │   ├── 20251011_unified-link-mark-phase2-implementation.md
│   │   ├── 20251011_test-status-report.md
│   │   └── ...
│   └── ...
└── 2025_11/
    ├── 20251101/
    │   └── ...
    └── ...
```

### 構造の説明

1. **月別ディレクトリ** (`YYYY_MM/`): 年月でグループ化
2. **日別ディレクトリ** (`YYYYMMDD/`): 各日の作業をまとめる
3. **作業ログファイル** (`YYYYMMDD_作業内容.md`): 具体的な作業記録

この構造により、日付ごとに複数の作業ログを整理できます。

## 作業ログの目的

- 作業内容の記録と振り返り
- 問題点と解決策の共有
- 学びの蓄積
- プロジェクト進捗の可視化

## 作業ログに記載すべき内容

1. **作業概要**: 何をしたか
2. **作業詳細**: 具体的な変更内容
3. **発見した課題**: 問題点と対応
4. **学んだこと**: 技術的な学び
5. **次回の作業予定**: 次にやること

## テンプレート

`/docs/templates/worklog-template.md` を使用してください。

## 命名規則

### ディレクトリ命名

- 月別: `YYYY_MM/` (例: `2025_10/`)
- 日別: `YYYYMMDD/` (例: `20251011/`)

### ファイル命名

`YYYYMMDD_作業内容の簡潔な説明.md`

例:

- `2025_10/20251010/20251010_user-auth-implementation.md`
- `2025_10/20251011/20251011_unified-link-mark-phase2-implementation.md`
- `2025_10/20251011/20251011_test-status-report.md`

### 複数の作業ログ

1 日に複数の作業を行った場合は、同じ日付ディレクトリ内に複数のファイルを作成します。

例（2025 年 10 月 11 日の作業）:

```
2025_10/20251011/
├── 20251011_unified-link-mark-phase2-implementation.md
├── 20251011_unified-link-mark-test-implementation.md
├── 20251011_test-status-report.md
├── 20251011_mock-refactoring-report.md
├── 20251011_maintainable-test-refactoring.md
└── 20251011_branch-creation-summary.md
```
