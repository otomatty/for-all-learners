# Tauri 2.0 移行実装計画書

## 概要

**目的**: Next.js 16 アプリケーションを Tauri 2.0 ネイティブアプリ化するための実装計画書

**期間**: 約6-8週間（フェーズ別に段階的実装）

**前提条件**:
- Next.js 16 + React + TypeScript
- Supabase をバックエンドとして使用
- 111個のServer Actionsファイルをクライアント側に移行

---

## 参照ドキュメント

### 技術調査
- [Tauri移行計画](../../01_issues/open/2025_11/20251109_01_tauri-native-migration.md) - 全体計画とプラットフォーム別対応
- [Server Actions移行戦略](../../02_research/2025_11/20251109_01_server-actions-migration-strategy.md) - Server Actionsの移行パターンと戦略
- [Supabase Tauri統合戦略](../../02_research/2025_11/20251109_02_supabase-tauri-integration.md) - Supabase認証・セッション管理・同期戦略

### 関連実装計画
- 実装計画: `docs/03_plans/tauri-migration/`（このディレクトリ）
- 作業ログ: `docs/05_logs/2025_11/`

---

## 実装フェーズ

### Phase 0: 準備・環境構築（1週間）

**目標**: Tauri開発環境のセットアップと基盤整備

#### タスク

1. **Tauri環境のセットアップ** (2-3日)
   - [ ] Rust toolchain インストール確認
   - [ ] Tauri CLI インストール (`bun add -D @tauri-apps/cli`)
   - [ ] `bunx tauri init` 実行
   - [ ] `src-tauri/tauri.conf.json` の基本設定
   - [ ] アイコンアセット準備（`.icns`, `.ico`, `.png`）

2. **TanStack Query のセットアップ** (1日)
   - [ ] `@tanstack/react-query` インストール確認（既にインストール済み）
   - [ ] `components/providers.tsx` の確認・最適化
   - [ ] QueryClient の設定確認（デフォルトオプション）
   - [ ] DevTools の設定確認

3. **Supabase クライアントの Tauri 対応** (2-3日)
   - [ ] `lib/supabase/client.ts` の確認
   - [ ] Tauri環境検出ロジックの実装
   - [ ] カスタムスキーム対応の準備
   - [ ] localStorage ベースのセッション管理準備

4. **プロジェクト構造の確認** (1日)
   - [ ] Server Actions ファイルの棚卸し
   - [ ] 依存関係のマッピング
   - [ ] 移行優先度の決定

#### 参照ファイル

- `package.json` - 依存関係確認
- `components/providers.tsx` - TanStack Query設定
- `lib/supabase/client.ts` - Supabaseクライアント
- `app/_actions/` - Server Actions一覧

#### 完了条件

- Tauri開発環境が動作する
- TanStack Queryが正しく設定されている
- SupabaseクライアントがTauri環境を検出できる

---

### Phase 1: CRUD操作の移行（2週間）

**目標**: 基本的なデータベース操作をクライアント側に移行

**移行パターン**: パターン1（クライアント側Supabase直接アクセス）

#### Phase 1.1: Notes関連の移行（1週間）

**対象ファイル** (29ファイル):
```
app/_actions/notes/
├── createNote.ts
├── updateNote.ts
├── deleteNote.ts
├── getNotesList.ts
├── getNoteDetail.ts
├── getNotePages.ts
├── linkPageToNote.ts
├── unlinkPageFromNote.ts
├── shareNote.ts
├── unshareNote.ts
├── generateNoteShareLink.ts
├── revokeNoteShareLink.ts
├── joinNoteByLink.ts
├── joinNotePublic.ts
├── moveToTrash.ts
├── restoreFromTrash.ts
├── getTrashItems.ts
├── deletePagesPermanently.ts
├── batchMovePages.ts
├── checkPageConflict.ts
├── checkBatchConflicts.ts
├── createDefaultNote.ts
├── getDefaultNote.ts
├── getAllUserPages.ts
├── migrateOrphanedPages.ts
└── types.ts
```

**実装手順**:

