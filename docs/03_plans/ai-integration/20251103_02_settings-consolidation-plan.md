# Settings統合 & モデル選択機能追加 実装計画

**作成日**: 2025-11-03
**対象フェーズ**: Phase 1.5 - Settings統合 & モデル選択UI拡張
**ステータス**: ✅ 完了（2025-11-03）
**完了ログ**: `docs/05_logs/2025_11/20251103/03_phase15-settings-consolidation-complete.md`

---

## 📋 目的

1. `/settings/api-keys`ページを廃止し、`/settings`ページの`llm-settings`タブに統合
2. 統合後のLLM設定タブで、各プロバイダーのモデルを選択できるようにする
3. 既存の`LLMProviderContext`と新しいUI設計を調和させる

---

## 🎯 要件定義

### R-001: `/settings/api-keys`ページの廃止
- **内容**: `/settings/api-keys/page.tsx`を削除
- **影響範囲**: ナビゲーションリンク、内部リンクをすべて`/settings`（llm-settingsタブ）に変更
- **必要な作業**:
  - [ ] ナビゲーションメニューから削除
  - [ ] 内部リンクを検索して置き換え
  - [ ] リダイレクト設定（必要に応じて）

### R-002: llm-settingsタブにAPIキー設定を統合
- **内容**: `/settings/_components/llm-settings/index.tsx`に以下を統合:
  - APIKeySettings（各プロバイダーのAPIキー入力）
  - LLMProviderSettings（プロバイダー・モデル選択）
- **デザイン**:
  ```
  [LLM設定タブ]
  ┌─────────────────────────────────────────┐
  │ 1. プロバイダー選択（RadioGroup）        │
  │    ○ Google Gemini                      │
  │    ○ OpenAI                             │
  │    ○ Anthropic Claude                   │
  ├─────────────────────────────────────────┤
  │ 2. APIキー設定（選択されたプロバイダー） │
  │    [APIキー入力フォーム]                 │
  │    [保存ボタン] [削除ボタン]            │
  ├─────────────────────────────────────────┤
  │ 3. モデル選択（Select）                 │
  │    プロバイダーに応じたモデル一覧        │
  │    - gemini-2.0-flash-exp               │
  │    - gemini-2.5-flash                   │
  │    - gemini-1.5-pro                     │
  ├─────────────────────────────────────────┤
  │ 4. 情報表示（Alert）                    │
  │    現在の設定: Google Gemini            │
  │    モデル: gemini-2.5-flash             │
  └─────────────────────────────────────────┘
  ```

### R-003: モデル選択機能の実装
- **内容**: プロバイダーごとの利用可能モデル一覧を定義
- **データ構造**:
  ```typescript
  const MODEL_OPTIONS: Record<LLMProvider, Array<{ value: string; label: string; description?: string }>> = {
    google: [
      { value: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash (Experimental)", description: "最新の実験版モデル" },
      { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", description: "推奨：高速で正確" },
      { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro", description: "高度な推論能力" },
      { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash", description: "バランス型" },
    ],
    openai: [
      { value: "gpt-4o", label: "GPT-4o", description: "推奨：最新モデル" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini", description: "軽量版" },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo", description: "高性能" },
      { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", description: "コスト効率的" },
    ],
    anthropic: [
      { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet", description: "推奨：最新版" },
      { value: "claude-3-opus-20240229", label: "Claude 3 Opus", description: "最高性能" },
      { value: "claude-3-sonnet-20240229", label: "Claude 3 Sonnet", description: "バランス型" },
      { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku", description: "高速・軽量" },
    ],
  };
  ```

### R-004: LLMProviderContextとの統合
- **内容**: 既存の`LLMProviderContext`をそのまま利用
- **統合方法**:
  - `useLLMProvider()`でグローバル状態を取得・更新
  - localStorage永続化は既存の仕組みを活用
  - プロバイダー変更時、自動的にデフォルトモデルに設定

### R-005: データベース連携
- **内容**: APIキーは`user_llm_settings`テーブルに保存
- **既存のServer Actions**:
  - `getUserLlmSettings()`: 設定取得
  - `updateUserLlmSettings()`: 設定更新
  - `deleteUserLlmSettings()`: 設定削除
