# Phase 1.0: 既存AI機能統合計画

**作成日:** 2025-11-02
**対象:** 既存AI機能のAPIキー管理統合
**前提条件:** Phase 0.5（UI実装）完了

---

## 概要

既存のAI機能（ノート生成・問題生成）を、Phase 0.5で実装したAPIキー管理システムと統合します。
ユーザーが設定したAPIキーを使用してLLM呼び出しを行い、プロバイダーを選択可能にします。

---

## 現在のAI機能

### 1. ノート生成機能
**ファイル:** `app/_actions/generatePageInfo.ts`
**機能:** ページタイトルからMarkdown形式のコンテンツを生成
**現在の実装:**
```typescript
// 環境変数の固定APIキーを使用
import { geminiClient } from "@/lib/gemini/client";

export async function generatePageInfo(title: string): Promise<string> {
  const response = await geminiClient.models.generateContent({
    model: "gemini-2.5-flash",
    contents,
  });
  // ...
}
```

**問題点:**
- 環境変数の固定APIキーのみ
- Google Gemini固定（他のプロバイダー使用不可）
- ユーザーごとのカスタマイズ不可

### 2. 問題生成機能
**ファイル:** `hooks/useGenerateQuestions.ts` → `app/api/practice/generate`
**機能:** カードから練習問題を生成
**現在の実装:**
```typescript
// API Route: app/api/practice/generate
// 環境変数の固定APIキーを使用
```

**問題点:**
- 同様に環境変数の固定APIキー
- プロバイダー固定

---

## Phase 1.0 実装計画

### アーキテクチャ変更

#### Before (Phase 0.5まで)
```
generatePageInfo()
  ↓
geminiClient (固定APIキー)
  ↓
Google Gemini API
```

#### After (Phase 1.0)
```
generatePageInfo(provider?: LLMProvider)
  ↓
getUserAPIKey(provider)  ← ユーザー設定のAPIキー取得
  ↓
createLLMClient(provider, apiKey)
  ↓
選択されたLLM API (Google/OpenAI/Anthropic)
```

---

## 実装ファイル

### 1. Server Actions修正

#### 1.1 generatePageInfo.ts（ノート生成）
**修正内容:**
- プロバイダー選択パラメータ追加
- ユーザーAPIキー取得
- 統合LLMクライアント使用

**ファイル:** `app/_actions/generatePageInfo.ts`

```typescript
export async function generatePageInfo(
  title: string,
  options?: {
    provider?: LLMProvider;
    model?: string;
  }
): Promise<string> {
  // 1. ユーザーAPIキー取得
  const apiKey = await getUserAPIKey(options?.provider || "google");
  
  // 2. LLMクライアント作成
  const client = await createLLMClient({
    provider: options?.provider || "google",
    model: options?.model,
    apiKey,
  });
  
  // 3. コンテンツ生成
  const result = await client.generate(prompt);
  return result;
}
```

#### 1.2 generateCards.ts（問題生成）
**新規作成または修正:**
- API Routeからの移行検討
- プロバイダー選択対応

**ファイル:** `app/_actions/ai/generateCards.ts` (新規)

```typescript
export async function generateCardsFromContent(
  content: string,
  options?: {
    provider?: LLMProvider;
    model?: string;
    type?: QuestionType;
  }
): Promise<QuestionData[]> {
  // ユーザーAPIキー + 統合クライアント使用
}
```

---

### 2. ヘルパー関数実装

#### 2.1 getUserAPIKey（ユーザーAPIキー取得）
**ファイル:** `app/_actions/ai/getUserAPIKey.ts` (新規)

**機能:**
1. 現在のユーザー認証確認
2. 指定プロバイダーのAPIキー取得（user_api_keysテーブル）
3. 復号化（api-key-vault使用）
4. フォールバック処理（環境変数APIキー）

