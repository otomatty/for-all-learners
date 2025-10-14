# 20251013 作業ログ - ブラケット記法リンク解決デバッグログ追加

## 作業概要

ブラケット記法のリンク判定がリアルタイムで反映されない問題を調査するため、デバッグログを追加しました。

**作業開始**: 2025-10-13  
**優先度**: 高  
**対象ファイル**:

- `lib/tiptap-extensions/unified-link-mark/input-rules/bracket-rule.ts`
- `lib/tiptap-extensions/unified-link-mark/resolver-queue.ts`
- `lib/tiptap-extensions/unified-link-mark/state-manager.ts`

---

## 問題の状況

### 現象

1. ブラケット記法 `[ページタイトル]` でテキストを入力
2. InputRule が発動して UnifiedLinkMark に変換される
3. **しかし、リンクの状態（exists/missing）がリアルタイムで反映されない**
4. ページを再読み込みすると、正しい状態で表示される

### 期待される動作

- `[既存ページ]` と入力 → 即座に青色（exists）リンクとして表示
- `[未作成ページ]` と入力 → 即座に赤色（missing）リンクとして表示

---

## 実装した修正

### 1. InputRule にデバッグログを追加

**ファイル**: `lib/tiptap-extensions/unified-link-mark/input-rules/bracket-rule.ts`

#### 追加したログ

```typescript
// logger import を追加
import logger from "../../../logger";

// Resolverキューへの追加ログ
if (!isExternal) {
  logger.debug(
    { key, raw, markId, variant: "bracket" },
    "[BracketInputRule] Enqueueing resolve for bracket link"
  );
  enqueueResolve({
    key,
    raw,
    markId,
    editor: context.editor,
    variant: "bracket",
  });
} else {
  logger.debug(
    { raw, markId },
    "[BracketInputRule] External link detected, skipping resolution"
  );
}
```

**確認ポイント**:

- InputRule が正しく発動しているか
- `enqueueResolve`が呼ばれているか
- `key`と`markId`が正しく生成されているか

---

### 2. ResolverQueue にデバッグログを追加

**ファイル**: `lib/tiptap-extensions/unified-link-mark/resolver-queue.ts`

#### 追加したログ

**キューへの追加時**:

```typescript
add(item: ResolverQueueItem): void {
  logger.debug(
    { key: item.key, markId: item.markId, variant: item.variant },
    "[ResolverQueue] Adding item to queue",
  );
  this.queue.push(item);

  if (!this.isRunning) {
    logger.debug("[ResolverQueue] Starting queue processing");
    void this.process();
  }
}
```

**解決処理の開始時**:

```typescript
private async resolveItem(item: ResolverQueueItem): Promise<void> {
  const { key, raw, markId, editor, variant = "bracket" } = item;

  logger.debug(
    { key, raw, markId, variant },
    "[ResolverQueue] Starting resolution",
  );
  // ...
}
```

**解決結果のログ**:

```typescript
// ページが見つからない場合
if (results.length === 0) {
  logger.debug(
    { key, raw, markId },
    "[ResolverQueue] No pages found - marking as MISSING"
  );
  // ...
}

// 完全一致が見つかった場合
if (exact) {
  logger.debug(
    { key, raw, markId, pageId: exact.id, title: exact.title },
    "[ResolverQueue] Exact match found - marking as EXISTS"
  );
  // ...
}

// 完全一致が見つからない場合
else {
  logger.debug(
    { key, raw, markId, resultsCount: results.length },
    "[ResolverQueue] No exact match found - marking as MISSING"
  );
  // ...
}
```

**確認ポイント**:

- Resolver キューに正しく追加されているか
- ページ検索が実行されているか
- 検索結果が正しく処理されているか

---

### 3. StateManager にデバッグログを追加

**ファイル**: `lib/tiptap-extensions/unified-link-mark/state-manager.ts`

#### 追加したログ

```typescript
export function updateMarkState(
  editor: Editor,
  markId: string,
  updates: Partial<UnifiedLinkAttributes>
): void {
  logger.debug({ markId, updates }, "[StateManager] updateMarkState called");

  try {
    // ... マーク検索と更新処理

    if (changed) {
      logger.debug(
        { markId, foundMarks, updates },
        "[StateManager] Dispatching state update"
      );
      dispatch(tr);
    } else {
      logger.warn(
        { markId, foundMarks },
        "[StateManager] No marks found to update"
      );
    }
  } catch (error) {
    logger.error({ error }, "Failed to update mark state");
  }
}
```

**確認ポイント**:

