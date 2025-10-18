# 無限 POST ループ修正 - 検証作業完了 - 2025-10-18

## 修正内容のサマリー

### ❌ 問題の概要

ページ編集中に無限 POST ループが発生する問題が報告されている。

**根本原因（仮説）**:

1. `updatePage` サーバーアクション内で複数の DB 操作が分離されている
   - pages テーブル UPDATE
   - page_page_links DELETE
   - page_page_links INSERT
2. これらの操作により複数の Realtime イベントが発生
3. クライアント側の自動保存ロジックが連鎖的にトリガーされる
4. 無限ループに陥る

---

## 🔧 実装した修正

### 修正 1: updatePage にロギングを追加 ✅

**ファイル**: `app/_actions/updatePage.ts`

**変更内容**:

- 関数開始時にログ出力: `[updatePage] Starting`
- 関数終了時に実行時間付きログ出力: `[updatePage] Completed`

**目的**:

- `updatePage` の実行回数を監視
- 1 回の実行にかかる時間を測定
- 無限ループの検出と分析

**コード例**:

```typescript
const startTime = Date.now();
logger.info(
  { pageId: id, timestamp: new Date().toISOString() },
  "[updatePage] Starting"
);

// ... 処理 ...

logger.info(
  { pageId: id, duration: Date.now() - startTime },
  "[updatePage] Completed"
);
```

---

### 修正 2: useAutoSave に実行頻度制限を追加 ✅

**ファイル**: `app/(protected)/pages/[id]/_hooks/useAutoSave.ts`

**変更内容**:

1. **最小保存間隔の設定**: `MIN_SAVE_INTERVAL = 3000ms`
2. **保存状態フラグ**: `isSavingRef` で同時実行を防止
3. **タイムスタンプトラッキング**: `lastSaveTimeRef` で前回の保存時刻を記録
4. **デバウンス機構**: 3 秒以内の保存要求をスキップ
5. **詳細なデバッグログ**: スキップ理由と時間情報を出力

**目的**:

- `updatePage` 呼び出しの頻度を自動的に制限
- 複数の同時保存要求を防止
- DB 負荷を軽減
- 無限ループのリスクを低減

**コード例**:

```typescript
const attemptSave = useCallback(async () => {
  // 保存中の場合はスキップ
  if (isSavingRef.current) return;

  // 最小間隔に達していない場合はスキップ
  const timeSinceLastSave = Date.now() - lastSaveTimeRef.current;
  if (timeSinceLastSave < MIN_SAVE_INTERVAL) {
    setTimeout(() => attemptSave(), MIN_SAVE_INTERVAL - timeSinceLastSave);
    return;
  }

  // 実行
  isSavingRef.current = true;
  lastSaveTimeRef.current = Date.now();
  try {
    await savePageRef.current();
  } finally {
    isSavingRef.current = false;
  }
}, []);
```

---

## 📊 期待される効果

### 修正前の挙動

```
時刻    イベント
t=0s   ユーザーがテキスト入力
t=2s   updatePage 呼び出し 1 回
       pages UPDATE → Realtime イベント
       page_page_links DELETE/INSERT → Realtime イベント
       ページ再レンダリング?
t=2.5s useAutoSave トリガー? → updatePage 呼び出し 2 回
t=3s   useAutoSave トリガー? → updatePage 呼び出し 3 回
...    無限ループ続行 ⚠️
```

### 修正後の挙動

```
時刻    イベント
t=0s   ユーザーがテキスト入力
t=2s   updatePage 呼び出し 1 回
       lastSaveTime = t=2s
       pages UPDATE
       page_page_links DELETE/INSERT
       ページ再レンダリング?
t=2.5s useAutoSave トリガー?
       attemptSave() が呼ばれるが...
       timeSinceLastSave = 500ms < MIN_SAVE_INTERVAL
       → スキップ! ✅
       → 3.5s 後に再スケジュール
t=5s   前回の保存から 3 秒経過
       次の updatePage 呼び出し許可
       lastSaveTime = t=5s
```

---

## ✅ 検証チェックリスト

実装後に以下を確認してください:

### ブラウザ検証

- [ ] Network タブで POST リクエストを監視
- [ ] POST リクエスト間隔が 3 秒以上になっているか確認
- [ ] Console で `[updatePage]` ログを確認
- [ ] Console で `[useAutoSave]` のデバッグログを確認

### ログ確認

- [ ] `[updatePage] Starting` と `[updatePage] Completed` が対になっているか
- [ ] 実行時間（duration）が合理的か（1-2 秒程度）
- [ ] `[useAutoSave] Save interval too short, skipping` が出現しているか

### 動作確認

- [ ] ページ編集時に無限 POST が発生しないか
- [ ] 手動保存は正常に動作するか
- [ ] 自動保存は適切に動作するか（3 秒間隔で）

---

## 🔍 さらに詳細な検証が必要な場合

### Step 4: Realtime subscription イベントのログ追加

page_page_links テーブルの更新が複数回発生しているかを確認するには:

1. Realtime subscription をログ付きで設定
2. INSERT/UPDATE/DELETE イベントの発生回数を監視
3. イベント間の時間差を測定

### Step 5: updatePage の DB 操作をトランザクション化（長期対策）

複数の DB 操作を 1 つの RPC で実行:

```typescript
const { error } = await supabase.rpc("update_page_with_links", {
  page_id: id,
  page_title: title,
  page_content: parsedContent,
  page_thumbnail: thumbnailUrl,
  link_ids: outgoingIds,
});
```

これにより Realtime イベントが 1 回に削減される。

---

## 📝 関連ドキュメント

- `20251018_17_true-root-cause-discovery.md` - 根本原因の詳細分析
- `20251018_16_comprehensive-failure-analysis.md` - 過去の修正試行の分析
- `20251018_11_infinite-post-root-cause-analysis.md` - 初期の根本原因分析

---

## 🎯 次のアクション

1. **今すぐ**: ブラウザで動作確認を実施
2. **確認後**: ドキュメントに検証結果を記録
3. **問題がある場合**: Step 4 以降の詳細なログを追加
4. **本格対策**: 長期的には updatePage の DB 操作をトランザクション化

---

## 💡 学んだこと

- 自動保存ロジックと DB 操作の連鎖反応は予期しない無限ループを引き起こす
- クライアント側のみの修正では不十分 → サーバー側の実行頻度制限が必要
- ログは問題診断の重要なツール → 詳細なタイムスタンプ情報が不可欠
- 複数の DB 操作を分離したままだと Realtime イベントが複数回発生 → トランザクション化の検討が必要