**実装:**
```typescript
export async function getUserAPIKey(
  provider: LLMProvider
): Promise<string> {
  // 1. 認証チェック
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    // 未認証時は環境変数フォールバック
    return getEnvironmentAPIKey(provider);
  }
  
  // 2. ユーザーAPIキー取得
  const { data, error } = await supabase
    .from("user_api_keys")
    .select("encrypted_key")
    .eq("user_id", user.id)
    .eq("provider", provider)
    .single();
  
  if (error || !data) {
    // 未設定時は環境変数フォールバック
    return getEnvironmentAPIKey(provider);
  }
  
  // 3. 復号化
  const decrypted = await decryptAPIKey(data.encrypted_key);
  return decrypted;
}

function getEnvironmentAPIKey(provider: LLMProvider): string {
  const keys = {
    google: process.env.GEMINI_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
  };
  
  const key = keys[provider];
  if (!key) {
    throw new Error(`API key not configured for provider: ${provider}`);
  }
  
  return key;
}
```

#### 2.2 getUserPreferredProvider（デフォルトプロバイダー取得）
**ファイル:** `app/_actions/ai/getUserPreferredProvider.ts` (新規)

**機能:**
- ユーザーのデフォルトプロバイダー設定を取得
- 未設定時は "google" をデフォルト

**実装:**
```typescript
export async function getUserPreferredProvider(): Promise<LLMProvider> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return "google"; // デフォルト
  }
  
  // user_preferencesテーブルから取得（Phase 1.0では実装スキップ可）
  // とりあえず設定済みのプロバイダーを返す
  const { data } = await supabase
    .from("user_api_keys")
    .select("provider")
    .eq("user_id", user.id)
    .limit(1)
    .single();
  
  return (data?.provider as LLMProvider) || "google";
}
```

---

### 3. UIコンポーネント追加

#### 3.1 ProviderSelector（プロバイダー選択）
**ファイル:** `components/ai/ProviderSelector.tsx` (新規)

**機能:**
- AI生成時にプロバイダー選択
- 設定済みプロバイダーのみ選択可能
- 未設定時は設定画面へ誘導

