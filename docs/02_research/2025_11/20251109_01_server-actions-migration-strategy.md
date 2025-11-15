# Server Actions 移行戦略

## 概要

Tauri 2.0 への移行において、Next.js Server Actions（111ファイル）をクライアント側で動作させるための移行戦略をまとめます。

**現状**: `app/_actions/` 配下に111個のServer Actionsファイルが存在し、以下の機能を提供しています。

---

## 現状分析

### Server Actions の分類

#### 1. **CRUD操作** (約40ファイル)
基本的なデータベース操作（Create, Read, Update, Delete）

**主要ファイル**:
- `app/_actions/notes/*` - ノート管理（createNote, updateNote, deleteNote, getNotesList など）
- `app/_actions/decks.ts` - デッキ管理（createDeck, updateDeck, deleteDeck など）
- `app/_actions/pages.ts` - ページ管理（createPage, updatePage, deletePage など）
- `app/_actions/cards.ts` - カード管理
- `app/_actions/study_goals.ts` - 学習目標管理
- `app/_actions/learning_logs.ts` - 学習ログ記録

**特徴**:
- Supabase クライアントを使用した直接的なDB操作
- `revalidatePath()` によるキャッシュ再検証（37ファイルで使用）
- 認証チェック（`supabase.auth.getUser()`）

**移行難易度**: ⭐⭐☆☆☆ (低〜中)

#### 2. **認証・セッション管理** (1ファイル)
- `app/_actions/auth.ts` - Google OAuth, Magic Link, ログアウト

**特徴**:
- `redirect()` を使用したページ遷移
- OAuth コールバック URL の設定
- Cookie ベースのセッション管理

**移行難易度**: ⭐⭐⭐⭐☆ (高)

#### 3. **ファイルアップロード・ストレージ** (約5ファイル)
Supabase Storage へのファイルアップロード

**主要ファイル**:
- `app/_actions/storage.ts` - 画像アップロード
- `app/_actions/pdfUpload.ts` - PDF アップロード
- `app/_actions/audio_recordings.ts` - 音声ファイル管理

**特徴**:
- `File` / `Blob` オブジェクトの直接処理
- Supabase Storage API の使用
- Signed URL の生成

**移行難易度**: ⭐⭐☆☆☆ (低〜中)

#### 4. **バッチ処理・非同期ジョブ** (約10ファイル)
大量データの一括処理、長時間実行される処理

**主要ファイル**:
- `app/_actions/audioBatchProcessing.ts` - 音声ファイルのバッチ文字起こし
- `app/_actions/transcribeImageBatch.ts` - 画像のバッチOCR
- `app/_actions/pdfBatchOcr.ts` - PDF ページのバッチOCR
- `app/_actions/pdfJobManager.ts` - PDF処理ジョブ管理
- `app/_actions/unifiedBatchProcessor.ts` - 統合バッチプロセッサー

**特徴**:
- 外部API（Gemini API）との連携
- クォータ管理
- 処理時間の推定と進捗管理
- エラーハンドリングと部分成功の対応

**移行難易度**: ⭐⭐⭐☆☆ (中〜高)

#### 5. **AI処理** (約5ファイル)
LLM を使用したコンテンツ生成

**主要ファイル**:
- `app/_actions/generateCards.ts` - カード自動生成
- `app/_actions/generatePageInfo.ts` - ページ情報生成
- `app/_actions/generateTitle.ts` - タイトル生成
- `app/_actions/ai/getUserAPIKey.ts` - API キー管理
- `app/_actions/ai/apiKey.ts` - API キー設定

**特徴**:
- 環境変数またはDBからAPIキーを取得
- 暗号化されたAPIキーの復号化
- プロバイダー別の処理分岐

**移行難易度**: ⭐⭐⭐☆☆ (中)

#### 6. **プラグイン管理** (約8ファイル)
プラグインシステムの管理機能

**主要ファイル**:
- `app/_actions/plugins.ts` - プラグインCRUD
- `app/_actions/plugin-publish.ts` - プラグイン公開
- `app/_actions/plugin-signatures.ts` - 署名検証
- `app/_actions/plugin-security-audit-logs.ts` - セキュリティ監査ログ

**特徴**:
- 複雑なビジネスロジック
- バージョン管理
- セキュリティチェック

**移行難易度**: ⭐⭐⭐☆☆ (中)

#### 7. **その他のユーティリティ** (約42ファイル)
- `app/_actions/dashboardStats.ts` - ダッシュボード統計
- `app/_actions/actionLogs.ts` - アクションログ記録
- `app/_actions/syncLinkGroups.ts` - リンクグループ同期
- `app/_actions/changelog.ts` - 変更履歴
- その他多数

---

## 移行パターン

### パターン1: クライアント側Supabase直接アクセス（推奨）

**概要**: Server Actions を廃止し、クライアント側から直接 Supabase クライアントを使用する。

#### 実装例

