# プラグインシステム今後の実装計画

**作成日**: 2025-11-05  
**最終更新**: 2025-11-05  
**関連Issue**: [#109](https://github.com/otomatty/for-all-learners/issues/109), [#112](https://github.com/otomatty/for-all-learners/issues/112), [#97](https://github.com/otomatty/for-all-learners/issues/97)

---

## 概要

プラグインシステムの基盤実装（Phase 1-3）とWidget/カレンダー拡張（Issue #112）が完了したため、今後の実装計画を整理しました。

---

## 実装済みフェーズ

### ✅ Phase 1: コアシステム（完了）
- プラグインローダー
- Web Workerサンドボックス
- プラグインAPI（基本）
- マーケットプレイスUI

### ✅ Phase 2: Extension Points（完了）
- Editor Extensions
- AI Extensions
- UI Extensions
- Data Processor Extensions
- Integration Extensions

### ✅ Phase 3: Marketplace UI/UX（完了）
- 検索・フィルタリング
- レーティング・レビュー
- 更新通知
- 設定UI

### ✅ Phase 4.5: Widget & Calendar Extensions（完了）
- Widgetレンダリング機能
- カレンダーUI拡張ポイント
- GitHubコミット統計サンプルプラグイン

---

## 残っているIssue一覧

### 🔴 高優先度（プラグインシステム関連）

#### Issue #112: Widgetレンダリング & カレンダーUI拡張機能
**ステータス**: 実装完了（PR #113レビュー対応済み）  
**優先度**: High  
**推定時間**: 30時間（完了）

**実装内容**:
- ✅ Widgetレンダリング機能の基盤実装
- ✅ カレンダーUI拡張ポイントの実装
- ✅ GitHub API連携機能の実装
- ✅ GitHubコミット行数表示プラグインの実装
- ✅ ドキュメントとテスト（69テストケース全てパス）

**次のアクション**: PR #113マージ待ち

---

#### Issue #109: Phase 4: Plugin Development Tools & Sample Plugins
**ステータス**: 未着手  
**優先度**: High  
**推定時間**: 44時間

**実装項目**:

1. **プラグイン開発ツール**（16時間）
   - [ ] CLIツール（プラグイン生成、ビルド、テスト）
   - [ ] プラグイン開発用テンプレート
   - [ ] ローカル開発環境でのプラグイン読み込み機能
   - [ ] デバッグツール（プラグインログ、エラー追跡）
   - [ ] TypeScript型定義の自動生成

2. **サンプルプラグイン作成**（12時間）
   - [ ] Hello Worldプラグイン（基本構造の説明）
   - [ ] Editor Extensionサンプル（カスタムノード/マーク）
   - [ ] AI Extensionサンプル（カスタム問題生成器）
   - [ ] UI Extensionサンプル（カスタムウィジェット）
   - [ ] Data Processor Extensionサンプル（カスタムインポーター）
   - [ ] Integration Extensionサンプル（OAuth連携）

3. **ドキュメント強化**（8時間）
   - [ ] プラグイン開発チュートリアル
   - [ ] APIリファレンスの充実
   - [ ] ベストプラクティスガイド
   - [ ] トラブルシューティングガイド

4. **テストと品質保証**（8時間）
   - [ ] プラグイン用テストフレームワーク
   - [ ] コード品質チェックツール
   - [ ] セキュリティチェックツール
   - [ ] パフォーマンステストツール

**依存関係**: Phase 1, Phase 2, Phase 3完了 ✅

---

#### Issue #97: Phase 5: Official Plugins Development
**ステータス**: 未着手  
**優先度**: Medium  
**推定時間**: 60時間

**実装予定プラグイン**:

1. **Scrapbox Sync Plugin**（12時間）
   - Scrapboxとの双方向同期
   - Integration Extension（OAuth連携）
   - Data Processor Extension（Importer）

2. **Anki Export Plugin**（8時間）
   - Anki .apkg形式エクスポート
   - Data Processor Extension（Exporter）
   - UI Extension（エクスポート設定UI）

3. **Math Equation Plugin**（10時間）
   - KaTeX/MathJax統合
   - Editor Extension（Custom Node）
   - UI Extension（数式エディタUI）

4. **Diagram Plugin**（10時間）
   - Mermaid/PlantUML統合
   - Editor Extension（Custom Node）
   - UI Extension（ダイアグラムエディタ）

5. **Code Editor Plugin**（12時間）
   - Monaco Editor統合
   - Editor Extension（Custom Node）
   - UI Extension（コードエディタUI）

6. **Speech-to-Text Plugin**（8時間）
   - Web Speech API統合
   - Editor Extension（Custom Plugin）
   - UI Extension（音声入力UI）

**依存関係**: Phase 1, Phase 2, Phase 4完了

---

### 🟡 中優先度（コード品質改善）

#### Issue #105: 未使用変数・パラメータの整理
**ステータス**: 未着手  
**優先度**: Medium  
**推定時間**: 2時間

**問題箇所**:
- `lib/plugins/plugin-api.ts` (line 553): `manager`変数が未使用
- `lib/plugins/editor-manager.ts` (line 226, 237): `pluginId`パラメータが未使用

**対応方針**: 
- 未使用変数・パラメータを削除
- または将来的な実装予定としてTODOコメントを追加

---

#### Issue #106: ReleaseNotesJSONの型アサーション問題
**ステータス**: 未着手  
**優先度**: Medium  
**推定時間**: 3時間

**問題**: `JSON.parse`の結果に型アサーションを適用しても実行時に検証されない

**対応方針**:
- Zodなどのスキーマ検証ライブラリを導入
- または型アサーションを削除（最小限の対応）

---

### 🟢 低優先度（ドキュメント・コード品質）

#### Issue #107: Markdownドキュメントの書式統一
**ステータス**: 未着手  
**優先度**: Low  
**推定時間**: 1時間

**問題**: `**目的**:` → `**目的:**` のようにコロンを太字に含める

**対応方針**: 該当ファイル内の全ての`**テキスト**:`形式を`**テキスト:**`形式に統一

---

#### Issue #99: Phase 2 サンプルプラグインの作成とドキュメント更新
**ステータス**: 未着手  
**優先度**: Low  
**推定時間**: 4時間

**実装内容**:
- サンプルプラグインの作成（カスタムマーク、カスタムノード）
- `docs/guides/plugin-development.md`の更新
- `docs/03_plans/plugin-system/phase2-editor-extensions.md`の更新

**備考**: Issue #109のサンプルプラグイン作成に含まれる可能性

---

### 🔵 その他の機能実装（AIチャットツールバー）

#### Issue #70: Phase 1 - AIチャットツールバー基本実装
**ステータス**: 未着手  
**優先度**: Critical  
**推定時間**: 3-5日

**実装内容**:
- フローティングツールバーの配置
- 基本的なチャットUI
- Gemini APIとの基本的な会話機能

---

#### Issue #71: Phase 2 - コンテキストに応じた応答
**ステータス**: 未着手  
**優先度**: High  
**推定時間**: 2-3日  
**依存関係**: #70

**実装内容**:
- 現在のページコンテキストの取得
- コンテキストに応じたプロンプト生成
- システムメッセージの動的生成

---

#### Issue #72: Phase 3 - ページ要約機能
**ステータス**: 未着手  
**優先度**: High  
**推定時間**: 2-3日  
**依存関係**: #71

**実装内容**:
- ページ一覧全体またはページ詳細の要約生成
- 要約の表示とコピー機能
- 構造化された要約フォーマット

---

#### Issue #73: Phase 4-8 - AIチャットツールバー高度な機能
**ステータス**: 未着手  
**優先度**: Medium ~ Low  
**推定時間**: 15-20日  
**依存関係**: #70, #71, #72

**実装内容**:
- Phase 4: 意味検索機能（4-5日）
- Phase 5: ツールメニューの実装（2-3日）
- Phase 6: ページ作成支援機能（3-4日）
- Phase 7: キャラクターカスタマイズ（3-4日）
- Phase 8: Model Context Protocol (MCP) 連携（5-7日）

---

### 🔵 その他の機能実装（検索・公開設定）

#### Issue #50: 検索結果の関連度スコアリング改善
**ステータス**: 未着手  
**優先度**: Medium  
**推定時間**: 未定

**実装内容**:
- 重み付けスコアリングの実装
- ユーザー行動に基づくスコアリング
- クリックログAPIの実装

---

#### Issue #49: 検索パフォーマンスの最適化
**ステータス**: 未着手  
**優先度**: Low  
**推定時間**: 未定

**実装内容**:
- 全文検索インデックスの追加
- クエリの最適化
- キャッシュ戦略の改善

---

#### Issue #69: デフォルトノートの公開制限とページ公開システム
**ステータス**: 未着手  
**優先度**: High  
**推定時間**: 未定

**実装内容**:
- Phase 1: デフォルトノートの公開制限UI
- Phase 2: ページ公開設定の実装
- Phase 3: 公開ノートとページの整合性チェック
- Phase 4: UX改善

---

#### Issue #11: 生成AIを使用したコンテンツ生成機能の改善
**ステータス**: 未着手  
**優先度**: High  
**推定時間**: 未定

**実装内容**:
- Phase 1: プロンプトの改善とデバッグ機能
- Phase 2: Web検索とMDN参照の統合
- Phase 3: 曖昧さ回避ページの自動生成

---

## 実装優先順位

### 最優先（プラグインシステムの完成）

1. **Issue #112**: Widgetレンダリング & カレンダーUI拡張機能
   - ✅ 実装完了（PR #113マージ待ち）

2. **Issue #109**: Phase 4: Plugin Development Tools & Sample Plugins
   - プラグイン開発者を支援するためのツールとサンプル
   - 推定時間: 44時間
   - **推奨開始時期**: Issue #112マージ後

### 高優先度（プラグインシステムの実用化）

3. **Issue #97**: Phase 5: Official Plugins Development
   - 公式プラグインの開発で実用性を示す
   - 推定時間: 60時間
   - **推奨開始時期**: Issue #109完了後

### 中優先度（コード品質改善）

4. **Issue #105**: 未使用変数・パラメータの整理（2時間）
5. **Issue #106**: ReleaseNotesJSONの型アサーション問題（3時間）

### 低優先度（ドキュメント・コード品質）

6. **Issue #107**: Markdownドキュメントの書式統一（1時間）
7. **Issue #99**: Phase 2 サンプルプラグインの作成（4時間）

### 並行実装可能（プラグインシステム以外）

- **Issue #70-73**: AIチャットツールバー（プラグインシステムと並行可能）
- **Issue #50, #49**: 検索機能の改善（プラグインシステムと並行可能）
- **Issue #69**: デフォルトノートの公開制限（プラグインシステムと並行可能）
- **Issue #11**: コンテンツ生成機能の改善（プラグインシステムと並行可能）

---

## 推奨実装スケジュール

### Q4 2025（11月-12月）

**Week 1-2（11月上旬）**
- Issue #112 PR #113マージと完了確認
- Issue #109 Phase 4開始（プラグイン開発ツール）

**Week 3-4（11月中旬）**
- Issue #109 Phase 4継続（サンプルプラグイン作成）
- Issue #105, #106（コード品質改善）並行実施

**Week 5-6（11月下旬）**
- Issue #109 Phase 4完了（ドキュメント強化、テスト）
- Issue #107, #99（ドキュメント改善）並行実施

**Week 7-8（12月上旬）**
- Issue #97 Phase 5開始（公式プラグイン開発）
  - Scrapbox Sync Plugin
  - Anki Export Plugin

**Week 9-10（12月中旬）**
- Issue #97 Phase 5継続
  - Math Equation Plugin
  - Diagram Plugin

**Week 11-12（12月下旬）**
- Issue #97 Phase 5継続
  - Code Editor Plugin
  - Speech-to-Text Plugin
- 並行実装: Issue #70-73（AIチャットツールバー）のPhase 1-2

---

## 技術的考慮事項

### プラグイン開発ツール（Issue #109）

**CLIツールの設計方針**:
- Node.js/TypeScriptベース
- プラグイン生成コマンド: `bun run plugin:create <plugin-name>`
- ビルドコマンド: `bun run plugin:build <plugin-id>`
- テストコマンド: `bun run plugin:test <plugin-id>`

**デバッグツールの設計方針**:
- プラグインログをブラウザDevToolsに表示
- エラー追跡とスタックトレース表示
- プラグイン実行時間の計測

### 公式プラグイン開発（Issue #97）

**各プラグインの品質基準**:
- テストカバレッジ70%以上
- エラーハンドリング適切
- パフォーマンス最適化
- アクセシビリティ対応
- i18n対応（日本語・英語）

**開発優先順位**:
1. Scrapbox Sync Plugin（実用性が高い）
2. Anki Export Plugin（学習効率向上）
3. Math Equation Plugin（学術用途）
4. Diagram Plugin（文書作成支援）
5. Code Editor Plugin（開発者向け）
6. Speech-to-Text Plugin（アクセシビリティ）

---

## リスクと対策

### リスク1: プラグイン開発ツールの複雑化

**対策**:
- 段階的な実装（まず基本的なCLIツールから）
- ユーザーフィードバックを収集して改善

### リスク2: 公式プラグインの開発時間超過

**対策**:
- 各プラグインのスコープを明確に定義
- MVP版から開始し、段階的に機能追加
- 優先度の高いプラグインから実装

### リスク3: 並行実装による品質低下

**対策**:
- コードレビューを徹底
- テストを必ず実装
- ドキュメントを常に最新に保つ

---

## 関連ドキュメント

- [実装状況まとめ](./implementation-status.md)
- [Phase 1実装計画](./phase1-core-system.md)
- [Phase 2実装計画](./phase2-editor-extensions.md)
- [Widget & Calendar拡張実装計画](./widget-calendar-extensions.md)
- [プラグイン開発ガイド](../guides/plugin-development.md)

---

## 変更履歴

| 日付 | 変更内容 | 担当 |
|------|----------|------|
| 2025-11-05 | 今後の実装計画ドキュメント作成 | AI Agent |

