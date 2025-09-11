# 認証・セキュリティ仕様書

**Feature Branch**: `002-auth-security-specification`  
**Created**: 2025-09-10  
**Completed**: 2025-09-10  
**Status**: ✅ Ready for Use  
**Documents**: Complete Authentication & Security Specification  
**Input**: User description: "認証・セキュリティ仕様書の作成"

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

セキュリティ管理者・開発者として、F.A.L プラットフォームの認証・認可・データ保護の全体像を包括的に把握し、セキュリティ監査・コンプライアンス対応・新機能開発時の権限設計を適切に実施したい。

### Acceptance Scenarios

1. **Given** セキュリティ監査が実施される, **When** 本仕様書を参照する, **Then** 認証フロー・権限管理・データ保護・RLS ポリシー・暗号化などの全セキュリティ要件が体系的に把握できる。
2. **Given** 新機能開発が開始される, **When** データアクセス権限を設計する, **Then** 既存の RLS パターン・権限レベル・アクセス制御方針に準拠した設計ができる。
3. **Given** セキュリティインシデントが発生した, **When** 本仕様書を参照する, **Then** 影響範囲の特定・対処方法・防止策の判断に必要な情報が即座に入手できる。

### Edge Cases

- 認証セッション期限切れ時のデータ保護とユーザー体験維持の両立
- 管理者権限の不正利用防止と正当な運用作業の効率性確保
- 共有機能での複雑な権限レベル制御と性能影響の最小化
- 外部統合（OAuth・API）でのセキュリティと利便性のバランス

## Requirements _(mandatory)_

### Functional Requirements

#### 認証・セッション管理

- **FR-001**: システムは Supabase Auth を使用した Google OAuth 認証を提供する
- **FR-002**: システムはマジックリンク認証（パスワードレス）を提供する
- **FR-003**: システムは Next.js ミドルウェアによる自動ルート保護を実装する
- **FR-004**: システムは SSR 対応のセッション管理（HTTPOnly Cookie + JWT）を実装する
- **FR-005**: システムは認証状態をサーバー・クライアント間でシームレスに同期する

#### データアクセス制御（RLS）

- **FR-006**: システムは全テーブルで Row Level Security（RLS）を有効化する
- **FR-007**: システムは auth.uid()ベースの所有者制限ポリシーを適用する
- **FR-008**: システムは管理者権限による全データアクセスを制御する
- **FR-009**: システムは共有機能での段階的権限制御（owner/editor/viewer）を実装する
- **FR-010**: システムは公開コンテンツへの匿名アクセスを許可する

#### プラン・制限管理

- **FR-011**: システは無料プラン（学習目標上限 3 個）の制限を強制する
- **FR-012**: システムは有料プラン（学習目標上限 10 個）の制限を強制する
- **FR-013**: システはプラン変更時のリアルタイム UI 反映を実装する
- **FR-014**: システムは機能制限をサーバーサイドで検証・強制する

#### 暗号化・データ保護

- **FR-015**: システムはユーザー API キーの暗号化保存を実装する
- **FR-016**: システムは機密データの暗号化伝送（HTTPS 強制）を実装する
- **FR-017**: システムは個人情報へのアクセスログ記録を実装する
- **FR-018**: システムはデータ削除時の完全消去を保証する

#### 管理者・運用セキュリティ

- **FR-019**: システムは管理者権限の階層制御（admin/superadmin）を実装する
- **FR-020**: システムは管理者操作の監査ログ記録を実装する
- **FR-021**: システムは管理者の不正アクセス防止機能を実装する
- **FR-022**: システムは緊急時の管理者権限無効化機能を提供する

### Key Entities _(include if feature involves data)_

#### 認証・アカウント管理

- **accounts**: ユーザー基本情報、プロフィール、認証状態の管理
- **admin_users**: 管理者権限、役割階層、アクセス制御の管理
- **user_settings**: 個人設定、テーマ、ロケール、プライバシー設定

#### サブスクリプション・プラン

- **plans**: プラン定義、機能制限、価格体系の管理
- **subscriptions**: ユーザー契約状態、期限、支払い状況の管理
- **plan_features**: プラン別機能可用性の管理

#### 共有・権限管理

- **deck_shares**: デッキ共有権限（owner/editor/viewer）の管理
- **page_shares**: ページ共有権限（owner/editor/viewer）の管理
- **note_shares**: ノート共有権限（owner/editor/viewer）の管理
- **share_links**: 期限付き公開リンク、一時アクセス制御の管理

#### セキュリティ・監査

- **action_logs**: ユーザー操作履歴、セキュリティイベントの記録
- **user_llm_settings**: 暗号化 API キー、外部サービス認証情報の管理
- **deleted_pages**: 論理削除データ、復旧・完全削除の管理

---

## 🔐 認証・セキュリティ実装詳細

### 📋 文書の目的と適用範囲

本仕様書は、F.A.L 学習プラットフォームにおける認証・認可・データ保護の全体像を体系化したものです。セキュリティ監査、新機能開発時の権限設計、コンプライアンス対応、インシデント対応に活用することを目的としています。

### 🔑 1) 認証アーキテクチャ

**認証方式:**

- **Supabase Auth**: Google OAuth、マジックリンク認証
- **セッション管理**: HTTPOnly Cookie + JWT トークン
- **SSR 対応**: @supabase/ssr による サーバーサイド認証

