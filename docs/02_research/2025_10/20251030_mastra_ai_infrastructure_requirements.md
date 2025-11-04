# Mastraを使用したAI機能基盤とAPIキー管理の実装要件定義

**作成日**: 2025-10-30
**対象**: 全開発者
**カテゴリ**: 要件定義・設計書
**優先度**: Critical

---

## 📋 概要

AIチャット機能の基盤として、**Mastra**フレームワークを導入します。また、AI機能は各ユーザーが自分のLLM APIキーを設定することで使用可能にします。

### 主要な変更点
- ✅ Mastra を使用したマルチLLM対応
- ✅ ユーザーごとのAPIキー管理機能
- ✅ APIキー未設定時のUI対応
- ✅ 複数LLMプロバイダーのサポート

---

## 🎯 Mastraの選定理由

### Mastraとは
Mastraは、AIアプリケーション開発のためのTypeScriptフレームワークです。

**公式サイト**: https://mastra.dev/

### 主な機能
1. **マルチLLM対応**: Gemini, OpenAI, Claude, Llama等を統一APIで利用
2. **エージェントシステム**: 複雑なAIワークフローの構築
3. **プロンプト管理**: バージョン管理とテンプレート化
4. **ツール連携**: カスタムツールの簡単な追加
5. **ストリーミング対応**: リアルタイムレスポンス

### なぜMastraを使うか
- 統一されたAPIでLLMを切り替え可能
- ユーザーが好きなLLMプロバイダーを選択可能
- エージェント機能で高度なAI機能を実装可能
- TypeScript ネイティブで型安全

---

## 🏗️ アーキテクチャ

### システム構成

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
├─────────────────────────────────────────────────────────────┤
│  - AICommandBar (チャットUI)                                │
│  - APIKeySettings (APIキー設定画面)                         │
│  - LLMProviderSelector (LLMプロバイダー選択)                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    Server Actions                           │
├─────────────────────────────────────────────────────────────┤
│  - chatWithAI (チャット実行)                                 │
│  - saveAPIKey (APIキー保存)                                  │
│  - getAPIKeyStatus (APIキー設定状態取得)                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    Mastra Engine                            │
├─────────────────────────────────────────────────────────────┤
│  lib/mastra/                                                │
│  ├── client.ts          (Mastra初期化)                      │
│  ├── agents/            (AIエージェント定義)                 │
│  │   ├── chat-agent.ts                                      │
│  │   ├── summarize-agent.ts                                 │
│  │   └── search-agent.ts                                    │
│  ├── tools/             (カスタムツール)                     │
│  │   ├── page-tool.ts                                       │
│  │   └── search-tool.ts                                     │
│  └── prompts/           (プロンプトテンプレート)             │
│      └── templates.ts                                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                      Supabase                               │
├─────────────────────────────────────────────────────────────┤
│  - user_api_keys (暗号化されたAPIキー)                       │
│  - ai_usage_logs (使用ログ)                                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                   LLM Providers                             │
├─────────────────────────────────────────────────────────────┤
│  - Google Gemini                                            │
│  - OpenAI GPT                                               │
│  - Anthropic Claude                                         │
│  - etc.                                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 データベース設計

### user_api_keys テーブル

```sql
-- ユーザーAPIキー管理テーブル
CREATE TABLE public.user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'gemini', 'openai', 'claude', etc.
  encrypted_api_key TEXT NOT NULL, -- 暗号化されたAPIキー
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  
  -- ユーザーごと・プロバイダーごとに1つのみ
  UNIQUE(user_id, provider)
);

-- インデックス
CREATE INDEX idx_user_api_keys_user_id ON public.user_api_keys(user_id);
CREATE INDEX idx_user_api_keys_provider ON public.user_api_keys(provider);

-- RLS ポリシー
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_own_api_keys
  ON public.user_api_keys
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY insert_own_api_keys
  ON public.user_api_keys
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY update_own_api_keys
  ON public.user_api_keys
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY delete_own_api_keys
  ON public.user_api_keys
  FOR DELETE
  USING (auth.uid() = user_id);
```