**Before (Server Action)**:
```typescript
// app/_actions/notes/createNote.ts
"use server";

import { getSupabaseClient } from "./getSupabaseClient";

export async function createNote(payload: CreateNotePayload) {
  const supabase = await getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { data, error } = await supabase
    .from("notes")
    .insert([{ owner_id: user.id, ...payload }])
    .select("*")
    .single();
  
  if (error) throw error;
  return data;
}
```

**After (Client-side)**:
```typescript
// lib/hooks/use-notes.ts
"use client";

import { createClient } from "@/lib/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useCreateNote() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateNotePayload) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

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

**使用例**:
```typescript
// app/(protected)/notes/components/NoteForm.tsx
"use client";

import { useCreateNote } from "@/lib/hooks/use-notes";

export function NoteForm() {
  const createNote = useCreateNote();

  const handleSubmit = async (data: CreateNotePayload) => {
    try {
      await createNote.mutateAsync(data);
      toast.success("ノートを作成しました");
    } catch (error) {
      toast.error("作成に失敗しました");
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

#### メリット
- ✅ Tauri環境でそのまま動作
- ✅ 型安全性が保たれる（Supabase TypeScript型）
- ✅ RLS (Row Level Security) がそのまま機能
- ✅ オフライン対応が容易（Supabase Realtime + ローカルキャッシュ）
- ✅ パフォーマンス向上（サーバー経由不要）

#### デメリット
- ❌ APIキーがクライアントに露出（ただしAnon Keyは公開前提）
- ❌ RLS ポリシーの見直しが必要（サーバー側の権限チェックが不要になるため）
- ❌ `revalidatePath()` が使えない（TanStack Queryのキャッシュ無効化で代替）

#### 適用範囲
- ✅ CRUD操作全般
- ✅ ファイルアップロード（Supabase Storage）
- ✅ リアルタイム更新が必要な機能

---

### パターン2: API Routes への移行

**概要**: Server Actions を Next.js API Routes (`app/api/`) に移行し、Tauri環境では直接APIを呼び出す。

#### 実装例

**Before (Server Action)**:
```typescript
// app/_actions/decks.ts
"use server";

export async function createDeck(deck: CreateDeckInput) {
  const supabase = await createClient();
  // ... 実装
}
```

**After (API Route)**:
```typescript
// app/api/decks/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { data, error } = await supabase
    .from("decks")
    .insert([{ ...body, user_id: user.id }])
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
```

**Client-side (Tauri対応)**:
```typescript
// lib/api/decks.ts
const API_BASE_URL = typeof window !== 'undefined' && window.__TAURI__
  ? 'http://localhost:3000/api'  // Tauri dev server
  : '/api';  // Web環境

export async function createDeck(deck: CreateDeckInput) {
  const response = await fetch(`${API_BASE_URL}/decks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(deck),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create deck');
  }

  return response.json();
}
```

#### メリット
- ✅ サーバー側のロジックを維持できる
- ✅ 認証・認可ロジックをサーバー側で一元管理
- ✅ 環境変数（APIキーなど）をサーバー側で管理可能
- ✅ 既存のServer Actionsロジックを最小限の変更で移行可能

#### デメリット
- ❌ Tauri環境ではAPIサーバーが必要（開発時はNext.js dev server、本番は別途サーバーが必要）
- ❌ オフライン対応が困難
- ❌ パフォーマンスオーバーヘッド（HTTPリクエスト）

#### 適用範囲
- ✅ 機密情報を扱う処理（APIキー管理など）
- ✅ 複雑なサーバー側ロジックが必要な処理
- ✅ バッチ処理・長時間実行される処理（ただし、Tauri環境では非推奨）

---

### パターン3: Tauri Command への移行

**概要**: 複雑な処理やファイルシステム操作を Rust 側の Tauri Command に移行する。

#### 実装例

**Rust側 (src-tauri/src/main.rs)**:
```rust
#[tauri::command]
async fn process_pdf_batch(
    app: tauri::AppHandle,
    pdf_paths: Vec<String>,
) -> Result<Vec<ProcessedPage>, String> {
    // Rust側でPDF処理を実行
    // ファイルシステムへの直接アクセスが可能
    // ...
}
```

**TypeScript側**:
```typescript
// lib/tauri/commands.ts
import { invoke } from "@tauri-apps/api/core";

export async function processPdfBatch(pdfPaths: string[]) {
  return invoke<ProcessedPage[]>("process_pdf_batch", { pdf_paths: pdfPaths });
}
```

#### メリット
- ✅ ネイティブパフォーマンス
- ✅ ファイルシステムへの直接アクセス
- ✅ セキュリティ（Rustの型安全性）
- ✅ オフライン処理が可能

#### デメリット
- ❌ Rustの知識が必要
- ❌ 開発・デバッグが複雑
- ❌ 既存のJavaScript/TypeScriptロジックの書き直しが必要

#### 適用範囲
- ✅ ファイルシステム操作が必要な処理
- ✅ パフォーマンスが重要な処理（画像処理、PDF解析など）
- ✅ ネイティブ機能が必要な処理

---

## 推奨移行戦略

### Phase 1: CRUD操作の移行（優先度: 高）

**期間**: 1-2週間

**対象**:
- `app/_actions/notes/*` (約20ファイル)
- `app/_actions/decks.ts`
- `app/_actions/pages.ts`
- `app/_actions/cards.ts`

**方法**: **パターン1（クライアント側Supabase直接アクセス）**

**手順**:
1. TanStack Query のセットアップ
2. カスタムフックの作成（`lib/hooks/use-notes.ts` など）
3. Server Actions の呼び出し箇所を順次置き換え
4. テスト・動作確認

### Phase 2: 認証・セッション管理（優先度: 高）

**期間**: 1週間

**対象**:
- `app/_actions/auth.ts`

**方法**: **パターン1 + Tauri Deep Link対応**

**課題**:
- OAuth コールバック URL の Tauri カスタムスキーム対応
- Cookie ベースのセッション管理 → localStorage ベースへの移行

**詳細**: `docs/02_research/2025_11/20251109_02_supabase-tauri-integration.md` を参照

### Phase 3: ファイルアップロード（優先度: 中）

**期間**: 1週間

**対象**:
- `app/_actions/storage.ts`
- `app/_actions/pdfUpload.ts`
- `app/_actions/audio_recordings.ts`

**方法**: **パターン1（Supabase Storage直接アクセス）**

**注意点**:
- Tauri環境でのファイル選択ダイアログ（`@tauri-apps/api/dialog`）の使用
- ファイルサイズ制限のクライアント側チェック

### Phase 4: バッチ処理・AI処理（優先度: 中）

**期間**: 2-3週間

**対象**:
- `app/_actions/audioBatchProcessing.ts`
- `app/_actions/transcribeImageBatch.ts`
- `app/_actions/generateCards.ts`
- `app/_actions/ai/getUserAPIKey.ts`

**方法**: **パターン2（API Routes）または パターン3（Tauri Command）**

**判断基準**:
- **API Routes**: 既存のロジックを維持したい場合、外部API連携が必要な場合
- **Tauri Command**: パフォーマンスが重要、オフライン処理が必要な場合

### Phase 5: プラグイン管理（優先度: 低）

**期間**: 1-2週間

**対象**:
- `app/_actions/plugins.ts`
- `app/_actions/plugin-publish.ts`

**方法**: **パターン1 + パターン2のハイブリッド**

---

## 移行チェックリスト

### 準備
- [ ] TanStack Query のインストール・セットアップ
- [ ] Supabase クライアントの Tauri 環境対応確認
- [ ] RLS ポリシーの見直し（クライアント側アクセス前提）

### CRUD操作の移行
- [ ] カスタムフックの作成（`lib/hooks/use-*.ts`）
- [ ] Server Actions の呼び出し箇所を特定
- [ ] 順次置き換え・テスト
- [ ] `revalidatePath()` の削除（TanStack Queryのキャッシュ無効化で代替）

### 認証の移行
- [ ] OAuth コールバック URL の Tauri 対応
- [ ] セッション管理の localStorage 移行
- [ ] Deep Link の設定

### ファイルアップロードの移行
- [ ] Tauri ファイルダイアログの統合
- [ ] Supabase Storage への直接アップロード確認
- [ ] 進捗表示の実装

### テスト
- [ ] 各機能の動作確認
- [ ] オフライン時の動作確認
- [ ] パフォーマンステスト

---

## パターン比較表

| 項目 | パターン1: クライアント直接 | パターン2: API Routes | パターン3: Tauri Command |
|------|---------------------------|---------------------|------------------------|
| **実装難易度** | ⭐⭐☆☆☆ | ⭐⭐⭐☆☆ | ⭐⭐⭐⭐☆ |
| **パフォーマンス** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐☆☆ | ⭐⭐⭐⭐⭐ |
| **オフライン対応** | ⭐⭐⭐⭐⭐ | ⭐⭐☆☆☆ | ⭐⭐⭐⭐⭐ |
| **セキュリティ** | ⭐⭐⭐☆☆ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐☆ |
| **既存コードの再利用** | ⭐⭐⭐⭐☆ | ⭐⭐⭐⭐⭐ | ⭐⭐☆☆☆ |
| **推奨用途** | CRUD、ファイルアップロード | 機密処理、バッチ処理 | ネイティブ処理、ファイル操作 |

---

## 参考資料

- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Tauri API Reference](https://v2.tauri.app/reference/javascript/)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

## 関連ドキュメント

- [Supabase接続戦略](./20251109_02_supabase-tauri-integration.md)
- [Tauri移行計画](../01_issues/open/2025_11/20251109_01_tauri-native-migration.md)

