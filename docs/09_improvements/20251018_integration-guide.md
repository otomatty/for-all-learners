# 会社評価制度対応 - 情報統合ガイド

**作成日**: 2025-10-18

---

## 🎯 このドキュメントの目的

本プロジェクトを会社の評価制度の中で適切に評価してもらうために、実装した以下の情報を一元管理し、ナビゲーションしやすくするためのガイドです。

---

## 📊 全体戦略（4つの柱）

### 1️⃣ **TDDの実践証明** - 技術力の可視化

「テスト駆動開発」を実践し、その過程を記録することで、実装力とテスト力を定量的に示します。

**関連ドキュメント**:
- `.github/pull_request_template.md` - PR テンプレート（Red/Green/Refactor の記載）
- `docs/04_implementation/guides/TDD_PRACTICE_GUIDE.md` - TDD 実践の具体的なステップ

**日々の実行**:
- Issue を作成する時点で設計を明確化
- テストを先に書く（Red フェーズ）
- テストをパスする実装をする（Green フェーズ）
- コードを改善する（Refactor フェーズ）
- PR に Red/Green/Refactor の証跡を記載

**期末の成果物**:
- 「TDD実践PRリスト」 - 実装した全機能の一覧表
- 代表的な PR 3〜5個の詳細説明

---

### 2️⃣ **フロントエンド設計能力** - 体系的思考の実証

単なる「コードを書く力」ではなく、「設計を考える力」を示すために、プロジェクト全体の設計原則を明示し、その実践例を提供します。

**関連ドキュメント**:
- `docs/03_design/specifications/FRONTEND_DESIGN_PRINCIPLES.md` - 設計原則（プロジェクト全体の「憲法」）
- `.github/ISSUE_TEMPLATE/feature.md` - Issue テンプレート（実装設計メモの記載）

**日々の実行**:
- Issue 作成時に「実装設計メモ」を記載
- 設計原則のどの部分に従うかを明記
- コンポーネント分割案、データフローを図示

**期末の成果物**:
- フロントエンド設計原則ドキュメント
- 設計メモが充実した Issue 3〜5個（PR の根拠となる）

---

### 3️⃣ **コード品質の継続的改善** - 保守性重視の姿勢

「短期的な完成度」ではなく「長期的な保守性」を重視する姿勢を、技術的負債の管理と品質メトリクスの追跡で示します。

**関連ドキュメント**:
- `docs/issues/` - 技術的負債の記録（open / in-progress / resolved で管理）
- `docs/08_worklogs/` - 月次サマリーにテストカバレッジ等を記載

**日々の実行**:
- 問題を発見したら即座に `docs/issues/open/` に記録
- 対応を開始したら `in-progress/` に移動
- 解決したら `resolved/` に記録し、解決策を記載

**月末の実行**:
- テストカバレッジを測定
- 解決した技術的負債を集計
- 月次サマリーに記載

**期末の成果物**:
- コード品質改善レポート（負債対応、カバレッジ推移）

---

### 4️⃣ **継続的な学習と成長** - 知識の深化

「継続的な学習」「技術への深い理解」を示すために、技術調査と作業ログを記録し、成長プロセスを可視化します。

**関連ドキュメント**:
- `docs/07_research/YYYY_MM/` - 技術調査レポート
- `docs/08_worklogs/YYYY_MM/YYYYMMDD/` - 日々の作業ログ

**日々の実行**:
- 技術選定時に調査レポートを作成
- 毎日の作業ログに「学んだこと」「工夫した点」を記入

**期末の成果物**:
- 学習・成長記録ダイジェスト

---

## 📁 実装済みの成果物

### ✅ 既に作成されているドキュメント

#### フェーズ1: 基盤整備（完了）

| ドキュメント | 場所 | 目的 |
|-----------|------|------|
| **評価戦略書** | `docs/09_improvements/20251018_evaluation-strategy.md` | 全体戦略、実装方法、期末提出物の定義 |
| **PR テンプレート** | `.github/pull_request_template.md` | Red/Green/Refactor を明示的に記載 |
| **フロントエンド設計原則** | `docs/03_design/specifications/FRONTEND_DESIGN_PRINCIPLES.md` | 設計思想、アーキテクチャ、コンポーネント分割方針 |
| **Issue テンプレート** | `.github/ISSUE_TEMPLATE/feature.md` | 実装設計メモの記載を促進 |
| **TDD実践ガイド** | `docs/04_implementation/guides/TDD_PRACTICE_GUIDE.md` | TDD の具体的な実践方法とパターン集 |
| **実装計画書** | `docs/04_implementation/plans/20251018_evaluation-implementation-plan.md` | ロードマップ、FAQ、提出物の構成 |
| **このガイド** | `docs/09_improvements/20251018_integration-guide.md` | 全情報の統合とナビゲーション |

