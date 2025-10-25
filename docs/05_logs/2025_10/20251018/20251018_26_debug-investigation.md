# デバッグ中：[Violation] 'setTimeout' の根本原因調査 - 2025-10-18

## 📋 現状分析

useAutoSave の修正後も [Violation] 'setTimeout' が大量出力されているため、**他の場所から setTimeout が呼ばれている**可能性が高いです。

## 🔍 複数の疑い筋

### 1. resolver-queue

**ファイル**: `lib/tiptap-extensions/unified-link-mark/resolver-queue.ts`

- UnifiedLinkMark の resolver キューが enqueue を大量に呼んでいる可能性
- **修正**: `logger.debug` → `logger.info` に変更して監視

### 2. page-link-preview-mark-plugin

**ファイル**: `lib/tiptap-extensions/page-link-preview-mark-plugin.ts`

- 500ms と 200ms の setTimeout を使用
- マウスオーバー/アウトイベントで登録
- エディタに 1000+ 個のリンクがある場合、マウスイベントが大量発火

### 3. MutationObserver エラー

```
TypeError: Failed to execute 'observe' on 'MutationObserver': parameter 1 is not of type 'Node'.
```

- TipTap 内部で MutationObserver が null オブジェクトに対して observe を試みている
- エラーが何度も発火している可能性

## 🎯 次のステップ

### 1. ブラウザコンソール出力の確認

**強制再読み込みを実施**: `Cmd+Shift+R`

新しいログが表示されるはずです：

```
✅ [ResolverQueue] Adding item to queue {...}
✅ [ResolverQueue] Starting queue processing
```

これらのログの頻度を確認してください。

### 2. ログから診断

**多数の ResolverQueue ログが出ている場合**:

```
[ResolverQueue] Adding item to queue
[ResolverQueue] Adding item to queue
[ResolverQueue] Adding item to queue
```

→ resolver-queue が大量に enqueue している可能性

**ResolverQueue ログが少ない場合**:
→ 別の場所から setTimeout が呼ばれている

### 3. Network タブの確認

- POST リクエストが継続しているか
- リクエスト数が適切か（最初の 1-2 件のみか）

## 🔧 実施した修正

### resolver-queue.ts

```typescript
// Before:
logger.debug(..., "[ResolverQueue] Adding item to queue")

// After:
logger.info(..., "[ResolverQueue] Adding item to queue")
```

**目的**: resolver-queue の enqueue 呼び出し頻度を監視可能にする

## 📊 期待される結果

### 修正前（問題）

```
[Violation] 'setTimeout' handler took 305ms
[Violation] 'setTimeout' handler took 301ms
[Violation] 'setTimeout' handler took 298ms
... (大量に出現)
```

### 修正後（期待値）

```
[ResolverQueue] Adding item to queue {key: "...", variant: "..."}
[ResolverQueue] Starting queue processing
... (適切な量のログ)

→ [Violation] が大幅に減少
```

## 💡 仮説の優先順位

### 高：resolver-queue

- 現在ログが debug で見えない
- 1000 個のページが読み込まれている
- enqueue が大量に呼ばれている可能性

### 中：page-link-preview-mark-plugin

- 固定の 500ms/200ms タイマー
- ただし、mouseover/mouseout イベントに依存

### 低：useAutoSave（既に修正済み）

- 依存配列を修正済み
- 2000ms の適切な間隔

## 🧪 テスト方法

1. **ブラウザ コンソール開く**: F12
2. **強制再読み込み**: Cmd+Shift+R
3. **ページを編集**: エディタをクリック、テキスト入力
4. **ログを監視**:
   - [ResolverQueue] ログの頻度を数える
   - [Violation] メッセージの出現回数を確認
5. **Network タブで POST 監視**

## 📝 重要な注意

- .next キャッシュをクリア済み
- 古いキャッシュが残っている可能性があるため、ブラウザキャッシュも削除を推奨
- iOS/Safari の場合、デベロッパーツールで強制再読み込み

---

**ユーザーからの出力待ち**: 新しいコンソール出力をシェアしてください

```
[ResolverQueue] の呼び出し頻度
[Violation] の出現頻度
Network タブの POST リクエスト数
```

これらの情報から正確な原因を特定できます。