1. **カスタムフックの作成** (2-3日)
   - [ ] `lib/hooks/use-notes.ts` 作成
   - [ ] `useNotes()` - ノート一覧取得
   - [ ] `useNote(id)` - ノート詳細取得
   - [ ] `useCreateNote()` - ノート作成
   - [ ] `useUpdateNote()` - ノート更新
   - [ ] `useDeleteNote()` - ノート削除
   - [ ] `useLinkPageToNote()` - ページ紐付け
   - [ ] `useUnlinkPageFromNote()` - ページ紐付け解除
   - [ ] `useShareNote()` - ノート共有
   - [ ] `useUnshareNote()` - 共有解除
   - [ ] `useNoteShareLinks()` - 共有リンク取得
   - [ ] `useGenerateNoteShareLink()` - 共有リンク生成
   - [ ] `useRevokeNoteShareLink()` - 共有リンク失効
   - [ ] `useJoinNoteByLink()` - リンクでノート参加
   - [ ] `useJoinNotePublic()` - 公開ノート参加
   - [ ] `useMoveNoteToTrash()` - ゴミ箱へ移動
   - [ ] `useRestoreNoteFromTrash()` - ゴミ箱から復元
   - [ ] `useTrashItems()` - ゴミ箱アイテム取得
   - [ ] `useDeletePagesPermanently()` - ページ完全削除
   - [ ] `useBatchMovePages()` - ページ一括移動
   - [ ] `useCheckPageConflict()` - ページ競合チェック
   - [ ] `useCheckBatchConflicts()` - 一括競合チェック
   - [ ] `useCreateDefaultNote()` - デフォルトノート作成
   - [ ] `useGetDefaultNote()` - デフォルトノート取得
   - [ ] `useGetAllUserPages()` - 全ユーザーページ取得
   - [ ] `useMigrateOrphanedPages()` - 孤立ページ移行

2. **Server Actions呼び出し箇所の特定と置き換え** (2-3日)
   - [ ] `app/(protected)/notes/` 配下のコンポーネントを確認
   - [ ] Server Actionsの呼び出し箇所を特定
   - [ ] カスタムフックへの置き換え
   - [ ] `revalidatePath()` の削除

3. **テスト・動作確認** (1-2日)
   - [ ] 各機能の動作確認
   - [ ] エラーハンドリングの確認
   - [ ] キャッシュ動作の確認

**参照ファイル**:
- `app/_actions/notes/*` - 移行元Server Actions
- `app/(protected)/notes/` - 使用箇所
- `lib/hooks/use-notes.ts` - 新規作成

**実装例**:
```typescript
// lib/hooks/use-notes.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export function useNotes() {
  const supabase = createClient();
  
  return useQuery({
    queryKey: ["notes"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateNote() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: CreateNotePayload) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("notes")
        .insert([{ owner_id: user.id, ...payload }])
        .select("*")
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}
```

#### Phase 1.2: Decks関連の移行（2-3日）

**対象ファイル**:
- `app/_actions/decks.ts`

**実装手順**:
- [ ] `lib/hooks/use-decks.ts` 作成
- [ ] Server Actions呼び出し箇所の置き換え
- [ ] テスト・動作確認

#### Phase 1.3: Pages関連の移行（2-3日）

**対象ファイル**:
- `app/_actions/pages.ts`
- `app/_actions/pages/get-backlinks.ts`

**実装手順**:
- [ ] `lib/hooks/use-pages.ts` 作成
- [ ] Server Actions呼び出し箇所の置き換え
- [ ] テスト・動作確認

#### Phase 1.4: Cards関連の移行（2-3日）

**対象ファイル**:
- `app/_actions/cards.ts`
- `app/_actions/syncCardLinks.ts`

**実装手順**:
- [ ] `lib/hooks/use-cards.ts` 作成
- [ ] Server Actions呼び出し箇所の置き換え
- [ ] テスト・動作確認

#### Phase 1.5: その他のCRUD操作（2-3日）

**対象ファイル**:
- `app/_actions/study_goals.ts`
- `app/_actions/learning_logs.ts`
- `app/_actions/milestone.ts`
- `app/_actions/review.ts`

**実装手順**:
- [ ] 各機能のカスタムフック作成
- [ ] Server Actions呼び出し箇所の置き換え
- [ ] テスト・動作確認

#### 完了条件

- すべてのCRUD操作がクライアント側で動作する
- TanStack Queryのキャッシュが正しく機能する
- `revalidatePath()` がすべて削除されている

---

### Phase 2: 認証・セッション管理の移行（1週間）

**目標**: OAuth認証とセッション管理をTauri環境に対応

**移行パターン**: パターン1 + Tauri Deep Link対応

#### 対象ファイル

- `app/_actions/auth.ts`

#### 実装手順

1. **Tauri Deep Link設定** (1-2日)
   - [ ] `src-tauri/tauri.conf.json` にDeep Link設定追加
   - [ ] Rust側のDeep Linkハンドラー実装
   - [ ] TypeScript側のDeep Linkハンドラー実装

