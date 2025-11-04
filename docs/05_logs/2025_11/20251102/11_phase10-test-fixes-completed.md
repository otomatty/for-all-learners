# Phase 1.0 Day 1 - テスト修正完了

**日時**: 2025-11-02 17:05
**フェーズ**: Phase 1.0 Day 1 (既存AI機能との統合)
**作業**: getUserAPIKey テスト修正・実装改善

---

## 📊 作業サマリー

### 成果

✅ **getUserAPIKey テスト 9/9 PASS達成**
✅ **実装コードの重要なバグ修正**
✅ **ビルド成功（エラーゼロ）**

### テスト結果

```
 Test Files  1 passed (1)
      Tests  9 passed (9)
   Duration  490ms
```

**成功率**: 100% (9/9)

---

## 🔧 実施した修正

### 1. モジュールスコープ変数の初期化タイミング問題

**問題**:
```typescript
// ❌ モジュール読み込み時に一度だけ評価される
const ENVIRONMENT_API_KEYS: Record<LLMProvider, string | undefined> = {
  google: process.env.GEMINI_API_KEY,
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
};
```

テスト中に`process.env.GEMINI_API_KEY = "test-key"`と設定しても、
`ENVIRONMENT_API_KEYS`は初期化時の値（`undefined`）のままだった。

**解決策**:
```typescript
// ✅ 動的に読み取る関数に変更
function getEnvironmentAPIKeys(): Record<LLMProvider, string | undefined> {
  return {
    google: process.env.GEMINI_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
  };
}

function getEnvironmentAPIKey(provider: LLMProvider): string {
  const keys = getEnvironmentAPIKeys(); // 呼び出し時に毎回読み取り
  const key = keys[provider];
  // ...
}
```

**影響範囲**:
- TC-002, TC-003, TC-004, TC-006, TC-009が解決

---

### 2. エラーハンドリングのスコープ問題

**問題**:
```typescript
// ❌ getEnvironmentAPIKey が try ブロック内で呼ばれる
try {
  const { data, error } = await supabase.from(...).single();
  
  if (error || !data?.encrypted_api_key) {
    return getEnvironmentAPIKey(provider); // 例外が外側の catch でキャッチされる
  }
  
  const decryptedKey = await decryptAPIKey(data.encrypted_api_key);
  return decryptedKey;
} catch (error) {
  // getEnvironmentAPIKey の例外もここでキャッチされてしまう
  try {
    return getEnvironmentAPIKey(provider);
  } catch {
    throw new Error("Failed to decrypt API key"); // 不正確なエラーメッセージ
  }
}
```

**解決策**:
```typescript
// ✅ データベースクエリを try の外に出す
const { data, error } = await supabase.from(...).single();

if (error || !data?.encrypted_api_key) {
  return getEnvironmentAPIKey(provider); // 例外は呼び出し元に伝播
}

// 復号化のみ try-catch で保護
try {
  const decryptedKey = await decryptAPIKey(data.encrypted_api_key);
  return decryptedKey;
} catch (error) {
  // 復号化失敗時のフォールバック
  try {
    return getEnvironmentAPIKey(provider);
  } catch {
    throw new Error("Failed to decrypt API key");
  }
}
```

**影響範囲**:
- TC-004が解決
- エラーメッセージが正確になった

---

### 3. テストモックの改善

**修正前**:
```typescript
single: vi.fn().mockResolvedValue({
  data: null,
  error: { message: "Not found", code: "PGRST116" },
}),
```

**修正後**:
```typescript
single: vi.fn().mockResolvedValue({
  data: null,
  error: {
    message: "JSON object requested, multiple (or no) rows returned",
    code: "PGRST116",
    details: null,
    hint: null,
  },
}),
```

**理由**: Supabase の実際のエラーレスポンス構造に合わせた

---

## 📝 変更ファイル

### 実装コード

**app/_actions/ai/getUserAPIKey.ts**
- 行数: 166 → 170 (+4行)
- 変更内容:
  - `ENVIRONMENT_API_KEYS`定数を`getEnvironmentAPIKeys()`関数に変更
  - データベースクエリを`try-catch`の外に移動
  - エラーハンドリングのスコープを修正

### テストコード

**app/_actions/ai/__tests__/getUserAPIKey.test.ts**
- 行数: 356 → 350 (-6行)
- 変更内容:
  - `Mock`型のインポート追加
  - 環境変数設定タイミングの最適化
  - モックエラー構造の改善
  - デバッグログの削除

---

## 🧪 テストケース詳細

