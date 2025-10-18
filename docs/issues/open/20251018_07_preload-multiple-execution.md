# ページキャッシュプリロード - 無限実行の問題（未解決）

## 概要

`preloadPageTitles()` が複数回実行されることで、**1000 ページのタイトル正規化処理が何度も実行される** 問題が報告されています。

## 現在の状況

### 症状

```
POST /pages/2fe77455-1092-48b9-8bb8-a1030b786fd6 200 in 71ms
POST /pages/2fe77455-1092-48b9-8bb8-a1030b786fd6 200 in 61ms
POST /pages/2fe77455-1092-48b9-8bb8-a1030b786fd6 200 in 119ms
... (無限に繰り返される)
```

**HTTP レベルで POST が無限に発生している**

### 実施された修正（9 個すべて失敗）

| #   | 修正内容                                              | ファイル                              | 結果            |
| --- | ----------------------------------------------------- | ------------------------------------- | --------------- |
| 1   | `initialDoc` を `useMemo` メモ化                      | `usePageEditorLogic.ts`               | ❌ 失敗         |
| 2   | `useEditorInitializer` 依存配列から `initialDoc` 削除 | `useEditorInitializer.ts`             | ❌ 失敗         |
| 3   | `owner_id` → `user_id` スキーマ修正                   | `page-cache-preloader.ts`             | ❌ 失敗         |
| 4   | `docRef` で参照安定化                                 | `useEditorInitializer.ts`             | ❌ 失敗         |
| 5   | `EditPageForm` を `memo` でメモ化                     | `edit-page-form.tsx`                  | ❌ 失敗         |
| 6   | `extensions` 配列を `useMemo` メモ化                  | `usePageEditorLogic.ts`               | ❌ 失敗         |
| 7   | プリロード実行フラグ（第 1 版）                       | `useEditorInitializer.ts`             | ❌ 失敗（悪化） |
| 8   | プリロード実行フラグ（第 2 版）                       | `useEditorInitializer.ts`             | ❌ 失敗         |
| 9   | デバッグログ削除とトレーサー追加                      | `page-cache-preloader.ts`, `utils.ts` | ❌ ログ改善のみ |

## 修正が無効だった理由

### 仮説 1: クライアント側の修正では根本原因に対処できない ⚠️

すべての修正が **React Hook や JavaScript の最適化** に焦点を当てていましたが、実際の POST リクエストは **HTTP レベルで無限に発生** しています。

この現象は以下のいずれかを示唆：

- サーバー側の処理が無限ループしている
- API エンドポイントの実装が問題
- ミドルウェアまたは Server Action の不正な挙動
- データベースレベルのトリガーまたは RLS の問題

### 仮説 2: 別のコンポーネントが POST を発行している可能性 ⚠️

`preloadPageTitles()` の呼び出しは 1 箇所のみ（`useEditorInitializer.ts`）ですが、無限ループは他の場所から発生している可能性：

- WebSocket や BroadcastChannel の無限メッセージング
- Auto-save 機構の不正な挙動
- キャッシュ無効化ロジックの問題
- Polling 機構

### 仮説 3: ビルド/キャッシュの問題 ⚠️

修正が実装されていても、以下により反映されていない可能性：

- HMR（Hot Module Reload）で修正が反映されていない
- ブラウザキャッシュが古いコードを提供している
- `next build` の型チェックエラーで修正が反映されていない
- サーバーキャッシュ

## 次のアプローチ

### 段階 1: サーバー側の詳細ログ採集（必須）

以下をサーバーログから特定：

1. **POST エンドポイント（`/pages/{id}`）の処理**

   - エンドポイントがどこにあるか
   - どのような操作が行われているか
   - なぜ無限にリクエストが発生しているか

2. **ミドルウェア（`middleware.ts`）の処理**

   - リクエストの再ルーティングが行われていないか
   - リダイレクトループがないか

3. **データベースクエリの追跡**
   - どのテーブルにアクセスしているか
   - トリガーが実行されていないか
   - RLS ポリシーの挙動

### 段階 2: クライアント側の詳細ログ採集

以下をブラウザから採集：

1. **Network タブ**

   - POST リクエストのペイロード
   - リクエスト/レスポンスヘッダ
   - どのコンポーネント/イベントから発生しているか（Stack trace）

2. **Performance タブ**

   - JavaScript 実行タイミング
   - Component render 回数

3. **DevTools Console**
   - `preloadCallCount` トレーサーの出力
   - エラーメッセージ

### 段階 3: 根本原因の特定

上記のログから：

- [ ] 根本原因がクライアント側か、サーバー側か判定
- [ ] 根本原因の詳細を特定
- [ ] 的確な修正を実装

## 関連ドキュメント

- **修正無効化分析**: `docs/08_worklogs/2025_10/20251018_10_modification-ineffective-analysis.md` ← 詳細
- **前回の問題**: `docs/issues/open/20251018_01_infinite-editor-preload-loop.md`

## 重要度

**Critical** - サーバー負荷、パフォーマンス低下の原因

## ステータス

🔴 **未解決** - 新しい調査方針が必要
