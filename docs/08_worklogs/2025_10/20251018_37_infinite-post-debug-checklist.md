# 📋 無限 POST ループ：詳細調査チェックリスト - 2025-10-18

## 🔍 デバッグ手順

### PHASE 1: ネットワークトレース（必須）

#### 1.1 POST リクエストの特定

- [ ] DevTools → Network タブを開く
- [ ] Network の記録を開始
- [ ] ページエディタで何か編集
- [ ] POST リクエストを検出
- [ ] POST リクエストをクリック

#### 1.2 Request の詳細を記録

**記録すべき情報**:

```
【Request タブ】
URL: ___________________
Method: POST
Headers:
  - Content-Type: ___________________
  - User-Agent: ___________________

【Preview / Response タブ】
Response Status: ___________________
Response Body: ___________________
Response Headers:
  - Content-Type: ___________________
  - Cache-Control: ___________________

【Timing タブ】
Queued: _____ ms
DNS Lookup: _____ ms
Initial Connection: _____ ms
SSL: _____ ms
Request Sent: _____ ms
Waiting (TTFB): _____ ms
Content Download: _____ ms
Total: _____ ms
```

#### 1.3 複数の POST をキャプチャ

- [ ] 3-5 個の POST リクエストをフィルタリング
- [ ] 時間間隔を測定：**\_\_\_**ms
- [ ] Request body が同じか異なるか：**\_\_\_**
- [ ] Response が同じか異なるか：**\_\_\_**

---

### PHASE 2: コンソールログの詳細化

#### 2.1 API エンドポイントの特定

DevTools Console で以下を実行：

```javascript
// すべての fetch を hooks
const originalFetch = window.fetch;
window.fetch = function (...args) {
  console.log("[FETCH]", args[0], args[1]);
  return originalFetch.apply(this, args);
};
```

**記録すべき情報**:

```
[FETCH] URL: ___________________
[FETCH] Method: ___________________
[FETCH] Headers: ___________________
[FETCH] Body: ___________________
```

#### 2.2 searchPages の呼び出し追跡

Console に以下を出力：

```javascript
// console を見て以下を確認
// [searchPages] Called が表示されるか？
// 何回表示されるか？
// どのタイミングで？
```

**予想される出力**:

```
✅ [searchPages] Called - 1 回（期待）
❌ [searchPages] Called - 10+ 回（異常）
```

#### 2.3 updatePage の呼び出し追跡

```javascript
// [updatePage] Started が表示されるか？
// 何回？
// どのタイミング？
```

---

### PHASE 3: Performance Profiling

#### 3.1 CPU 使用率の記録

- [ ] DevTools → Performance タブ
- [ ] Recording 開始（赤丸をクリック）
- [ ] ページエディタでテキスト編集
- [ ] 10 秒記録
- [ ] Recording 停止

#### 3.2 Flame Chart の分析

**確認項目**:

```
【Main thread での処理】
- どの関数が最も時間を消費？: ___________________
- 呼び出し深さは？: ___________________
- 呼び出し频度は？: ___________________

【イベントループ】
- setTimeout が頻繁に呼ばれている？: YES / NO
- Promise.then が頻繁に呼ばれている？: YES / NO
- その他：___________________
```

#### 3.3 Bottom-Up タブで関数を分析

```
Top functions by self time:
1. ___________________
2. ___________________
3. ___________________
```

---

### PHASE 4: ソースコードのトレース

#### 4.1 POST リクエストの発生源

**検索対象ファイル**:

```
app/api/pages/route.ts      - POST handler
app/api/notes/route.ts      - POST handler
lib/services/               - fetch 呼び出し
lib/utils/                  - utility functions
app/(protected)/pages/[id]/ - ページエディタ
```

**確認項目**:

- [ ] `fetch()` 呼び出しを検索
- [ ] `POST` リクエストを検索
- [ ] API エンドポイントを特定
- [ ] 呼び出し条件を確認

#### 4.2 searchPages の呼び出し元

**検索**:

```bash
grep -r "searchPages" app/ lib/
```

**確認項目**:

- [ ] 何個の呼び出し元がある？: **\_**
- [ ] 無条件に呼ばれている箇所はないか？
- [ ] useEffect 内で呼ばれている？

#### 4.3 updatePage の呼び出し元

**検索**:

```bash
grep -r "updatePage" app/ lib/
```

**確認項目**:

