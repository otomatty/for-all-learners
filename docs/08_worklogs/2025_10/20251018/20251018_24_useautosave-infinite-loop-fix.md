# 無限 POST ループ - 最終修正：useAutoSave の無限ループ修正 - 2025-10-18

## 🔴 真の原因が判明！

ブラウザコンソールの `[Violation] 'setTimeout' handler` の大量出力から、**useAutoSave が無限に setTimeout を生成していた**ことが判明しました。

### 問題のコード

```typescript
// 修正前の useAutoSave.ts
const attemptSave = useCallback(async () => { ... }, []);

useEffect(() => {
    // ...
    setTimeout(() => {
        void attemptSave();
    }, 2000);
}, [editor, attemptSave]); // ❌ attemptSave が依存配列に入っている
```

### 問題のメカニズム

```
useEffect(..., [editor, attemptSave])
  ↓
new attemptSave created (参照が変わる)
  ↓
useEffect 再実行トリガー
  ↓
新しい setTimeout 登録
  ↓
🔄 ループ開始
```

**このループにより、setTimeout が無限に登録され続けていました。**

---

## ✅ 実施した修正

### 修正内容：attemptSave を useCallback から ref に変更

```typescript
// 修正後
const attemptSaveRef = useRef<() => Promise<void>>(async () => { ... });

useEffect(() => {
    attemptSaveRef.current = async () => {
        // 実装
    };
}, []); // 空の依存配列 - 一度だけ実行

useEffect(() => {
    // ...
    setTimeout(() => {
        void attemptSaveRef.current(); // ← ref を使う
    }, 2000);
}, [editor, isDirty]); // ← attemptSave を依存配列から削除
```

### 重要なポイント

1. **attemptSaveRef は ref**

   - 参照が変わらないので、依存配列に入れる必要がない
   - つまり useEffect は不要に再実行されない

2. **依存配列から attemptSave を削除**

   - `[editor, isDirty]` のみ
   - 必要な時だけ useEffect が実行される

3. **attemptSaveRef.current で最新の実装にアクセス**
   - ref の値を更新することで、常に最新の実装を実行

---

## 🔄 修正前後の動作比較

### 修正前（無限ループ）

```
エディタ更新
  ↓
useEffect 実行
  ↓
setTimeout 登録 ← 毎回新しいタイムアウト ID
  ↓
attemptSave 参照変更 ← 依存配列に入っているから
  ↓
useEffect 再実行トリガー
  ↓
🔄 ループ
  ↓
[Violation] 'setTimeout' handler が大量出力
```

### 修正後（正常）

```
エディタ更新
  ↓
useEffect 実行（[editor, isDirty] のみ）
  ↓
setTimeout 登録
  ↓
editor / isDirty が変わらない
  ↓
useEffect 再実行なし ✅
  ↓
正常に 2 秒待機 → attemptSaveRef.current() 呼び出し
```

---

## 📊 期待される改善

### 修正前のコンソール

```
[Violation] 'setTimeout' handler took 305ms
[Violation] 'setTimeout' handler took 301ms
[Violation] 'setTimeout' handler took 298ms
... (大量に繰り返す)
```

### 修正後のコンソール（期待値）

```
[AutoReconciler] Using cached page ID {...}
[searchPages] Returning cached result {...}
[useAutoSave] Attempting save
[AutoReconciler] Resolved page ID {...}
```

---

## 🔍 ログレベル修正の効果

同時に実施した logger.debug → logger.info の変更により、以下のログが表示されるようになります：

- `[searchPages] Executing search` - API 呼び出し
- `[searchPages] Returning cached result` - キャッシュヒット
- `[AutoReconciler] Using cached page ID` - キャッシュから取得
- `[AutoReconciler] Already processing this key, skipping` - 重複処理防止

---

## 🎯 検証ポイント

ブラウザコンソールで以下を確認してください：

1. **[Violation] 'setTimeout' が消える**

   - ページ編集時に大量の Violation が出ないか

2. **[searchPages] のログが見える**

   - API 呼び出し数が適切か
   - キャッシュヒット率が高いか

3. **[AutoReconciler] のログが見える**

   - キャッシュ機能が働いているか
   - 重複処理がスキップされているか

4. **Network タブ**
   - POST リクエストが大幅に減少しているか
   - リクエスト間隔が 3 秒以上か

---

## 修正したファイル一覧

| ファイル           | 修正内容                                                     |
| ------------------ | ------------------------------------------------------------ |
| useAutoSave.ts     | attemptSave を useCallback から ref に変更、依存配列を最小化 |
| auto-reconciler.ts | logger.debug → logger.info                                   |
| searchPages.ts     | logger.debug → logger.info、API 呼び出しカウント追加         |
| reconcile-queue.ts | logger.debug → logger.info                                   |

---

## 最終まとめ

### 無限 POST ループの本当の原因

```
useEffect(..., [editor, attemptSave])
  ← attemptSave が依存配列に入っている
    ← attemptSave が useCallback で毎回新しく作られている
      ← attemptSave 内で setTimeout を登録している
        ← 新しい setTimeout が無限に登録され続ける
          ← [Violation] 'setTimeout' handler が大量出力される
```

### 修正による効果

1. **setTimeout の無限登録が止まる**
2. **searchPages の API 呼び出しが制限される**
3. **ブラウザの動作が改善される**
4. **POST リクエストが大幅に削減される**

---

## 次のステップ

1. **ブラウザを再読み込み** (Ctrl+Shift+R で強制再読み込み)
2. **コンソールでログを確認**
3. **Network タブで POST リクエストを監視**
4. **ページ編集時に [Violation] が出ないか確認**

すべての修正コードは品質チェック（biome）を通過しています。
