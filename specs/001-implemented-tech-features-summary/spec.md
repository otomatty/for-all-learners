# Feature Specification: 現状実装の技術要件と機能サマリ資料

**Feature Branch**: `001-implemented-tech-features-summary`  
**Created**: 2025-09-08  
**Status**: Draft  
**Input**: User description: "現在開発中の学習アプリについて現時点で実装されている技術要件をまとめ、どのような機能がすでに実装されているのかをまとめた資料を作成してください。"

## Execution Flow (main)

```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identify: actors, actions, data, constraints
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines

- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements

- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

### For AI Generation

When creating this spec from a user prompt:

1. **Mark all ambiguities**: Use [NEEDS CLARIFICATION: specific question] for any assumption you'd need to make
2. **Don't guess**: If the prompt doesn't specify something (e.g., "login system" without auth method), mark it
3. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
4. **Common underspecified areas**:
   - User types and permissions
   - Data retention/deletion policies
   - Performance targets and scale
   - Error handling behaviors
   - Integration requirements
   - Security/compliance needs

---

## User Scenarios & Testing _(mandatory)_

### Primary User Story

ステークホルダーとして、現在の実装状況を一望できる「技術要件と実装済み機能のサマリ資料」を参照できることで、意思決定・優先順位付け・次フェーズの計画を迅速に行いたい。

### Acceptance Scenarios

1. Given サマリ資料が公開されている, When 閲覧する, Then 技術スタックの概要・認証/ルーティング方針・データモデルの主要領域・AI/生成機能・OCR・リッチテキスト編集・PWA・管理/共有/課金制限などの「実装済み領域」が網羅的に把握できる。
2. Given サマリ資料を読む, When 任意の領域の詳細を確認したい, Then 各領域の「何ができるか（機能）」と「期待される価値/目的」が明確に記述されている（実装方法の詳細には踏み込まない）。
3. Given チームメンバーが新規参画した, When サマリ資料を読む, Then 初回読了で主要機能と用語が共通理解でき、どの画面/ドメインに紐づくかが把握できる。

### Edge Cases

- リリース後に機能が増減した場合、当資料が更新されず陳腐化するリスクへの対処（更新責任者/更新周期の定義）。
- 対象読者が非技術者の場合でも、過度に専門用語に依存せず理解できる表現であること。
- 内部向け資料と外部共有版（公開可否）の線引きを明示すること。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001（サマリ範囲）**: 資料は「何が実装済みか」を機能観点で網羅し、実装方法の詳細には踏み込まない。
- **FR-002（構成）**: 次の章立てを最低限含む：技術スタック概要／認証とルーティング方針／主要ドメイン（デッキ/カード/ノート/ページ/クイズ/進捗/共有）／AI 機能／OCR 機能／リッチテキスト編集／PWA／管理画面／外部連携／プランと制限。
- **FR-003（認証/保護）**: 「認証が存在し、未認証ユーザーは公開ページのみアクセス可能で、保護ルートは認証必須」という振る舞いを明示する。
- **FR-004（学習コンテンツ）**: 「デッキ/カード/ページ/ノート/クイズ等の学習ドメインが存在し、作成・参照・学習進捗の記録に対応する」ことを明示する。
- **FR-005（共有/コラボ）**: デッキ/ページ/ノートの共有・一時リンク・共同編集など「コラボ機能の有無と目的」を明示する。
- **FR-006（AI 生成）**: フラッシュカード／選択式／穴埋め等の学習用問生成が可能で、複数件の一括生成にも対応することを明示する。
- **FR-007（OCR）**: 画像からのテキスト抽出をサポートし、結果を学習コンテンツ化（ノート化/カード化等）に活用できることを明示する。
- **FR-008（リッチテキスト）**: ノート/ページにおけるリッチテキスト編集（コード/数式/メディア/リンク等）が可能であることを明示する。
- **FR-009（PWA）**: アプリがスタンドアロン表示に対応するマニフェストを備えることを明示する。
- **FR-010（管理機能）**: 管理インターフェースが存在し、ユーザー管理や分析が可能であることを明示する。
- **FR-011（外部連携）**: 画像キャプチャやナレッジ基盤、外部セットの取り込み等の外部連携が存在することを明示する。
- **FR-012（プラン/制限）**: 無料/有料プランに依存する機能/作成数の上限制御（例：学習目標数）があることを明示する。
- **FR-013（型と整合）**: スキーマ変更に追随する型生成の仕組みが存在し、ドメイン整合性に資する旨を明示する。
- **FR-014（可読性）**: 非技術者が読んでも理解できる語彙/構成とし、専門用語は説明を付す。
- **FR-015（更新運用）**: 更新タイミング・責任者・公開可否（社内/社外）を定義する。

_Ambiguities to clarify:_

- **FR-016**: 公開対象（社内限定か、対外公開版を用意するか） [NEEDS CLARIFICATION]
- **FR-017**: 更新頻度（リリース毎/週次/月次） [NEEDS CLARIFICATION]
- **FR-018**: 翻訳要否（日本語/英語） [NEEDS CLARIFICATION]

### Key Entities _(include if feature involves data)_

- **アカウント/プラン**: ユーザー基本情報、契約プラン、サブスクリプション状態。
- **学習コンテンツ（デッキ/カード/ページ/ノート/クイズ）**: 学習素材の作成・編集・参照に関わる主要エンティティ郡。
- **進捗/ログ（学習ログ/デッキ学習ログ/アクションログ/マイルストーン）**: 学習セッションや行動履歴、達成状況の記録。
- **共有/コラボ（デッキ共有/ページ共有/ノート共有/一時共有リンク）**: 閲覧・編集権限、期限付き公開の制御。
- **外部連携（画像キャプチャ/ナレッジ同期/外部セット取り込み）**: 画像や外部ナレッジベース、学習セットの取り込みに関わる連携先。

—

以下は当サマリ資料に含める「実装済み領域の解説（WHAT/WHY 中心）」の例示（技術詳細は記載しない）：

- 認証とルート保護: 認証済みユーザーのみが学習/ダッシュボード等にアクセスでき、未認証ユーザーは公開ページのみ。
- 学習ドメイン: デッキ/カード/ページ/ノート/クイズの作成・参照・学習・進捗記録が可能。
- 生成 AI: フラッシュカード/選択式/穴埋めの問題生成と一括生成を提供し、教材生成の初期コストを低減。
- 画像テキスト化: 画像からテキスト抽出を行い、ノート/カード化に活用。
- リッチエディタ: コード/数式/メディア/相互リンク等を用いた知識構造化を支援。
- 共有/コラボ: 共同編集・限定共有・公開設定で学習の共同体験を促進。
- PWA: モバイル/デスクトップでのアプリライクな体験を提供（スタンドアロン表示）。
- 管理/分析: 管理者向けのユーザー管理/分析ビューを提供。
- プラン制限: 例として学習目標数の上限（無料/有料）を実装し、UI にも反映。

---

## Review & Acceptance Checklist

_GATE: Automated checks run during main() execution_

### Content Quality

- [ ] No implementation details (languages, frameworks, APIs)
- [ ] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
- [ ] All mandatory sections completed

### Requirement Completeness

- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous
- [ ] Success criteria are measurable
- [ ] Scope is clearly bounded
- [ ] Dependencies and assumptions identified

---

## Execution Status

_Updated by main() during processing_

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [ ] Review checklist passed

---

## 実装済みの技術要件と機能サマリ（資料本文）

本資料は、現時点で「利用者が何をできるか」という観点で実装済み機能をまとめたものです。技術的な実装方法（ライブラリ、API、コード構造）は扱わず、目的と振る舞いに焦点を当てています。

### 1) 認証とアクセス制御

- ログインしたユーザーのみが学習用の各画面（ダッシュボード、ノート、デッキ/カード、学習、ページ等）にアクセス可能。
- 未ログイン時は、トップ/価格/ガイド/FAQ/問い合わせ/変更履歴/マイルストーン等の公開ページのみアクセス可能。

価値: プライベートな学習データの保護と、公開情報のシンプルな導線確保。

### 2) 学習コンテンツ（デッキ/カード/ページ/ノート/クイズ）

- デッキ（カードの集合）とカード（個別の学習単位）の作成・閲覧・学習が可能。
- ノートとページで学習内容を整理・記録し、相互に関連付け（ページリンク）できる。
- クイズ（フラッシュカード/選択式/穴埋め）により、理解確認と記憶定着を支援。

価値: 学習素材の作成から反復練習までを一連の流れで完結できる。

### 3) 生成 AI による教材作成支援

- フラッシュカード、選択式、穴埋め問題を自動生成。
- 複数カードの一括生成にも対応し、教材準備の初期負荷を軽減。

価値: 学習開始までの時間短縮と、継続的な教材拡充の効率化。

### 4) 画像からのテキスト抽出（OCR）

- 画像（例: キャプチャや講義スライド）からテキストを抽出し、ノート/カード化などに活用可能。
- 進捗表示やエラー通知に対応し、処理の見通しを得やすい。

価値: 紙・画像ベースの教材のデジタル化と再利用性の向上。

### 5) リッチテキスト編集

- ノート/ページでのリッチな編集が可能（コードブロック、数式、メディア、相互リンクなど）。
- 知識の構造化や可視化を促進し、深い理解に寄与。

価値: メモではなく「学びの資産」としてのドキュメント化を支援。

### 6) 共有とコラボレーション

- デッキ/ページ/ノートの共有設定、共同編集、期限付き共有リンクに対応。
- 公開/限定共有/非公開を切り替えられる。

価値: 学習コミュニティ内でのコラボやレビューを促進。

### 7) 進捗と学習ログ・実績

- 学習ログや達成状況、アクションの履歴を記録。
- 可視化や実績管理により、モチベーションの維持を後押し。

価値: 日々の学習の積み重ねを見える化し、改善の手掛かりを提供。

### 8) ゲーミフィケーション（概要）

- ポイント/実績/マイルストーンの概念があり、活動に応じた達成体験を提供（記録・表示の仕組みが存在）。

価値: 自律的な継続学習を促す仕掛け。

### 9) プランと機能上限

- 無料/有料プランの概念があり、例として学習目標（ゴール）作成数の上限（無料 3 / 有料 10）を実装。
- 上限到達時は UI で案内やアップグレード導線を提供。

価値: 段階的な価値提供と、必要に応じた拡張のインセンティブ設計。

### 10) 管理（アドミン）

- 管理用画面があり、ユーザー管理や分析ビューを提供。

価値: 運用効率の向上と、全体最適のための意思決定材料を提供。

### 11) 外部連携（例）

- 画像キャプチャサービス連携による画像取り込み。
- ナレッジ基盤との同期。
- 外部の学習セット取り込み（例: 他サービスのカードセット）への対応。

価値: 既存の情報資産や他ツールを活かしたシームレスな学習体験。

### 12) PWA 対応（アプリライク体験）

- スタンドアロン表示用のアプリマニフェストを備え、ホーム画面からの起動などアプリに近い操作感を実現。

価値: モバイル/デスクトップでの快適な利用体験。

---

## 今後の更新運用

- 更新責任: プロダクトオーナーが承認し、ドメイン担当がドラフト作成。
- 更新頻度: リリースごとに差分反映（少なくとも月次でレビュー）。
- 共有範囲: 社内向け完全版と、外部共有可能な要約版を用意（機微情報を除外）。

---
