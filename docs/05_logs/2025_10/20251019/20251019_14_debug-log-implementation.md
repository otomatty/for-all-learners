# デバッグログ実装完了ドキュメント

**作成日**: 2025-10-19  
**目的**: InputRule double-trigger 問題の原因特定

---

## 📋 実装内容

### 1. tag-rule.ts のデバッグログ実装

**有効にしたログ**:
- `DEBUG_TAG_DUPLICATION = true` でコンソール出力開始
- **CALL**: InputRule がトリガーされた時刻と Call 番号
- **DUPLICATE-DETECTED**: 時間ウィンドウ内の重複検出時
- **SKIP**: コード文脈またはマーク有無判定でスキップ時
- **PROCESS**: 実際にマーク付与を開始する時点
- **COMPLETE**: マーク付与完了時

**削除したログ**:
- 状態確認前のログ（不要）
- チェーン操作の詳細ログ（既に確認済み）

### 2. bracket-rule.ts のデバッグログ実装

同様の仕様でbracket用のログを実装:
- `DEBUG_BRACKET_DUPLICATION = true` でコンソール出力開始
- 重複検出メカニズムの同じ仕様

---

## 🔍 確認できる項目

コンソール（F12）で以下が確認可能：

### パターン A: 正常な処理
```
[XX:XX:XX] [TagRule-DEBUG] [CALL] Call #1 | {...}
[XX:XX:XX] [TagRule-DEBUG] [PROCESS] applying mark and text insertion | {...}
[XX:XX:XX] [TagRule-DEBUG] [COMPLETE] mark applied and text inserted | {...}
```

### パターン B: 重複検出
```
[XX:XX:XX] [TagRule-DEBUG] [CALL] Call #1 | {...}
[XX:XX:XX] [TagRule-DEBUG] [PROCESS] applying mark and text insertion | {...}
[XX:XX:XX] [TagRule-DEBUG] [COMPLETE] mark applied and text inserted | {...}
[XX:XX:XX] [TagRule-DEBUG] [CALL] Call #2 | {...}
[XX:XX:XX] [TagRule-DEBUG] [DUPLICATE-DETECTED] Skipping (call #2 in window) | {...}
```

### パターン C: マーク有無で検出
```
[XX:XX:XX] [TagRule-DEBUG] [CALL] Call #1 | {...}
[XX:XX:XX] [TagRule-DEBUG] [SKIP] text already has UnifiedLink mark | {...}
```

---

## 🧪 ブラウザでの確認手順

1. **開発サーバー起動**:
   ```bash
   bun dev
   ```

2. **ブラウザを開く**: `http://localhost:3000`

3. **F12 でコンソール開く**

4. **フィルターを設定**: コンソール検索で `TagRule-DEBUG` を入力

5. **テストを実行**:
   ```
   入力: " #テスト"
   キー: Enter 押下
   ```

6. **ログを確認**:
   - Call #1、#2 が表示されるか
   - 重複検出がされているか
   - マーク付与のタイミング

---

## ⚠️ デバッグフラグの状態

**現在の設定**:
- `tag-rule.ts`: `DEBUG_TAG_DUPLICATION = true`
- `bracket-rule.ts`: `DEBUG_BRACKET_DUPLICATION = true`

**本番環境では必ず**:
```typescript
const DEBUG_TAG_DUPLICATION = false;
const DEBUG_BRACKET_DUPLICATION = false;
```

に変更してください。

---

## 📊 ログで特に注目する項目

| 項目 | 期待値 | 確認内容 |
|------|-------|---------|
| **Call 数** | 通常は 1-2 回 | 3 回以上なら過剰トリガー |
| **時間差** | `timeSinceLast` | 50ms 以内なら重複検出対象 |
| **重複検出** | 表示されるべき | 表示されなければ検出失敗 |
| **マーク有無** | 2 回目は SKIP | 既に Mark がついているか確認 |

---

## 🔧 トラブルシューティング

### Q: ログが表示されない

**A**:
1. 開発サーバーを再起動（Ctrl+C → `bun dev`）
2. ブラウザキャッシュをクリア（Cmd+Shift+Delete）
3. ページを完全リロード（Cmd+R）

### Q: ログが大量に出力される

**A**:
1. エディタからフォーカスを外してから入力
2. 複数回の入力が連続していないか確認
3. IME 入力完了後にログが多いなら double-trigger の証拠

### Q: "## テスト" が解決されない

**A**:
1. **DUPLICATE-DETECTED が表示されないなら**: 時間ウィンドウ判定が失敗している可能性
2. **SKIP ログが表示されないなら**: マーク有無判定が失敗している可能性
3. **すべてのログが表示されているなら**: suggestion-plugin または resolver-queue が関連している可能性

---

## 次のステップ

1. **ブラウザでテスト実施**
2. **ログを確認して問題箇所を特定**
3. **問題に応じた修正を実装**
4. **修正後、テストで検証**

---

**ドキュメント作成日**: 2025-10-19  
**次の確認**: ブラウザでのログ出力確認
