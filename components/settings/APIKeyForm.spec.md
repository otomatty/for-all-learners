# APIKeyForm.spec.md

**Component Name:** APIKeyForm
**Created:** 2025-11-02
**Category:** Settings / Form Component

---

## Overview

APIキーを入力・検証・保存するためのダイアログフォームコンポーネント。
ユーザーがAPIキーを安全に入力し、リアルタイムで検証できる機能を提供します。

---

## Requirements

### Functional Requirements

**FR-001: APIキー入力**
- テキスト入力フィールドを提供
- デフォルトは非表示（password type）
- 表示/非表示の切り替えボタン

**FR-002: リアルタイム検証**
- [テスト] ボタンでAPIキーを検証
- 検証中はローディング表示
- 成功/失敗を視覚的にフィードバック

**FR-003: 保存処理**
- [保存] ボタンでAPIキーを保存
- 保存中はローディング表示
- 成功後にダイアログを閉じる

**FR-004: エラーハンドリング**
- 空のAPIキーでは保存不可
- 検証失敗時はエラーメッセージ表示
- ネットワークエラーも適切にハンドリング

**FR-005: キャンセル機能**
- [キャンセル] ボタンで閉じる
- Escキーで閉じる
- 入力内容は破棄される

---

### Non-Functional Requirements

**NFR-001: セキュリティ**
- APIキーは非表示がデフォルト
- コンソールログにAPIキーを出力しない
- エラーメッセージにAPIキーを含めない

**NFR-002: UX**
- ローディング状態の明確な表示
- 成功/失敗の即座のフィードバック
- キーボードナビゲーション対応

**NFR-003: パフォーマンス**
- テスト実行: < 3秒
- 保存実行: < 1秒
- UIブロックなし（非同期処理）

---

## Component Specification

### Props Interface

```typescript
export interface APIKeyFormProps {
  /** プロバイダー識別子 */
  provider: LLMProvider;
  
  /** ダイアログの開閉状態 */
  isOpen: boolean;
  
  /** ダイアログを閉じるコールバック */
  onClose: () => void;
  
  /** 保存成功時のコールバック */
  onSave: () => void;
}
```

---

### State Management

```typescript
interface FormState {
  /** 入力されたAPIキー */
  apiKey: string;
  
  /** APIキーの表示/非表示 */
  isVisible: boolean;
  
  /** テスト実行中フラグ */
  isTesting: boolean;
  
  /** 保存実行中フラグ */
  isSaving: boolean;
  
  /** テスト結果 */
  testResult: "success" | "error" | null;
  
  /** エラーメッセージ */
  errorMessage: string | null;
}
```

---

### Component Structure

```tsx
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="sm:max-w-[500px]">
    <DialogHeader>
      <DialogTitle>
        {providerInfo.icon} {providerInfo.name} APIキー設定
      </DialogTitle>
      <DialogDescription>
        APIキーを入力してください。
        <a href={providerInfo.docsUrl} target="_blank" rel="noopener noreferrer">
          ドキュメント
        </a>
        から取得できます。
      </DialogDescription>
    </DialogHeader>
    
    <div className="space-y-4 py-4">
      {/* APIキー入力 */}
      <div className="space-y-2">
        <Label htmlFor="api-key">APIキー</Label>
        <div className="flex gap-2">
          <Input
            id="api-key"
            type={isVisible ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            disabled={isSaving || isTesting}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsVisible(!isVisible)}
          >
            {isVisible ? <EyeOff /> : <Eye />}
          </Button>
        </div>
      </div>
      
      {/* テスト結果表示 */}
      {testResult === "success" && (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            APIキーは有効です
          </AlertDescription>
        </Alert>
      )}
      
      {testResult === "error" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {errorMessage || "APIキーが無効です"}
          </AlertDescription>
        </Alert>
      )}
    </div>
    
    <DialogFooter>
      <Button
        type="button"
        variant="outline"
        onClick={handleTest}
        disabled={!apiKey.trim() || isTesting || isSaving}
      >
        {isTesting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            テスト中...
          </>
        ) : (
          "テスト"
        )}
      </Button>
      
      <Button
        type="button"
        onClick={handleSave}
        disabled={!apiKey.trim() || isSaving || isTesting}
      >
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            保存中...
          </>
        ) : (
          "保存"
        )}
      </Button>
      
      <Button
        type="button"
        variant="ghost"
        onClick={onClose}
        disabled={isSaving || isTesting}
      >
        キャンセル
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

### Event Handlers

```typescript
async function handleTest() {
  if (!apiKey.trim()) {
    toast.error("APIキーを入力してください");
    return;
  }
  
  setIsTesting(true);
  setTestResult(null);
  setErrorMessage(null);
  
  try {
    const result = await testAPIKey(provider, apiKey);
    
    if (result.success) {
      setTestResult("success");
      toast.success("APIキーは有効です");
    } else {
      setTestResult("error");
      setErrorMessage(result.error);
      toast.error(result.error);
    }
  } catch (error) {
    setTestResult("error");
    setErrorMessage("テスト中にエラーが発生しました");
    toast.error("テスト中にエラーが発生しました");
  } finally {
    setIsTesting(false);
  }
}

