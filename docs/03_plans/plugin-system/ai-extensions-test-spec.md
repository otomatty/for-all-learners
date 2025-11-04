# AI Extensions & アンインストール確認ダイアログ テストケース仕様書

**作成日**: 2025-11-04  
**最終更新**: 2025-11-04  
**関連ファイル**:
- `lib/plugins/ai-registry.ts`
- `lib/plugins/plugin-api.ts`
- `app/(protected)/settings/plugins/_components/InstalledPluginCard.tsx`

---

## 1. テストスコープ

### 1.1 AI Extension Registry (`lib/plugins/ai-registry.ts`)

**テストファイル**: `lib/plugins/__tests__/ai-registry.test.ts`

**テスト対象機能**:
- Question Generator登録・管理
- Prompt Template登録・管理
- Content Analyzer登録・管理
- プラグイン単位のクリーンアップ
- 統計情報取得

### 1.2 AI API (`lib/plugins/plugin-api.ts`)

**テストファイル**: `lib/plugins/__tests__/plugin-api.test.ts`

**テスト対象機能**:
- AI APIのメソッド定義確認
- Question Generator API
- Prompt Template API
- Content Analyzer API

### 1.3 InstalledPluginCard コンポーネント

**テストファイル**: `app/(protected)/settings/plugins/_components/__tests__/InstalledPluginCard.test.tsx`

**テスト対象機能**:
- コンポーネントレンダリング
- アンインストール確認ダイアログ
- ユーザーインタラクション
- エラーハンドリング
- アクセシビリティ

---

## 2. AI Extension Registry テストケース

### 2.1 Singleton Pattern

#### TC-AI-001: シングルトンインスタンスの取得
- **前提条件**: なし
- **実行**: `getInstance()` を2回呼び出す
- **期待結果**: 同じインスタンスが返される
- **テストコード**: `lib/plugins/__tests__/ai-registry.test.ts` (46-51行目)

#### TC-AI-002: インスタンスのリセット
- **前提条件**: インスタンスが作成されている
- **実行**: `reset()` を呼び出してから `getInstance()` を呼び出す
- **期待結果**: 新しいインスタンスが返される
- **テストコード**: `lib/plugins/__tests__/ai-registry.test.ts` (53-60行目)

### 2.2 Question Generator Registration

#### TC-AI-003: Question Generatorの登録
- **前提条件**: レジストリが初期化されている
- **入力**: プラグインID "plugin-1", Generator Options
- **実行**: `registerQuestionGenerator()` を呼び出す
- **期待結果**: 
  - Generatorが登録される
  - `getQuestionGenerators("plugin-1")` で1件取得できる
  - Generator IDが正しく設定されている
- **テストコード**: `lib/plugins/__tests__/ai-registry.test.ts` (64-75行目)

#### TC-AI-004: 重複Generator IDのエラー
- **前提条件**: Generatorが既に登録されている
- **実行**: 同じGenerator IDで再度登録を試みる
- **期待結果**: エラーがスローされる
- **テストコード**: `lib/plugins/__tests__/ai-registry.test.ts` (77-85行目)

#### TC-AI-005: 異なるプラグインでの同じGenerator ID
- **前提条件**: なし
- **実行**: 異なるプラグインIDで同じGenerator IDを登録
- **期待結果**: 両方のプラグインで登録される
- **テストコード**: `lib/plugins/__tests__/ai-registry.test.ts` (87-96行目)

#### TC-AI-006: 複数Generatorの登録
- **前提条件**: なし
- **実行**: 同じプラグインに複数のGeneratorを登録
- **期待結果**: 全てのGeneratorが登録される
- **テストコード**: `lib/plugins/__tests__/ai-registry.test.ts` (98-109行目)

#### TC-AI-007: Question Typeによるフィルタリング
- **前提条件**: 異なるタイプのGeneratorが登録されている
- **実行**: `getQuestionGenerators(pluginId, type)` で特定タイプを取得
- **期待結果**: 指定タイプのGeneratorのみが返される
- **テストコード**: `lib/plugins/__tests__/ai-registry.test.ts` (111-134行目)

