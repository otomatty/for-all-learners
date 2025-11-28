# Repository Specification

## Related Files

- Implementation: `lib/repositories/index.ts`
- Types: `lib/repositories/types.ts`
- Base Repository: `lib/repositories/base-repository.ts`
- Tests: `lib/repositories/__tests__/base-repository.test.ts`

## Related Documentation

- Issue: https://github.com/otomatty/for-all-learners/issues/195
- Parent Issue: https://github.com/otomatty/for-all-learners/issues/189

## Requirements

### 責務

Repository層はデータアクセスを抽象化し、以下の責務を担う：

1. **ローカルDBからのデータ読み取り**
   - ローカルDB（IndexedDB/SQLite）からデータを取得
   - バックグラウンドで同期をトリガー（オプション）

2. **ローカルDBへのデータ書き込み**
   - 作成/更新時に `sync_status: 'pending'` を設定
   - `local_updated_at` を現在時刻に設定
   - バックグラウンドで同期をトリガー

3. **同期関連操作**
   - 同期待ちデータの取得
   - 同期完了マーク付け
   - サーバーからのデータ反映

### 型定義 (types.ts)

#### Repository インターフェース

```typescript
interface Repository<T extends SyncableEntity> {
  // 読み取り
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | undefined>;
  
  // 書き込み（ローカル優先）
  create(entity: Omit<T, 'id' | SyncMetadataKeys>): Promise<T>;
  update(id: string, updates: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
  
  // 同期関連
  getPendingSync(): Promise<T[]>;
  markSynced(id: string, serverUpdatedAt: string): Promise<void>;
  syncFromServer(entities: T[]): Promise<void>;
}
```

#### RepositoryOptions

```typescript
interface RepositoryOptions {
  enableBackgroundSync?: boolean;
  onSyncComplete?: () => void;
}
```

#### RepositoryError

```typescript
class RepositoryError extends Error {
  constructor(
    public code: RepositoryErrorCode,
    message?: string,
    public details?: unknown
  );
}

type RepositoryErrorCode =
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'DB_ERROR'
  | 'SYNC_ERROR';
```

### BaseRepository クラス (base-repository.ts)

#### コンストラクタ

- `RepositoryOptions` を受け取る
- デフォルトで `enableBackgroundSync: true`

#### メソッド

1. **getAll(): Promise<T[]>**
   - ローカルDBから全データを取得
   - `enableBackgroundSync` が true の場合、バックグラウンドで同期をトリガー

2. **getById(id: string): Promise<T | undefined>**
   - 指定IDのデータを取得
   - 見つからない場合は `undefined` を返す

3. **create(entity: Omit<T, 'id' | SyncMetadataKeys>): Promise<T>**
   - 新規エンティティを作成
   - `id` は `crypto.randomUUID()` で生成
   - 同期メタデータを設定:
     - `sync_status: 'pending'`
     - `synced_at: null`
     - `local_updated_at: new Date().toISOString()`
     - `server_updated_at: null`
   - バックグラウンドで同期をトリガー

4. **update(id: string, updates: Partial<T>): Promise<T>**
   - 既存エンティティを更新
   - 存在しない場合は `RepositoryError` をスロー
   - 同期メタデータを更新:
     - `sync_status: 'pending'`
     - `local_updated_at: new Date().toISOString()`
   - バックグラウンドで同期をトリガー

5. **delete(id: string): Promise<boolean>**
   - エンティティを論理削除（sync_status: 'deleted'）
   - バックグラウンドで同期をトリガー

6. **getPendingSync(): Promise<T[]>**
   - `sync_status: 'pending'` または `sync_status: 'deleted'` のデータを取得

7. **markSynced(id: string, serverUpdatedAt: string): Promise<void>**
   - 同期完了マークを付ける
   - `sync_status: 'synced'`
   - `synced_at: new Date().toISOString()`
   - `server_updated_at: serverUpdatedAt`

8. **syncFromServer(entities: T[]): Promise<void>**
   - サーバーから取得したデータをローカルに反映
   - ローカルに存在しない場合は新規作成
   - ローカルが `synced` の場合はサーバーの値で上書き
   - ローカルが `pending` の場合は競合解決ロジックに任せる

