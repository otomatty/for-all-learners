# エクスプローラー機能 Phase 3 実装計画書

## ドキュメント情報
- **作成日**: 2025年07月28日
- **バージョン**: 1.0
- **対象機能**: エクスプローラー風ページ・ノート管理システム Phase 3
- **前提条件**: Phase 1-2 完了済み（基本UI・ドラッグ&ドロップ機能）

## 1. 現在の実装状況

### ✅ 完了済み機能（Phase 1-3）
- エクスプローラー風分割レイアウト
- ドラッグ&ドロップによるページ移動・コピー
- 複数選択・バッチ操作
- 同名競合の自動検出（バックエンド）
- 操作パネルからの移動・コピー
- 検索・フィルタ・ソート機能
- **同名競合解決UI** - 2025/07/28完了
- **削除機能とゴミ箱システム** - 2025/07/28完了

### 🔄 実装中・改善が必要な機能
- UIのリアルタイム更新（現在はページリロード）
- エラーハンドリングの強化
- パフォーマンス最適化（大量データ対応）

### ❌ 未実装機能
- アンドゥ・リドゥ機能
- 高度な検索・全文検索機能
- クリップボード機能
- モバイル最適化

## 2. Phase 3 実装計画

### 2.1 優先度高: コア機能の完成

#### 2.1.1 同名競合解決ダイアログ ✅ **完了 (2025/07/28)**
**目標**: 同名ページが存在する場合の解決方法を選択できるUI

**実装ファイル**:
```
app/(protected)/notes/explorer/_components/
├── conflict-resolution-dialog.tsx    # メインダイアログ
├── conflict-item.tsx                 # 個別競合アイテム
├── conflict-preview.tsx              # プレビュー表示
└── types.ts                          # 型定義

app/_actions/notes/
└── checkBatchConflicts.ts            # バッチ競合チェックAPI
```

**実装済み機能**:
- 競合するページの詳細表示（作成日時、更新日時、内容プレビュー200文字）
- 解決オプション:
  - 自動リネーム: "ページ名 (2)" 形式での自動命名
  - 手動リネーム: ユーザーが新しいタイトルを入力
  - 上書き: 既存ページを削除して置き換え
  - スキップ: 該当ページの移動をキャンセル
- 複数競合の一括処理
- 移動前の事前競合チェック

**技術実装**:
- React Hook Form不使用でシンプルなstate管理
- Radix UIコンポーネント（Dialog, RadioGroup等）活用
- 型安全性を重視したTypeScript実装

#### 2.1.2 削除機能の実装 ✅ **完了 (2025/07/28)**
**目標**: 選択したページを安全に削除する機能

**実装ファイル**:
```
app/_actions/notes/
├── moveToTrash.ts              # ソフト削除（ゴミ箱移動）
├── restoreFromTrash.ts         # ゴミ箱からの復元
├── deletePagesPermanently.ts   # 完全削除
└── getTrashItems.ts           # ゴミ箱一覧取得

app/(protected)/notes/explorer/_components/
├── delete-confirmation-dialog.tsx    # 削除確認ダイアログ
└── trash-panel.tsx                   # ゴミ箱表示パネル
```

**実装済み機能**:
- 削除確認ダイアログ（削除対象ページの詳細表示）
- ソフト削除（ゴミ箱移動・30日間保管）
- 完全削除（即座に削除・復元不可）
- 復元機能（ゴミ箱から元のノートまたは指定ノートに復元）
- 自動削除（30日後の自動完全削除・警告表示付き）
- ゴミ箱管理（一覧表示・選択・バッチ操作）

**データベース実装**:
```sql
-- ゴミ箱テーブル
CREATE TABLE page_trash (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  original_note_id UUID REFERENCES notes(id) ON DELETE SET NULL,
  page_title TEXT NOT NULL,
  page_content TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  auto_delete_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  metadata JSONB DEFAULT '{}'::jsonb
);
```

**セキュリティ実装**:
- Row Level Security (RLS) でユーザー単位のアクセス制御
- 管理者は全ユーザーのゴミ箱にアクセス可能
- ユーザー認証とオーナーシップ検証

#### 2.1.3 リアルタイムUI更新
**目標**: ページリロードなしでの即座な画面更新

