# Week 4: Repository層の実装

## 日付

2025-11-26

## 概要

Week 4のPhase Cとして、Repository基盤クラスとエンティティ別Repositoryを実装しました。
テスト駆動開発（TDD）の方針に従い、仕様書→テスト→実装の順序で進めました。

## 完了したIssue

- [x] #195 Repository基盤クラスの実装
- [x] #196 Notes/Pages Repositoryの実装
- [x] #197 Decks/Cards Repositoryの実装

## 実装内容

### 1. Repository基盤 (#195)

#### ファイル構成

```
lib/repositories/
├── types.ts                    # 型定義・インターフェース
├── base-repository.ts          # 基盤クラス
├── index.ts                    # エクスポート
├── repository.spec.md          # 仕様書
└── __tests__/
    ├── helpers.ts              # テストヘルパー
    └── base-repository.test.ts # 16テストケース
```

#### 主要な機能

- `BaseRepository<T>` 抽象クラス
  - CRUD操作（getAll, getById, create, update, delete）
  - 同期操作（getPendingSync, markSynced, syncFromServer）
  - バックグラウンド同期トリガー
  - 同期メタデータ自動設定（sync_status, local_updated_at等）

- `RepositoryError` クラス
  - エラーコード: NOT_FOUND, VALIDATION_ERROR, DB_ERROR, SYNC_ERROR
  - i18n対応準備（エラーコード方式）

### 2. Notes Repository (#196)

#### ファイル

- `lib/repositories/notes-repository.ts`
- `lib/repositories/notes-repository.spec.md`
- `lib/repositories/__tests__/notes-repository.test.ts` (6テスト)

#### 固有メソッド

- `getBySlug(userId, slug)`: スラッグでノート取得
- `getDefaultNote(userId)`: デフォルトノート取得

### 3. Pages Repository (#196)

#### ファイル

- `lib/repositories/pages-repository.ts`
- `lib/repositories/pages-repository.spec.md`
- `lib/repositories/__tests__/pages-repository.test.ts` (5テスト)

#### 固有メソッド

- `getByNoteId(noteId)`: ノート内ページ一覧
- `updateMetadata(id, updates)`: メタデータのみ更新

#### 注意点

`content_tiptap` はリアルタイム同期（Yjs）で管理されるため、ローカルDBには保存しない設計。

### 4. Decks Repository (#197)

#### ファイル

- `lib/repositories/decks-repository.ts`
- `lib/repositories/decks-repository.spec.md`
- `lib/repositories/__tests__/decks-repository.test.ts` (3テスト)

### 5. Cards Repository (#197)

#### ファイル

- `lib/repositories/cards-repository.ts`
- `lib/repositories/cards-repository.spec.md`
- `lib/repositories/__tests__/cards-repository.test.ts` (5テスト)

#### 固有メソッド

- `getByDeckId(deckId)`: デッキ内カード一覧
- `getDueCards(userId)`: 復習対象カード取得
- `updateReviewResult(id, result)`: FSRS結果更新
- `createBatch(userId, payloads)`: カード一括作成

#### FSRS初期値

```typescript
ease_factor: 2.5
repetition_count: 0
review_interval: 0
next_review_at: null
stability: 0
difficulty: 0
last_reviewed_at: null
```

## テスト結果

```
 ✓ lib/repositories/__tests__/base-repository.test.ts (16 tests)
 ✓ lib/repositories/__tests__/notes-repository.test.ts (6 tests)
 ✓ lib/repositories/__tests__/pages-repository.test.ts (5 tests)
 ✓ lib/repositories/__tests__/decks-repository.test.ts (3 tests)
 ✓ lib/repositories/__tests__/cards-repository.test.ts (5 tests)

 Test Files  5 passed (5)
      Tests  35 passed (35)
```

## 使用例

```typescript
import { notesRepository, cardsRepository } from '@/lib/repositories';

// ノート取得
const notes = await notesRepository.getAll(userId);
const defaultNote = await notesRepository.getDefaultNote(userId);

// カード作成
const card = await cardsRepository.create(userId, {
  deck_id: 'deck-1',
  front_content: { type: 'doc', content: [...] },
  back_content: { type: 'doc', content: [...] },
});

// 復習結果更新
await cardsRepository.updateReviewResult(cardId, {
  ease_factor: 2.7,
  repetition_count: 1,
  review_interval: 1,
  next_review_at: '2025-12-01T00:00:00Z',
  stability: 1.5,
  difficulty: 0.3,
  last_reviewed_at: new Date().toISOString(),
});
```

## 次のステップ

Week 5以降:
- #198 既存フックのRepository移行
- フック層でRepositoryを使用するように変更
- UIコンポーネントとの統合

## 関連ドキュメント

- [DEVELOPMENT_SCHEDULE.md](../../../DEVELOPMENT_SCHEDULE.md)
- [Epic Issue #189](https://github.com/otomatty/for-all-learners/issues/189)

