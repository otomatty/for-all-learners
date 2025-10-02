# UnifiedLinkMark 実装作業ログ

**実装期間**: 2025 年 9 月 29 日  
**ブランチ**: `fix/preserve-bold-in-links`  
**目的**: [Title]と#tag の両方を統一的に処理する UnifiedLinkMark システムの実装

## 作業概要

UnifiedLinkMark は、既存の PageLinkMark と TagLink を統合し、[Title]構文と#tag 構文の両方を単一の Tiptap Mark で処理するシステムです。リアルタイム更新、クロスタブ同期、自動解決機能を備えた次世代リンクシステムとして設計されました。

## 完了フェーズ

### フェーズ 0: 設計・仕様策定 ✅

#### 1. 仕様書作成

- **ファイル**: `docs/unified-link-mark-spec.md`
- **内容**: 22 セクションからなる包括的な技術仕様
  - 目的・範囲・マーク属性定義
  - ステートマシン（pending → exists/missing）
  - 正規化ルール（Unicode NFC、スペース圧縮、アンダースコア変換）
  - 入力規則（日本語#tag 対応、[Title]パターン）
  - 非同期解決・クリック動作・移行計画
  - テスト計画・ロールアウト戦略

#### 2. Mermaid 図表化

- **ステートマシン図**: stateDiagram-v2 形式
- **シーケンス図**: sequenceDiagram 形式
- **リアルタイムデータフロー図**: flowchart 形式
- **パースエラー修正**: 日本語ラベル対応、ASCII ID 化

#### 3. 実装計画策定

- **ファイル**: `docs/unified-link-mark-implementation-plan.md`
- **段階的アプローチ**: P0〜P5 の 6 段階実装計画
- **リスク管理**: 既存システムとの共存戦略

### フェーズ 1: 基盤実装 (P0) ✅

#### 1. ユーティリティ関数群

**ファイル**: `lib/unilink/utils.ts`

```typescript
// 主要機能
- normalizeTitleToKey: Unicode NFC + スペース圧縮 + アンダースコア変換
- TTLCache: 30秒TTLのメモリキャッシュ
- updateUnilinkAttrs: マーク属性更新ヘルパー
```

#### 2. 調整キュー

**ファイル**: `lib/unilink/reconcile-queue.ts`

```typescript
// ReconcileQueue クラス
- 100ms デバウンス処理
- 重複API呼び出し防止
- インフライト状態管理
```

#### 3. クロスタブ通信

**ファイル**: `lib/unilink/broadcast-channel.ts`

```typescript
// UnilinkBroadcastChannel
- BroadcastChannel ラッパー
- 型安全なメッセージング
- エラーハンドリング
```

#### 4. リアルタイム監視

**ファイル**: `lib/unilink/realtime-listener.ts`

```typescript
// UnilinkRealtimeListener
- Supabase Realtime 統合
- pages テーブル変更監視
- イベントフィルタリング
```

#### 5. 共通エクスポート

**ファイル**: `lib/unilink/index.ts`

### フェーズ 2: コア実装 (P1) ✅

#### 1. UnifiedLinkMark 拡張

**ファイル**: `lib/tiptap-extensions/unified-link-mark.ts`

**主要機能**:

- **属性スキーマ**: variant, raw, text, key, pageId, href, state, exists, created, markId
- **InputRules**:
  - `#tag`パターン（日本語文字対応）
  - `[Title]`パターン
- **非同期解決**: searchPages API 統合
- **レンダリング**: data-state 属性による CSS 制御
- **コマンド**: insertUnifiedLink, refreshUnifiedLinks

**技術詳細**:

```typescript
// 日本語対応#tag正規表現（ES5互換）
const tagPattern =
  /#([a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF\uFF00-\uFFEF_-]+)/g;

// 非同期解決キュー
const resolverQueue = new Map<string, Promise<void>>();

// 状態更新関数
function updateMarkState(
  editor: Editor,
  markId: string,
  updates: Partial<UnifiedLinkAttributes>
);
```

#### 2. エディタ統合

**ファイル**: `app/(protected)/pages/[id]/_hooks/usePageEditorLogic.ts`

