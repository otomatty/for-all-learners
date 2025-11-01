# Lint エラー修正・アクセシビリティ改善実装計画

**作成日**: 2025-11-01  
**ステータス**: 🟢 進行中  
**関連Issue**: TBD

---

## 📊 現状分析

### エラー状況

| 日付 | エラー数 | 主な改善内容 |
|------|---------|-------------|
| 2025-10-31 | 51個 | 初期状態 |
| 2025-11-01 | 40個 | セマンティックHTML・useId導入 |

### 修正完了項目 ✅

1. **`trash-panel.tsx`** - `<div role="button">` → `<button>`
2. **`droppable-note-item.tsx`** - `<div role="button">` → `<button>`
3. **`profile-form.tsx`** - アバター選択ボタン化 + `useId()`
4. **`integration-card-shell.tsx`** - `<img>` → `next/image` + ボタン化
5. **`mode-toggle.tsx`** - `useId()`導入
6. **`notification-settings.tsx`** - `useId()`導入
7. **`create-page-dialog.tsx`** - `useId()`導入

### 残存エラー分類（40個）

| カテゴリ | 件数 | 優先度 | 対応方針 |
|---------|------|--------|---------|
| CSS警告（Tailwind @apply） | ~20件 | 低 | 無視可（Tailwind仕様） |
| 公開ページアンカー | 3件 | 低 | 意図的（ページ内リンク用） |
| ログインページ | 1件 | 🔴 高 | Phase 1で対応 |
| 外部連携設定 | 3件 | 🔴 高 | Phase 1で対応 |
| 管理画面フォーム | ~12件 | 🟡 中 | Phase 2で対応 |
| ローディング | 1件 | 低 | 対応不要 |

---

## 🎯 実装計画

### Phase 1: 緊急対応（優先度: 🔴 高）

**目標**: ユーザー向けページのエラー解消  
**期間**: 2025-11-01 〜 2025-11-02（2日）  
**担当**: TBD

#### タスク一覧

##### 1.1 ログインページの修正

**ファイル**: `app/auth/login/page.tsx`  
**工数**: 0.5日

```typescript
// 修正内容
import { useId } from 'react';

export default function LoginPage() {
  const emailId = useId();
  
  return (
    <Input
      id={emailId}
      type="email"
      // ...
    />
  );
}
```

**テスト項目**:
- [ ] ログインフォームが正常に表示される
- [ ] メール入力欄にフォーカスできる
- [ ] Label と Input が正しく関連付けられている

##### 1.2 外部連携設定の修正

**ファイル**:
- `app/(protected)/settings/_components/external-sync-settings/cosense-sync-settings.tsx`
- `app/(protected)/settings/_components/external-sync-settings/service-integration-details.tsx`

**工数**: 0.5日

```typescript
// cosense-sync-settings.tsx
const cookieId = useId();
const projectId = useId();

// service-integration-details.tsx
const apiKeyId = useId();
const syncFrequencyId = useId();
```

**テスト項目**:
- [ ] Cosense連携設定が正常に動作
- [ ] API Key入力欄が正常に動作
- [ ] 同期頻度選択が正常に動作

#### 成果物

- [ ] 修正PR作成
- [ ] 作業ログ: `docs/05_logs/2025_11/20251101_01_high-priority-lint-fixes.md`
- [ ] エラー数: 40個 → 36個

---

### Phase 2: 管理画面の改善（優先度: 🟡 中）

**目標**: 管理者UXの向上  
**期間**: 2025-11-03 〜 2025-11-05（3日）  
**担当**: TBD

#### タスク一覧

##### 2.1 問合せ管理画面

**ファイル**: `app/admin/inquiries/_components/InquiryFilters.tsx`  
**工数**: 1日

```typescript
const searchQueryId = useId();
const statusId = useId();
const priorityId = useId();
const categoryId = useId();
```

**修正箇所**: 4箇所

##### 2.2 変更履歴管理

**ファイル**: `app/admin/changelog/_components/ChangelogForm.tsx`  
**工数**: 0.5日

```typescript
const versionId = useId();
const titleId = useId();
const releaseDateId = useId();
```

**修正箇所**: 3箇所

##### 2.3 サムネイル一括更新

**ファイル**: `app/admin/_components/ThumbnailBatchUpdate.tsx`  
**工数**: 0.5日

```typescript
const userIdInputId = useId();
const dryRunId = useId();
const batchLimitId = useId();
```