2. **SupabaseクライアントのTauri対応** (1-2日)
   - [ ] `lib/supabase/tauri-client.ts` 作成
   - [ ] カスタムスキーム対応
   - [ ] localStorage ベースのセッション管理実装

3. **認証フローの実装** (2-3日)
   - [ ] `lib/auth/tauri-auth-handler.ts` 作成
   - [ ] `lib/auth/tauri-login.ts` 作成（Google OAuth）
   - [ ] `lib/auth/tauri-magic-link.ts` 作成（Magic Link）
   - [ ] `lib/hooks/use-auth.ts` 作成（セッション状態管理）
   - [ ] `app/layout.tsx` にDeep Linkハンドラー設定

4. **既存認証コードの置き換え** (1-2日)
   - [ ] `app/_actions/auth.ts` の呼び出し箇所を特定
   - [ ] 新しい認証フックへの置き換え
   - [ ] テスト・動作確認

#### 参照ファイル

- `app/_actions/auth.ts` - 移行元Server Actions
- `lib/supabase/client.ts` - Supabaseクライアント
- `app/(public)/auth/` - 認証ページ
- `lib/auth/tauri-auth-handler.ts` - 新規作成
- `lib/auth/tauri-login.ts` - 新規作成
- `lib/auth/tauri-magic-link.ts` - 新規作成
- `lib/hooks/use-auth.ts` - 新規作成

#### 参照ドキュメント

- [Supabase Tauri統合戦略](../../02_research/2025_11/20251109_02_supabase-tauri-integration.md) - セクション2, 3, 4を参照

#### 完了条件

- OAuth認証がTauri環境で動作する
- Magic Link認証がTauri環境で動作する
- セッションがlocalStorageに正しく保存される
- Deep Linkが正しく処理される

---

### Phase 3: ファイルアップロード・ストレージの移行（1週間）

**目標**: ファイルアップロード機能をクライアント側に移行

**移行パターン**: パターン1（Supabase Storage直接アクセス）

#### 対象ファイル

- `app/_actions/storage.ts` - 画像アップロード
- `app/_actions/pdfUpload.ts` - PDFアップロード
- `app/_actions/audio_recordings.ts` - 音声ファイル管理
- `app/_actions/audio_transcriptions.ts` - 音声文字起こし

#### 実装手順

1. **Tauriファイルダイアログの統合** (1-2日)
   - [ ] `@tauri-apps/api/dialog` のインストール
   - [ ] `lib/utils/tauri-file-dialog.ts` 作成
   - [ ] ファイル選択ダイアログの実装

2. **ストレージフックの作成** (2-3日)
   - [ ] `lib/hooks/use-storage.ts` 作成
   - [ ] `useUploadImage()` - 画像アップロード
   - [ ] `useUploadPdf()` - PDFアップロード
   - [ ] `useUploadAudio()` - 音声ファイルアップロード
   - [ ] `useGetSignedUrl()` - Signed URL取得
   - [ ] 進捗表示の実装

3. **既存コードの置き換え** (2-3日)
   - [ ] Server Actions呼び出し箇所の特定
   - [ ] 新しいフックへの置き換え
   - [ ] ファイルサイズ制限のクライアント側チェック実装
   - [ ] テスト・動作確認

#### 参照ファイル

- `app/_actions/storage.ts` - 移行元Server Actions
- `app/_actions/pdfUpload.ts` - 移行元Server Actions
- `app/_actions/audio_recordings.ts` - 移行元Server Actions
- `lib/hooks/use-storage.ts` - 新規作成
- `lib/utils/tauri-file-dialog.ts` - 新規作成

#### 実装例

```typescript
// lib/hooks/use-storage.ts
"use client";

import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { open } from "@tauri-apps/api/dialog";

export function useUploadImage() {
  const supabase = createClient();
  
  return useMutation({
    mutationFn: async (file: File) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      // ファイルサイズチェック（10MB制限）
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("ファイルサイズが10MBを超えています");
      }
      
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from("images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });
      
      if (error) throw error;
      
      // Signed URL取得
      const { data: urlData } = await supabase.storage
        .from("images")
        .createSignedUrl(fileName, 3600);
      
      return urlData?.signedUrl;
    },
  });
}
```

#### 完了条件

- 画像アップロードが動作する
- PDFアップロードが動作する
- 音声ファイルアップロードが動作する
- Tauri環境でのファイル選択ダイアログが動作する
- 進捗表示が正しく機能する

