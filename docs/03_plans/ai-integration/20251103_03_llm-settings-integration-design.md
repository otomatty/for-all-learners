# LLM設定タブ 統合設計書

**作成日**: 2025-11-03
**対象**: `/settings`ページの`llm-settings`タブ
**目的**: APIキー設定 + プロバイダー選択 + モデル選択の統合

---

## 📋 現状分析

### 既存の`llm-settings/index.tsx`
- **機能1**: モデル選択（システムモデル + カスタムモデル）
- **機能2**: プロバイダーごとのAPIキー設定（Switch ON/OFF）
- **データ構造**:
  ```typescript
  SYSTEM_MODELS = {
    gemini: ["gemini-text-bison-001", "gemini-code-gecko-001"],
    openai: ["gpt-3.5-turbo", "gpt-4"],
    claude: ["claude-v1", "claude-v1.3"],
    deepseek: ["deepseek-default"],
  }
  ```
- **問題点**:
  - プロバイダーの選択がない（すべてのプロバイダーが並列）
  - 「どのプロバイダーを使用するか」が不明確
  - モデル選択が全プロバイダー共通（プロバイダーごとに分けるべき）

### Phase 1.4で作成した`LLMProviderSettings.tsx`
- **機能1**: プロバイダー選択（RadioGroup: Google/OpenAI/Anthropic）
- **機能2**: モデル選択（プロバイダーごとのモデル一覧）
- **機能3**: LLMProviderContext統合（localStorage永続化）
- **データ構造**:
  ```typescript
  MODEL_OPTIONS = {
    google: [
      { value: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash (Experimental)" },
      { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      // ...
    ],
    openai: [
      { value: "gpt-4o", label: "GPT-4o" },
      // ...
    ],
    anthropic: [
      { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
      // ...
    ],
  }
  ```

### Phase 0.5で作成した`APIKeySettings.tsx`
- **機能1**: プロバイダーごとのAPIキー入力（3つのProviderCard）
- **機能2**: APIキー保存・削除
- **機能3**: Supabase暗号化保存
- **コンポーネント構成**:
  - `ProviderCard` × 3（Google/OpenAI/Anthropic）
  - `APIKeyForm`（APIキー入力・保存・削除）

---

## 🎯 統合後の設計

### UI構成
```
[LLM設定タブ]
┌───────────────────────────────────────────────────────────┐
│ 📝 LLM設定                                                │
│                                                           │
│ 各プロバイダーのAPIキーを設定し、AIチャットで使用する    │
│ モデルを選択します。                                      │
├───────────────────────────────────────────────────────────┤
│                                                           │
│ ▼ Google Gemini                          [設定済み ✓]   │
│ ───────────────────────────────────────────────────────   │
│   APIキー: [********************] [👁]                   │
│   [保存] [削除]                                          │
│                                                           │
│   使用可能なモデル（チェックしたモデルのみAIチャットに   │
│   表示）:                                                 │
│   ☑ Gemini 2.0 Flash (Experimental)                     │
│     最新の実験版モデル（不安定な可能性）                  │
│   ☑ Gemini 2.5 Flash                                    │
│     推奨：高速で正確なバランス型                          │
│   ☐ Gemini 1.5 Pro                                      │
│     高度な推論能力、複雑なタスクに最適                    │
│   ☐ Gemini 1.5 Flash                                    │
│     旧版：バランス型                                      │
│                                                           │
│   ⓘ APIキーは暗号化されて安全に保存されます              │
│                                                           │
├───────────────────────────────────────────────────────────┤
│                                                           │
│ ▶ OpenAI GPT                             [未設定]        │
│                                                           │
├───────────────────────────────────────────────────────────┤
│                                                           │
│ ▶ Anthropic Claude                       [未設定]        │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### データフロー
```
┌──────────────────────────────────────────────────────────┐
│ User Interaction                                         │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ LLMSettingsIntegrated Component                          │
│                                                          │
│ State:                                                   │
│  • selectedProvider (from LLMProviderContext)            │
│  • selectedModel (from LLMProviderContext)               │
│  • apiKeys (from Supabase via Server Actions)            │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ Data Persistence                                         │
│                                                          │
│ • LLMProviderContext → localStorage                      │
│   (provider, model)                                      │
│                                                          │
│ • Server Actions → Supabase                              │
│   (api_key_encrypted)                                    │
└──────────────────────────────────────────────────────────┘
```

### コンポーネント階層
```
<LLMSettingsIntegrated>
  └─ <Accordion type="single" collapsible>
      ├─ <AccordionItem value="google">
      │   ├─ <AccordionTrigger>
      │   │   └─ Google Gemini [設定済み ✓ / 未設定]
      │   └─ <AccordionContent>
      │       ├─ <APIKeyForm>
      │       │   ├─ <Input type="password">
      │       │   ├─ <Button>保存</Button>
      │       │   └─ <Button>削除</Button>
      │       └─ <ModelSelection>
      │           └─ {MODEL_OPTIONS.google.map(model => (
      │               <Checkbox> {model.label}
      │             ))}
      │
      ├─ <AccordionItem value="openai">
      │   └─ (same structure)
      │
      └─ <AccordionItem value="anthropic">
          └─ (same structure)