- `updateMarkState`が呼ばれているか
- `markId`で該当するマークが見つかっているか
- `dispatch(tr)`でエディタの状態が更新されているか

---

## デバッグ方法

### 1. ログレベルの設定

開発環境では、`LOG_LEVEL=debug`が設定されているため、すべてのデバッグログが出力されます。

**確認**:

```bash
# .env.local または環境変数
LOG_LEVEL=debug
```

### 2. ブラウザコンソールでログを確認

1. ブラウザの開発者ツールを開く（F12）
2. Console タブを選択
3. フィルターで`[BracketInputRule]`や`[ResolverQueue]`を検索

### 3. 期待されるログの流れ

正常に動作している場合、以下のようなログが出力されるはずです:

```
[BracketInputRule] Enqueueing resolve for bracket link
  { key: "test-page", raw: "テストページ", markId: "unilink-...", variant: "bracket" }

[ResolverQueue] Adding item to queue
  { key: "test-page", markId: "unilink-...", variant: "bracket" }

[ResolverQueue] Starting queue processing

[ResolverQueue] Starting resolution
  { key: "test-page", raw: "テストページ", markId: "unilink-...", variant: "bracket" }

[ResolverQueue] Exact match found - marking as EXISTS
  { key: "test-page", raw: "テストページ", markId: "unilink-...", pageId: "xxx", title: "テストページ" }

[StateManager] updateMarkState called
  { markId: "unilink-...", updates: { state: "exists", exists: true, pageId: "xxx", href: "/pages/xxx" } }

[StateManager] Dispatching state update
  { markId: "unilink-...", foundMarks: 1, updates: { ... } }
```

---

## 想定される問題パターン

### パターン 1: InputRule が発動していない

**症状**: `[BracketInputRule]`のログが出力されない

**原因**:

- InputRule のパターンマッチが失敗
- ブラケットが閉じていない
- コードブロック内で入力している

**対応**: InputRule のパターン検証

---

### パターン 2: Resolver キューに追加されていない

**症状**: `[ResolverQueue] Adding item to queue`のログが出力されない

**原因**:

- `enqueueResolve`が呼ばれていない
- 外部リンクと判定されている

**対応**: InputRule 内の`isExternal`判定を確認

---

### パターン 3: ページ検索が失敗

**症状**: `[ResolverQueue] Starting resolution`の後にエラーログ

**原因**:

- `searchPages` API が失敗
- ネットワークエラー
- データベース接続エラー

**対応**: API 呼び出しとエラーハンドリングを確認

---

### パターン 4: マークが見つからない

**症状**: `[StateManager] No marks found to update`の警告

**原因**:

- `markId`が一致しない
- マークが既に削除されている
- マークタイプ名が間違っている（`unilink` vs `unifiedLink`）

**対応**:

- マークタイプ名を確認（現在は`unilink`）
- `markId`の生成と保存を確認

---

### パターン 5: dispatch が失敗

**症状**: `[StateManager] Dispatching state update`の後も表示が変わらない

**原因**:

- トランザクションの適用が失敗
- エディタの状態が無効
- レンダリング層の問題

**対応**:

- エディタのトランザクション処理を確認
- レンダリング関数を確認

---

## 次のステップ

### 1. ログの確認

実際にブラケット記法でリンクを作成して、コンソールログを確認してください。

### 2. 問題の特定

上記のログパターンと照らし合わせて、どの段階で問題が発生しているか特定してください。

### 3. 修正の実施

特定した問題に応じて、該当箇所を修正してください。

---

## その他の修正

### Biome 警告の修正

1. **未使用 import 削除**:

   - `lib/tiptap-extensions/unified-link-mark/plugins/__tests__/suggestion-plugin.test.ts`
   - `import type { Editor }`を削除

2. **未使用変数削除**:
   - `lib/tiptap-extensions/unified-link-mark/resolver-queue.ts`
   - `processItem`関数の`variant`変数を削除

---

## 関連ドキュメント

- [ブラケット記法仕様修正](./20251013_03_bracket-suggestion-specification-fix.md)
- [サジェスト候補表示条件修正](./20251013_04_bracket-suggestion-display-condition.md)
- [InputRule 実装](../../../lib/tiptap-extensions/unified-link-mark/input-rules/bracket-rule.ts)
- [ResolverQueue 実装](../../../lib/tiptap-extensions/unified-link-mark/resolver-queue.ts)
- [StateManager 実装](../../../lib/tiptap-extensions/unified-link-mark/state-manager.ts)

---

## 作成日時

- 作成: 2025-10-13
- 最終更新: 2025-10-13