**修正箇所**: 3箇所

#### 成果物

- [ ] 修正PR作成
- [ ] 作業ログ: `docs/05_logs/2025_11/20251103_01_admin-panel-improvements.md`
- [ ] エラー数: 36個 → 26個

---

### Phase 3: コード品質の標準化（優先度: 🟡 中）

**目標**: プロジェクト全体の一貫性向上  
**期間**: 2025-11-06 〜 2025-11-10（5日）  
**担当**: TBD

#### タスク一覧

##### 3.1 Lintルールの調整

**ファイル**: `biome.json`  
**工数**: 0.5日

```json
{
  "linter": {
    "rules": {
      "correctness": {
        "useUniqueElementIds": {
          "level": "error",
          "options": {
            "ignorePatterns": ["faq", "features", "pricing"]
          }
        }
      }
    }
  }
}
```

**対応内容**:
- 公開ページのアンカーリンクを許可リストに追加
- CSS関連警告の抑制設定

##### 3.2 アクセシビリティガイドライン作成

**ファイル**: `docs/rules/accessibility-guidelines.md`  
**工数**: 2日

**内容**:
- セマンティックHTML使用ガイド
- `useId()` 使用ガイドライン
- ARIA属性のベストプラクティス
- キーボード操作対応ガイド
- スクリーンリーダー対応チェックリスト

##### 3.3 コンポーネントテンプレート作成

**ファイル**: `templates/component-with-form-template.tsx`  
**工数**: 1日

```typescript
"use client";

import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface ComponentNameProps {
  // Props definition
}

export default function ComponentName({ ...props }: ComponentNameProps) {
  const inputId = useId();
  
  return (
    <div>
      <Label htmlFor={inputId}>Label Text</Label>
      <Input id={inputId} {...props} />
    </div>
  );
}
```

##### 3.4 開発者向けドキュメント更新

**ファイル**: `CONTRIBUTING.md`  
**工数**: 1日

**追加内容**:
- アクセシビリティチェックリスト
- コードレビュー観点
- 推奨パターン集

#### 成果物

- [ ] ガイドライン文書: `docs/rules/accessibility-guidelines.md`
- [ ] テンプレート: `templates/component-with-form-template.tsx`
- [ ] CONTRIBUTING.md更新
- [ ] エラー数: 26個 → 20個（CSS警告のみ）

---

### Phase 4: CI/CDパイプラインの強化（優先度: 🟡 中）

**目標**: 品質維持の自動化  
**期間**: 2025-11-11 〜 2025-11-13（3日）  
**担当**: TBD

#### タスク一覧

##### 4.1 Pre-commit Hook設定

**ファイル**: `.husky/pre-commit`  
**工数**: 0.5日

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Running lint check..."
bun lint:fix

echo "🧪 Running tests..."
bun test --silent

echo "✅ Pre-commit checks passed!"
```

##### 4.2 GitHub Actions拡張

**ファイル**: `.github/workflows/lint-and-test.yml`  
**工数**: 1日

```yaml
name: Lint and Test

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      
      - name: Install dependencies
        run: bun install
      
      - name: Lint check
        run: bun lint:ci
      
      - name: Type check
        run: bun tsc --noEmit
      
      - name: Test
        run: bun test --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

##### 4.3 PRテンプレート更新

**ファイル**: `.github/pull_request_template.md`  
**工数**: 0.5日

追加項目:
```markdown
## アクセシビリティチェックリスト

- [ ] `useId()` を使用してIDを動的生成
- [ ] セマンティックHTMLを使用（`<button>`, `<nav>`, etc.）
- [ ] ARIA属性が適切に設定されている
- [ ] キーボード操作が可能
- [ ] スクリーンリーダーで内容が理解できる
- [ ] `bun lint:ci` がエラーなし
```

##### 4.4 Status Badge追加

**ファイル**: `README.md`  
**工数**: 0.5日

```markdown
[![Lint Status](https://github.com/otomatty/for-all-learners/workflows/Lint%20and%20Test/badge.svg)](https://github.com/otomatty/for-all-learners/actions)
[![codecov](https://codecov.io/gh/otomatty/for-all-learners/branch/main/graph/badge.svg)](https://codecov.io/gh/otomatty/for-all-learners)
```

#### 成果物

- [ ] `.husky/pre-commit` 作成
- [ ] `.github/workflows/lint-and-test.yml` 作成
- [ ] PRテンプレート更新
- [ ] README.md バッジ追加