#### TC-AI-008: 特定Generatorの削除
- **前提条件**: 複数のGeneratorが登録されている
- **実行**: `unregisterQuestionGenerator(pluginId, generatorId)` を呼び出す
- **期待結果**: 指定したGeneratorのみが削除される
- **テストコード**: `lib/plugins/__tests__/ai-registry.test.ts` (136-154行目)

#### TC-AI-009: プラグインの全Generator削除
- **前提条件**: 複数のGeneratorが登録されている
- **実行**: `unregisterQuestionGenerator(pluginId)` を呼び出す
- **期待結果**: プラグインの全Generatorが削除される
- **テストコード**: `lib/plugins/__tests__/ai-registry.test.ts` (156-170行目)

#### TC-AI-010: 存在しないGeneratorの削除
- **前提条件**: Generatorが登録されていない
- **実行**: `unregisterQuestionGenerator()` を呼び出す
- **期待結果**: `false` が返される
- **テストコード**: `lib/plugins/__tests__/ai-registry.test.ts` (172-178行目)

### 2.3 Prompt Template Registration

#### TC-AI-011: Prompt Templateの登録
- **前提条件**: レジストリが初期化されている
- **入力**: プラグインID "plugin-1", Template Options
- **実行**: `registerPromptTemplate()` を呼び出す
- **期待結果**: 
  - Templateが登録される
  - `getPromptTemplate(key)` で取得できる
  - Template IDとキーが正しく設定されている
- **テストコード**: `lib/plugins/__tests__/ai-registry.test.ts` (181-194行目)

#### TC-AI-012: 重複Template IDのエラー
- **前提条件**: Templateが既に登録されている
- **実行**: 同じTemplate IDで再度登録を試みる
- **期待結果**: エラーがスローされる
- **テストコード**: `lib/plugins/__tests__/ai-registry.test.ts` (196-206行目)

#### TC-AI-013: 重複Template Keyのエラー
- **前提条件**: Templateが既に登録されている
- **実行**: 同じTemplate Keyで異なるプラグインから登録を試みる
- **期待結果**: エラーがスローされる（キーはグローバルに一意である必要がある）
- **テストコード**: `lib/plugins/__tests__/ai-registry.test.ts` (208-220行目)

#### TC-AI-014: Template Keyによる取得
- **前提条件**: Templateが登録されている
- **実行**: `getPromptTemplate(key)` を呼び出す
- **期待結果**: 該当するTemplateが返される
- **テストコード**: `lib/plugins/__tests__/ai-registry.test.ts` (222-231行目)

#### TC-AI-015: 存在しないTemplate Keyの取得
- **前提条件**: Templateが登録されていない
- **実行**: `getPromptTemplate("non-existent")` を呼び出す
- **期待結果**: `undefined` が返される
- **テストコード**: `lib/plugins/__tests__/ai-registry.test.ts` (233-238行目)

#### TC-AI-016: 特定Templateの削除
- **前提条件**: 複数のTemplateが登録されている
- **実行**: `unregisterPromptTemplate(pluginId, templateId)` を呼び出す
- **期待結果**: 指定したTemplateのみが削除され、キーマップからも削除される
- **テストコード**: `lib/plugins/__tests__/ai-registry.test.ts` (240-257行目)

#### TC-AI-017: プラグインの全Template削除
- **前提条件**: 複数のTemplateが登録されている
- **実行**: `unregisterPromptTemplate(pluginId)` を呼び出す
- **期待結果**: プラグインの全Templateが削除され、キーマップからも削除される
- **テストコード**: `lib/plugins/__tests__/ai-registry.test.ts` (259-276行目)

### 2.4 Content Analyzer Registration

