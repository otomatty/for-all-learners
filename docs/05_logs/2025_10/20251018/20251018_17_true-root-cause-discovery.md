# 無限 POST ループ - 真の根本原因の発見 - 2025-10-18 最終

## 🔴 緊急発見

`updatePage` アクション内で **複数のデータベース操作** が行われており、これが **Realtime subscription の連鎖反応** を引き起こしている可能性が **極めて高い**。

---

## updatePage アクションの構造分析

### 現在のコード（`app/_actions/updatePage.ts`）

```typescript
export async function updatePage({
  id,
  title,
  content,
  autoGenerateThumbnail = true,
  forceRegenerateThumbnail = false,
  enableSmartThumbnailUpdate = true,
}: UpdatePageParams) {
  // 1) ページ情報取得
  const { data: currentPage, error: fetchErr } = await supabase
    .from("pages")
    .select("thumbnail_url")
    .eq("id", id)
    .single();

  // 2) サムネイル更新ロジック
  let thumbnailUrl: string | null = currentPage.thumbnail_url;
  if (autoGenerateThumbnail) {
    /* ... */
  }

  // ❌ ここで pages テーブルが UPDATE される
  const { error: pageErr } = await supabase
    .from("pages")
    .update({
      title,
      content_tiptap: parsedContent,
      thumbnail_url: thumbnailUrl,
    })
    .eq("id", id);

  // ❌ ここで page_page_links テーブルが DELETE される
  await supabase.from("page_page_links").delete().eq("page_id", id);

  // ❌ ここで page_page_links テーブルが INSERT される
  if (outgoingIds.length > 0) {
    const { error: linksErr } = await supabase.from("page_page_links").insert(
      outgoingIds.map((linked_id) => ({
        page_id: id,
        linked_id,
      }))
    );
  }

  return { success: true };
}
```

---

## 無限ループの真のメカニズム

### シナリオ: Realtime subscription による複合連鎖反応

```
Step 1: ユーザーがテキストを入力（2秒後）
  ↓
Step 2: useAutoSave が savePage() 呼び出し
  ↓
Step 3: updatePage Server Action 実行
  ↓
Step 4a: pages テーブル UPDATE
   └─ Supabase Realtime が UPDATE イベント検知
      └─ クライアント subscription が反応
         └─ page prop が更新される
            └─ edit-page-form.tsx が再レンダリング
               └─ useEditorInitializer が再実行 ← 修正 11a で防止したはず
  ↓
Step 4b: page_page_links テーブル DELETE + INSERT
   └─ Supabase Realtime が DELETE/INSERT イベント検知
      └─ 親ページの subscription も反応する可能性
         └─ 複数の subscription が相互作用
  ↓
Step 5: subscription による更新イベント
  ↓
Step 6: edit-page-form の再レンダリング
  ↓
Step 7: useAutoSave が何らかの理由で再度 savePage() 呼び出し
  ↓
🔄 ステップ 3 に戻る

結果: 無限ループ
```

---

## 問題の根本的な原因

### 原因 1: Realtime subscription の過度な反応 🔴 最有力

**問題の定義**:

- `pages` テーブルの UPDATE イベント
- `page_page_links` テーブルの UPDATE イベント
- この 2 つが連鎖してクライアント側の再レンダリングを引き起こす

**リスク**:

- `page_page_links` テーブルが 1 万件以上ある場合、INSERT/DELETE に時間がかかる
- その間に複数の subscription イベントが発生する可能性

---

### 原因 2: useAutoSave の再トリガー 🟠

**問題の定義**:

- Realtime subscription でページが再レンダリングされる
- useAutoSave の依存配列が変わる可能性
- 不要に savePage() が再度呼ばれる

**修正 10a では対応していない点**:

- useAutoSave の修正は `savePage` 参照の安定化のみ
- しかし、**Realtime による再レンダリングそのもの** は防いでいない

---

### 原因 3: editor インスタンスの再作成 🟠

**問題の定義**:

- Realtime subscription でページが再レンダリング
- editor インスタンスが何度も作られる
- その度に useEditorInitializer が実行される

**修正 11a では対応していない点**:

- userId 依存の除外のみ
- しかし、**editor インスタンス自体の参照が変わること** は防いでいない

---

## クライアント側の修正が無効だった理由

### なぜ修正がすべて失敗したのか

```
修正の想定:
  ページ再レンダリング → useEditorInitializer が再実行されない
  ↓
  preloadPageTitles が呼ばれない
  ↓
  無限ループ停止

実際に起こっていること:
  Realtime subscription → ページが何度も再レンダリング（修正ではクライアント側の再レンダリングは防げない）
  ↓
  editor インスタンスが何度も作られる
  ↓
  savePage が何度も呼ばれる ← useAutoSave の修正では防げない
  ↓
  updatePage が何度も実行
  ↓
  page_page_links が何度も DELETE/INSERT ← DB 操作の回数は変わらない
  ↓
  🔄 無限ループ継続
```

**重要な気付き**: クライアント側の修正では、**Realtime subscription による再レンダリング自体は防げない**

---

## 本当に必要な修正

### 修正 A: updatePage 内の複数 DB 操作をトランザクション化 🔴 Critical