```

---

## 📝 型定義

### LLMProvider
```typescript
type LLMProvider = "google" | "openai" | "anthropic";
```

### LLMProviderConfig
```typescript
interface LLMProviderConfig {
  provider: LLMProvider;
  model: string;
}
```

### ModelOption
```typescript
interface ModelOption {
  value: string;
  label: string;
  description?: string;
}
```

### MODEL_OPTIONS
```typescript
const MODEL_OPTIONS: Record<LLMProvider, ModelOption[]> = {
  google: [
    {
      value: "gemini-2.0-flash-exp",
      label: "Gemini 2.0 Flash (Experimental)",
      description: "最新の実験版モデル（不安定な可能性）",
    },
    {
      value: "gemini-2.5-flash",
      label: "Gemini 2.5 Flash",
      description: "推奨：高速で正確なバランス型",
    },
    {
      value: "gemini-1.5-pro",
      label: "Gemini 1.5 Pro",
      description: "高度な推論能力、複雑なタスクに最適",
    },
    {
      value: "gemini-1.5-flash",
      label: "Gemini 1.5 Flash",
      description: "旧版：バランス型",
    },
  ],
  openai: [
    {
      value: "gpt-4o",
      label: "GPT-4o",
      description: "推奨：最新の高性能モデル",
    },
    {
      value: "gpt-4o-mini",
      label: "GPT-4o Mini",
      description: "軽量版、コスト効率的",
    },
    {
      value: "gpt-4-turbo",
      label: "GPT-4 Turbo",
      description: "高性能、長文対応",
    },
    {
      value: "gpt-3.5-turbo",
      label: "GPT-3.5 Turbo",
      description: "旧版：コスト効率的",
    },
  ],
  anthropic: [
    {
      value: "claude-3-5-sonnet-20241022",
      label: "Claude 3.5 Sonnet",
      description: "推奨：最新版、バランス型",
    },
    {
      value: "claude-3-opus-20240229",
      label: "Claude 3 Opus",
      description: "最高性能、複雑なタスクに最適",
    },
    {
      value: "claude-3-sonnet-20240229",
      label: "Claude 3 Sonnet",
      description: "バランス型",
    },
    {
      value: "claude-3-haiku-20240307",
      label: "Claude 3 Haiku",
      description: "高速・軽量、シンプルなタスクに最適",
    },
  ],
};
```

---

## 🔄 イベントハンドリング

### 1. プロバイダー変更時
```typescript
const handleProviderChange = (provider: LLMProvider) => {
  // 1. デフォルトモデルを取得
  const defaultModel = MODEL_OPTIONS[provider][0].value;
  
  // 2. LLMProviderContextを更新
  setConfig({ provider, model: defaultModel });
  
  // 3. トースト通知
  toast.success(`プロバイダーを ${provider} に変更しました`);
};
```

### 2. モデル変更時
```typescript
const handleModelChange = (model: string) => {
  // 1. LLMProviderContextを更新
  setConfig({ provider: config.provider, model });
  
  // 2. トースト通知
  toast.success(`モデルを ${model} に変更しました`);
};
```

### 3. APIキー保存時
```typescript
const handleSaveAPIKey = async (apiKey: string) => {
  try {
    // 1. Server Actionを呼び出し
    await updateUserLlmSettings(config.provider, apiKey);
    
    // 2. 成功通知
    toast.success("APIキーを保存しました");
    
    // 3. ローカル状態を更新
    setApiKeys({ ...apiKeys, [config.provider]: apiKey });
  } catch (error) {
    // エラーハンドリング
    toast.error("APIキーの保存に失敗しました");
    console.error("Failed to save API key:", error);
  }
};
```

### 4. APIキー削除時
```typescript
const handleDeleteAPIKey = async () => {
  try {
    // 1. Server Actionを呼び出し
    await deleteUserLlmSettings();
    
    // 2. 成功通知
    toast.success("APIキーを削除しました");
    
    // 3. ローカル状態を更新
    setApiKeys({ ...apiKeys, [config.provider]: "" });
  } catch (error) {
    // エラーハンドリング
    toast.error("APIキーの削除に失敗しました");
    console.error("Failed to delete API key:", error);
  }
};
```

---

## 🎨 UIコンポーネント設計

### ProviderSelector
```tsx
<div className="space-y-2">
  <Label>使用するプロバイダー</Label>
  <RadioGroup value={config.provider} onValueChange={handleProviderChange}>
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="google" id="google" />
      <Label htmlFor="google">Google Gemini</Label>
    </div>
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="openai" id="openai" />
      <Label htmlFor="openai">OpenAI GPT</Label>
    </div>
    <div className="flex items-center space-x-2">
      <RadioGroupItem value="anthropic" id="anthropic" />
      <Label htmlFor="anthropic">Anthropic Claude</Label>
    </div>
  </RadioGroup>