#### TC-AI-018: Content Analyzerの登録
- **前提条件**: レジストリが初期化されている
- **入力**: プラグインID "plugin-1", Analyzer Options
- **実行**: `registerContentAnalyzer()` を呼び出す
- **期待結果**: 
  - Analyzerが登録される
  - `getContentAnalyzers("plugin-1")` で1件取得できる
  - Analyzer IDが正しく設定されている
- **テストコード**: `lib/plugins/__tests__/ai-registry.test.ts` (279-290行目)

#### TC-AI-019: 重複Analyzer IDのエラー
- **前提条件**: Analyzerが既に登録されている
- **実行**: 同じAnalyzer IDで再度登録を試みる
- **期待結果**: エラーがスローされる
- **テストコード**: `lib/plugins/__tests__/ai-registry.test.ts` (292-302行目)

#### TC-AI-020: 異なるプラグインでの同じAnalyzer ID
- **前提条件**: なし
- **実行**: 異なるプラグインIDで同じAnalyzer IDを登録
- **期待結果**: 両方のプラグインで登録される
- **テストコード**: `lib/plugins/__tests__/ai-registry.test.ts` (304-314行目)

#### TC-AI-021: 特定Analyzerの削除
- **前提条件**: 複数のAnalyzerが登録されている
- **実行**: `unregisterContentAnalyzer(pluginId, analyzerId)` を呼び出す
- **期待結果**: 指定したAnalyzerのみが削除される
- **テストコード**: `lib/plugins/__tests__/ai-registry.test.ts` (316-334行目)

#### TC-AI-022: プラグインの全Analyzer削除
- **前提条件**: 複数のAnalyzerが登録されている
- **実行**: `unregisterContentAnalyzer(pluginId)` を呼び出す
- **期待結果**: プラグインの全Analyzerが削除される
- **テストコード**: `lib/plugins/__tests__/ai-registry.test.ts` (336-352行目)

### 2.5 Plugin Clearing

#### TC-AI-023: プラグインの全拡張機能削除
- **前提条件**: Generator、Template、Analyzerが登録されている
- **実行**: `clearPlugin(pluginId)` を呼び出す
- **期待結果**: プラグインの全拡張機能が削除される（Generator、Template、Analyzer全て）
- **テストコード**: `lib/plugins/__tests__/ai-registry.test.ts` (355-373行目)

#### TC-AI-024: 全プラグインの全拡張機能削除
- **前提条件**: 複数プラグインに拡張機能が登録されている
- **実行**: `clear()` を呼び出す
- **期待結果**: 全てのプラグインの全拡張機能が削除される
- **テストコード**: `lib/plugins/__tests__/ai-registry.test.ts` (375-399行目)

### 2.6 Statistics

#### TC-AI-025: 統計情報の取得
- **前提条件**: 複数のプラグインに拡張機能が登録されている
- **実行**: `getStats()` を呼び出す
- **期待結果**: 
  - `totalPlugins`: プラグイン数
  - `totalGenerators`: Generator総数
  - `totalTemplates`: Template総数
  - `totalAnalyzers`: Analyzer総数
  が正しく計算される
- **テストコード**: `lib/plugins/__tests__/ai-registry.test.ts` (401-425行目)

#### TC-AI-026: 空レジストリの統計情報
- **前提条件**: 拡張機能が登録されていない
- **実行**: `getStats()` を呼び出す
- **期待結果**: 全ての統計値が0
- **テストコード**: `lib/plugins/__tests__/ai-registry.test.ts` (427-437行目)

### 2.7 Query Operations

#### TC-AI-027: 全プラグインのGenerator取得
- **前提条件**: 複数プラグインにGeneratorが登録されている
- **実行**: `getQuestionGenerators()` を呼び出す（pluginIdなし）
- **期待結果**: 全てのプラグインのGeneratorが返される
- **テストコード**: `lib/plugins/__tests__/ai-registry.test.ts` (440-451行目)

