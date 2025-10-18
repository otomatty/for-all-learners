# エディター無限ループ - 根本原因特定と修正完了 - 2025-10-18

## 🎯 根本原因

サーバーコンポーネント `page.tsx` で毎回 `transformPageLinks()` が実行され、**新しい `decoratedDoc` オブジェクトが生成**されていました。

これが `initialContent` として `EditPageForm` に渡されるため：

1. `EditPageForm` → `usePageEditorLogic` → `initialDoc` が毎回変わる参照
2. `initialDoc` が依存配列に含まれていた → 毎回 `useEffect` が実行される
3. `preloadPageTitles()` が何度も呼ばれる
4. ∞ 無限ループ

```
page.tsx (Server)
  ↓
  transformPageLinks() ← 毎回新しいオブジェクト生成
  ↓
  initialContent={decoratedDoc} ← 毎回異なる参照
  ↓
EditPageForm (Client)
  ↓
usePageEditorLogic
  ↓
initialDoc (毎回新しい参照)
  ↓
useEditorInitializer
  ↓
dependencies: [editor, initialDoc, userId] ← initialDoc が毎回変わる！
  ↓
∞ Loop
```

## 🔧 修正内容

**ファイル**: `app/(protected)/pages/[id]/_hooks/useEditorInitializer.ts`

### 修正前

```typescript
useEffect(() => {
  // ...
  const sanitized = sanitizeContent(initialDoc);
  // ...
}, [editor, initialDoc, userId]); // ← initialDoc が依存に入っている
```

### 修正後

```typescript
const docRef = useRef<JSONContent>(initialDoc);

// 別の useEffect: 値の更新を追跡（リーン化だけ）
useEffect(() => {
  docRef.current = initialDoc;
  // ログのみ
}, [initialDoc]);

// メイン useEffect: エディター作成時 1 回だけ実行
useEffect(() => {
  if (!editor) return;
  const sanitized = sanitizeContent(docRef.current); // ← ref を使用
  // ...
}, [editor, userId]); // ← initialDoc は依存に含めない
```

## 📊 期待される効果

- ✅ エディターの初期化が **1 回だけ** 実行される
- ✅ `preloadPageTitles()` が **1 回だけ** 呼び出される
- ✅ 無限 POST リクエストが **完全に停止する**
- ✅ ブラウザコンソールのエラーが **完全に消える**
- ✅ サーバーログが **清潔になる**

## 🧪 確認方法

1. **ブラウザを再読み込み** (Cmd+R)
2. **コンソール/ネットワークタブで確認**:
   - `[DEBUG] useEditorInitializer effect triggered` が **1 回だけ** 出力される
   - `[PageCachePreloader] Starting preload` の `callId` が **1 種類だけ** 出力される
   - 同じ POST/GET リクエストが **何度も繰り返されない**
3. **サーバーログで確認**:
   - 無限の `POST /pages/...` が **消える**

## 📝 デバッグログの見方

3 つの useEffect が実行されます（正常な場合）:

```
[DEBUG] initialDoc updated (not triggering re-init)
  → initialDoc の値を ref に保存（ほぼ即座）

[DEBUG] useEditorInitializer effect triggered
  → エディター作成後、1 回だけ実行

[DEBUG] Editor content set successfully
  → コンテンツ設定完了
```

もし `effect triggered` が何度も出力される場合は、`editor` の参照が変わっています。

## 関連ファイル

- `app/(protected)/pages/[id]/_hooks/useEditorInitializer.ts` - ✅ 修正完了
- `app/(protected)/pages/[id]/_hooks/usePageEditorLogic.ts` - 参照のみ
- `lib/utils/transformPageLinks.ts` - 参照のみ（サーバー側なので問題なし）

## 学び

**サーバー → クライアントの値の参照性は重要**

サーバーコンポーネントで毎回計算される値がクライアント側に渡される場合、その値は常に新しい参照になります。クライアント側で依存配列に含める場合は、安定した参照に変換する工夫が必要です。

✅ 完了