---

### Phase 4: バッチ処理・AI処理の移行（2-3週間）

**目標**: バッチ処理とAI処理を適切なパターンに移行

**移行パターン**: パターン2（API Routes）または パターン3（Tauri Command）

#### Phase 4.1: バッチ処理の移行（1-2週間）

**対象ファイル**:
- `app/_actions/audioBatchProcessing.ts` - 音声ファイルのバッチ文字起こし
- `app/_actions/transcribeImageBatch.ts` - 画像のバッチOCR
- `app/_actions/pdfBatchOcr.ts` - PDFページのバッチOCR
- `app/_actions/pdfJobManager.ts` - PDF処理ジョブ管理
- `app/_actions/unifiedBatchProcessor.ts` - 統合バッチプロセッサー
- `app/_actions/multiFileBatchProcessing.ts` - 複数ファイルバッチ処理

**判断基準**:
- **API Routes**: 外部API（Gemini API）との連携が必要な場合
- **Tauri Command**: パフォーマンスが重要、オフライン処理が必要な場合

**実装手順**:
- [ ] 各バッチ処理の要件分析
- [ ] 移行パターンの決定（API Routes / Tauri Command）
- [ ] API Routes実装 または Tauri Command実装
- [ ] クライアント側の呼び出し実装
- [ ] 進捗管理の実装
- [ ] テスト・動作確認

#### Phase 4.2: AI処理の移行（1週間）

**対象ファイル**:
- `app/_actions/generateCards.ts` - カード自動生成
- `app/_actions/generatePageInfo.ts` - ページ情報生成
- `app/_actions/generateTitle.ts` - タイトル生成
- `app/_actions/generateCardsFromPage.ts` - ページからカード生成
- `app/_actions/ai/getUserAPIKey.ts` - APIキー取得
- `app/_actions/ai/apiKey.ts` - APIキー設定

**実装手順**:
- [ ] API Routesへの移行（機密情報を扱うため）
- [ ] `app/api/ai/` 配下にAPI Routes作成
- [ ] クライアント側の呼び出し実装
- [ ] APIキー管理の実装
- [ ] テスト・動作確認

#### 参照ファイル

- `app/_actions/audioBatchProcessing.ts` - 移行元
- `app/_actions/transcribeImageBatch.ts` - 移行元
- `app/_actions/generateCards.ts` - 移行元
- `app/api/ai/` - 新規作成（API Routes）
- `lib/hooks/use-ai.ts` - 新規作成

#### 完了条件

- バッチ処理が正しく動作する
- AI処理が正しく動作する
- 進捗管理が正しく機能する
- APIキーが安全に管理される

---

### Phase 5: その他の機能の移行（1-2週間）

**目標**: 残りのServer Actionsを移行

#### Phase 5.1: プラグイン管理（1週間）

**対象ファイル**:
- `app/_actions/plugins.ts` - プラグインCRUD
- `app/_actions/plugin-publish.ts` - プラグイン公開
- `app/_actions/plugin-signatures.ts` - 署名検証
- `app/_actions/plugin-security-audit-logs.ts` - セキュリティ監査ログ
- `app/_actions/plugin-security-alerts.ts` - セキュリティアラート
- `app/_actions/plugin-ratings-reviews.ts` - 評価・レビュー
- `app/_actions/plugin-storage.ts` - プラグインストレージ
- `app/_actions/plugin-widgets.ts` - プラグインウィジェット
- `app/_actions/plugins-dev.ts` - 開発用プラグイン管理

**移行パターン**: パターン1 + パターン2のハイブリッド

**実装手順**:
- [ ] プラグインCRUDのクライアント側移行
- [ ] プラグイン公開のAPI Routes移行
- [ ] 署名検証のAPI Routes移行
- [ ] セキュリティ関連のAPI Routes移行

#### Phase 5.2: その他のユーティリティ（1週間）

**対象ファイル**:
- `app/_actions/dashboardStats.ts` - ダッシュボード統計
- `app/_actions/actionLogs.ts` - アクションログ記録
- `app/_actions/syncLinkGroups.ts` - リンクグループ同期
- `app/_actions/changelog.ts` - 変更履歴
- `app/_actions/user_settings.ts` - ユーザー設定
- `app/_actions/subscriptions.ts` - サブスクリプション管理
- `app/_actions/inquiries.ts` - お問い合わせ
- その他多数

