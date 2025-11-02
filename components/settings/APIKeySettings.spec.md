# APIKeySettings.spec.md

**Component:** APIKeySettings
**File:** `components/settings/APIKeySettings.tsx`
**Created:** 2025-11-02
**Phase:** 0.5 - UI Implementation

---

## Overview

APIキー設定のメインコンポーネント。3つのLLMプロバイダー（Google、OpenAI、Anthropic）のAPIキー管理を統合的に提供します。

---

## Requirements

### FR-001: プロバイダーカード表示
- 3つのプロバイダー（google, openai, anthropic）のカードを表示
- 各カードは設定状態を表示
- 最終更新日時を表示

### FR-002: 初期データ取得
- コンポーネントマウント時にgetAPIKeyStatusを呼び出し
- 全プロバイダーの設定状態を取得
- 取得中はローディング状態を表示

### FR-003: APIキー設定フロー
- ProviderCardの「設定」ボタンクリック → APIKeyFormダイアログ表示
- APIKeyFormで保存成功 → ステータスを再取得して表示更新
- 保存失敗 → エラー表示（Toast）

### FR-004: APIキー編集フロー
- ProviderCardの「編集」ボタンクリック → APIKeyFormダイアログ表示
- 編集モードでも新規設定と同じフロー
- 既存キーは表示せず、新しいキーを入力

### FR-005: APIキー削除フロー
- ProviderCardの「削除」ボタンクリック → 確認ダイアログ表示
- 「削除」確定 → deleteAPIKeyを呼び出し
- 削除成功 → ステータス更新 + Toast表示
- 削除中はローディング表示

### FR-006: エラーハンドリング
- Server Actionエラー → Toast表示
- ネットワークエラー → Toast表示
- 初期データ取得失敗 → エラーメッセージ表示

### NFR-001: パフォーマンス
- 不必要な再レンダリングを防ぐ
- useCallbackでイベントハンドラーを安定化

### NFR-002: アクセシビリティ
- ローディング中は操作を無効化
- 確認ダイアログは明確な選択肢を提供
- キーボードナビゲーション対応

---

## Props

```typescript
// このコンポーネントはPropsを受け取らない（Server Componentから呼び出される）
export function APIKeySettings() {
  // ...
}
```

---

## State

```typescript
interface State {
  // 各プロバイダーの設定状態
  keyStatus: Record<LLMProvider, APIKeyStatus>;
  
  // ローディング状態
  isLoading: boolean;
  
  // 選択されたプロバイダー（Form表示用）
  selectedProvider: LLMProvider | null;
  
  // Formダイアログの開閉
  isFormOpen: boolean;
  
  // 削除確認ダイアログの開閉
  isDeleteDialogOpen: boolean;
  
  // 削除対象のプロバイダー
  providerToDelete: LLMProvider | null;
  
  // 削除中のローディング
  isDeletingProvider: LLMProvider | null;
}
```

---

## Server Actions

### getAPIKeyStatus()
- 全プロバイダーの設定状態を取得
- 戻り値: `{ success: boolean, data?: Record<LLMProvider, APIKeyStatus>, error?: string }`

### deleteAPIKey(provider: LLMProvider)
- 指定プロバイダーのAPIキーを削除
- 戻り値: `{ success: boolean, message?: string, error?: string }`

---

## Event Handlers

### handleConfigure(provider: LLMProvider)
- 選択されたプロバイダーを設定
- APIKeyFormダイアログを開く

### handleEdit(provider: LLMProvider)
- 選択されたプロバイダーを設定（編集モード）
- APIKeyFormダイアログを開く

### handleDeleteClick(provider: LLMProvider)
- 削除対象プロバイダーを設定
- 削除確認ダイアログを開く

### handleDeleteConfirm()
- deleteAPIKeyを呼び出し
- 成功時: Toast表示 + ステータス再取得
- 失敗時: Toast表示（エラー）

### handleSave()
- APIKeyFormの保存成功後に呼ばれる
- getAPIKeyStatusを再実行してステータス更新

### refreshStatus()
- getAPIKeyStatusを呼び出してステータスを再取得
- 全体のリフレッシュに使用

---

## Component Structure

```tsx
<div className="space-y-6">
  {/* ローディング状態 */}
  {isLoading && (
    <div className="flex justify-center py-8">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  )}

  {/* プロバイダーカード */}
  {!isLoading && (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <ProviderCard
        provider="google"
        configured={keyStatus.google.configured}
        updatedAt={keyStatus.google.updatedAt}
        onConfigure={() => handleConfigure("google")}
        onDelete={() => handleDeleteClick("google")}
        isLoading={isDeletingProvider === "google"}
      />
      
      {/* OpenAI, Anthropic も同様 */}
    </div>
  )}

  {/* APIキー入力フォーム */}
  {selectedProvider && (
    <APIKeyForm
      provider={selectedProvider}
      isOpen={isFormOpen}
      onClose={() => setIsFormOpen(false)}
      onSave={handleSave}
    />
  )}

  {/* 削除確認ダイアログ */}
  <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>APIキーを削除しますか?</AlertDialogTitle>
        <AlertDialogDescription>
          {providerToDelete && PROVIDER_CONFIG[providerToDelete].name} の
          APIキーが削除されます。この操作は元に戻せません。
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>キャンセル</AlertDialogCancel>
        <AlertDialogAction onClick={handleDeleteConfirm}>
          削除
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</div>
```