#### TC-AI-028: 全プラグインのTemplate取得
- **前提条件**: 複数プラグインにTemplateが登録されている
- **実行**: `getPromptTemplates()` を呼び出す（pluginIdなし）
- **期待結果**: 全てのプラグインのTemplateが返される
- **テストコード**: `lib/plugins/__tests__/ai-registry.test.ts` (453-463行目)

#### TC-AI-029: 全プラグインのAnalyzer取得
- **前提条件**: 複数プラグインにAnalyzerが登録されている
- **実行**: `getContentAnalyzers()` を呼び出す（pluginIdなし）
- **期待結果**: 全てのプラグインのAnalyzerが返される
- **テストコード**: `lib/plugins/__tests__/ai-registry.test.ts` (465-475行目)

---

## 3. AI API テストケース

### 3.1 API定義確認

#### TC-AI-API-001: AI APIメソッドの存在確認
- **前提条件**: Plugin APIインスタンスが作成されている
- **実行**: `api.ai` の各メソッドを確認
- **期待結果**: 
  - `registerQuestionGenerator`
  - `unregisterQuestionGenerator`
  - `registerPromptTemplate`
  - `unregisterPromptTemplate`
  - `registerContentAnalyzer`
  - `unregisterContentAnalyzer`
  が全て関数として定義されている
- **テストコード**: `lib/plugins/__tests__/plugin-api.test.ts` (347-357行目)

### 3.2 Question Generator API

#### TC-AI-API-002: Question Generatorの登録
- **前提条件**: Plugin APIインスタンスが作成されている
- **実行**: `api.ai.registerQuestionGenerator(options)` を呼び出す
- **期待結果**: 
  - Generatorがレジストリに登録される
  - `getQuestionGenerators()` で取得できる
- **テストコード**: `lib/plugins/__tests__/plugin-api.test.ts` (360-384行目)

#### TC-AI-API-003: 重複Generator登録のエラー
- **前提条件**: Generatorが既に登録されている
- **実行**: 同じGenerator IDで再度登録を試みる
- **期待結果**: エラーがスローされる
- **テストコード**: `lib/plugins/__tests__/plugin-api.test.ts` (386-408行目)

#### TC-AI-API-004: Question Generatorの削除
- **前提条件**: Generatorが登録されている
- **実行**: `api.ai.unregisterQuestionGenerator(generatorId)` を呼び出す
- **期待結果**: Generatorがレジストリから削除される
- **テストコード**: `lib/plugins/__tests__/plugin-api.test.ts` (410-433行目)

### 3.3 Prompt Template API

#### TC-AI-API-005: Prompt Templateの登録
- **前提条件**: Plugin APIインスタンスが作成されている
- **実行**: `api.ai.registerPromptTemplate(options)` を呼び出す
- **期待結果**: 
  - Templateがレジストリに登録される
  - `getPromptTemplate(key)` で取得できる
- **テストコード**: `lib/plugins/__tests__/plugin-api.test.ts` (437-447行目)

#### TC-AI-API-006: 重複Template Key登録のエラー
- **前提条件**: Templateが既に登録されている
- **実行**: 同じTemplate Keyで再度登録を試みる
- **期待結果**: エラーがスローされる
- **テストコード**: `lib/plugins/__tests__/plugin-api.test.ts` (449-469行目)

#### TC-AI-API-007: Prompt Templateの削除
- **前提条件**: Templateが登録されている
- **実行**: `api.ai.unregisterPromptTemplate(templateId)` を呼び出す
- **期待結果**: Templateがレジストリから削除される
- **テストコード**: `lib/plugins/__tests__/plugin-api.test.ts` (471-499行目)

### 3.4 Content Analyzer API

#### TC-AI-API-008: Content Analyzerの登録
- **前提条件**: Plugin APIインスタンスが作成されている
- **実行**: `api.ai.registerContentAnalyzer(options)` を呼び出す
- **期待結果**: 
  - Analyzerがレジストリに登録される
  - `getContentAnalyzers()` で取得できる
- **テストコード**: `lib/plugins/__tests__/plugin-api.test.ts` (503-525行目)