### TC-001: 認証ユーザー、APIキー設定済み
✅ **PASS** - ユーザー設定のAPIキーを復号化して返す

### TC-002: 認証ユーザー、APIキー未設定、環境変数あり
✅ **PASS** - データベースにキーがない場合、環境変数にフォールバック

### TC-003: 環境変数フォールバック
✅ **PASS** - OpenAI, Anthropic の環境変数正しく取得

### TC-004: APIキー完全に未設定
✅ **PASS** - ユーザーキーも環境変数もない場合、適切なエラーメッセージ

### TC-005: 不正なプロバイダー
✅ **PASS** - 無効なプロバイダー名で例外スロー

### TC-006: 復号化失敗時の環境変数フォールバック
✅ **PASS** - 復号化失敗時、環境変数にフォールバック

### TC-007: 空文字列の環境変数
✅ **PASS** - 空文字列を適切にエラー判定

### TC-008: 未認証ユーザー
✅ **PASS** - 未認証時は環境変数を使用

### TC-009: 各プロバイダーの環境変数マッピング
✅ **PASS** - Google, OpenAI, Anthropic すべてのマッピング確認

---

## 💡 学んだこと

### 1. Node.js モジュールの初期化タイミング

**教訓**: モジュールスコープの変数は**最初のimport時に一度だけ評価される**

**対策**:
- テスト可能性を考慮し、環境変数は関数内で動的に読み取る
- または、依存性注入で環境変数を渡す設計にする

**参考**: この問題は Vitest の`vi.stubEnv()`でも解決可能だが、
実装側で対応する方が実運用環境との整合性が保たれる。

### 2. try-catch のスコープ設計

**教訓**: try-catchブロックは**失敗する可能性がある処理のみ**を含めるべき

**悪い例**:
```typescript
try {
  const data = await fetchData();
  if (!data) {
    return fallback(); // fallback が失敗しても try-catch でキャッチされる
  }
} catch (error) {
  // どの処理が失敗したか不明確
}
```

**良い例**:
```typescript
const data = await fetchData();
if (!data) {
  return fallback(); // 例外は自然に伝播
}

try {
  return processData(data); // 処理のみ保護
} catch (error) {
  // processData の失敗のみ
}
```

### 3. Supabase エラーレスポンスの構造

Supabase の`single()`は**レコードが見つからない場合でもPromiseを解決**し、
`error`オブジェクトを返す。これは例外をスローしない。

```typescript
const { data, error } = await supabase.from(...).single();
// ↑ 常に解決される (reject されない)

if (error) {
  // エラーコードで判定
  if (error.code === 'PGRST116') {
    // レコードなし
  }
}
```

---

## 📊 統計

### コード行数

| ファイル | 行数 |
|---------|------|
| getUserAPIKey.ts | 170 |
| getUserAPIKey.test.ts | 350 |
| getUserAPIKey.spec.md | 202 |
| **合計** | **722** |

### テストカバレッジ（推定）

- **行カバレッジ**: 95%以上
- **分岐カバレッジ**: 90%以上
- **関数カバレッジ**: 100%

### 修正履歴

| 試行 | 修正内容 | 結果 |
|------|---------|------|
| 1回目 | モックエラー構造修正 | 5/9 PASS |
| 2回目 | 環境変数読み取りタイミング修正 | 8/9 PASS |
| 3回目 | try-catch スコープ修正 | 9/9 PASS ✅ |

---

## 🚀 次のステップ

### Phase 1.0 Day 2: generatePageInfo 統合

**予定日**: 2025-11-03

**タスク**:
1. `generatePageInfo.ts`の現状確認
2. `getUserAPIKey`を統合
3. テスト追加・修正
4. 動作確認

**関連ファイル**:
- `app/_actions/generatePageInfo.ts`
- `app/_actions/__tests__/generatePageInfo.test.ts`（作成予定）

---

## 🔗 関連ドキュメント

- **実装計画**: docs/03_plans/mastra-infrastructure/20251102_04_phase10-integration-plan.md
- **仕様書**: app/_actions/ai/getUserAPIKey.spec.md
- **Phase 0.5 完了報告**: docs/05_logs/2025_11/20251102/09_phase05-apikey-ui-completion.md
- **Day 1 進捗ログ**: docs/05_logs/2025_11/20251102/10_phase10-day1-progress.md

---

**作業時間**: 約2時間
**完了時刻**: 2025-11-02 17:05
**次回作業**: Phase 1.0 Day 2 - generatePageInfo 統合開始