---

## Test Cases

### TC-001: 初期レンダリング
**Given:** コンポーネントがマウントされる
**When:** 初回レンダリング
**Then:**
- ローディングスピナーが表示される
- getAPIKeyStatusが呼ばれる

### TC-002: データ取得成功
**Given:** getAPIKeyStatusが成功する
**When:** データ取得完了
**Then:**
- 3つのProviderCardが表示される
- google, openai, anthropicカードが存在
- ローディングが消える

### TC-003: データ取得失敗
**Given:** getAPIKeyStatusがエラーを返す
**When:** データ取得失敗
**Then:**
- エラーToastが表示される
- ローディングが消える

### TC-004: Configure ボタンクリック
**Given:** プロバイダーカードが表示されている
**When:** Configureボタンをクリック
**Then:**
- selectedProviderが設定される
- APIKeyFormダイアログが開く

### TC-005: Edit ボタンクリック
**Given:** 設定済みプロバイダーカードが表示されている
**When:** Editボタンをクリック
**Then:**
- selectedProviderが設定される
- APIKeyFormダイアログが開く

### TC-006: Delete ボタンクリック
**Given:** 設定済みプロバイダーカードが表示されている
**When:** Deleteボタンをクリック
**Then:**
- 削除確認ダイアログが表示される
- providerToDeleteが設定される

### TC-007: 削除確認ダイアログ - キャンセル
**Given:** 削除確認ダイアログが開いている
**When:** キャンセルボタンをクリック
**Then:**
- ダイアログが閉じる
- deleteAPIKeyが呼ばれない

### TC-008: 削除確認ダイアログ - 削除実行
**Given:** 削除確認ダイアログが開いている
**When:** 削除ボタンをクリック
**Then:**
- deleteAPIKeyが呼ばれる
- 削除中のローディングが表示される

### TC-009: 削除成功フロー
**Given:** deleteAPIKeyが成功する
**When:** 削除実行
**Then:**
- 成功Toastが表示される
- getAPIKeyStatusが再実行される
- ダイアログが閉じる

### TC-010: 削除失敗フロー
**Given:** deleteAPIKeyがエラーを返す
**When:** 削除実行
**Then:**
- エラーToastが表示される
- ダイアログが閉じる

### TC-011: APIKeyForm保存成功
**Given:** APIKeyFormが開いている
**When:** onSaveが呼ばれる
**Then:**
- getAPIKeyStatusが再実行される
- ステータスが更新される

### TC-012: 複数プロバイダー表示
**Given:** 全プロバイダーが設定済み
**When:** ページをレンダリング
**Then:**
- 3つのカードがすべて「Configured」状態
- 各カードに最終更新日時が表示される

### TC-013: 未設定プロバイダー表示
**Given:** すべて未設定
**When:** ページをレンダリング
**Then:**
- 3つのカードがすべて「Unconfigured」状態
- 「設定」ボタンが表示される

### TC-014: 削除中のローディング表示
**Given:** APIキー削除中
**When:** isDeletingProviderが設定される
**Then:**
- 該当ProviderCardにローディングオーバーレイ表示
- 他のカードは通常表示

### TC-015: アクセシビリティ - キーボードナビゲーション
**Given:** ページが表示されている
**When:** Tabキーでナビゲーション
**Then:**
- カード間を移動できる
- ボタンにフォーカスできる

---

## Dependencies

### External Libraries
- `lucide-react`: アイコン(Loader2)
- `sonner`: Toast通知

### Internal Components
- `components/settings/ProviderCard.tsx`
- `components/settings/APIKeyForm.tsx`
- `components/ui/alert-dialog.tsx`

### Server Actions
- `app/_actions/ai/apiKey.ts`
  - getAPIKeyStatus()
  - deleteAPIKey()

### Types
- `lib/llm/client.ts`
  - LLMProvider
  - APIKeyStatus

---

## Implementation Notes

### State Management
- useStateでローカル状態管理
- グローバル状態は不要（他コンポーネントと共有しない）

### Performance Optimization
- useCallbackでイベントハンドラーをメモ化
- 不必要な再レンダリングを防ぐ

### Error Handling
- Server Actionのエラーは必ずToast表示
- ユーザーに明確なフィードバックを提供

### Loading States
- 初期データ取得: isLoading
- 削除実行中: isDeletingProvider
- 各状態を明確に分離

### Dialog Management
- APIKeyFormとAlertDialogは独立して管理
- 同時に複数開かないように制御

---

## Related Files

- **Tests:** `components/settings/__tests__/APIKeySettings.test.tsx`
- **Implementation:** `components/settings/APIKeySettings.tsx`
- **Page:** `app/(protected)/settings/api-keys/page.tsx`
- **Plan:** `docs/03_plans/mastra-infrastructure/20251102_03_phase05-ui-plan.md`

---

**Last Updated:** 2025-11-02
**Status:** Specification Complete, Ready for Implementation
