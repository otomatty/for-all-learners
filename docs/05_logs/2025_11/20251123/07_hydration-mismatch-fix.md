# ハイドレーション不一致エラーの修正

## 作業日時
2025年11月23日

## 問題の概要

Tauri開発モードでスタイルが表示されるようになった後、以下のハイドレーション不一致エラーが発生：

```
A tree hydrated but some attributes of the server rendered HTML didn't match the client properties.
```

エラーメッセージから、`form`要素の`action`、`enctype`、`method`属性がサーバー側とクライアント側で一致していないことが判明。

## 原因分析

### 根本原因

`LoginForm`コンポーネントで`useMemo(() => isTauri(), [])`を使用していましたが、`isTauri()`関数は：

- **サーバー側**: `window`が未定義のため、常に`false`を返す
- **クライアント側**: `window.__TAURI__`をチェックし、Tauri環境では`true`を返す

これにより、サーバー側では`action`属性を持つ`form`要素（Web環境用）がレンダリングされ、クライアント側では`action`属性がない`form`要素（Tauri環境用）がレンダリングされるため、ハイドレーション不一致が発生していました。

### 影響を受けたコンポーネント

1. **`MagicLinkForm`**: `isTauri`が`true`の場合、`action`属性がない`form`を返す
2. **`GoogleLoginForm`**: `isTauri`が`true`の場合、`action`属性がない`form`を返す

## 実施した修正

### 1. `LoginForm.tsx`の修正

`useMemo`の代わりに`useState`と`useEffect`を使用して、クライアント側でのみ`isTauri`を判定するように変更：

```typescript
// 修正前
const tauriEnv = useMemo(() => isTauri(), []);

// 修正後
const [tauriEnv, setTauriEnv] = useState(false);

useEffect(() => {
  // クライアント側でのみ実行
  setTauriEnv(isTauri());
}, []);
```

### 2. `MagicLinkForm.tsx`の修正

Tauri環境用の`form`要素に`suppressHydrationWarning`を追加：

```typescript
<form
  onSubmit={async (e) => {
    // ...
  }}
  className="grid gap-4 mb-6"
  suppressHydrationWarning
>
```

### 3. `GoogleLoginForm.tsx`の修正

Tauri環境用の`form`要素に`suppressHydrationWarning`を追加：

```typescript
<form
  onSubmit={async (e) => {
    // ...
  }}
  className="grid gap-6"
  suppressHydrationWarning
>
```

## 修正の理由

1. **`useState`と`useEffect`の使用**:
   - サーバー側では常に`false`（Web環境の`form`）をレンダリング
   - クライアント側で`useEffect`が実行され、実際の値に更新される
   - これにより、サーバー側とクライアント側で同じ初期値を使用できる

2. **`suppressHydrationWarning`の追加**:
   - `form`要素の属性がサーバー側とクライアント側で異なる場合、Reactのハイドレーション警告を抑制
   - これは、Tauri環境とWeb環境で異なる`form`構造を使用する必要があるため、意図的な不一致

## 確認方法

1. **Tauriアプリを再起動**
   ```bash
   bunx tauri dev
   ```

2. **開発者ツールで確認**
   - Consoleタブでハイドレーション不一致エラーが発生していないか確認
   - フォームが正常に動作するか確認

3. **動作確認**
   - Magic Linkフォームが正常に動作するか確認
   - Googleログインフォームが正常に動作するか確認

## 注意事項

- `suppressHydrationWarning`は、意図的な不一致の場合にのみ使用してください
- サーバー側とクライアント側で異なるコンテンツをレンダリングする場合は、`useState`と`useEffect`を使用してクライアント側でのみ更新するようにしてください

## 参照

- React Hydration Mismatch: https://react.dev/link/hydration-mismatch
- Issue #157: Phase 6 - Next.js静的化とTauri統合