---

## 🚀 実行フロー

### 新機能を実装する場合のステップ

```
1️⃣ Issue 作成
   ↓
   Issue テンプレートを使用
   → 実装設計メモを記載
   → 設計原則のどれに従うか明記
   ↓

2️⃣ TDD で実装
   ↓
   Red フェーズ: テストを書く（失敗）
   → 参考: TDD実践ガイド
   ↓
   Green フェーズ: テストをパスする実装
   ↓
   Refactor フェーズ: コードを改善
   ↓

3️⃣ PR 作成
   ↓
   PR テンプレートを使用
   → Red/Green/Refactor の証跡を記載
   → テストコードへのリンク
   → テスト結果スクリーンショット
   ↓

4️⃣ レビュー・マージ
   ↓

5️⃣ 作業ログ記録
   ↓
   docs/08_worklogs/YYYY_MM/YYYYMMDD/ に記録
   → 実施した作業
   → 学んだこと
   → 問題と解決策
```

### 月末の実行

```
月末に実施:

1️⃣ テストカバレッジを測定
   npm run coverage

2️⃣ 技術的負債を確認
   docs/issues/ で open → resolved への移動を確認

3️⃣ 月次サマリーを作成
   docs/08_worklogs/YYYY_MM/
   → その月の実装機能
   → テストカバレッジ
   → 解決した負債件数
   → 学習内容
```

### 期末の実行（1月上旬）

```
期末に提出:

1️⃣ TDD実践PRリスト を作成
   - すべての PR を列挙
   - 機能名、テストケース数、カバレッジ

2️⃣ 代表的な実装事例 5個を選定
   - 設計が優れた PR
   - PR テンプレートに沿った記載が充実
   - リファクタリングがうまくいった例

3️⃣ コード品質改善レポート を作成
   - 技術的負債への対応実績
   - テストカバレッジの推移グラフ

4️⃣ 学習・成長記録ダイジェスト を作成
   - 主要な技術調査
   - 学習内容のハイライト

5️⃣ evaluation_2025/ ディレクトリに集約
   - 01_DESIGN_PRINCIPLES.md
   - 02_TDD_PRACTICE_LIST.md
   - 03_CODE_QUALITY_REPORT.md
   - 04_LEARNING_RECORD.md
   - 05_MONTHLY_LOGS/ (4ファイル)
```

---

## 🎓 ドキュメント間の関連図

```
📋 評価戦略書
  ├─ 目的: 全体戦略の定義
  └─ 次: 基盤ドキュメントへ

📄 フロントエンド設計原則 (基盤)
  ├─ 目的: プロジェクト全体の「憲法」
  ├─ Issue テンプレート で実装時に参照
  ├─ 期末提出物 01 として提出
  └─ PR テンプレート で実装例を記載

🧪 TDD実践ガイド (基盤)
  ├─ 目的: TDD の具体的な実装方法
  ├─ 新機能実装時に参照
  └─ PR テンプレート に Red/Green/Refactor を記載

📝 Issue テンプレート (実行)
  ├─ 目的: 設計メモを記載、設計思想を明確化
  ├─ 参照: フロントエンド設計原則
  └─ 期末に代表例 3〜5個を選定して提出

📤 PR テンプレート (実行)
  ├─ 目的: TDD プロセスを記録
  ├─ 参照: TDD実践ガイド
  ├─ 期末に TDD実践PRリスト を作成
  └─ 代表的な PR 5個を選定して詳細説明

📓 作業ログ (実行)
  ├─ 目的: 日々の学習と活動を記録
  ├─ 月末に月次サマリーを作成
  ├─ テストカバレッジを記録
  └─ 期末に学習・成長記録ダイジェスト を作成

⚠️ 技術的負債管理 (実行)
  ├─ 目的: 品質への継続的対応を示す
  ├─ open → in-progress → resolved で管理
  └─ 期末に コード品質改善レポート を作成

🔬 技術調査レポート (実行)
  ├─ 目的: 技術選定の記録、学習プロセス
  └─ 期末に学習・成長記録ダイジェスト に含める
```

---

## 💡 使用例

### 例1: 新機能「メモにタグを追加する機能」を実装

**ステップ1: Issue 作成**

GitHub で新しい Issue を作成 → Issue テンプレート使用

```markdown
## 概要
メモにタグ機能を追加する

## 実装設計メモ

### 目的
ユーザーがメモにタグを付け、タグで検索・フィルタできるようにする

### 設計方針
「フロントエンド設計原則」の『UIとロジックの分離』に従い、
タグ管理ロジックを `useTags` カスタムフックに切り出します。

### コンポーネント分割案
| コンポーネント | ステータス | 責務 |
|-------------|---------|------|
| TagInput | 新規作成 | タグ入力フォーム |
| TagList | 新規作成 | 追加されたタグの表示 |
| useTags | 新規作成 | ロジック層（追加・削除・永続化） |
```

