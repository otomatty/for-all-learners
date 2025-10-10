承知いたしました。`features` は `plans` テーブルのJSONBカラムで管理する方針で、`subscriptions` テーブルと `plans` テーブルのSQLスキーマを改めて提案します。Stripe連携を前提とし、年間払い・月額払いに対応できるようにします。

**1. `plans` テーブル**

このテーブルは、Stripeで作成する「Price」に対応します。同じ製品（例: プレミアムプラン）でも、月額と年額では別のPrice IDになるため、このテーブルではそれらを別々のレコードとして扱います。

```sql
CREATE TABLE public.plans (
  id VARCHAR(255) PRIMARY KEY, -- StripeのPrice IDと一致させることを強く推奨
  name VARCHAR(255) NOT NULL, -- プランの表示名 (例: 'プレミアムプラン (月払い)', 'プレミアムプラン (年払い)')
  description TEXT NULL, -- プランの説明
  active BOOLEAN NOT NULL DEFAULT TRUE, -- このプラン (Price) が現在提供中か/選択可能か
  features JSONB NULL,
    -- 例:
    -- {
    --   "llm_model_type": "standard",               -- "standard", "premium" など
    --   "background_problem_generation": false,     -- 事前生成の可否
    --   "problem_generation_daily_limit": 100,    -- 1日の問題生成上限 (nullなら無制限)
    --   "card_creation_limit": 500,               -- 作成可能なカード総数 (nullなら無制限)
    --   "available_question_types": ["fill_in_the_blank", "multiple_choice"], -- 利用可能な問題形式
    --   "advanced_analytics": false,                -- 高度な分析機能の可否
    --   "priority_support": false                   -- 優先サポートの可否
    -- }
  -- StripeのProduct IDを保存しておくと、同じ製品の異なる価格プランをグルーピングするのに便利 (オプション)
  stripe_product_id VARCHAR(255) NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.plans.id IS 'StripeのPrice IDと一致させることを強く推奨します。';
COMMENT ON COLUMN public.plans.features IS 'プラン毎の機能制限や設定値をJSON形式で格納します。キー名はアプリケーションで一貫して使用してください。';
COMMENT ON COLUMN public.plans.stripe_product_id IS 'このPriceが属するStripeのProduct ID。同じ製品の月額・年額プランなどを識別するのに役立ちます。';

-- プランIDでの検索は主キーなのでインデックスは自動的に作成されます。
-- stripe_product_id で検索することがあればインデックスを追加
CREATE INDEX IF NOT EXISTS idx_plans_stripe_product_id ON public.plans(stripe_product_id);
```

**`plans` テーブルのポイント:**

*   `id`: Stripeの **Price ID** をそのまま格納します。これが主キーです。
*   `name`: ユーザーに表示するプラン名。「プレミアムプラン (月払い)」「プレミアムプラン (年払い)」のように区別できるようにします。
*   `active`: このプランが現在新規加入を受け付けているかを示します。古いプランを廃止する際に `FALSE` にします。
*   `features` (JSONB): ここに機能制限や設定値を柔軟に格納します。キー名はアプリケーション全体で統一して使用してください。上記コメント内に具体的な例を記載しました。
*   `stripe_product_id` (オプション): Stripeでは1つのProductに対して複数のPrice（月額、年額など）を設定できます。このProduct IDを保存しておくと、同じ製品群のプランをDB上で識別しやすくなります。

**2. `subscriptions` テーブル**

このテーブルは、ユーザーとプラン（StripeのSubscription）を紐付け、その状態を管理します。

```sql
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- このサブスクリプションレコード自体のユニークID
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id VARCHAR(255) NOT NULL REFERENCES public.plans(id), -- 契約しているプラン (StripeのPrice ID)
  status VARCHAR(50) NOT NULL,
    -- StripeのSubscription statusを参考に (例: 'active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid')
    -- アプリケーションで必要なステータスを定義してください。
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL, -- 現在の課金期間の開始日時
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL, -- 現在の課金期間の終了日時 (実質的な有効期限)
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE, -- 期間終了時にキャンセルがスケジュールされているか
  canceled_at TIMESTAMP WITH TIME ZONE NULL, -- 即時キャンセルされた、またはキャンセル処理が実行された日時
  ended_at TIMESTAMP WITH TIME ZONE NULL, -- サブスクリプションが完全に終了した日時 (例: 期間終了キャンセル後)
  trial_start TIMESTAMP WITH TIME ZONE NULL, -- トライアル期間の開始日時
  trial_end TIMESTAMP WITH TIME ZONE NULL, -- トライアル期間の終了日時

  -- Stripe固有のID (Stripeと連携する上で非常に重要)
  stripe_customer_id TEXT NULL, -- StripeのCustomer ID
  stripe_subscription_id TEXT UNIQUE NULL, -- StripeのSubscription ID (これが実質的なサブスクリプションの主キーとなることが多い)
  stripe_latest_invoice_id TEXT NULL, -- 最新のInvoice ID
  stripe_payment_method_id TEXT NULL, -- 支払い方法ID (必要に応じて)

  metadata JSONB NULL, -- StripeのSubscription metadataなど、追加情報を格納する場合

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT check_subscription_status CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid')) -- 適宜調整
);

COMMENT ON COLUMN public.subscriptions.user_id IS 'Supabase AuthのユーザーID';
COMMENT ON COLUMN public.subscriptions.plan_id IS '契約しているプランのID (plans.idを参照、StripeのPrice ID)';
COMMENT ON COLUMN public.subscriptions.status IS 'サブスクリプションの現在の状態。Stripeのステータスと同期させることが一般的です。';
COMMENT ON COLUMN public.subscriptions.current_period_end IS 'この日時までプランが有効です。';
COMMENT ON COLUMN public.subscriptions.stripe_customer_id IS 'StripeのCustomerオブジェクトのID。';
COMMENT ON COLUMN public.subscriptions.stripe_subscription_id IS 'StripeのSubscriptionオブジェクトのID。Webhookでの紐付けに必須。';

-- 重要な検索のためのインデックス
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_current_period_end ON public.subscriptions(current_period_end);
```