**実装方針**:
- React Query / TanStack Queryを活用したキャッシュ管理
- 楽観的更新（Optimistic Updates）
- Server-Sent Events（SSE）またはSupabase Realtimeを使用

**実装ファイル**:
```
hooks/
├── useNotesQuery.ts                  # ノート一覧のクエリ
├── usePagesQuery.ts                  # ページ一覧のクエリ
└── useOptimisticUpdates.ts          # 楽観的更新フック

lib/
└── realtime-client.ts               # リアルタイム通信クライアント
```

### 2.2 優先度中: UX向上機能

#### 2.2.1 アンドゥ・リドゥ機能
**目標**: 操作の取り消しと再実行が可能

**実装設計**:
```typescript
interface OperationHistory {
  id: string;
  type: 'move' | 'copy' | 'delete' | 'rename';
  timestamp: Date;
  undoAction: () => Promise<void>;
  redoAction: () => Promise<void>;
  description: string;
}
```

**実装ファイル**:
```
hooks/
├── useOperationHistory.ts           # 操作履歴管理
└── useUndoRedo.ts                   # アンドゥ・リドゥ機能

app/(protected)/notes/explorer/_components/
└── operation-history-panel.tsx     # 操作履歴表示
```

#### 2.2.2 高度な検索機能
**目標**: ページ内容の全文検索と結果表示

**実装ファイル**:
```
app/_actions/notes/
└── searchPages.ts                   # 全文検索API

app/(protected)/notes/explorer/_components/
├── advanced-search-dialog.tsx      # 高度な検索ダイアログ
├── search-results-panel.tsx        # 検索結果表示
└── search-filters.tsx              # 検索フィルター
```

**機能仕様**:
- ページタイトル・内容の全文検索
- 日付範囲・ノート・タグでのフィルタリング
- 検索結果のハイライト表示
- 検索履歴の保存

#### 2.2.3 クリップボード機能
**目標**: ページの一時的な保存と再利用

**実装設計**:
```typescript
interface ClipboardItem {
  id: string;
  pageId: string;
  pageTitle: string;
  operation: 'cut' | 'copy';
  timestamp: Date;
  sourceNoteId: string;
}
```

### 2.3 優先度低: 拡張機能

#### 2.3.1 ページプレビュー機能
- ホバー時の内容プレビュー
- サムネイル画像の生成・表示
- リッチテキストコンテンツの要約

#### 2.3.2 バルクインポート・エクスポート
- 複数ページの一括インポート
- ノート単位でのエクスポート（Markdown, PDF）
- 他サービスからのデータ移行

#### 2.3.3 コラボレーション機能
- リアルタイム編集者表示
- 操作ログの共有
- 権限に応じた操作制限

## 3. 実装スケジュール

### Week 1: コア機能完成 ✅ **部分完了 (2025/07/28)**
- **Day 1-2**: 同名競合解決ダイアログ ✅ **完了**
- **Day 3-4**: 削除機能とゴミ箱 ✅ **完了**
- **Day 5**: リアルタイムUI更新 🔄 **次期実装**

### Week 2: UX向上
- **Day 1-2**: アンドゥ・リドゥ機能
- **Day 3-4**: 高度な検索機能
- **Day 5**: クリップボード機能

### Week 3: 最適化・拡張
- **Day 1-2**: パフォーマンス最適化
- **Day 3-4**: モバイル対応
- **Day 5**: テスト・バグ修正

## 4. 技術的考慮事項

### 4.1 パフォーマンス最適化
- **仮想化**: 大量ページの効率的な描画
- **ページネーション**: 段階的なデータ読み込み
- **キャッシュ戦略**: 適切なデータキャッシュとインvalidation

### 4.2 エラーハンドリング強化
- **Network Resilience**: オフライン対応・再試行機能
- **Validation**: クライアント・サーバー両側でのバリデーション
- **Error Boundaries**: React Error Boundaryによる部分的エラー対応

### 4.3 アクセシビリティ向上
- **キーボード操作**: すべての機能のキーボードアクセス
- **スクリーンリーダー**: ARIA属性とセマンティックHTML
- **カラーコントラスト**: WCAG 2.1 AA準拠

### 4.4 モバイル最適化
- **タッチ操作**: ドラッグ&ドロップのタッチ対応
- **レスポンシブデザイン**: 小画面での操作性向上
- **Progressive Web App**: オフライン機能とアプリライクなUX