- **スキーマ**:
  ```sql
  CREATE TABLE user_llm_settings (
    user_id UUID PRIMARY KEY,
    provider TEXT NOT NULL,
    api_key_encrypted TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

---

## 🚀 実装ステップ

### Phase 1.5.1: 既存コンポーネントの統合準備（Day 1） ✅
- [x] **タスク1**: 既存の`llm-settings/index.tsx`を分析
- [x] **タスク2**: `APIKeySettings`コンポーネントの機能を確認
- [x] **タスク3**: `LLMProviderSettings`コンポーネントの機能を確認
- [x] **タスク4**: 統合設計書を作成（`20251103_03_llm-settings-integration-design.md`）

### Phase 1.5.2: 新しいLLM設定コンポーネント作成（Day 2） ✅
- [x] **タスク1**: `MODEL_OPTIONS`定数を定義（12モデル × 3プロバイダー）
- [x] **タスク2**: 統合後の`LLMSettingsIntegrated.tsx`を実装（442行）
  - プロバイダー選択（RadioGroup）
  - APIキー入力フォーム（選択されたプロバイダー）
  - モデル選択（Select）
  - 情報表示（Alert）
- [x] **タスク3**: `useLLMProvider()`を統合
- [x] **タスク4**: Server Actionsとの連携（saveAPIKey, deleteAPIKey, getAPIKeyStatus）

### Phase 1.5.3: テスト実装（Day 3） ✅
- [x] **タスク1**: `LLMSettingsIntegrated.test.tsx`を作成（451行、12テストケース）
  - TC-001: デフォルトプロバイダー選択
  - TC-002: プロバイダー変更時のモデル自動切り替え
  - TC-003: モデル選択
  - TC-004: APIキー保存
  - TC-005: localStorage永続化
  - TC-006: APIキー削除
  - TC-007: 保存エラーハンドリング
  - TC-008: 削除エラーハンドリング
  - TC-009: 各プロバイダーの正しいモデル表示
  - TC-010: 設定サマリー表示
  - TC-011: APIキー表示/非表示切り替え
  - TC-012: 複数プロバイダー切り替え
- [x] **タスク2**: 統合テスト実行（12/12 Pass）

### Phase 1.5.4: `/settings/api-keys`ページの削除（Day 4） ✅
- [x] **タスク1**: ナビゲーションメニュー確認（該当なし）
- [x] **タスク2**: 内部リンク検索・置き換え完了
- [x] **タスク3**: `/settings/api-keys/page.tsx`削除（ディレクトリごと削除）
- [x] **タスク4**: リダイレクト設定完了（middleware.ts）
  ```typescript
  if (pathname === "/settings/api-keys") {
    return NextResponse.redirect(new URL("/settings?tab=llm", req.url));
  }
  ```

### Phase 1.5.5: 動作確認・ドキュメント作成（Day 5） ✅
- [x] **タスク1**: 実際の画面で動作確認
  - プロバイダー切り替え ✅
  - APIキー保存・削除 ✅
  - モデル選択 ✅
  - localStorage永続化 ✅
- [x] **タスク2**: ユーザー向け操作ガイド作成（コンポーネント内に説明文追加）
- [x] **タスク3**: 開発者向けドキュメント更新（依存関係コメント更新）
- [x] **タスク4**: 作業ログ記録（`03_phase15-settings-consolidation-complete.md`）

---

## 📝 テストケース計画

### LLM設定タブの統合テスト
- **TC-001**: デフォルトプロバイダー（Google）が選択されている
- **TC-002**: プロバイダー変更時、APIキーフォームが切り替わる
- **TC-003**: プロバイダー変更時、モデル選択が自動的にデフォルトに設定される
- **TC-004**: APIキー入力・保存が正常に動作する
- **TC-005**: APIキー削除が正常に動作する
- **TC-006**: モデル選択が正常に動作する
- **TC-007**: localStorage永続化が正常に動作する
- **TC-008**: Server Actions（getUserLlmSettings）が呼ばれる
- **TC-009**: Server Actions（updateUserLlmSettings）が呼ばれる
- **TC-010**: Server Actions（deleteUserLlmSettings）が呼ばれる
- **TC-011**: エラー時にトースト通知が表示される
- **TC-012**: プロバイダーごとの正しいモデル一覧が表示される

---

## 🗂️ ファイル構成

### 新規作成
```
components/settings/
└── __tests__/
    └── LLMSettingsIntegrated.test.tsx (統合後のテスト)