</div>
```

### ModelSelector
```tsx
<div className="space-y-2">
  <Label htmlFor="model-select">モデル</Label>
  <Select value={config.model} onValueChange={handleModelChange}>
    <SelectTrigger id="model-select">
      <SelectValue placeholder="モデルを選択" />
    </SelectTrigger>
    <SelectContent>
      {MODEL_OPTIONS[config.provider].map((option) => (
        <SelectItem key={option.value} value={option.value}>
          <div className="flex flex-col">
            <span>{option.label}</span>
            {option.description && (
              <span className="text-xs text-muted-foreground">
                {option.description}
              </span>
            )}
          </div>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

### APIKeyForm
```tsx
<div className="space-y-4 p-4 border rounded">
  <Label htmlFor="api-key">APIキー ({providerLabel})</Label>
  <div className="flex space-x-2">
    <Input
      id="api-key"
      type={showAPIKey ? "text" : "password"}
      value={apiKeys[config.provider] || ""}
      onChange={(e) => setApiKeys({ ...apiKeys, [config.provider]: e.target.value })}
      placeholder="APIキーを入力"
    />
    <Button variant="ghost" onClick={() => setShowAPIKey(!showAPIKey)}>
      {showAPIKey ? <EyeOffIcon /> : <EyeIcon />}
    </Button>
  </div>
  <div className="flex space-x-2">
    <Button onClick={handleSaveAPIKey} disabled={isPending}>
      保存
    </Button>
    <Button variant="destructive" onClick={handleDeleteAPIKey} disabled={isPending}>
      削除
    </Button>
  </div>
  <p className="text-sm text-muted-foreground">
    ⓘ APIキーは暗号化されて安全に保存されます
  </p>
</div>
```

### SettingsSummary
```tsx
<Alert>
  <InfoIcon className="h-4 w-4" />
  <AlertTitle>現在の設定</AlertTitle>
  <AlertDescription>
    <ul className="list-disc list-inside space-y-1">
      <li>プロバイダー: {providerLabel}</li>
      <li>モデル: {modelLabel}</li>
      <li>APIキー: {apiKeys[config.provider] ? "設定済み ✓" : "未設定"}</li>
    </ul>
  </AlertDescription>
</Alert>
```

---

## 🧪 テストケース設計

### TC-001: デフォルト状態の確認
```typescript
test("TC-001: デフォルトプロバイダー（Google）が選択されている", () => {
  render(<LLMSettingsIntegrated />);
  const googleRadio = screen.getByLabelText("Google Gemini");
  expect(googleRadio).toBeChecked();
});
```

### TC-002: プロバイダー変更時のモデル自動切り替え
```typescript
test("TC-002: プロバイダー変更時、モデルが自動的にデフォルトに設定される", async () => {
  render(<LLMSettingsIntegrated />);
  
  // OpenAIに変更
  const openaiRadio = screen.getByLabelText("OpenAI GPT");
  fireEvent.click(openaiRadio);
  
  // モデルが gpt-4o（デフォルト）に変更されることを確認
  await waitFor(() => {
    expect(screen.getByDisplayValue("gpt-4o")).toBeInTheDocument();
  });
});
```

### TC-003: モデル選択
```typescript
test("TC-003: モデル選択が正常に動作する", async () => {
  render(<LLMSettingsIntegrated />);
  
  // モデル選択を開く
  const modelSelect = screen.getByRole("combobox");
  fireEvent.click(modelSelect);
  
  // gemini-1.5-proを選択
  const proOption = screen.getByText("Gemini 1.5 Pro");
  fireEvent.click(proOption);
  
  // 選択が反映されることを確認
  await waitFor(() => {
    expect(screen.getByDisplayValue("gemini-1.5-pro")).toBeInTheDocument();
  });
});
```

### TC-004: APIキー保存
```typescript
test("TC-004: APIキー保存が正常に動作する", async () => {
  const mockUpdate = jest.fn().mockResolvedValue(undefined);
  jest.mock("@/app/_actions/llmSettings", () => ({
    updateUserLlmSettings: mockUpdate,
  }));
  
  render(<LLMSettingsIntegrated />);
  
  // APIキーを入力
  const apiKeyInput = screen.getByPlaceholderText("APIキーを入力");
  fireEvent.change(apiKeyInput, { target: { value: "test-api-key-123" } });
  
  // 保存ボタンをクリック
  const saveButton = screen.getByText("保存");
  fireEvent.click(saveButton);
  
  // Server Actionが呼ばれることを確認
  await waitFor(() => {
    expect(mockUpdate).toHaveBeenCalledWith("google", "test-api-key-123");
  });
  
  // 成功トーストが表示されることを確認
  expect(screen.getByText("APIキーを保存しました")).toBeInTheDocument();
});
```

### TC-005: localStorage永続化
```typescript
test("TC-005: localStorage永続化が正常に動作する", async () => {
  render(<LLMSettingsIntegrated />);
  
  // OpenAIに変更
  const openaiRadio = screen.getByLabelText("OpenAI GPT");
  fireEvent.click(openaiRadio);
  
  // localStorageに保存されることを確認
  await waitFor(() => {
    const stored = localStorage.getItem("llm-provider-config");
    const parsed = JSON.parse(stored!);
    expect(parsed.provider).toBe("openai");
    expect(parsed.model).toBe("gpt-4o");
  });
});
```

---

## 🔧 実装方針

### 1. 段階的な実装
- **Step 1**: 新しい`LLMSettingsIntegrated`コンポーネントを作成
- **Step 2**: 既存の`llm-settings/index.tsx`をバックアップ
- **Step 3**: 新しいコンポーネントで置き換え
- **Step 4**: テスト実装・実行
- **Step 5**: 動作確認後、バックアップを削除

### 2. データ移行
- 既存のAPIキー設定は`user_llm_settings`テーブルに保存済み
- LLMProviderContextの設定はlocalStorageに保存
- **移行作業不要**（既存データをそのまま使用）

### 3. 後方互換性
- 既存のServer Actions（`getUserLlmSettings`, `updateUserLlmSettings`, `deleteUserLlmSettings`）をそのまま使用
- スキーマ変更なし

---

## 📊 Phase 1.5 の目標

### 完了条件
- [ ] `LLMSettingsIntegrated`コンポーネント実装完了
- [ ] テスト12個以上がすべてPASS
- [ ] `/settings/api-keys`ページ削除完了
- [ ] 内部リンクすべて修正完了
- [ ] リダイレクト設定完了（オプション）
- [ ] ドキュメント作成完了

### テスト目標
```
✅ Phase 1.5: 12/12 tests PASS
  ├─ TC-001: デフォルト状態の確認
  ├─ TC-002: プロバイダー変更時のモデル自動切り替え
  ├─ TC-003: モデル選択
  ├─ TC-004: APIキー保存
  ├─ TC-005: localStorage永続化
  ├─ TC-006: APIキー削除
  ├─ TC-007: エラーハンドリング（保存失敗）
  ├─ TC-008: エラーハンドリング（削除失敗）
  ├─ TC-009: プロバイダーごとの正しいモデル表示
  ├─ TC-010: 設定サマリーの表示
  ├─ TC-011: APIキー表示/非表示切り替え
  └─ TC-012: 複数プロバイダー間の切り替え
```

---

**最終更新**: 2025-11-03
**作成者**: AI (Claude 3.5 Sonnet)