async function handleSave() {
  if (!apiKey.trim()) {
    toast.error("APIキーを入力してください");
    return;
  }
  
  setIsSaving(true);
  
  try {
    const result = await saveAPIKey(provider, apiKey);
    
    if (result.success) {
      toast.success("APIキーを保存しました");
      onSave(); // 親コンポーネントに通知
      onClose(); // ダイアログを閉じる
    } else {
      toast.error(result.error);
    }
  } catch (error) {
    toast.error("保存中にエラーが発生しました");
  } finally {
    setIsSaving(false);
  }
}
```

---

## Test Cases

### TC-001: 初期表示

**Given:**
- `isOpen = true`
- `provider = "google"`

**When:**
- ダイアログが開かれる

**Then:**
- タイトルに "Google Gemini APIキー設定" が表示される
- APIキー入力フィールドが表示される
- 入力フィールドは password type（非表示）
- [テスト] [保存] [キャンセル] ボタンが表示される
- すべてのボタンが有効

---

### TC-002: APIキー入力

**Given:**
- ダイアログが開かれている

**When:**
- APIキー入力フィールドに "test-api-key" を入力

**Then:**
- 入力値が状態に反映される
- 入力フィールドに "•••••••••••" と表示される（password type）

---

### TC-003: 表示/非表示切り替え

**Given:**
- APIキーが入力されている
- `isVisible = false`

**When:**
- 目のアイコンボタンをクリック

**Then:**
- `isVisible = true` になる
- 入力フィールドが text type に変更される
- APIキーがプレーンテキストで表示される
- アイコンが EyeOff に変更される

---

### TC-004: 空のAPIキーで保存試行

**Given:**
- `apiKey = ""`

**When:**
- [保存] ボタンをクリック

**Then:**
- エラートースト "APIキーを入力してください" が表示される
- saveAPIKey() は呼ばれない
- ダイアログは開いたまま

---

### TC-005: APIキーのテスト成功

**Given:**
- `apiKey = "valid-api-key"`

**When:**
- [テスト] ボタンをクリック
- testAPIKey() が成功を返す

**Then:**
- ボタンテキストが "テスト中..." に変更される
- ローディングスピナーが表示される
- 成功アラートが表示される
- 成功トースト "APIキーは有効です" が表示される
- `testResult = "success"`

---

### TC-006: APIキーのテスト失敗

**Given:**
- `apiKey = "invalid-api-key"`

**When:**
- [テスト] ボタンをクリック
- testAPIKey() が失敗を返す

**Then:**
- エラーアラートが表示される
- エラートーストが表示される
- `testResult = "error"`
- `errorMessage` にエラー内容が設定される

---

### TC-007: APIキーの保存成功

**Given:**
- `apiKey = "valid-api-key"`

**When:**
- [保存] ボタンをクリック
- saveAPIKey() が成功を返す

**Then:**
- ボタンテキストが "保存中..." に変更される
- ローディングスピナーが表示される
- 成功トースト "APIキーを保存しました" が表示される
- `onSave()` コールバックが呼ばれる
- `onClose()` コールバックが呼ばれる
- ダイアログが閉じる

---

### TC-008: APIキーの保存失敗

**Given:**
- `apiKey = "test-key"`

**When:**
- [保存] ボタンをクリック
- saveAPIKey() が失敗を返す

**Then:**
- エラートーストが表示される
- ダイアログは開いたまま
- `onSave()` は呼ばれない
- `onClose()` は呼ばれない

---

### TC-009: キャンセルボタン

**Given:**
- ダイアログが開かれている
- APIキーが入力されている

**When:**
- [キャンセル] ボタンをクリック

**Then:**
- `onClose()` コールバックが呼ばれる
- 入力内容は破棄される（親の責任）

---

### TC-010: Escキーでダイアログを閉じる

**Given:**
- ダイアログが開かれている

**When:**
- Escキーを押す

**Then:**
- `onClose()` コールバックが呼ばれる

---

### TC-011: テスト中のボタン無効化

**Given:**
- `isTesting = true`

**When:**
- ダイアログがレンダリングされる

**Then:**
- [テスト] ボタンが無効化される
- [保存] ボタンが無効化される
- [キャンセル] ボタンが無効化される
- 入力フィールドが無効化される

---

### TC-012: 保存中のボタン無効化

**Given:**
- `isSaving = true`

**When:**
- ダイアログがレンダリングされる

**Then:**
- [テスト] ボタンが無効化される
- [保存] ボタンが無効化される
- [キャンセル] ボタンが無効化される
- 入力フィールドが無効化される

---

## Implementation Notes

### Provider Info Configuration

```typescript
import { PROVIDER_CONFIG } from "@/components/settings/ProviderCard";

