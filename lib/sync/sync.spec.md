# Sync Module Specification

## Related Files

- Implementation:
  - `lib/sync/types.ts` - 型定義
  - `lib/sync/sync-manager.ts` - 同期マネージャー
  - `lib/sync/conflict-resolver.ts` - 競合解決ロジック
  - `lib/sync/sync-queue.ts` - 同期キュー
  - `lib/sync/sync-triggers.ts` - 同期トリガー
  - `lib/sync/index.ts` - エントリーポイント
- Tests:
  - `lib/sync/__tests__/sync-manager.test.ts`
  - `lib/sync/__tests__/conflict-resolver.test.ts`
  - `lib/sync/__tests__/sync-queue.test.ts`

## Related Documentation

- Issue: https://github.com/otomatty/for-all-learners/issues/193 (同期マネージャー)
- Issue: https://github.com/otomatty/for-all-learners/issues/194 (競合解決ロジック)
- Plan: `docs/03_plans/tauri-migration/20251109_01_implementation-plan.md`
- Dependencies:
  - `lib/db/hybrid-client.ts` - ローカルDBクライアント
  - `lib/supabase/client.ts` - Supabaseクライアント

## Requirements

### 責務

1. **SyncManager** - ローカルDBとSupabaseの同期を管理
   - ローカルの変更をサーバーにプッシュ
   - サーバーの変更をローカルにプル
   - ネットワーク状態の監視
   - 定期同期の管理
   - イベント通知

2. **ConflictResolver** - 競合解決（Last Write Wins）
   - ローカルとサーバーのデータを比較
   - 最新のデータを採用
   - 同時刻の場合はローカル優先

3. **SyncQueue** - オフライン時の変更をキューに保存
   - FIFO（先入れ先出し）で処理
   - リトライ機能
   - localStorage に永続化

4. **SyncTriggers** - 同期を実行するタイミングを管理
   - ページ表示時
   - フォーカス時
   - 定期同期

### 同期フロー

```
┌─────────────────────────────────────────────────────────────┐
│                      同期フロー                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. ローカル変更のプッシュ                                   │
│     ├─ sync_status = 'pending' のエンティティを取得          │
│     ├─ サーバーの現在の状態を取得                            │
│     ├─ 競合解決（LWW）                                       │
│     │   ├─ ローカルが新しい → サーバーを更新                 │
│     │   └─ サーバーが新しい → ローカルを更新                 │
│     └─ sync_status = 'synced' に更新                         │
│                                                              │
│  2. サーバー変更のプル                                       │
│     ├─ サーバーから全エンティティを取得                      │
│     ├─ ローカルに存在しない → 新規作成                       │
│     └─ サーバーが新しい → ローカルを更新                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 競合解決フロー（LWW）

```
┌─────────────────────────────────────────────────────────────┐
│                 競合解決フロー（LWW）                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ローカル変更あり (sync_status = 'pending')                  │
│        │                                                     │
│        ▼                                                     │
│  サーバーから現在の状態を取得                                │
│        │                                                     │
│        ▼                                                     │
│  ┌─────────────────────────────────────────┐                │
│  │ local_updated_at vs server_updated_at   │                │
│  └──────────────────┬──────────────────────┘                │
│                     │                                        │
│         ┌───────────┴───────────┐                           │
│         ▼                       ▼                           │
│  ┌─────────────┐        ┌─────────────┐                     │
│  │ ローカルが新しい │        │ サーバーが新しい │                     │
│  └──────┬──────┘        └──────┬──────┘                     │
│         │                       │                           │
│         ▼                       ▼                           │
│  サーバーを更新            ローカルを更新                    │
│  sync_status='synced'     sync_status='synced'              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 同期トリガー

| トリガー | 動作 |
|---------|------|
| アプリ起動時 | ネットワーク確認 → 同期実行 |
| ネットワーク復帰時 | 自動同期 |
| 5分間隔 | バックグラウンド同期 |
| データ変更時 | sync_status を 'pending' に設定 |
| 手動実行 | ユーザーが同期ボタンを押下 |
| ページ表示時 | ネットワーク確認 → 同期実行 |

### 状態管理

```typescript
type SyncState = 'idle' | 'syncing' | 'error' | 'offline' | 'paused';

interface SyncManagerState {
  state: SyncState;
  isOnline: boolean;
  lastSyncAt: string | null;
  lastSyncResult: SyncResult | null;
  pendingCount: number;
  errorMessage: string | null;
}
```

### イベント