**現在の問題**:

- pages テーブル UPDATE
- page_page_links DELETE
- page_page_links INSERT
- これら 3 つの操作が分離されている

**修正案**:

```typescript
export async function updatePage({
  id,
  title,
  content,
  autoGenerateThumbnail = true,
  forceRegenerateThumbnail = false,
  enableSmartThumbnailUpdate = true,
}: UpdatePageParams) {
  const supabase = await createClient();

  // トランザクション開始（複数の操作を原子的に実行）
  const { outgoingIds } = extractLinkData(parsedContent);

  // サムネイル更新ロジック省略...

  // 複数の操作を RPC (Remote Procedure Call) で一度に実行
  // または、rpc で実行するようなストアドプロシージャを作成

  const { error } = await supabase.rpc("update_page_with_links", {
    page_id: id,
    page_title: title,
    page_content: parsedContent,
    page_thumbnail: thumbnailUrl,
    link_ids: outgoingIds,
  });

  if (error) throw error;

  return { success: true };
}
```

**効果**:

- 複数の DB 操作が 1 つの操作として実行される
- Realtime イベントが複数発生しない（理想的には 1 回のみ）
- サーバー側の DB 操作の最適化

---

### 修正 B: Realtime subscription の最適化（クライアント側）🟠 High

**現在の問題**:

- page 変更で即座にクライアント再レンダリング
- editor インスタンスが再作成される

**修正案**:

```typescript
// edit-page-form.tsx
const [isRemoteUpdate, setIsRemoteUpdate] = useState(false);

useEffect(() => {
  // Realtime subscription でページが更新された場合、
  // ローカル編集ではない場合のみ再レンダリング
  if (isRemoteUpdate) {
    // リモート更新の場合、少し待機してから再レンダリング
    const timer = setTimeout(() => {
      setIsRemoteUpdate(false);
    }, 1000); // 1 秒待機（他のリモート更新を受け付ける）

    return () => clearTimeout(timer);
  }
}, [isRemoteUpdate]);

// useAutoSave から savePage() 呼び出し前に setIsRemoteUpdate(false) を設定
```

---

### 修正 C: updatePage の実行頻度を制限 🟠 High

**現在の問題**:

- useAutoSave が 2 秒ごとに savePage() を呼び出す
- それが複数回重複してトリガーされる可能性

**修正案**:

```typescript
// usePageSaver.ts
const isSavingRef = useRef(false);
const lastSaveTimeRef = useRef(0);
const MIN_SAVE_INTERVAL = 3000; // 最小保存間隔: 3 秒

const savePage = useCallback(async () => {
  if (!editor) return;

  // デバウンス: 最後の保存から3秒以上経過していない場合、スキップ
  if (Date.now() - lastSaveTimeRef.current < MIN_SAVE_INTERVAL) {
    logger.debug(
      { lastSaveTime: lastSaveTimeRef.current },
      "Skipping save - too frequent"
    );
    return;
  }

  if (isSavingRef.current) {
    logger.debug("Save already in progress, skipping");
    return;
  }

  isSavingRef.current = true;
  lastSaveTimeRef.current = Date.now();

  try {
    // ... 保存処理
  } finally {
    isSavingRef.current = false;
  }
}, [editor]);
```

---

## 検証計画（実施順序）

### Step 1: updatePage のロギング追加（即座）

```typescript
export async function updatePage({...}: UpdatePageParams) {
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
}
```

**目的**: updatePage が何回実行されているか、それぞれ何秒かかっているか確認

---

### Step 2: Realtime subscription イベントのログ（即座）

```typescript
// edit-page-form.tsx 内で subscription 設定時

const channel = supabase
  .channel(`public:pages:id=eq.${page.id}`)
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "pages",
      filter: `id=eq.${page.id}`,
    },
    (payload) => {
      logger.info(
        { event: payload.eventType, timestamp: new Date().toISOString() },
        "[Realtime] Page update event"
      );
      setPage(payload.new);
    }
  )
  .subscribe();
```

**目的**: Realtime イベントが何回発生しているか確認

---

### Step 3: 修正 A または B の実装

修正 A または B のいずれかを選択して実装

---

## 最終的な結論

### 修正が失敗した理由

```
修正の方向: クライアント側の React Hook 最適化
  ↓
実際の問題: サーバー側の DB 操作 + Realtime subscription の複合問題
  ↓
結果: クライアント側の修正では解決できない
```

### 本当に必要な対策

1. **サーバー側**: updatePage の DB 操作をトランザクション化
2. **クライアント側**: Realtime イベント時のデバウンス/スロットル
3. **双方**: savePage の実行頻度を制限

---

## 今後の開発方針

### すぐに実施すべき項目

1. ✅ updatePage にログ追加（15 分）
2. ✅ Realtime subscription にログ追加（15 分）
3. ⏳ updatePage の実行頻度を制限（30 分）
4. ⏳ 修正 A または B の実装（1-2 時間）

### 期待される結果

- updatePage 呼び出し: 現在 N 回 → 目標 1-2 回
- Realtime イベント: 現在複数回 → 目標 1 回
- POST リクエスト: 完全に停止