**変更内容**:

```typescript
// インポート追加
import { UnifiedLinkMark } from "@/lib/tiptap-extensions/unified-link-mark";

// 拡張配列への追加（PageLinkMarkより前に配置）
extensions: [
  StarterKit.configure({...}),
  UnifiedLinkMark,        // ← 新規追加
  PageLinkMark,          // ← 既存（優先度下げ）
  // ... 他の拡張
]
```

### 検証・テスト結果 ✅

#### TypeScript コンパイレーションチェック

```bash
npx tsc --noEmit --skipLibCheck
# 結果: エラーなし（Exit Code: 0）
```

#### 機能テスト準備完了

- [Title]構文の自動マーク生成
- #tag 構文の自動マーク生成（日本語対応）
- pending 状態での初期レンダリング
- 非同期解決キューの動作

## 残りフェーズ（未着手）

### P2: 解決ロジック統合

- searchPages API 完全統合
- 存在確認・ページ作成・ナビゲーション機能
- エラーハンドリング強化

### P3: リアルタイム自動再解決

- Supabase Realtime 統合
- BroadcastChannel による同期
- 自動 missing→exists 更新

### P4: レガシーシステム置換

- 既存 TagLink/PageLinkMark からの移行
- 重複削除・段階的除去
- 後方互換性維持

### P5: テスト・最終化

- テストスイート作成
- パフォーマンス検証
- 本番環境向け調整

## 技術的成果

### 1. アーキテクチャ統合

- 2 つの異なるリンクシステム（PageLink/TagLink）を単一抽象化
- Tiptap/ProseMirror の Mark 基盤による一貫した実装
- 型安全な TypeScript 実装

### 2. 国際化対応

- 日本語文字に完全対応した#tag 処理
- Unicode 正規化による一貫したキー生成
- ES5 互換正規表現パターン

### 3. パフォーマンス最適化

- TTL キャッシュによる重複 API 呼び出し防止
- デバウンス処理による負荷軽減
- 非同期解決による UI ブロッキング回避

### 4. 拡張性設計

- プラグイン可能なアーキテクチャ
- リアルタイム機能への対応準備
- 将来的な機能拡張への考慮

## コード統計

### 新規作成ファイル

- `docs/unified-link-mark-spec.md`: 仕様書（22 セクション）
- `docs/unified-link-mark-implementation-plan.md`: 実装計画
- `lib/unilink/utils.ts`: 基盤ユーティリティ
- `lib/unilink/reconcile-queue.ts`: 調整キュー
- `lib/unilink/broadcast-channel.ts`: クロスタブ通信
- `lib/unilink/realtime-listener.ts`: リアルタイム監視
- `lib/unilink/index.ts`: エクスポート
- `lib/tiptap-extensions/unified-link-mark.ts`: メイン実装

### 修正ファイル

- `app/(protected)/pages/[id]/_hooks/usePageEditorLogic.ts`: エディタ統合

### 総行数

- 新規コード: 約 800 行
- 文書: 約 1200 行
- 合計: 約 2000 行

## 学習・発見事項

### 1. Mermaid 図表の制約

- 日本語ラベルでのパースエラー対応
- ASCII ID 化による構文エラー回避
- 複雑なフローチャートの可読性向上

### 2. TypeScript 型安全性

- Tiptap 拡張での厳密な型定義
- 非同期処理での型推論活用
- インターフェース設計によるコードの保守性向上

### 3. 正規表現パターン設計

- 日本語文字範囲の適切な指定
- ES5 互換性とモダンブラウザ対応の両立
- パフォーマンスを考慮したパターン最適化

## 次回作業の準備

### P2 着手のための前提条件

1. P1 の動作確認（エディタでの基本機能テスト）
2. searchPages API の詳細仕様確認
3. 既存ページ作成フローの理解

### 検討事項

1. 既存システムとの共存期間の管理
2. ユーザー向け機能告知のタイミング
3. パフォーマンス監視指標の設定

---

**作成日**: 2025 年 9 月 29 日  
**作成者**: GitHub Copilot  
**ステータス**: P1 完了、P2 準備完了