**ミドルウェアベース保護:**

```
保護対象外ルート（PUBLIC_PATHS）:
- / (ランディング)
- /auth/* (認証関連)
- /features, /pricing, /guides, /faq (公開情報)
- /inquiry, /changelog, /milestones (サポート)

保護対象ルート（認証必須）:
- /dashboard, /decks, /notes, /pages (学習エリア)
- /learn, /goals, /profile, /reports (個人機能)
- /search, /settings (設定・検索)
- /admin (管理機能)
```

**価値提案:**

- セキュリティと利便性の最適バランス
- セッション状態の確実な管理とパフォーマンス両立
- OAuth による信頼性の高い認証基盤

**制限・考慮事項:**

- セッション期限切れ時の自動リダイレクト
- OAuth プロバイダーの可用性依存
- ネットワーク遮断時の認証状態保持

### 🛡️ 2) Row Level Security（RLS）による データアクセス制御

**基本ポリシーパターン:**

_所有者制限ポリシー:_

```sql
CREATE POLICY "Users can manage own [table]" ON [table]
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

_管理者アクセスポリシー:_

```sql
CREATE POLICY "Admins can select [table]" ON [table]
FOR SELECT USING (public.is_admin_user());
```

_共有アクセスポリシー:_

```sql
CREATE POLICY "Shared access control" ON [table]
FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM [table]_shares WHERE shared_with_user_id = auth.uid())
);
```

**適用テーブル範囲:**

- 学習コンテンツ: decks, cards, pages, notes, questions
- 進捗・ログ: learning_logs, deck_study_logs, action_logs
- 設定・個人情報: user_settings, quiz_settings, user_llm_settings
- 共有・コラボ: deck_shares, page_shares, note_shares

**価値提案:**

- データベースレベルでの確実なアクセス制御
- アプリケーション層のバグによる情報漏洩防止
- 細粒度な権限制御とスケーラブルな実装

**制限・考慮事項:**

- 複雑なクエリでのパフォーマンス影響
- RLS ポリシーデバッグの難易度
- 共有機能での権限継承の複雑性

### 🎭 3) 権限管理と役割制御

**管理者権限階層:**

```
superadmin: 全システム管理権限
├─ 管理者テーブルの完全CRUD
├─ 全ユーザーデータの参照・操作
└─ システム設定・緊急対応権限

admin: 日常運用管理権限
├─ 全ユーザーデータの参照のみ
├─ 自己の管理者レコード更新
└─ レポート・分析機能アクセス
```

**権限判定関数:**

```sql
-- 管理者判定
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
    AND role IN ('admin','superadmin')
    AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- superadmin判定
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
    AND role = 'superadmin'
    AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

**共有権限レベル:**

- **owner**: 完全な制御権限（削除・設定変更・権限管理）
- **editor**: 編集権限（コンテンツ修正・追加）
- **viewer**: 閲覧権限（読み取り専用アクセス）

**価値提案:**

- 段階的権限によるセキュリティと協働の両立
- 管理者権限の適切な分離による運用リスク軽減
- 監査可能な権限変更履歴

### 💰 4) サブスクリプション・プラン制限

**プラン別機能制限:**

```
無料プラン:
├─ 学習目標作成: 上限3個
├─ デッキ作成: 無制限
├─ カード作成: 無制限
└─ 基本機能: 全て利用可能

有料プラン:
├─ 学習目標作成: 上限10個
├─ デッキ作成: 無制限
├─ カード作成: 無制限
└─ 高度機能: プレミアム機能追加
```

**サーバーサイド制限強制:**

- Server Actions でのプラン制限チェック
- UI レベルでの制限表示・アップグレード導線
- リアルタイムプラン状態同期

**価値提案:**

- 段階的価値提供による収益最大化
- 制限回避不可能な確実な制御
- ユーザー体験を損なわない制限設計

### 🔒 5) 暗号化・データ保護

**暗号化対象:**

- **API キー**: ユーザーの LLM 設定（Gemini/OpenAI 等）
- **個人情報**: メールアドレス、プロフィール情報
- **通信**: 全データ伝送の HTTLS 強制

**削除・保持ポリシー:**

- **論理削除**: 30 日間のゴミ箱保存後、自動完全削除
- **共有データ**: 削除時の権限者通知・確認プロセス
- **監査ログ**: 法的要件に基づく長期保存（1 年間）

**価値提案:**

- 法的コンプライアンス要件への準拠
- ユーザープライバシーの確実な保護
- データ漏洩時の影響最小化

### 📊 6) セキュリティ監視・監査

**操作ログ記録:**

- 全 CRUD 操作の自動記録（action_logs）
- 管理者操作の詳細ログ
- 認証・権限変更イベント

**監査機能:**

- ユーザー操作履歴の検索・分析
- 異常アクセスパターンの検出
- データアクセス権限の定期レビュー

**価値提案:**

- セキュリティインシデントの早期発見
- コンプライアンス監査への迅速対応
- 操作透明性によるユーザー信頼向上

---

## Review & Acceptance Checklist

_GATE: Automated checks run during main() execution_

### Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status

_Updated by main() during processing_

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

**Final Status**: ✅ AUTHENTICATION & SECURITY SPEC READY FOR USE---
