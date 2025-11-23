# Tailwind CSS スタイル適用問題の詳細調査ガイド

## 作業日時
2025年11月23日

## 問題の概要

Tauri開発モードで起動した際に、Tailwind CSSのスタイルが適用されない。

## 確認済みの事実

1. ✅ CSSファイルは生成されている（`.next/static/css/`に存在）
2. ✅ Tailwind CSS v4は正しく処理されている（`layout.css`に`tailwindcss v4.1.16`が含まれている）
3. ✅ PostCSS設定は正しい（`postcss.config.mjs`で`@tailwindcss/postcss`を使用）
4. ✅ `globals.css`は正しくインポートされている（`app/layout.tsx`で`import "./globals.css"`）

## 考えられる原因

### 1. CSSファイルがブラウザに読み込まれていない

**確認方法**:
1. Tauriアプリの開発者ツールを開く（`Cmd+Option+I` / `Ctrl+Shift+I`）
2. Networkタブを開く
3. ページをリロード
4. CSSファイル（`/_next/static/css/`）が読み込まれているか確認
5. 読み込まれていない場合、エラーメッセージを確認

**考えられる原因**:
- CSSファイルのパスが正しく解決されていない
- CORSの問題
- CSP（Content Security Policy）でブロックされている

### 2. CSSファイルは読み込まれているが、スタイルが適用されていない

**確認方法**:
1. 開発者ツールのElementsタブを開く
2. `<head>`タグ内に`<link rel="stylesheet">`タグがあるか確認
3. 該当する要素を選択し、Computedタブでスタイルが適用されているか確認
4. Stylesタブで、Tailwind CSSのクラスが正しく解釈されているか確認

**考えられる原因**:
- CSSの優先順位の問題
- 他のスタイルが上書きしている
- Tailwind CSSのクラス名が正しくない

### 3. Tailwind CSS v4の設定の問題

Tailwind CSS v4では、`@import "tailwindcss"`を使用しますが、これが正しく処理されていない可能性があります。

**確認方法**:
1. `.next/dev/static/css/app/layout.css`の内容を確認
2. Tailwind CSSのクラス（例：`.bg-blue-500`）が含まれているか確認

### 4. Next.jsの開発モードでのCSS処理の問題

Next.jsの開発モードでは、CSSは動的に処理されますが、Tauri環境では問題が発生する可能性があります。

**確認方法**:
1. 通常の開発モード（`bun dev`）で起動
2. ブラウザで`http://localhost:3000`にアクセス
3. スタイルが正しく適用されているか確認
4. 適用されている場合、Tauri環境特有の問題

### 5. CSP（Content Security Policy）の問題

Tauri環境では、CSPが設定されている場合、CSSの読み込みがブロックされる可能性があります。

**確認方法**:
1. `tauri.conf.json`で`"csp": null`が設定されているか確認
2. 開発者ツールのConsoleタブでCSPエラーがないか確認

## 診断手順

### ステップ1: 開発者ツールでの確認

1. **Tauriアプリの開発者ツールを開く**
   ```bash
   bunx tauri dev
   ```
   - アプリが起動したら、`Cmd+Option+I` / `Ctrl+Shift+I`で開発者ツールを開く

2. **NetworkタブでCSSファイルの読み込みを確認**
   - Networkタブを開く
   - フィルターで「CSS」を選択
   - ページをリロード
   - `/_next/static/css/`のファイルが読み込まれているか確認
   - 読み込まれている場合、Statusが200か確認
   - 読み込まれていない場合、エラーメッセージを確認

3. **ElementsタブでCSSの適用を確認**
   - Elementsタブを開く
   - `<head>`タグを展開
   - `<link rel="stylesheet">`タグがあるか確認
   - 該当する要素を選択し、Computedタブでスタイルが適用されているか確認

4. **Consoleタブでエラーを確認**
   - Consoleタブを開く
   - エラーメッセージがないか確認
   - CSPエラーがないか確認

### ステップ2: 生成されたCSSファイルの確認

```bash
# 生成されたCSSファイルの内容を確認
cat .next/dev/static/css/app/layout.css | head -50

# Tailwind CSSのクラスが含まれているか確認
grep -i "bg-blue\|text-red\|flex\|grid" .next/dev/static/css/app/layout.css | head -10
```

### ステップ3: 通常の開発モードでの確認

```bash
# 通常の開発モードで起動
bun dev

# ブラウザで http://localhost:3000 にアクセス
# スタイルが正しく適用されているか確認
```

### ステップ4: PostCSS設定の確認

```bash
# PostCSS設定を確認
cat postcss.config.mjs

# Tailwind CSS v4のPostCSSプラグインが正しくインストールされているか確認
bun list | grep tailwindcss
```

## 解決策の提案

### 解決策1: CSSファイルのパスを確認

Tauri開発モードでは、CSSファイルのパスが正しく解決されていない可能性があります。

**確認項目**:
- `/_next/static/css/`のパスが正しく解決されているか
- 相対パスと絶対パスの違い

### 解決策2: CSP設定の確認

`tauri.conf.json`でCSPが設定されている場合、CSSの読み込みがブロックされる可能性があります。

**現在の設定**:
```json
"security": {
  "csp": null
}
```

この設定は正しいですが、Next.jsのmiddlewareでCSPヘッダーが設定されている可能性があります。

### 解決策3: Tailwind CSS v4の設定を確認

Tailwind CSS v4では、`@import "tailwindcss"`を使用しますが、これが正しく処理されていない可能性があります。

**確認項目**:
- `postcss.config.mjs`で`@tailwindcss/postcss`が正しく設定されているか
- `globals.css`で`@import "tailwindcss"`が正しく記述されているか

### 解決策4: Next.js設定の確認

`next.config.ts`でCSSの処理に問題がある可能性があります。

**確認項目**:
- Webpack設定でCSSの処理が正しく行われているか
- PostCSS設定が正しく読み込まれているか

## 次のステップ

1. 開発者ツールでCSSファイルの読み込み状況を確認
2. エラーメッセージを確認
3. 生成されたCSSファイルの内容を確認
4. 通常の開発モードでの動作を確認

これらの情報を基に、問題の原因を特定し、適切な解決策を提案します。

