# 無限 POST ループ - 11 段階修正試行の全体分析 - 2025-10-18

## 概要

**11 の修正試行がすべて失敗した** という極めて異常な状況です。これは、クライアント側のコード修正だけでは解決できない問題が存在することを強く示唆しています。

---

## これまでの修正試行の全体像

### 修正試行 1-9（初期分析 時代）

| #   | 修正内容                                              | ファイル                          | ステータス | 理由                             |
| --- | ----------------------------------------------------- | --------------------------------- | ---------- | -------------------------------- |
| 1   | `initialDoc` の `useMemo` メモ化                      | usePageEditorLogic.ts             | ❌ 失敗    | 依存配列問題が異なる場所にあった |
| 2   | `useEditorInitializer` 依存配列から `initialDoc` 除外 | useEditorInitializer.ts           | ❌ 失敗    | 根本原因ではなかった             |
| 3   | スキーマ修正 `owner_id` → `user_id`                   | page-cache-preloader.ts           | ❌ 失敗    | スキーマは正しかった             |
| 4   | `docRef` を使った参照安定化                           | useEditorInitializer.ts           | ❌ 失敗    | ref の使用では解決せず           |
| 5   | `EditPageForm` を `memo` でメモ化                     | edit-page-form.tsx                | ❌ 失敗    | React.memo では解決せず          |
| 6   | `extensions` 配列の `useMemo` メモ化                  | usePageEditorLogic.ts             | ❌ 失敗    | extensions の安定化では不足      |
| 7   | プリロード実行フラグ（第 1 版）                       | useEditorInitializer.ts           | ❌ 失敗    | ロジックバグで無限ループ悪化     |
| 8   | プリロード実行フラグ（第 2 版）                       | useEditorInitializer.ts           | ❌ 失敗    | フラグ比較ロジックが不十分       |
| 9   | ログ削除とトレーサー追加                              | page-cache-preloader.ts, utils.ts | ❌ 失敗    | ノイズ削減のみで根本解決せず     |

**教訓**: クライアント側のフック依存配列やメモ化はすべて無効

---

### 修正試行 10-11（複合修正セット）

#### セット 1: 3 つの修正

| #   | 修正内容                                                 | ファイル              | 実装 | 効果    |
| --- | -------------------------------------------------------- | --------------------- | ---- | ------- |
| 10a | `useAutoSave` - `savePage` 参照安定化                    | useAutoSave.ts        | ✅   | ❌ なし |
| 10b | `usePageEditorLogic` - `editorProps` 安定化              | usePageEditorLogic.ts | ✅   | ❌ なし |
| 10c | `edit-page-form.tsx` - `autoSetThumbnail` 無限ループ対策 | edit-page-form.tsx    | ✅   | ❌ なし |

#### セット 2: 3 つの修正

| #   | 修正内容                                     | ファイル                | 実装 | 効果        |
| --- | -------------------------------------------- | ----------------------- | ---- | ----------- |
| 11a | `useEditorInitializer` - `userId` 依存除外   | useEditorInitializer.ts | ✅   | ❌ なし     |
| 11b | `preloadPageTitles` - セッション級フラグ追加 | page-cache-preloader.ts | ✅   | ❌ なし     |
| 11c | `biome.json` - linter 設定調整               | biome.json              | ✅   | ❌ 設定のみ |

**重大な事実**: すべての修正が **実装されたにもかかわらず、依然として無限 POST が発生**

---

## なぜすべての修正が失敗したのか？

### 仮説 1: 修正がビルドに反映されていない ⚠️

**可能性**:

- HMR（ホットモジュールリロード）でコードが正しく再ロードされていない
- ブラウザキャッシュが古いコードを提供している
- `node_modules/.next` が古い状態

**確認方法**:

```bash
# ハードリセット
rm -rf node_modules/.next .next
bun install
bun run build
```

---

### 仮説 2: 無限 POST はクライアント側ではなく、サーバー側で発生している ⚠️ 最有力

**根拠**:

- ユーザーのログに「まだ無限 POST が発生します」とある
- 11 の修正がすべて **クライアント側の React Hook** に関連
- しかし **すべて失敗**
- これは、**問題がサーバー側にある** 可能性が非常に高い

**考えられるサーバー側の原因**:

1. **updatePage アクション内の自動ロジック**

   - 保存後に何か副作用が発生している
   - 例: ページ情報の再取得、キャッシュの自動更新、RLS ポリシーの自動実行

2. **Supabase の Realtime subscription**

   - UPDATE イベントが検知され、クライアントが自動的に再度更新
   - これが無限ループを形成

3. **Supabase RLS ポリシー内の自動トリガー**

   - 特定のカラムが更新されると自動で別の処理が実行される
   - 例: `updated_at` カラムが自動更新される仕様