---

### Phase 5: 長期的改善（優先度: 🟢 低-中）

**目標**: 技術的負債の解消  
**期間**: 2025-11-14 〜 継続的  
**担当**: TBD

#### タスク一覧

##### 5.1 画像最適化の完全移行

**工数**: 3日

```bash
# 残存する <img> タグを検索
grep -r "<img" app/ components/ --include="*.tsx" --include="*.jsx"

# next/image に置き換え
```

**対象ファイル**: TBD（検索結果による）

##### 5.2 テストカバレッジ向上

**目標**: 80%以上  
**工数**: 継続的

優先順位:
1. ユーザー向けコンポーネント（高）
2. API関連ロジック（高）
3. 管理画面コンポーネント（中）
4. ユーティリティ関数（中）

##### 5.3 パフォーマンス監視基盤

**ファイル**: `lib/metrics/performance-monitor.ts`  
**工数**: 2日

```typescript
// Core Web Vitals計測
export function reportWebVitals(metric: Metric) {
  if (metric.label === 'web-vital') {
    console.log(metric);
    // Send to analytics
  }
}
```

実装内容:
- Core Web Vitals計測
- エラートラッキング（Sentry連携）
- ユーザー行動分析

##### 5.4 ローディングスケルトンの改善

**ファイル**: `app/admin/inquiries/[id]/loading.tsx`  
**工数**: 0.5日

```typescript
// 配列インデックスをkeyとして使用している箇所を修正
{items.map((item) => (
  <div key={item.id}>  // item.id を使用
    {/* ... */}
  </div>
))}
```

#### 成果物

- [ ] 画像最適化完了レポート
- [ ] テストカバレッジレポート（月次）
- [ ] パフォーマンスダッシュボード
- [ ] 作業ログ: `docs/05_logs/2025_11/` (継続的)

---

## 📈 マイルストーン

| マイルストーン | 期日 | エラー数目標 | 主な成果 |
|--------------|------|------------|---------|
| M1: 緊急対応完了 | 2025-11-02 | 36個 | ユーザー向けページ改善 |
| M2: 管理画面改善完了 | 2025-11-05 | 26個 | 管理者UX向上 |
| M3: 標準化完了 | 2025-11-10 | 20個 | ガイドライン確立 |
| M4: CI/CD強化完了 | 2025-11-13 | 20個 | 自動化基盤構築 |
| M5: 技術的負債解消 | 継続的 | 0個* | 最適化完了 |

*CSS警告を除く

---

## 🎯 KPI・成功指標

### 短期（1-2週間）

- ✅ エラー数削減率: 50%以上（40個 → 20個）
- ✅ ユーザー向けページのlintエラー: 0件
- ✅ アクセシビリティスコア（Lighthouse）: 95点以上

### 中期（1ヶ月）

- ✅ CI/CD自動化率: 100%
- ✅ PRマージ前のlintエラー検出率: 100%
- ✅ 開発者ガイドライン遵守率: 90%以上

### 長期（3ヶ月）

- ✅ 実質的なlintエラー: 0件
- ✅ テストカバレッジ: 80%以上
- ✅ Core Web Vitals: すべてGreen
- ✅ 月次の新規エラー発生数: 0件

---

## 🔄 レビュー・更新方針

### 週次レビュー

**実施日**: 毎週金曜日  
**内容**:
- 進捗確認
- エラー数推移確認
- ブロッカーの特定
- 次週の優先順位調整

### 月次レビュー

**実施日**: 毎月末  
**内容**:
- KPI達成状況確認
- 技術的負債の評価
- プラン全体の見直し
- 次月の計画策定

---

## 📝 関連ドキュメント

- [コーディング規則](../../rules/README.md)
- [言語規則](../../rules/language-rules.md)
- [コード品質基準](../../rules/code-quality-standards.md)
- [アクセシビリティガイドライン](../../rules/accessibility-guidelines.md) ※Phase 3で作成予定

---

## 📞 問い合わせ・質問

プラン実施中の質問や提案は以下で受け付けます:

- **GitHub Issues**: [for-all-learners/issues](https://github.com/otomatty/for-all-learners/issues)
- **Discord**: #dev-quality チャンネル

---

**最終更新**: 2025-11-01  
**作成者**: AI Assistant (Grok)  
**承認者**: TBD