## Test Cases

### TC-001: getAll - ローカルDBから全データ取得

- **Given**: ローカルDBに複数のエンティティが存在
- **When**: `getAll()` を実行
- **Then**: 全エンティティの配列が返される

### TC-002: getAll - 空の場合

- **Given**: ローカルDBにエンティティが存在しない
- **When**: `getAll()` を実行
- **Then**: 空の配列が返される

### TC-003: getById - 存在するID

- **Given**: ローカルDBに特定のエンティティが存在
- **When**: `getById(id)` を実行
- **Then**: 該当エンティティが返される

### TC-004: getById - 存在しないID

- **Given**: ローカルDBに該当エンティティが存在しない
- **When**: `getById(id)` を実行
- **Then**: `undefined` が返される

### TC-005: create - 新規エンティティ作成

- **Given**: 新規エンティティのデータ（id, 同期メタデータ除く）
- **When**: `create(entity)` を実行
- **Then**: 
  - 新しいIDが生成される
  - `sync_status: 'pending'` が設定される
  - `synced_at: null` が設定される
  - `local_updated_at` が現在時刻に設定される
  - `server_updated_at: null` が設定される

### TC-006: update - 既存エンティティ更新

- **Given**: ローカルDBに既存エンティティが存在
- **When**: `update(id, updates)` を実行
- **Then**:
  - 指定フィールドが更新される
  - `sync_status: 'pending'` が設定される
  - `local_updated_at` が現在時刻に更新される

### TC-007: update - 存在しないエンティティ

- **Given**: ローカルDBに該当エンティティが存在しない
- **When**: `update(id, updates)` を実行
- **Then**: `RepositoryError` (code: 'NOT_FOUND') がスローされる

### TC-008: delete - エンティティ削除

- **Given**: ローカルDBに既存エンティティが存在
- **When**: `delete(id)` を実行
- **Then**:
  - `true` が返される
  - エンティティの `sync_status` が `'deleted'` に設定される

### TC-009: delete - 存在しないエンティティ

- **Given**: ローカルDBに該当エンティティが存在しない
- **When**: `delete(id)` を実行
- **Then**: `false` が返される

### TC-010: getPendingSync - 同期待ちデータ取得

- **Given**: ローカルDBに `pending` と `synced` のエンティティが混在
- **When**: `getPendingSync()` を実行
- **Then**: `sync_status: 'pending'` のエンティティのみ返される

### TC-011: markSynced - 同期完了マーク

- **Given**: `sync_status: 'pending'` のエンティティが存在
- **When**: `markSynced(id, serverUpdatedAt)` を実行
- **Then**:
  - `sync_status: 'synced'` に更新される
  - `synced_at` が現在時刻に設定される
  - `server_updated_at` が引数の値に設定される

### TC-012: syncFromServer - 新規データの同期

- **Given**: ローカルDBに存在しないエンティティをサーバーから取得
- **When**: `syncFromServer([entity])` を実行
- **Then**: 新規エンティティが `sync_status: 'synced'` で作成される

### TC-013: syncFromServer - 既存データの上書き（synced状態）

- **Given**: ローカルに `sync_status: 'synced'` のエンティティが存在
- **When**: サーバーから新しいデータで `syncFromServer([entity])` を実行
- **Then**: ローカルエンティティがサーバーの値で上書きされる

### TC-014: syncFromServer - pending状態のスキップ

- **Given**: ローカルに `sync_status: 'pending'` のエンティティが存在
- **When**: サーバーから同じIDで `syncFromServer([entity])` を実行
- **Then**: ローカルエンティティは変更されない（競合解決に任せる）

### TC-015: バックグラウンド同期トリガー

- **Given**: `enableBackgroundSync: true` のオプション
- **When**: `create()` を実行
- **Then**: バックグラウンドで `syncManager.sync()` が呼ばれる

### TC-016: バックグラウンド同期無効

- **Given**: `enableBackgroundSync: false` のオプション
- **When**: `create()` を実行
- **Then**: `syncManager.sync()` は呼ばれない