### ai_usage_logs テーブル（オプション）

```sql
-- AI使用ログテーブル（統計・デバッグ用）
CREATE TABLE public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  cost_usd DECIMAL(10, 6), -- 推定コスト
  response_time_ms INTEGER,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_ai_usage_logs_user_id ON public.ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_logs_created_at ON public.ai_usage_logs(created_at);

-- RLS ポリシー
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_own_ai_usage_logs
  ON public.ai_usage_logs
  FOR SELECT
  USING (auth.uid() = user_id);
```

---

## 🔐 APIキー暗号化

### 暗号化方式

**推奨**: Supabase Vault を使用

```typescript
// lib/encryption/api-key-vault.ts
import { createClient } from "@/lib/supabase/server";

export async function encryptAPIKey(apiKey: string): Promise<string> {
  const supabase = await createClient();
  
  // Supabase Vault を使用して暗号化
  const { data, error } = await supabase.rpc('vault.encrypt', {
    secret: apiKey
  });
  
  if (error) throw error;
  return data;
}

export async function decryptAPIKey(encryptedKey: string): Promise<string> {
  const supabase = await createClient();
  
  // Supabase Vault を使用して復号化
  const { data, error } = await supabase.rpc('vault.decrypt', {
    encrypted: encryptedKey
  });
  
  if (error) throw error;
  return data;
}
```

**代替案**: 環境変数の暗号化キーを使用

```typescript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_KEY!;
const ALGORITHM = 'aes-256-gcm';

export function encryptAPIKey(apiKey: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptAPIKey(encryptedKey: string): string {
  const parts = encryptedKey.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

---

## 🛠️ Mastra統合

### Mastraのインストール

```bash
bun add @mastra/core @mastra/agent @mastra/llm
```

### Mastra クライアントの初期化

```typescript
// lib/mastra/client.ts
import { Mastra } from '@mastra/core';
import { GeminiLLM } from '@mastra/llm/gemini';
import { OpenAILLM } from '@mastra/llm/openai';
import { ClaudeLLM } from '@mastra/llm/claude';

interface MastraClientOptions {
  provider: 'gemini' | 'openai' | 'claude';
  apiKey: string;
  model?: string;
}

export function createMastraClient(options: MastraClientOptions): Mastra {
  let llm;
  
  switch (options.provider) {
    case 'gemini':
      llm = new GeminiLLM({
        apiKey: options.apiKey,
        model: options.model || 'gemini-1.5-pro'
      });
      break;
    
    case 'openai':
      llm = new OpenAILLM({
        apiKey: options.apiKey,
        model: options.model || 'gpt-4'
      });
      break;
    
    case 'claude':
      llm = new ClaudeLLM({
        apiKey: options.apiKey,
        model: options.model || 'claude-3-opus'
      });
      break;
    
    default:
      throw new Error(`Unsupported provider: ${options.provider}`);
  }
  
  return new Mastra({
    llm,
    // その他の設定
  });
}
```

### チャットエージェントの定義

```typescript
// lib/mastra/agents/chat-agent.ts
import { Agent } from '@mastra/agent';
import { createMastraClient } from '../client';