## 5. データベース設計拡張

### 5.1 新規テーブル
```sql
-- 操作履歴テーブル
CREATE TABLE operation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES accounts(id),
  operation_type VARCHAR(20) NOT NULL,
  target_ids JSONB NOT NULL,
  before_state JSONB,
  after_state JSONB,
  undo_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 検索インデックステーブル  
CREATE TABLE page_search_index (
  page_id UUID PRIMARY KEY REFERENCES pages(id),
  content_vector tsvector,
  last_indexed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- クリップボードテーブル
CREATE TABLE user_clipboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES accounts(id),
  page_id UUID NOT NULL REFERENCES pages(id),
  operation VARCHAR(10) NOT NULL, -- 'cut' or 'copy'
  source_note_id UUID REFERENCES notes(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
n
### 5.2 インデックス追加
```sql
-- 全文検索インデックス
CREATE INDEX idx_page_search_content ON page_search_index USING gin(content_vector);

-- 操作履歴インデックス
CREATE INDEX idx_operation_history_user_created ON operation_history(user_id, created_at DESC);

-- ゴミ箱自動削除インデックス
CREATE INDEX idx_page_trash_auto_delete ON page_trash(auto_delete_at) WHERE auto_delete_at IS NOT NULL;
```

## 6. テスト計画

### 6.1 単体テスト
- Server Actions のテスト
- React Hooksのテスト
- ユーティリティ関数のテスト

### 6.2 統合テスト  
- ドラッグ&ドロップフローのテスト
- 競合解決フローのテスト
- バッチ操作のテスト

### 6.3 E2Eテスト
- エクスプローラー全体のユーザージャーニー
- エラーシナリオのテスト
- パフォーマンステスト

## 7. リリース計画

### 7.1 段階的リリース
- **Alpha**: 内部テスト用（同名競合解決・削除機能）
- **Beta**: 限定ユーザー向け（全機能含む）
- **GA**: 一般リリース（十分なテスト・最適化完了後）

### 7.2 フィーチャーフラグ
- 新機能の段階的展開
- A/Bテストによる効果測定
- 問題発生時の即座な無効化

## 8. 成功指標

### 8.1 技術指標
- **ページロード時間**: 500ms以下
- **操作レスポンス時間**: 100ms以下  
- **エラー率**: 1%以下

### 8.2 ユーザー指標
- **機能利用率**: 月間アクティブユーザーの70%以上が利用
- **操作完了率**: ドラッグ&ドロップ操作の成功率95%以上
- **ユーザー満足度**: 5段階評価で平均4.0以上

## 9. リスク管理

### 9.1 技術リスク
| リスク | 影響度 | 対策 |
|--------|--------|------|
| 大量データでのパフォーマンス低下 | 高 | 仮想化・ページネーション実装 |
| ブラウザ互換性問題 | 中 | クロスブラウザテスト強化 |
| リアルタイム更新の複雑化 | 中 | 段階的実装・フォールバック機能 |

### 9.2 UXリスク  
| リスク | 影響度 | 対策 |
|--------|--------|------|
| 操作の複雑化 | 高 | ユーザビリティテスト実施 |
| 既存ワークフローの阻害 | 中 | 旧機能との併存期間設定 |
| 学習コストの増大 | 中 | チュートリアル・ヘルプ機能強化 |

## 10. 今後の発展性

### 10.1 AI機能統合
- スマートな分類提案
- 内容に基づく自動タグ付け
- 類似ページの推奨

### 10.2 外部サービス連携
- Notion・Google Docsとの同期
- Slack・Discord通知
- Zapier・Make.com連携

### 10.3 エンタープライズ機能
- 詳細な権限管理
- 監査ログ・コンプライアンス
- API・Webhook提供

---

## 関連ドキュメント
- Phase 1-2実装ログ: `.docs/work-logs/2025-07-28_1500_explorer-dnd-implementation.md`
- **Phase 3実装ログ**: `.docs/work-logs/2025-07-28_1600_explorer-phase3-implementation.md` ✅ **完了記録**
- 要件定義書: `.docs/requirements/page-note-management-system.md`
- API仕様書: `app/_actions/notes/README.md`

**承認者**: _____________  
**承認日**: _____________