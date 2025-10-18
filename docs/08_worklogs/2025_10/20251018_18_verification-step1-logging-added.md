# 無限 POST ループ - 検証 Step 1-3: ロギング追加と実行頻度制限 - 2025-10-18

## 実施内容

### Step 1: updatePage にロギング追加 ✅ 完了

`app/_actions/updatePage.ts` に以下のログを追加:

**変更箇所**:

```typescript
// 関数開始時
logger.info(
  { pageId: id, timestamp: new Date().toISOString() },
  "[updatePage] Starting"
);

// 関数完了時
logger.info(
  { pageId: id, duration: Date.now() - startTime },
  "[updatePage] Completed"
);
```

**効果**:

- `updatePage` が何回実行されているか監視可能
- 1 回の実行にどのくらい時間がかかっているか測定可能
- データベース操作の完了時間が明確になる

---

### Step 2: Realtime subscription イベントのログ追加 🔍 調査中

**発見**:

- edit-page-form.tsx では直接的な Realtime subscription が見当たらない
- page prop の更新メカニズムが明確でない
- 可能性: サーバーコンポーネント経由での自動再フェッチ?

**確認待ち**:

- [ ] ブラウザの Network タブで POST リクエストを監視
- [ ] ブラウザの Console で `[updatePage]` ログを確認
- [ ] POST リクエスト間隔の測定

---

### Step 3: 修正 C - updatePage の実行頻度を制限 ✅ 完了

`app/(protected)/pages/[id]/_hooks/useAutoSave.ts` に実行頻度制限を追加:

**変更内容**:

1. **最小保存間隔の設定**: `MIN_SAVE_INTERVAL = 3000ms` (3 秒)
2. **保存状態トラッキング**: `isSavingRef` で同時実行を防止
3. **デバウンス機構**: 前回の保存から 3 秒以下の場合、スキップ
4. **詳細なログ出力**: スキップ理由とタイムスタンプを記録

**ログ出力例**:

```
[useAutoSave] Save already in progress, skipping
[useAutoSave] Save interval too short, skipping (timeSinceLastSave: 1500ms)
[useAutoSave] Attempting save
```

**効果**:

- `updatePage` の呼び出し頻度を自動的に制限
- 複数の同時保存要求をフィルタリング
- DB 負荷の軽減と無限ループのリスク低減

---

## コード変更のポイント

### useAutoSave.ts での修正

```typescript
// 修正前: 2 秒ごとに savePage() が呼ばれる可能性がある
setTimeout(() => {
  void savePageRef.current();
}, 2000);

// 修正後: 最小 3 秒間隔で実行を制限
const attemptSave = useCallback(async () => {
  if (isSavingRef.current) return; // 保存中はスキップ

  const timeSinceLastSave = Date.now() - lastSaveTimeRef.current;
  if (timeSinceLastSave < MIN_SAVE_INTERVAL) {
    // 最小間隔に達するまで再スケジュール
    setTimeout(() => attemptSave(), MIN_SAVE_INTERVAL - timeSinceLastSave);
    return;
  }

  // 実行
  await savePageRef.current();
}, []);
```

---

## 無限ループの予防

### シナリオ: 修正前（問題あり）

```
t=0s:   ユーザーがテキスト入力
t=2s:   useAutoSave → updatePage() 呼び出し 1 回目
        pages UPDATE → Realtime イベント?
        page_page_links DELETE/INSERT
        → ページ再レンダリング?
        → useAutoSave トリガー?
t=4s:   updatePage() 呼び出し 2 回目（可能性）
t=6s:   updatePage() 呼び出し 3 回目（可能性）
...     無限ループ続行
```

### シナリオ: 修正後（改善）

```
t=0s:   ユーザーがテキスト入力
t=2s:   useAutoSave → attemptSave()
        → updatePage() 呼び出し 1 回目
        lastSaveTimeRef = t=2s
        pages UPDATE
        page_page_links DELETE/INSERT
        → ページ再レンダリング?
        → useAutoSave トリガー?
t=2.5s: attemptSave() スキップ（MIN_SAVE_INTERVAL: 3s未満）
t=5s:   次の保存が許可される
```

---

## 次のステップ

### Step 4: ブラウザで検証（必須）

1. **Network タブ**:

   - POST リクエストの頻度を監視
   - リクエスト間隔が 3 秒以上か確認

2. **Console**:

   - `[updatePage]` ログを確認
   - `[useAutoSave]` のデバッグログを確認

3. **期待値**:
   - POST が無限に続かない
   - updatePage の呼び出しが制限される
   - ユーザーが編集中のみ保存が実行される

---

## 関連ドキュメント

- `20251018_17_true-root-cause-discovery.md` - 根本原因の仮説と修正案
- `20251018_16_comprehensive-failure-analysis.md` - 過去の修正試行と失敗分析