const providerInfo = PROVIDER_CONFIG[provider];
```

---

### Toast Notifications

```typescript
import { toast } from "sonner";

// 成功
toast.success("APIキーを保存しました");

// エラー
toast.error("APIキーが無効です");

// ローディング
const toastId = toast.loading("保存中...");
toast.dismiss(toastId);
```

---

### Form Reset

```typescript
function resetForm() {
  setApiKey("");
  setIsVisible(false);
  setTestResult(null);
  setErrorMessage(null);
}

// ダイアログが閉じる時にリセット
useEffect(() => {
  if (!isOpen) {
    resetForm();
  }
}, [isOpen]);
```

---

### Keyboard Navigation

```tsx
// Enterキーで保存
<Input
  onKeyDown={(e) => {
    if (e.key === "Enter" && !isSaving && !isTesting && apiKey.trim()) {
      handleSave();
    }
  }}
/>
```

---

## Dependencies

### External Dependencies
- `react`: ^18.0.0
- `@/components/ui/dialog`: shadcn/ui Dialog
- `@/components/ui/input`: shadcn/ui Input
- `@/components/ui/button`: shadcn/ui Button
- `@/components/ui/label`: shadcn/ui Label
- `@/components/ui/alert`: shadcn/ui Alert
- `lucide-react`: Icons (Eye, EyeOff, Loader2, CheckCircle2, AlertCircle)
- `sonner`: Toast notifications

### Internal Dependencies
- `@/app/_actions/ai/apiKey`: Server Actions (testAPIKey, saveAPIKey)
- `@/types/llm`: LLMProvider type
- `@/components/settings/ProviderCard`: PROVIDER_CONFIG

---

## Related Files

- **Implementation**: `components/settings/APIKeyForm.tsx`
- **Tests**: `components/settings/__tests__/APIKeyForm.test.tsx`
- **Server Actions**: `app/_actions/ai/apiKey.ts`
- **Parent Component**: `components/settings/APIKeySettings.tsx`

---

## Visual Design

```
┌─────────────────────────────────────────────────┐
│ 🤖 Google Gemini APIキー設定         [×]        │
├─────────────────────────────────────────────────┤
│ APIキーを入力してください。ドキュメントから     │
│ 取得できます。                                  │
│                                                 │
│ APIキー                                         │
│ ┌─────────────────────────────────┐  ┌───┐    │
│ │ ••••••••••••••••••••••••••••••••│  │👁️ │    │
│ └─────────────────────────────────┘  └───┘    │
│                                                 │
│ ┌─────────────────────────────────────────────┐│
│ │ ✓ APIキーは有効です                         ││
│ └─────────────────────────────────────────────┘│
│                                                 │
│ ┌─────────┐  ┌──────┐  ┌──────────┐          │
│ │ テスト  │  │ 保存 │  │ キャンセル│          │
│ └─────────┘  └──────┘  └──────────┘          │
└─────────────────────────────────────────────────┘

エラー時:
┌─────────────────────────────────────────────────┐
│ ⚠ APIキーが無効です                             │
│ ネットワーク接続を確認してください              │
└─────────────────────────────────────────────────┘
```

---

## Security Considerations

### APIキーの扱い

```typescript
// ❌ Bad: ログに出力
console.log("API Key:", apiKey);

// ✅ Good: ログに出力しない
logger.debug("Testing API key for provider", { provider });

// ❌ Bad: エラーメッセージにAPIキーを含める
throw new Error(`Invalid API key: ${apiKey}`);

// ✅ Good: APIキーを含めない
throw new Error("Invalid API key");
```

---

### Input Validation

```typescript
// トリミング処理
const trimmedKey = apiKey.trim();

// 空文字チェック
if (!trimmedKey) {
  return { success: false, error: "APIキーを入力してください" };
}

// 長さチェック（オプション）
if (trimmedKey.length < 10) {
  return { success: false, error: "APIキーが短すぎます" };
}
```

---

## Accessibility

### Screen Reader Support

```tsx
<Label htmlFor="api-key">APIキー</Label>
<Input
  id="api-key"
  aria-label="APIキー入力"
  aria-invalid={testResult === "error"}
  aria-describedby={testResult === "error" ? "error-message" : undefined}
/>

{testResult === "error" && (
  <Alert id="error-message" role="alert">
    <AlertDescription>{errorMessage}</AlertDescription>
  </Alert>
)}
```

---

### Keyboard Shortcuts

- `Tab`: フォーカス移動
- `Enter`: 保存実行（入力フィールドにフォーカス時）
- `Esc`: ダイアログを閉じる

---

**Last Updated:** 2025-11-02
**Status:** Ready for Implementation
**Next Step:** Implementation → Testing