```typescript
type SyncEventType =
  | 'sync_started'
  | 'sync_completed'
  | 'sync_failed'
  | 'push_started'
  | 'push_completed'
  | 'pull_started'
  | 'pull_completed'
  | 'conflict_resolved'
  | 'network_online'
  | 'network_offline';
```

## Test Cases

### ConflictResolver

#### TC-001: resolve - ローカルが新しい場合
- Given: ローカルの local_updated_at がサーバーより新しい
- When: resolve(local, server) を実行
- Then: 'local' を返す

#### TC-002: resolve - サーバーが新しい場合
- Given: サーバーの server_updated_at がローカルより新しい
- When: resolve(local, server) を実行
- Then: 'server' を返す

#### TC-003: resolve - 同時刻の場合
- Given: ローカルとサーバーの更新日時が同じ
- When: resolve(local, server) を実行
- Then: 'local' を返す（ローカル優先）

#### TC-004: merge - ローカルが勝った場合
- Given: ローカルが新しい
- When: merge(local, server) を実行
- Then: ローカルデータを返し、sync_status は 'pending'

#### TC-005: merge - サーバーが勝った場合
- Given: サーバーが新しい
- When: merge(local, server) を実行
- Then: サーバーデータを返し、sync_status は 'synced'

#### TC-006: isServerNewer
- Given: サーバーの更新日時がローカルより新しい
- When: isServerNewer(local, serverUpdatedAt) を実行
- Then: true を返す

#### TC-007: hasLocalChanges - 変更あり
- Given: local_updated_at が synced_at より後
- When: hasLocalChanges(entity) を実行
- Then: true を返す

#### TC-008: hasLocalChanges - 変更なし
- Given: local_updated_at が synced_at より前
- When: hasLocalChanges(entity) を実行
- Then: false を返す

### SyncQueue

#### TC-009: enqueue - 新規追加
- Given: 空のキュー
- When: enqueue('notes', 'create', 'note-1', data) を実行
- Then: キューにアイテムが追加される

#### TC-010: enqueue - create → update のマージ
- Given: create 済みのアイテムがある
- When: 同じエンティティに対して update を enqueue
- Then: 操作は create のまま、データは更新

#### TC-011: enqueue - delete で上書き
- Given: create または update 済みのアイテムがある
- When: 同じエンティティに対して delete を enqueue
- Then: 操作は delete に変更

#### TC-012: dequeue
- Given: 複数のアイテムがあるキュー
- When: dequeue() を実行
- Then: 先頭のアイテムを返し、キューから削除

#### TC-013: retry
- Given: リトライ回数 < maxRetries
- When: retry(id) を実行
- Then: リトライ回数が増加し、キューの最後に移動

#### TC-014: retry - 最大回数到達
- Given: リトライ回数 >= maxRetries
- When: retry(id) を実行
- Then: アイテムが削除され、false を返す

#### TC-015: 永続化
- Given: アイテムを追加
- When: 新しい SyncQueue インスタンスを作成
- Then: localStorage からキューが復元される

### SyncManager

#### TC-016: sync - 未初期化
- Given: initialize() が呼ばれていない
- When: sync() を実行
- Then: エラー結果を返す

#### TC-017: sync - オフライン
- Given: navigator.onLine = false
- When: sync() を実行
- Then: エラー結果を返す

#### TC-018: start / stop
- Given: 初期化済みの SyncManager
- When: start() → stop() を実行
- Then: 定期同期が開始・停止される

#### TC-019: addEventListener
- Given: SyncManager インスタンス
- When: addEventListener(listener) を実行
- Then: イベント発火時にリスナーが呼ばれる

#### TC-020: ネットワーク復帰時の同期
- Given: オフライン状態
- When: オンラインに復帰
- Then: 自動的に sync() が実行される

## Usage Example

```typescript
import { syncManager, setupSyncTriggers } from '@/lib/sync';
import { createClient } from '@/lib/supabase/client';

// 初期化
const supabase = createClient();
await syncManager.initialize(supabase, userId);

// イベントリスナーを追加
const removeListener = syncManager.addEventListener((event) => {
  console.log('Sync event:', event.type);
});

// 同期トリガーを設定
const cleanup = setupSyncTriggers(syncManager, {
  syncOnVisibilityChange: true,
  enablePeriodicSync: true,
});

// 手動同期
const result = await syncManager.sync();
console.log('Sync result:', result);

// 状態を取得
const state = syncManager.getState();
console.log('Pending count:', state.pendingCount);

// クリーンアップ
cleanup();
removeListener();
syncManager.dispose();
```