**実装:**
```typescript
interface ProviderSelectorProps {
  value?: LLMProvider;
  onChange: (provider: LLMProvider) => void;
}

export function ProviderSelector({ value, onChange }: ProviderSelectorProps) {
  const [keyStatus, setKeyStatus] = useState<Record<LLMProvider, boolean>>({});
  
  useEffect(() => {
    // 各プロバイダーの設定状態取得
    async function fetchStatus() {
      const google = await getAPIKeyStatus("google");
      const openai = await getAPIKeyStatus("openai");
      const anthropic = await getAPIKeyStatus("anthropic");
      
      setKeyStatus({
        google: google.configured,
        openai: openai.configured,
        anthropic: anthropic.configured,
      });
    }
    fetchStatus();
  }, []);
  
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="プロバイダーを選択" />
      </SelectTrigger>
      <SelectContent>
        {PROVIDERS.map(provider => (
          <SelectItem
            key={provider}
            value={provider}
            disabled={!keyStatus[provider]}
          >
            {provider === "google" && "Google Gemini"}
            {provider === "openai" && "OpenAI"}
            {provider === "anthropic" && "Anthropic Claude"}
            {!keyStatus[provider] && " (未設定)"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

#### 3.2 GenerateContentButton（コンテンツ生成ボタン）
**ファイル:** `components/pages/GenerateContentButton.tsx` (修正)

**変更点:**
- プロバイダー選択ダイアログ追加
- 生成時にプロバイダー指定

**実装:**
```typescript
export function GenerateContentButton({ pageTitle }: { pageTitle: string }) {
  const [provider, setProvider] = useState<LLMProvider>("google");
  const [isOpen, setIsOpen] = useState(false);
  
  async function handleGenerate() {
    // プロバイダーを指定して生成
    const content = await generatePageInfo(pageTitle, { provider });
    // ...
  }
  
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Sparkles className="mr-2 h-4 w-4" />
        コンテンツ生成
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>コンテンツ生成</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Label>プロバイダー選択</Label>
            <ProviderSelector value={provider} onChange={setProvider} />
          </div>
          
          <DialogFooter>
            <Button onClick={handleGenerate}>生成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

---

### 4. データベース拡張（オプション）

#### 4.1 user_preferences テーブル（Phase 1.5 または Phase 2.0）
```sql
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_llm_provider TEXT DEFAULT 'google',
  default_llm_model TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Phase 1.0では実装スキップ可（環境変数フォールバック使用）**

---

## 実装順序

### Day 1: Server Actions基盤
- [ ] getUserAPIKey.ts 実装
- [ ] getUserPreferredProvider.ts 実装（簡易版）
- [ ] テスト実装

### Day 2: generatePageInfo統合
- [ ] generatePageInfo.ts 修正（プロバイダー対応）
- [ ] エラーハンドリング追加
- [ ] テスト実装

### Day 3: UIコンポーネント
- [ ] ProviderSelector.tsx 実装
- [ ] GenerateContentButton 修正
- [ ] テスト実装

### Day 4: 問題生成統合
- [ ] generateCards.ts 実装
- [ ] API Route修正または削除
- [ ] テスト実装

### Day 5: 統合テスト・ドキュメント
- [ ] E2Eテスト
- [ ] ドキュメント作成
- [ ] バグ修正

---

## エラーハンドリング

### ケース1: APIキー未設定
```typescript
// ユーザー向けエラー
throw new Error("APIキーが設定されていません。設定画面から設定してください。");

// UI側でキャッチして設定画面へ誘導
```

### ケース2: APIキー無効
```typescript
// 検証エラー時
throw new Error("APIキーが無効です。設定を確認してください。");

// UI側でトースト表示 + 再設定促進
```

### ケース3: 環境変数フォールバック失敗
```typescript
// システムエラー
logger.error("Environment API key not configured", { provider });
throw new Error("システム設定エラー。管理者に連絡してください。");
```

---

## テスト計画

### ユニットテスト
- getUserAPIKey() - 各種ケース
- generatePageInfo() - プロバイダー切り替え
- ProviderSelector - UI動作

### 統合テスト
- APIキー設定 → コンテンツ生成フロー
- プロバイダー切り替え → 正常動作確認
- エラーケース → 適切なエラー表示

---

## マイルストーン

### Phase 1.0.1: 基盤実装 (Day 1-2)
- getUserAPIKey実装
- generatePageInfo統合

### Phase 1.0.2: UI実装 (Day 3)
- ProviderSelector実装
- 既存UIの修正

### Phase 1.0.3: 問題生成統合 (Day 4)
- generateCards実装
- API Route統合

### Phase 1.0.4: 完成・テスト (Day 5)
- E2Eテスト
- ドキュメント作成

---

## 成功基準

- [ ] ユーザー設定のAPIキーでコンテンツ生成成功
- [ ] プロバイダー切り替え動作確認
- [ ] 環境変数フォールバック動作確認
- [ ] エラーハンドリング適切
- [ ] テストカバレッジ80%以上
- [ ] ドキュメント完成

---

## リスク・注意点

### リスク1: 既存機能の後方互換性
**対策:** 環境変数フォールバック実装で既存動作維持

### リスク2: プロンプト形式の差異
**対策:** 各プロバイダーで同等の結果が得られるようプロンプト調整

### リスク3: レート制限・コスト
**対策:** 後のフェーズで使用量追跡実装を検討

---

## 次のフェーズ（Phase 2.0以降）

- デフォルトプロバイダー設定UI
- モデル選択機能
- 使用量追跡
- コスト管理
- RAG機能実装

---

**最終更新:** 2025-11-02
**作成者:** AI (Claude 3.5 Sonnet)
**ステータス:** 🚧 計画中