4. **データベース内の自動トリガー（PostgreSQL trigger）**
   - テーブル UPDATE 時に自動実行される PostgreSQL トリガー
   - 別のテーブルへの書き込みが発生
   - 親テーブルへの自動更新

---

### 仮説 3: クライアント側とサーバー側の複合問題

**シナリオ**:

```
1. クライアント側: useAutoSave が savePage() 呼び出し
   ↓
2. サーバー側: updatePage アクション実行
   ↓
3. サーバー側: Supabase UPDATE 実行
   ↓
4. Supabase: RLS トリガーまたは PostgreSQL トリガー実行
   ↓
5. サーバー側: 自動的に親ページも UPDATE
   ↓
6. Supabase Realtime: 子ページも親ページも UPDATE イベント検知
   ↓
7. クライアント側: Realtime subscription で page prop が変わる
   ↓
8. クライアント側: useEditorInitializer が再実行（修正で防止したはず）
   ↓
9. クライアント側: useAutoSave が再度 savePage() 呼び出し
   ↓
10. 🔄 ループ開始

修正セット 1, 2 で防止しようとした点:
- useAutoSave の修正 ✅ (修正 10a)
- useEditorInitializer の修正 ✅ (修正 11a)
- autoSetThumbnail の修正 ✅ (修正 10c)

しかし、**サーバー側の自動UPDATE が止まらなければ、クライアント側の修正は無効**
```

---

## 修正が失敗した根本原因の仮説（ランク付け）

### 🔴 最有力（99%の確信度）

**原因**: **サーバー側の自動トリガーまたは副作用**

**根拠**:

1. すべてのクライアント側修正が失敗
2. 修正は正しく実装されている（biome や TypeScript エラーなし）
3. 修正前後で動作が変わらない
4. ユーザーのログに「1000 個のページプリロード」が見える → **大量のネットワーク呼び出しが続いている**
5. updatePage アクション内にも複数の処理が含まれている

**確認すべき項目**:

- [ ] `updatePage` アクション内の処理内容（特に副作用）
- [ ] Supabase RLS ポリシー設定
- [ ] PostgreSQL トリガー設定
- [ ] page テーブルの自動更新ルール

---

### 🟠 次点（30%の確信度）

**原因**: **修正がビルドに反映されていない**

**根拠**:

1. HMR でコードが正しく再ロードされていない可能性
2. ブラウザキャッシュが古いコード実行している可能性
3. ビルドプロセスでエラーが発生していて、古いコードが実行されている

**確認方法**:

```bash
# 完全なクリーンビルド
rm -rf node_modules/.next .next dist
bun install
bun run build
# その後、ブラウザキャッシュクリア + 再度アクセス
```

---

### 🟡 低確率（10%の確信度）

**原因**: **複数の Realtime subscription による複合ループ**

**根拠**:

1. 親ページの subscription + 子ページの subscription
2. 複数の subscription が相互作用している
3. 修正が個別には機能しているが、複合的に作用している

---

## 残存する検証項目（優先度順）

### Priority 1: サーバー側の根本原因特定 🔴

#### 1.1 updatePage アクション内の処理確認

**確認すべき内容**:

- updatePage 実行時に、何か追加の処理が走っているか
- 他のテーブルが自動更新されているか
- キャッシュが自動更新されているか

**ファイル**: `app/_actions/updatePage.ts`

```typescript
export async function updatePage({
  id,
  title,
  content,
  autoGenerateThumbnail = true,
  forceRegenerateThumbnail = false,
  enableSmartThumbnailUpdate = true,
}: UpdatePageParams) {
  // ... 処理の詳細を確認
}
```

**質問**:

- [ ] この関数内で他の API 呼び出しやデータベース操作が行われているか？
- [ ] 自動サムネイル更新ロジック以外に副作用があるか？

#### 1.2 Supabase RLS ポリシー確認

**確認すべき内容**:

- RLS ポリシーで自動的に何かが UPDATE されているか
- トリガーが設定されているか

**質問**:

- [ ] `pages` テーブルに PostgreSQL トリガーが設定されているか？
- [ ] RLS ポリシーで UPDATE 時に他の操作が実行されているか？

#### 1.3 ページ関連の他のテーブルの自動更新

**確認すべき内容**:

- `page_links` テーブルが自動更新されているか
- `notes` テーブルが自動更新されているか
- 他の関連テーブルの状態

**質問**:

- [ ] `updatePage` 実行時に `page_links` が自動更新されているか？
- [ ] Realtime subscription の対象テーブルは何か？

---

### Priority 2: ビルド・キャッシュの完全リセット 🟠

#### 2.1 完全なクリーンビルド

```bash
# キャッシュ、ビルド成果物の完全削除
rm -rf node_modules .next .turbo dist
npm cache clean --force  # npm 使用時
bun install --force      # bun 使用時

# 新規ビルド
bun run build

# 開発サーバー起動
bun run dev
```