export async function createChatAgent(
  provider: string,
  apiKey: string,
  systemPrompt: string
) {
  const mastra = createMastraClient({
    provider: provider as any,
    apiKey
  });
  
  return new Agent({
    name: 'chat-assistant',
    instructions: systemPrompt,
    llm: mastra.llm,
    tools: [
      // カスタムツールを追加
    ]
  });
}
```

---

## 📱 UI実装

### APIキー設定画面

**ファイル:**
```
components/settings/
├── APIKeySettings.tsx
├── APIKeyForm.tsx
└── ProviderSelector.tsx
```

**UI例:**
```tsx
// components/settings/APIKeySettings.tsx
export function APIKeySettings() {
  const [provider, setProvider] = useState<'gemini' | 'openai' | 'claude'>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      await saveAPIKey({ provider, apiKey });
      toast.success('APIキーを保存しました');
    } catch (error) {
      toast.error('APIキーの保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI APIキー設定</CardTitle>
        <CardDescription>
          AI機能を使用するには、LLMプロバイダーのAPIキーを設定してください
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label>プロバイダー</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini">Google Gemini</SelectItem>
                <SelectItem value="openai">OpenAI GPT</SelectItem>
                <SelectItem value="claude">Anthropic Claude</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>APIキー</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              APIキーは暗号化して保存されます
            </p>
          </div>
          
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>APIキーの取得方法</AlertTitle>
            <AlertDescription>
              {provider === 'gemini' && (
                <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer">
                  Google AI Studio でAPIキーを取得
                </a>
              )}
              {provider === 'openai' && (
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">
                  OpenAI Platform でAPIキーを取得
                </a>
              )}
              {provider === 'claude' && (
                <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">
                  Anthropic Console でAPIキーを取得
                </a>
              )}
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? '保存中...' : '保存'}
        </Button>
      </CardFooter>
    </Card>
  );
}
```

### APIキー未設定時のUI

```tsx
// components/ai-command-bar/APIKeyPrompt.tsx
export function APIKeyPrompt() {
  return (
    <div className="p-4 text-center">
      <Bot className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
      <h3 className="font-semibold mb-2">AI機能を使用するには</h3>
      <p className="text-sm text-muted-foreground mb-4">
        LLMプロバイダーのAPIキーを設定してください
      </p>
      <Button asChild>
        <Link href="/settings/api-keys">
          APIキーを設定
        </Link>
      </Button>
    </div>
  );
}
```

---

## 🎯 実装タスク

### Phase 0: Mastra基盤構築（優先度: Critical）

**期間**: 3-4日

#### Task 1: データベース構築
- [ ] `user_api_keys` テーブル作成
- [ ] `ai_usage_logs` テーブル作成（オプション）
- [ ] RLS ポリシー設定
- [ ] マイグレーションファイル作成

#### Task 2: APIキー暗号化
- [ ] Supabase Vault 設定 or 暗号化ユーティリティ実装
- [ ] 暗号化関数のテスト
- [ ] セキュリティレビュー

#### Task 3: Mastraセットアップ
- [ ] Mastra インストール
- [ ] 基本的なクライアント実装
- [ ] マルチLLM対応の確認

#### Task 4: Server Actions実装
- [ ] `saveAPIKey` - APIキー保存
- [ ] `getAPIKeyStatus` - APIキー設定状態取得
- [ ] `deleteAPIKey` - APIキー削除
- [ ] `testAPIKey` - APIキーの検証

#### Task 5: UI実装
- [ ] APIキー設定画面
- [ ] プロバイダー選択UI
- [ ] APIキー未設定時のプロンプト
- [ ] 設定ページへのナビゲーション追加

---

## ✅ 完了条件

- [ ] Mastra が正しくインストールされている
- [ ] データベーステーブルが作成されている
- [ ] APIキーが暗号化して保存できる
- [ ] APIキー設定画面が動作する
- [ ] プロバイダーを切り替えられる
- [ ] APIキー未設定時に適切なUIが表示される
- [ ] セキュリティレビューを通過している
- [ ] すべてのテストがパスする

---

## 🧪 テスト要件

### ユニットテスト
- [ ] APIキー暗号化・復号化
- [ ] Mastraクライアント初期化
- [ ] Server Actions

### 統合テスト
- [ ] APIキー保存フロー
- [ ] APIキー取得フロー
- [ ] プロバイダー切り替え

### セキュリティテスト
- [ ] APIキーが平文で保存されていないこと
- [ ] 他のユーザーのAPIキーにアクセスできないこと
- [ ] RLSポリシーが正しく機能すること

---

## 📚 参考資料

- Mastra 公式ドキュメント: https://mastra.dev/docs
- Supabase Vault: https://supabase.com/docs/guides/database/vault
- Node.js Crypto: https://nodejs.org/api/crypto.html

---

## 🔗 関連 Issue

- #70 (Phase 1): 基本実装 - **この基盤の上に構築**
- #71 (Phase 2): コンテキスト応答
- #72 (Phase 3): ページ要約

---

**最終更新**: 2025-10-30
**作成者**: AI (Claude)