**`subscriptions` テーブルのポイント:**

*   `id`: このDBレコード自体のUUID。
*   `user_id`: `auth.users.id` への参照。
*   `plan_id`: `plans.id` への参照。ユーザーが契約している具体的なPrice IDが入ります。
*   `status`: StripeのSubscriptionステータスと同期させます。`active`, `trialing` が実質的に有料機能アクセス可の状態です。
*   `current_period_start`, `current_period_end`: Stripeから取得する課金期間。
*   `stripe_customer_id`: Stripeの顧客ID。ユーザーごとに作成・保存します。
*   `stripe_subscription_id`: StripeのサブスクリプションID。**これがStripeとDBを紐付ける上で最も重要なIDの一つです。** Webhookでイベントを受信した際に、どのサブスクリプションに関するものかを特定するために使います。`UNIQUE` 制約をつけておくと良いでしょう。

**Stripe連携の流れ（概要）**

1.  **ユーザーがプラン選択・支払い:**
    *   フロントエンドでStripe Elementsなどを使って決済情報を入力。
    *   バックエンド (Supabase Function) でStripe APIを呼び出し、Customerを作成（初回の場合）、Subscriptionを作成。
2.  **Subscription作成成功時:**
    *   Stripeから返されるSubscriptionオブジェクトの情報を基に、`subscriptions` テーブルにレコードを作成または更新。`stripe_subscription_id` や `status`, `current_period_end` などを保存。
3.  **Webhookによる同期:**
    *   Stripe側でイベント（支払い成功、失敗、サブスクリプション更新、キャンセルなど）が発生すると、設定したWebhookエンドポイント (Supabase Function) に通知が送られます。
    *   Webhookハンドラは、受信したイベントの内容（特に `subscription_id`）を基に、`subscriptions` テーブルの対応するレコードを更新します。例えば、`invoice.payment_succeeded` イベントで `current_period_end` を更新したり、`customer.subscription.updated` でステータスを変更したりします。

**初期データ (例)**

`plans` テーブルには、提供するプランの情報をあらかじめINSERTしておきます。

```sql
-- plansテーブルへの初期データ例
INSERT INTO public.plans (id, name, active, stripe_product_id, features) VALUES
('price_xxxxxxxxxxxxxx_free', 'フリープラン', true, 'prod_xxxxxxxxxxxxxx_main', '{
  "llm_model_type": "standard",
  "background_problem_generation": false,
  "problem_generation_daily_limit": 20,
  "card_creation_limit": 100,
  "available_question_types": ["fill_in_the_blank"],
  "advanced_analytics": false,
  "priority_support": false
}'),
('price_xxxxxxxxxxxxxx_month', 'プレミアムプラン (月払い)', true, 'prod_xxxxxxxxxxxxxx_main', '{
  "llm_model_type": "premium",
  "background_problem_generation": true,
  "problem_generation_daily_limit": null,
  "card_creation_limit": null,
  "available_question_types": ["fill_in_the_blank", "multiple_choice", "free_description"],
  "advanced_analytics": true,
  "priority_support": true
}'),
('price_xxxxxxxxxxxxxx_year', 'プレミアムプラン (年払い)', true, 'prod_xxxxxxxxxxxxxx_main', '{
  "llm_model_type": "premium",
  "background_problem_generation": true,
  "problem_generation_daily_limit": null,
  "card_creation_limit": null,
  "available_question_types": ["fill_in_the_blank", "multiple_choice", "free_description"],
  "advanced_analytics": true,
  "priority_support": true
}');
-- 注意: 'price_...' や 'prod_...' の部分は、実際にStripeで作成したIDに置き換えてください。
-- フリープランもStripeのPriceとして$0で作成し、管理を一元化することもできますし、
-- DB上で特別なplan_id（例: 'free'）として扱い、subscriptionsテーブルにはレコードを作成しない、
-- もしくは status='active', current_period_end=非常に未来の日付 でフリープランのレコードを作成するなど、運用方法はいくつか考えられます。
-- ここでは、フリープランもStripeのPriceとして管理する前提で例示しました。
```

この設計で、Stripeと連携した柔軟なサブスクリプション管理システムの基盤が整います。
特にStripeのWebhookハンドラの実装が肝になってきますので、Supabaseのドキュメントやサンプルをよく参照してください。