- [ ] 何個の呼び出し元がある？: **\_**
- [ ] 無限ループの可能性がある箇所は？

---

### PHASE 5: 修正の検証

#### 5.1 logger の設定確認

**確認項目**:

```typescript
// lib/logger.ts を確認
- [ ] isBrowser が判定されている？
- [ ] asObject が false に設定？
- [ ] browser config が存在？

// Console で確認
const logger = require('./lib/logger').default;
console.log(logger);
```

#### 5.2 auto-reconciler の確認

**確認項目**:

```typescript
// lib/unilink/auto-reconciler.ts を確認
- [ ] rebuild() が呼ばれていない？
- [ ] reconcileStaleKeys に NO rebuild comment？

// 検索
grep -n "rebuild()" lib/unilink/auto-reconciler.ts
// 結果は 0 行（削除されている）か？
```

#### 5.3 observer の確認

**確認項目**:

```typescript
// pages-list-container.tsx を確認
- [ ] observerRef が useRef で宣言？
- [ ] observer.disconnect() が呼ばれている？

// 検索
grep -n "observerRef" app/\(protected\)/pages/_components/pages-list-container.tsx
```

---

### PHASE 6: ブラウザキャッシュのクリア

#### 6.1 キャッシュをクリア

- [ ] DevTools → Application
- [ ] Local Storage → Clear All
- [ ] Session Storage → Clear All
- [ ] IndexedDB → Delete All
- [ ] Service Workers → Unregister

#### 6.2 ハードリロード

- [ ] Cmd + Shift + R（macOS）
- [ ] Ctrl + Shift + R（Windows）

#### 6.3 修正が適用されているか確認

- [ ] Network タブで POST が続く？
- [ ] Console にエラーが出ている？
- [ ] ページが正常に読み込まれている？

---

## 📊 チェックリスト報告テンプレート

実施後、以下の情報を報告してください：

### 【PHASE 1 結果】ネットワークトレース

```
POST API エンドポイント:
Request Body:
Response Status:
Response Body:
POST 間隔: ___ ms
```

### 【PHASE 2 結果】コンソールログ

```
searchPages 呼び出し回数: ___
updatePage 呼び出し回数: ___
その他ログ:
```

### 【PHASE 3 結果】Performance

```
最も時間を消費している関数:
呼び出し深さ:
CPU 使用率: ____%
```

### 【PHASE 4 結果】ソース分析

```
POST 発生元:
searchPages 呼び出し元:
その他:
```

### 【PHASE 5 結果】修正確認

```
logger asObject: false ✓/✗
auto-reconciler rebuild(): なし ✓/✗
observer cleanup(): あり ✓/✗
```

### 【PHASE 6 結果】キャッシュクリア後

```
問題継続: YES / NO
エラーあり: YES / NO
改善: YES / NO
```

---

## 🎯 期待される発見

### シナリオ A: searchPages が無限に呼ばれている

**兆候**:

- [searchPages] ログが 10+ 回
- POST が /api/search にいっている

**次のアクション**:

- searchPages の呼び出し元を特定
- 呼び出し条件の分析

### シナリオ B: 別の API が POST されている

**兆候**:

- POST URL が `/api/pages` または `/api/notes`
- searchPages ログが少ない

**次のアクション**:

- その API の handler を調査
- Response が何を返しているか確認

### シナリオ C: useEffect の無限ループ

**兆候**:

- Promise chain が深い
- setTimeout が頻繁に呼ばれている

**次のアクション**:

- useEffect の依存配列を再確認
- 不要な state update を検索

---

## 💡 追加の質問

調査中に以下の質問に答えてください：

1. **ページエディタで何か編集したら即座に POST が始まるか、それとも遅延があるか？**

   - 即座に開始: \_\_\_
   - 遅延あり: \_\_\_ ms

2. **POST の間隔は一定か、それともランダムか？**

   - 一定: \_\_\_ ms
   - ランダム: min **_ ms, max _** ms

3. **ページを編集せずに静止していたら POST は止まるか？**

   - 止まる: YES / NO
   - 続く: YES / NO

4. **別のページに移動したら POST は止まるか？**

   - 止まる: YES / NO
   - 続く: YES / NO

5. **本番環境（`npm run build && npm run start`）では問題が発生するか？**
   - 発生: YES / NO
   - 改善: YES / NO

---

**このチェックリストを完了後、結果を報告してください。**