docs/03_plans/ai-integration/
└── 20251103_02_settings-consolidation-plan.md (このファイル)

docs/05_logs/2025_11/20251103/
└── 03_phase15-settings-consolidation.md (完了ログ)
```

### 修正
```
app/(protected)/settings/_components/llm-settings/
└── index.tsx (大幅に修正: APIKeySettings + LLMProviderSettings統合)

app/(protected)/settings/_components/user-settings-form.tsx
└── llm タブの内容を確認（必要に応じて修正）
```

### 削除
```
app/(protected)/settings/api-keys/
└── page.tsx (削除)

components/settings/
├── APIKeySettings.tsx (llm-settings/index.tsxに統合後、削除検討)
└── LLMProviderSettings.tsx (llm-settings/index.tsxに統合後、削除検討)
```

---

## ⚠️ リスク・注意点

### リスク1: 既存のllm-settingsタブとの衝突
- **内容**: 既存の`llm-settings/index.tsx`が異なる設計の可能性
- **対策**: 既存コードを詳細に分析し、統合設計を慎重に行う
- **マイルストーン**: Phase 1.5.1で確認

### リスク2: Server Actionsのスキーマ不一致
- **内容**: `user_llm_settings`テーブルが想定と異なる可能性
- **対策**: 既存のServer Actionsとスキーマを確認
- **マイルストーン**: Phase 1.5.2タスク4

### リスク3: 内部リンクの見落とし
- **内容**: `/settings/api-keys`へのリンクが残る
- **対策**: `grep -r`で徹底的に検索、Playwrightでのリンクチェック
- **マイルストーン**: Phase 1.5.4タスク2

### リスク4: ユーザーの混乱
- **内容**: URLが変わることでブックマークが無効に
- **対策**: リダイレクト設定 + リリースノートで案内
- **マイルストーン**: Phase 1.5.4タスク4

---

## 📊 Phase 1.5 完成度の定義

### ✅ 完了条件
1. `/settings/api-keys`ページが削除されている
2. `/settings`ページの`llm-settings`タブに以下が統合されている:
   - プロバイダー選択（RadioGroup）
   - APIキー入力フォーム
   - モデル選択（Select）
   - 情報表示（Alert）
3. 統合テストがすべてPASSしている（目標: 12 tests以上）
4. 既存の`LLMProviderContext`が正常に動作している
5. localStorage永続化が正常に動作している
6. Server Actionsとの連携が正常に動作している
7. 内部リンクがすべて`/settings`（llm-settingsタブ）に更新されている
8. リダイレクト設定が完了している（オプション）
9. ドキュメントが作成されている

---

## 🔗 関連ドキュメント

- **Phase 1.4 完了ログ**: `docs/05_logs/2025_11/20251103/02_phase14-frontend-ui-implementation.md`
- **UI仕様書（Phase 1.4）**: `docs/03_plans/ai-integration/20251103_01_phase14-ui-spec.md`
- **LLMProviderContext**: `lib/contexts/LLMProviderContext.tsx`
- **APIKeySettings**: `components/settings/APIKeySettings.tsx`
- **LLMProviderSettings**: `components/settings/LLMProviderSettings.tsx`
- **既存のllm-settings**: `app/(protected)/settings/_components/llm-settings/index.tsx`

---

## 📅 スケジュール

| フェーズ      | 作業内容                     | 予定日     | ステータス |
|---------------|------------------------------|------------|------------|
| Phase 1.5.1   | 既存コンポーネント分析       | 2025-11-03 | 🚧 進行中  |
| Phase 1.5.2   | 新しいLLM設定コンポーネント  | 2025-11-04 | ⏳ 未着手  |
| Phase 1.5.3   | テスト実装                   | 2025-11-05 | ⏳ 未着手  |
| Phase 1.5.4   | 旧ページ削除・リンク修正     | 2025-11-06 | ⏳ 未着手  |
| Phase 1.5.5   | 動作確認・ドキュメント       | 2025-11-07 | ⏳ 未着手  |

---

**最終更新**: 2025-11-03
**作成者**: AI (Claude 3.5 Sonnet)
**ステータス**: 🚧 計画中
