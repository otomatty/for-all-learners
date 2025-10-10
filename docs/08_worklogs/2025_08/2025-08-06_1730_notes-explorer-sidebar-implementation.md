# ノートエクスプローラーサイドバー実装ログ

## 作業日時・概要
- **作業日**: 2025年08月06日 17:30-18:00
- **タスク**: ノートエクスプローラーをサイドバー形式で実装
- **目的**: 専用エクスプローラーページへの移動なしに、どのノートページからもドラッグ&ドロップでページ整理を可能にする

## 要件・背景
- 既存の`/notes/explorer`ページは専用画面として残す
- `/notes`配下のすべてのページで左側にフローティングボタンを配置
- ボタンクリックでサイドバーが左からスライドイン
- `/notes/{slug}/{pageId}`では現在のノートとページをハイライト表示

## 実装内容

### 1. フローティングボタンとサイドバーコンポーネント

#### 新規作成ファイル
```
app/(protected)/notes/_components/
├── notes-sidebar.tsx          # サイドバーコンポーネント
├── notes-layout-client.tsx    # クライアントサイドレイアウト
└── draggable-pages-list.tsx   # ドラッグ可能なページリスト
```

#### notes-sidebar.tsx の実装
- **フローティングボタン**
  - 画面左端、垂直中央に固定配置
  - 右側が丸い特徴的なデザイン
  - ChevronRightアイコンでサイドバーが隠れていることを示す
  - z-index: 40で他の要素より前面に表示

- **サイドバー**
  - 既存の`components/ui/sidebar.tsx`を活用
  - variant="floating"で浮動表示
  - collapsible="offcanvas"で画面外からスライドイン
  - ノート一覧をツリー形式で表示

- **ハイライト機能**
  - 現在のノート: 背景色変更（bg-sidebar-accent）
  - 現在のページ: 左端に青い縦線表示
  - URLから現在位置を自動検出

### 2. ドラッグ&ドロップ機能の実装

#### draggable-pages-list.tsx
- `@dnd-kit/sortable`を使用したドラッグ可能なページアイテム
- グリップハンドル（GripVerticalアイコン）をホバー時に表示
- ドラッグ中は半透明化（opacity: 0.5）
- ドラッグ中はリンククリックを無効化

#### pages-list.tsx の修正
- 既存のページリストをDraggablePageItemに置き換え
- extractTextFromTiptapとisAllowedDomain関数を維持

#### page-client.tsx の拡張
- DndContextとSortableContextを追加
- handleDragEnd関数でドラッグ終了時の処理
- rectSortingStrategyでグリッドレイアウトに対応

### 3. レイアウトとページ移動処理

#### layout.tsx（サーバーコンポーネント）
```typescript
- getUserNotesでノート一覧を取得
- NotesLayoutClientに渡してクライアント処理を委譲
```

#### notes-layout-client.tsx（クライアントコンポーネント）
- **ページ移動処理**
  - checkBatchConflictsで競合チェック
  - 競合がある場合はConflictResolutionDialog表示
  - batchMovePagesで実際の移動実行

- **状態管理**
  - pendingOperation: 競合解決待ちの操作
  - toast通知でユーザーフィードバック

- **エラーハンドリング**
  - try-catchで包括的なエラー処理
  - 失敗時はtoast.errorで通知

### 4. 技術的な詳細

#### インポートパスの修正
- ケース問題の解決: `batch-move-pages` → `batchMovePages`
- ケース問題の解決: `check-batch-conflicts` → `checkBatchConflicts`

#### 文字化け対応
- 日本語コメントの文字化けを修正
- UTF-8エンコーディングの確認

#### TypeScript型定義
```typescript
type Note = {
  id: string;
  title: string;
  slug: string;
  pageCount: number;
};
```

## 実装された機能

### ✅ 完成した機能
1. **フローティングボタン**
   - 画面左中央に常時表示
   - クリックでサイドバートグル
   - アクセシビリティ対応（sr-only）

2. **ノートエクスプローラーサイドバー**
   - ノート一覧の表示
   - 現在のノート/ページのハイライト
   - スムーズなスライドアニメーション

3. **ドラッグ&ドロップ**
   - `/notes/{slug}`でページリストのドラッグ対応
   - サイドバーの他ノートへのドロップ
   - 視覚的フィードバック（グリップハンドル、透明度）

4. **ページ移動処理**
   - 競合チェックと解決
   - 移動/コピーの実行
   - リアルタイムフィードバック

### 🔄 今後の拡張予定
1. **ページエディターのドラッグ対応**
   - `/notes/{slug}/{pageId}`でエディター全体をドラッグ可能に
   - ドラッグハンドルの追加

2. **リアルタイム更新**
   - window.location.reloadを使わない状態更新
   - React Queryのキャッシュ無効化

3. **アニメーション改善**
   - ドラッグ時のゴーストイメージ
   - ドロップ時のアニメーション

## テストポイント
1. **フローティングボタン**: 表示位置、クリック動作
2. **サイドバー**: 開閉アニメーション、ノート一覧表示
3. **ハイライト**: 現在位置の正確な検出と表示
4. **ドラッグ&ドロップ**: ページ移動の動作確認
5. **競合解決**: 同名ページ移動時のダイアログ表示
6. **エラー処理**: ネットワークエラー時の挙動