**ステップ2-4: TDD で実装**

```typescript
// __tests__/useTags.test.ts
describe('useTags', () => {
  it('should add a tag', () => { /* Red */ });
  it('should persist to Supabase', () => { /* Red */ });
  it('should remove a tag', () => { /* Red */ });
});

// hooks/useTags.ts
export function useTags() { /* Green */ }

// 次に Refactor フェーズで改善
```

**ステップ5: PR 作成**

PR テンプレートを使用：

```markdown
## TDDプロセスの証跡

### 1. 【RED】失敗するテストの作成
- 要件: ユーザーがタグを追加できる
- テストコード: __tests__/useTags.test.ts#12-25
- 失敗の証明: [CI ログ]

### 2. 【GREEN】テストをパスする最小限の実装
- 実装コード: hooks/useTags.ts#1-20
- テスト結果: ✓ All tests passed

### 3. 【REFACTOR】設計の改善
- 改善内容: Validation ロジックをヘルパー関数に分離
- 最終版: hooks/useTags.ts#1-45
```

**ステップ6-7: マージ・作業ログ**

作業ログに記録：

```markdown
# 2025-10-XX: メモにタグ機能を実装

## 実施内容
- useTags カスタムフック、TagInput/TagList コンポーネント実装
- TDD で実装（Red → Green → Refactor）
- テストケース数: 8個

## 学んだこと
- Validation ロジックを分離することで、再利用性が向上
- useCallback のメモ化でレンダリング最適化

## 問題と対応
- 当初 Supabase への永続化でネットワークエラーが多発
  → リトライ機構を実装して対応（issue: open/xxx）

## テスト結果
- Coverage: 87%
- All tests: ✓ PASSED
```

---

### 例2: 期末に成果物を作成

**ステップ1: TDD実践PRリスト を作成**

```markdown
| PR No. | タイトル | テストケース数 | カバレッジ |
|--------|---------|-------------|----------|
| #123   | メモにタグ機能 | 8 | 87% |
| #124   | タグの永続化 | 5 | 92% |
| #125   | タグ検索機能 | 6 | 85% |
```

**ステップ2-4: 提出物を作成**

```
evaluation_2025/
├── 01_DESIGN_PRINCIPLES.md (既存ファイルへのリンク)
├── 02_TDD_PRACTICE_LIST.md (作成)
├── 03_CODE_QUALITY_REPORT.md (作成)
├── 04_LEARNING_RECORD.md (作成)
└── 05_MONTHLY_LOGS/
    ├── 2025_10.md (作成)
    ├── 2025_11.md (作成)
    ├── 2025_12.md (作成)
    └── 2025_01.md (作成)
```

---

## 📖 よくある質問

**Q: 毎日これらを全部実行する必要がある？**

A: いいえ。日々の実行は以下だけです：

1. Issue 作成時に実装設計メモを記載（5分程度）
2. 実装時に TDD で実装（通常の実装時間）
3. PR テンプレートに Red/Green/Refactor を記載（10分程度）
4. 作業ログに学んだことを記入（5分程度）

月末と期末は集計作業が加わります。

---

**Q: 既存の PR も対応が必要？**

A: いいえ。11月以降の新規 PR から適用してください。期末に代表例を選定する際に、テンプレートに沿った解説を追加することでカバーできます。

---

**Q: テストカバレッジが低い場合は？**

A: コード品質改善レポートで「カバレッジ向上の計画」を示すことで OK です。完璧さより「継続的な改善」の意志が重要です。

---

## 🔗 関連ドキュメント一覧

### 戦略・計画
- `docs/09_improvements/20251018_evaluation-strategy.md` - 全体戦略
- `docs/04_implementation/plans/20251018_evaluation-implementation-plan.md` - 実装ロードマップ
- `docs/09_improvements/20251018_integration-guide.md` - このドキュメント

### 基盤ドキュメント
- `docs/03_design/specifications/FRONTEND_DESIGN_PRINCIPLES.md` - 設計原則
- `docs/04_implementation/guides/TDD_PRACTICE_GUIDE.md` - TDD 実践ガイド

### テンプレート
- `.github/pull_request_template.md` - PR テンプレート
- `.github/ISSUE_TEMPLATE/feature.md` - Issue テンプレート
- `docs/templates/worklog-template.md` - 作業ログテンプレート

### 実行ドキュメント
- `docs/07_research/YYYY_MM/` - 技術調査レポート
- `docs/08_worklogs/YYYY_MM/` - 月別作業ログ
- `docs/issues/` - 技術的負債管理

---

**最終更新**: 2025-10-18