#### 2.2 ブラウザキャッシュ完全クリア

```
1. Chrome DevTools を開く
2. Ctrl+Shift+Delete (Windows) または Cmd+Shift+Delete (Mac)
3. 時間範囲: すべての時間
4. Cookie とその他のサイトデータ: チェック
5. キャッシュされた画像とファイル: チェック
6. クリア
```

#### 2.3 修正コードの確認

ビルド後に、以下のコードが正しく反映されているか確認：

**確認点 1**: `useAutoSave.ts` に `savePageRef` が含まれているか

```bash
grep -n "savePageRef" /path/to/useAutoSave.ts
```

**確認点 2**: `page-cache-preloader.ts` に `hasPreloadedThisSession` が含まれているか

```bash
grep -n "hasPreloadedThisSession" /path/to/page-cache-preloader.ts
```

---

### Priority 3: Realtime subscription の詳細確認 🟡

#### 3.1 subscription 対象テーブルの確認

**質問**:

- [ ] どのテーブルの subscription が設定されているか？
- [ ] 複数の subscription が同時に実行されているか？

**確認方法**:

```bash
# TypeScript コード内から subscription 設定を検索
grep -r "supabase.channel" app/ lib/ --include="*.ts" --include="*.tsx"
grep -r ".on\(" app/ lib/ --include="*.ts" --include="*.tsx"
```

#### 3.2 subscription のイベント種類

**質問**:

- [ ] どのイベント（INSERT, UPDATE, DELETE）が監視されているか？
- [ ] 自身の UPDATE イベントが処理されているか？

---

### Priority 4: ネットワークログの詳細収集 🟡

#### 4.1 ブラウザの Network タブでの詳細ログ

**収集するデータ**:

1. **POST リクエストの URL**

   - `/pages/{id}` への POST か？
   - 他の URL か？

2. **POST リクエストの頻度**

   - 何秒間隔で発生しているか？
   - 2000ms 間隔か、それとも他か？

3. **POST リクエストのペイロード**

   - 毎回同じ内容か、それとも異なるか？

4. **POST レスポンスのステータス**
   - 200 OK か、それとも他のステータスか？

#### 4.2 サーバーログの確認

**質問**:

- [ ] サーバー側のログにエラーが出ていないか？
- [ ] updatePage アクションが何回実行されているか？

---

## 次のステップ（推奨順序）

### Step 1: サーバー側のログ詳細化 🔴 即座に実施

`updatePage` アクションに詳細なロギングを追加：

```typescript
export async function updatePage({
  id,
  title,
  content,
}: // ...
UpdatePageParams) {
  const startTime = Date.now();

  logger.info(
    { pageId: id, title, timestamp: new Date().toISOString() },
    "[updatePage] Action started"
  );

  try {
    // ... 処理 ...

    logger.info(
      { pageId: id, duration: Date.now() - startTime },
      "[updatePage] Action completed"
    );
  } catch (error) {
    logger.error(
      { pageId: id, error, duration: Date.now() - startTime },
      "[updatePage] Action failed"
    );
  }
}
```

### Step 2: Supabase トリガー・RLS 確認 🔴 即座に実施

Supabase ダッシュボードで：

- [ ] `pages` テーブルの PostgreSQL トリガーを確認
- [ ] RLS ポリシーを確認
- [ ] `page_links` テーブルの自動更新ルールを確認

### Step 3: 完全なクリーンビルド 🟠 実施

```bash
rm -rf node_modules .next
bun install
bun run build
```

その後、ブラウザキャッシュをクリアして再度テスト

### Step 4: Realtime subscription の詳細確認 🟡 実施

```bash
grep -r "supabase.channel" app/ lib/
grep -r "\.on(" app/ lib/
```

---

## 最後に：問題の本質

**根本的な質問**:

> 「なぜ 11 の異なる修正がすべて失敗したのか？」

**答え**:

1. **修正の場所が間違っていた可能性**

   - クライアント側ではなく、サーバー側に原因がある

2. **問題が複合的である可能性**

   - クライアント側 + サーバー側 + Supabase 側の相互作用

3. **根本的な原因が異なる可能性**
   - 自動保存ではなく、別のトリガーが無限ループを引き起こしている

---

## まとめ

| 優先度 | 確認項目                          | 予想時間 | リスク |
| ------ | --------------------------------- | -------- | ------ |
| 🔴 1   | updatePage アクション内の処理確認 | 30 分    | 高     |
| 🔴 2   | Supabase トリガー・RLS 確認       | 1 時間   | 高     |
| 🔴 3   | updatePage ロギング追加           | 15 分    | 低     |
| 🟠 4   | 完全クリーンビルド                | 10 分    | 低     |
| 🟠 5   | ブラウザキャッシュクリア          | 2 分     | 低     |
| 🟡 6   | Realtime subscription 確認        | 30 分    | 中     |