#### TC-AI-API-009: 重複Analyzer登録のエラー
- **前提条件**: Analyzerが既に登録されている
- **実行**: 同じAnalyzer IDで再度登録を試みる
- **期待結果**: エラーがスローされる
- **テストコード**: `lib/plugins/__tests__/plugin-api.test.ts` (527-546行目)

#### TC-AI-API-010: Content Analyzerの削除
- **前提条件**: Analyzerが登録されている
- **実行**: `api.ai.unregisterContentAnalyzer(analyzerId)` を呼び出す
- **期待結果**: Analyzerがレジストリから削除される
- **テストコード**: `lib/plugins/__tests__/plugin-api.test.ts` (548-568行目)

---

## 4. InstalledPluginCard コンポーネントテストケース

### 4.1 Rendering

#### TC-UI-001: プラグイン名の表示
- **前提条件**: プラグインデータが渡されている
- **実行**: コンポーネントをレンダリング
- **期待結果**: プラグイン名が表示される
- **テストコード**: `InstalledPluginCard.test.tsx` (68-72行目)

#### TC-UI-002: プラグイン説明の表示
- **前提条件**: プラグインデータが渡されている
- **実行**: コンポーネントをレンダリング
- **期待結果**: プラグイン説明が表示される
- **テストコード**: `InstalledPluginCard.test.tsx` (74-80行目)

#### TC-UI-003: プラグインバージョンの表示
- **前提条件**: プラグインデータが渡されている
- **実行**: コンポーネントをレンダリング
- **期待結果**: バージョンが表示される（例: "v1.0.0"）
- **テストコード**: `InstalledPluginCard.test.tsx` (82-86行目)

#### TC-UI-004: 作成者の表示
- **前提条件**: プラグインデータが渡されている
- **実行**: コンポーネントをレンダリング
- **期待結果**: 作成者名が表示される
- **テストコード**: `InstalledPluginCard.test.tsx` (88-92行目)

#### TC-UI-005: 有効状態バッジの表示
- **前提条件**: プラグインが有効状態
- **実行**: コンポーネントをレンダリング
- **期待結果**: "有効"バッジが表示される
- **テストコード**: `InstalledPluginCard.test.tsx` (94-100行目)

#### TC-UI-006: 無効状態バッジの表示
- **前提条件**: プラグインが無効状態
- **実行**: コンポーネントをレンダリング
- **期待結果**: "無効"バッジが表示される
- **テストコード**: `InstalledPluginCard.test.tsx` (102-110行目)

#### TC-UI-007: 公式バッジの表示
- **前提条件**: プラグインが公式プラグイン
- **実行**: コンポーネントをレンダリング
- **期待結果**: "公式"バッジが表示される
- **テストコード**: `InstalledPluginCard.test.tsx` (112-120行目)

#### TC-UI-008: 拡張ポイントバッジの表示
- **前提条件**: プラグインがエディタ拡張を提供
- **実行**: コンポーネントをレンダリング
- **期待結果**: "エディタ"バッジが表示される
- **テストコード**: `InstalledPluginCard.test.tsx` (122-128行目)

#### TC-UI-009: 有効化/無効化ボタンの表示
- **前提条件**: プラグインデータが渡されている
- **実行**: コンポーネントをレンダリング
- **期待結果**: 有効化/無効化ボタンが表示される
- **テストコード**: `InstalledPluginCard.test.tsx` (130-134行目)

#### TC-UI-010: アンインストールボタンの表示
- **前提条件**: プラグインデータが渡されている
- **実行**: コンポーネントをレンダリング
- **期待結果**: アンインストールボタンが表示される
- **テストコード**: `InstalledPluginCard.test.tsx` (136-142行目)

### 4.2 Uninstall Dialog

#### TC-UI-011: ダイアログの表示
- **前提条件**: コンポーネントがレンダリングされている
- **実行**: アンインストールボタンをクリック
- **期待結果**: 確認ダイアログが表示される
- **テストコード**: `InstalledPluginCard.test.tsx` (144-156行目)

