# Phase 3.6 完了レポート: Dashboard/Profile のconsole文置き換え

**作成日**: 2025-10-16  
**作成者**: AI Assistant  
**フェーズ**: Phase 3.6 - Dashboard/Profile Console Replacement

---

## 概要

ダッシュボードとプロフィール関連機能のすべてのconsole文をlogger呼び出しに置き換えました。

- **対象ファイル数**: 4ファイル
- **置き換え箇所数**: 6箇所
- **対象機能**: プロフィール保存、デッキ取得、デッキ選択/作成、目標サマリー

---

## 実施内容の詳細

### 1. profile-form.tsx

**ファイルパス**: `app/(protected)/profile/_components/profile-form.tsx`

**置き換え箇所**: 1箇所

**変更内容**:

1. **行92: プロフィール保存エラー**
   - **変更前**:
     ```typescript
     console.error("[ProfileForm][handleSaveError]", error);
     ```
   - **変更後**:
     ```typescript
     logger.error(
       {
         error,
         accountId: account.id,
         fullName: account.full_name,
         hasAvatarFile: !!selectedFile,
       },
       "Failed to save profile"
     );
     ```
   - **コンテキスト**: error, accountId, fullName, hasAvatarFile
   - **理由**: プロフィール保存失敗時に、保存しようとしたアカウント情報とアバターファイルの有無をログに記録

---

### 2. dashboard/page.tsx

**ファイルパス**: `app/(protected)/dashboard/page.tsx`

**置き換え箇所**: 1箇所

**変更内容**:

1. **行55: デッキフェッチエラー**
   - **変更前**:
     ```typescript
     console.error("Failed to fetch decks:", deckError);
     ```
   - **変更後**:
     ```typescript
     logger.error({ error: deckError, userId: user.id }, "Failed to fetch decks");
     ```
   - **コンテキスト**: error, userId
   - **理由**: ダッシュボードでのデッキ取得失敗時に、ユーザーIDをログに記録してユーザー固有の問題を追跡可能に

---

### 3. deck-selection-dialog.tsx

**ファイルパス**: `app/(protected)/dashboard/_components/deck-selection-dialog.tsx`

**置き換え箇所**: 2箇所

**変更内容**:

1. **行132: デッキリストフェッチエラー**
   - **変更前**:
     ```typescript
     console.error("Failed to fetch decks:", error);
     ```
   - **変更後**:
     ```typescript
     logger.error({ error, userId: user.id }, "Failed to fetch decks");
     ```
   - **コンテキスト**: error, userId
   - **理由**: デッキ選択ダイアログでのデッキリスト取得失敗を記録

2. **行162: デッキ作成エラー**
   - **変更前**:
     ```typescript
     console.error("Failed to create deck:", error);
     ```
   - **変更後**:
     ```typescript
     logger.error(
       { error, userId: user.id, deckTitle: newDeckTitle },
       "Failed to create deck"
     );
     ```
   - **コンテキスト**: error, userId, deckTitle
   - **理由**: 新規デッキ作成失敗時に、作成しようとしたデッキのタイトルをログに記録

---

### 4. goal-summary-client.tsx

**ファイルパス**: `app/(protected)/dashboard/_components/goal-summary/goal-summary-client.tsx`

**置き換え箇所**: 2箇所

**変更内容**:

1. **行99: 目標-デッキリンクフェッチエラー**
   - **変更前**:
     ```typescript
     console.error("Failed to fetch goal-deck links:", linksError);
     ```
   - **変更後**:
     ```typescript
     logger.error(
       { error: linksError, goalId: selectedGoalId },
       "Failed to fetch goal-deck links"
     );
     ```
   - **コンテキスト**: error, goalId
   - **理由**: 目標に紐づくデッキリンクの取得失敗時に、対象の目標IDをログに記録

2. **行118: 復習対象カード数カウントエラー**
   - **変更前**:
     ```typescript
     console.error("Failed to count due cards:", countError);
     ```
   - **変更後**:
     ```typescript
     logger.error(
       { error: countError, goalId: selectedGoalId, deckIdsCount: deckIds.length },
       "Failed to count due cards"
     );
     ```
   - **コンテキスト**: error, goalId, deckIdsCount
   - **理由**: 復習対象カード数のカウント失敗時に、目標IDと対象デッキ数をログに記録してデバッグを容易に

---

## 実施結果

### 検証結果

- **Lint検証**: ✅ パス(console関連の警告がすべて解消)
- **型エラー**: なし
- **実装パターン**: 全ファイルで統一されたlogger呼び出しパターンを使用

### コンテキストオブジェクトの設計

各エラーログに以下の情報を含めるようにコンテキストを設計:

1. **必須**: error オブジェクト
2. **ユーザー情報**: userId
3. **エンティティ情報**: accountId, goalId, deckTitle
4. **操作パラメータ**: hasAvatarFile, fullName, deckIdsCount
5. **パフォーマンス指標**: deckIdsCount (関連するデッキの数)

### 統一されたメッセージフォーマット

すべてのエラーメッセージを英語で統一:
- "Failed to {verb} {object}" パターン
- 例: "Failed to save profile", "Failed to fetch decks", "Failed to count due cards"

---

## 次のステップ

### Phase 3.7以降の予定

Phase 3の残り作業:
- **Phase 3.7**: Cloze Quiz (1 file, 6 locations)
- **Phase 3.8**: Settings (5 files, ~10 locations)
- **Phase 3.9**: Admin Panel (3 files, ~12 locations)

その他の残作業:
- **Phase 2 (残り)**: Hooks & Libraries (12 files, ~40 locations)
- **Phase 4**: その他・バックアップファイル (7 files, ~10 locations)

### 優先度の判断基準

1. ユーザー向け機能(Phase 3)を優先
2. エラーハンドリングが重要な機能から実施
3. 開発者向け機能(Phase 2)は後回し

---

## 学んだこと

### 技術的な知見

1. **変数名の確認**: selectedFile vs avatarFile のように、変数名は関数のスコープ全体を確認してから使用
2. **ユーザーコンテキスト**: ダッシュボード関連の機能では常にuserIdをログに含める
3. **関連エンティティの数**: deckIdsCountのように関連するエンティティの数をログに含めるとデバッグが容易

### プロセスの改善点

1. **段階的な作業**: 1ファイルずつ処理し、変数名などを確認しながら進めることでミスを防止
2. **一貫性の重視**: Phase 3.5から継続して同じメッセージフォーマットとコンテキスト設計パターンを使用
3. **即座の検証**: Lint警告で変数名のミスや未使用インポートを早期発見

---

## 関連ドキュメント

- [Phase 3.5完了レポート](./20251016_03_phase3-5-notes-complete.md)
- [Phase 3.4完了レポート](./20251016_02_phase3-4-decks-complete.md)
- [Phase 3.3完了レポート](../20251015/20251015_01_phase3-3-complete.md)
- [マイグレーション状況ドキュメント](../20251015/20251015_02_console-to-logger-migration-status.md)
- [実装計画](../../../04_implementation/plans/console-to-logger/20251011_07_migration-plan.md)