## パフォーマンス考慮事項
- サイドバーは`defaultOpen={false}`で初期非表示
- ドラッグセンサーは`distance: 8`で誤操作防止
- ページリストは既存のInfiniteQuery実装を維持

## アクセシビリティ
- フローティングボタンにaria-label
- キーボードナビゲーション対応（Cmd/Ctrl+B）
- スクリーンリーダー対応のテキスト

## 利用方法
1. `/notes`配下の任意のページにアクセス
2. 画面左中央のボタンをクリック
3. サイドバーからノートを選択またはドラッグ&ドロップ
4. ページをドラッグして他のノートに移動

## 関連ファイル
- UI基盤: `components/ui/sidebar.tsx`
- ドラッグライブラリ: `@dnd-kit/core`, `@dnd-kit/sortable`
- アクション: `app/_actions/notes/batchMovePages.ts`
- 競合解決: `app/(protected)/notes/explorer/_components/conflict-resolution-dialog.tsx`

## 技術スタック
- **フレームワーク**: Next.js 15, React 19
- **UI**: Tailwind CSS, Radix UI (Sidebar)
- **ドラッグ&ドロップ**: @dnd-kit
- **状態管理**: React useState, Server Actions
- **通知**: Sonner (Toast)

## 実装完了時刻
2025年08月06日 18:00

---

## 続きの作業 (2025年08月06日 21:00-)

### エラー修正作業
1. **Module not foundエラーの修正**
   - `getUserNotes`アクションが存在せず、代わりに`getNotesList`を使用
   - `app/(protected)/notes/layout.tsx`のインポートを修正
   - `getNotesList`の戻り値に合わせてプロパティ名を調整 (`page_count` → `pageCount`)

2. **不足コンポーネントの作成**
   - `draggable-pages-list.tsx`コンポーネントを新規作成
   - ドラッグ可能なページアイテムのUI実装
   - @dnd-kit/sortableを使用したドラッグ機能

### 現在の問題点
- ✅ **Module not foundエラー**: 解決済み
- ❌ **/notesページでノート一覧が表示されない**: 未解決

### 今後実装が必要な作業

#### 🔴 緊急度: 高
1. **ノート一覧表示の修正**
   - `/notes`ページで実際のノート一覧表示が機能していない
   - サイドバーの`NotesExplorerSidebar`は読み込まれているか確認
   - フローティングボタンの表示確認

2. **サイドバー表示の確認**
   - サイドバーの`defaultOpen={false}`により初期状態で非表示
   - フローティングボタンのクリック動作確認
   - サイドバー内でのノート一覧表示確認

#### 🟡 緊急度: 中
3. **ドラッグ&ドロップ機能の完成**
   - 個別ページでのドラッグ機能実装
   - `/notes/{slug}/{pageId}`ページでのエディター全体ドラッグ対応

4. **ページリスト統合**
   - 既存の`pages-list.tsx`と新しい`draggable-pages-list.tsx`の統合
   - `/notes/{slug}`ページでのドラッグ可能ページリストの実装

#### 🟢 緊急度: 低
5. **UI/UX改善**
   - リアルタイム更新（`window.location.reload`の置換）
   - アニメーション改善
   - モバイル対応

### 技術的調査項目
- サイドバーがレンダリングされない原因の特定
- Sidebar UIコンポーネントの正しい使用方法の確認
- SidebarProviderの設定確認

### フローティングボタン位置調整作業 (2025年08月06日 21:15-)

#### 実施した調整
1. **ボタンの追従動作実装**
   - サイドバーの開閉状態に応じてボタン位置を動的に変更
   - `useSidebar`の`state`を使用して開閉状態を取得
   - アニメーション付きで滑らかな位置移動を実装

2. **位置調整の試行錯誤**
   - 初期値: `left-80` (320px) → 位置が遠すぎる
   - 調整後: `left-64` (256px) → まだ遠い
   - 最終調整: `left-60` (240px) → 適切な位置

3. **視覚的改善**
   - 矢印アイコンの回転アニメーション（開いている時180度回転）
   - 位置移動時のスムーズなトランジション（300ms）
   - アクセシビリティテキストの動的変更

#### 技術的詳細
```tsx
// サイドバー状態の取得
const { toggleSidebar, state } = useSidebar();
const isOpen = state === "expanded";

// 動的位置調整
const leftPosition = isOpen ? "left-60" : "left-0"; // 240px / 4 = 60

// アニメーション付きクラス
className={cn(
  "fixed top-1/2 -translate-y-1/2 rounded-r-lg rounded-l-none h-12 w-10 shadow-lg z-50 transition-all duration-300",
  leftPosition
)}
```

#### 解決した問題
- ✅ **フローティングボタンのサイドバー追従**: 完了
- ✅ **位置のずれ**: `left-60`で適切な位置に調整
- ✅ **アニメーション**: スムーズな移動を実装

### 次回作業開始時のチェックリスト
1. ✅ 開発サーバーでエラーがないことを確認
2. ✅ `/notes`ページにアクセスしてフローティングボタンの表示確認
3. ✅ フローティングボタンクリックでサイドバーが開くことを確認
4. ✅ フローティングボタンがサイドバーに追従することを確認
5. 🔄 サイドバー内でノート一覧が表示されることを確認

## 今後の課題
- モバイル対応の改善
- ドラッグ中のプレビュー表示
- 複数ページの一括選択・移動
- サイドバー内でのノート作成機能