#### TC-UI-012: プラグイン名の表示
- **前提条件**: ダイアログが表示されている
- **実行**: アンインストールボタンをクリック
- **期待結果**: ダイアログ内にプラグイン名が表示される
- **テストコード**: `InstalledPluginCard.test.tsx` (158-168行目)

#### TC-UI-013: キャンセルボタンの動作
- **前提条件**: ダイアログが表示されている
- **実行**: キャンセルボタンをクリック
- **期待結果**: ダイアログが閉じる
- **テストコード**: `InstalledPluginCard.test.tsx` (170-182行目)

#### TC-UI-014: アンインストール実行
- **前提条件**: ダイアログが表示されている
- **実行**: 確認ボタンをクリック
- **期待結果**: `uninstallPlugin` が呼び出される
- **テストコード**: `InstalledPluginCard.test.tsx` (184-201行目)

#### TC-UI-015: 成功時のトースト通知
- **前提条件**: アンインストールが成功する
- **実行**: 確認ボタンをクリック
- **期待結果**: 成功トーストが表示される
- **テストコード**: `InstalledPluginCard.test.tsx` (203-219行目)

#### TC-UI-016: エラー時のトースト通知
- **前提条件**: アンインストールが失敗する
- **実行**: 確認ボタンをクリック
- **期待結果**: エラートーストが表示される
- **テストコード**: `InstalledPluginCard.test.tsx` (221-237行目)

#### TC-UI-017: 成功時のページリロード
- **前提条件**: アンインストールが成功する
- **実行**: 確認ボタンをクリック
- **期待結果**: ページがリロードされる
- **テストコード**: `InstalledPluginCard.test.tsx` (239-253行目)

#### TC-UI-018: アンインストール中のボタン無効化
- **前提条件**: ダイアログが表示されている
- **実行**: 確認ボタンをクリック（非同期処理中）
- **期待結果**: ボタンが無効化され、"アンインストール中..."と表示される
- **テストコード**: `InstalledPluginCard.test.tsx` (255-276行目)

#### TC-UI-019: 成功時のダイアログ閉鎖
- **前提条件**: アンインストールが成功する
- **実行**: 確認ボタンをクリック
- **期待結果**: ダイアログが閉じる
- **テストコード**: `InstalledPluginCard.test.tsx` (278-290行目)

### 4.3 Accessibility

#### TC-UI-020: ボタンのアクセシブルなラベル
- **前提条件**: コンポーネントがレンダリングされている
- **実行**: ボタンをroleで検索
- **期待結果**: 適切なroleとname属性が設定されている
- **テストコード**: `InstalledPluginCard.test.tsx` (292-300行目)

#### TC-UI-021: ダイアログのアクセシビリティ
- **前提条件**: ダイアログが表示されている
- **実行**: ダイアログをroleで検索
- **期待結果**: 適切なroleとname属性が設定されている
- **テストコード**: `InstalledPluginCard.test.tsx` (302-313行目)

---

## 5. テスト実行方法

### 5.1 全テスト実行

```bash
bun test
```

### 5.2 特定ファイルのテスト実行

```bash
# AI Extension Registry
bun test lib/plugins/__tests__/ai-registry.test.ts

# AI API
bun test lib/plugins/__tests__/plugin-api.test.ts

# InstalledPluginCard Component
bun test app/(protected)/settings/plugins/_components/__tests__/InstalledPluginCard.test.tsx
```

### 5.3 特定テストケースの実行

```bash
# テスト名でフィルタ
bun test -t "should register a question generator"
```

---

## 6. テストカバレッジ目標

- **AI Extension Registry**: 100%
- **AI API**: 100%
- **InstalledPluginCard Component**: 90%以上

---

## 7. 変更履歴

| 日付 | 変更内容 | 担当 |
|------|----------|------|
| 2025-11-04 | テストケース仕様書作成 | AI Agent |