**実装手順**:
- [ ] 各機能の要件分析
- [ ] 適切な移行パターンの決定
- [ ] 実装・テスト

#### 完了条件

- すべてのServer Actionsが移行完了
- すべての機能がTauri環境で動作する

---

### Phase 6: Next.js静的化とTauri統合（1週間）

**目標**: Next.jsを静的エクスポート可能にし、Tauriと統合

#### 実装手順

1. **Next.js設定の調整** (1-2日)
   - [ ] `next.config.ts` の `output: "export"` 設定
   - [ ] 動的ルートの `generateStaticParams` 実装
   - [ ] 画像最適化の無効化設定

2. **Service Workerの制御** (1-2日)
   - [ ] Tauri環境検出ロジック実装
   - [ ] PWAとTauriの共存テスト
   - [ ] キャッシュ戦略の調整

3. **Tauri設定の完成** (1-2日)
   - [ ] `src-tauri/tauri.conf.json` の最終調整
   - [ ] CSP設定の確認
   - [ ] アイコン・スプラッシュスクリーンの設定

4. **ビルド・テスト** (2-3日)
   - [ ] 静的エクスポートの動作確認
   - [ ] Tauriビルドの動作確認
   - [ ] 各OS向けビルドの動作確認

#### 参照ファイル

- `next.config.ts` - Next.js設定
- `src-tauri/tauri.conf.json` - Tauri設定
- `public/sw.js` - Service Worker
- `app/layout.tsx` - Service Worker登録

#### 完了条件

- Next.jsが静的エクスポートできる
- Tauriアプリが正常にビルドできる
- PWA版とTauri版が共存できる

---

## 実装チェックリスト

### Phase 0: 準備
- [ ] Rust toolchain インストール
- [ ] Tauri CLI セットアップ
- [ ] TanStack Query のセットアップ確認
- [ ] Supabase クライアントの Tauri 環境対応
- [ ] Server Actions ファイルの棚卸し

### Phase 1: CRUD操作
- [ ] Notes関連の移行完了
- [ ] Decks関連の移行完了
- [ ] Pages関連の移行完了
- [ ] Cards関連の移行完了
- [ ] その他のCRUD操作の移行完了
- [ ] `revalidatePath()` の削除完了

### Phase 2: 認証
- [ ] Tauri Deep Link設定
- [ ] SupabaseクライアントのTauri対応
- [ ] OAuth認証フローの実装
- [ ] Magic Link認証フローの実装
- [ ] セッション管理のlocalStorage移行

### Phase 3: ファイルアップロード
- [ ] Tauriファイルダイアログの統合
- [ ] 画像アップロードの移行
- [ ] PDFアップロードの移行
- [ ] 音声ファイルアップロードの移行

### Phase 4: バッチ処理・AI処理
- [ ] バッチ処理の移行完了
- [ ] AI処理の移行完了
- [ ] API Routes実装完了
- [ ] 進捗管理の実装完了

### Phase 5: その他の機能
- [ ] プラグイン管理の移行完了
- [ ] その他のユーティリティの移行完了

### Phase 6: 静的化・統合
- [ ] Next.js静的エクスポート設定
- [ ] Service Worker制御実装
- [ ] Tauri設定完成
- [ ] ビルド・テスト完了

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| Server Actions移行が予想より時間がかかる | 高 | 中 | 段階的な移行、優先度の明確化 |
| Tauri環境でのSupabase認証が動作しない | 高 | 中 | 事前のプロトタイプ検証、Deep Link設定の確認 |
| パフォーマンスの低下 | 中 | 低 | TanStack Queryのキャッシュ最適化、パフォーマンステスト |
| オフライン対応の不備 | 中 | 中 | ハイブリッドDB戦略の実装、オフラインテスト |
| ビルドエラーの発生 | 中 | 低 | 段階的なビルド確認、エラーハンドリングの強化 |

---

## 次のステップ

1. **Phase 0の開始**: 環境構築と準備作業
2. **プロトタイプ作成**: 最小構成での動作確認
3. **Phase 1の開始**: CRUD操作の移行

---

## 関連ドキュメント

- [Tauri移行計画](../../01_issues/open/2025_11/20251109_01_tauri-native-migration.md)
- [Server Actions移行戦略](../../02_research/2025_11/20251109_01_server-actions-migration-strategy.md)
- [Supabase Tauri統合戦略](../../02_research/2025_11/20251109_02_supabase-tauri-integration.md)

---

**作成日**: 2025-11-09  
**最終更新**: 2025-11-09  
**担当**: 開発チーム

