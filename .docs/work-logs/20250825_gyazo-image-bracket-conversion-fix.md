# 作業ログ: Gyazo画像ブラケット変換問題の修正

**日付:** 2025-08-25  
**担当者:** AI Assistant  
**作業概要:** Gyazo画像リンクのブラケット変換時に発生していたブラケット残存問題を調査・修正

## 背景・課題

### 問題の症状
Gyazo URLをペーストしてブラケット化された後、画像ノードに変換される際に以下の問題が発生：

```
元の状態: [https://gyazo.com/xxxxx]
↓ 変換後（問題）
結果: [https://gyazo.com/xxx

{画像が表示}

]
```

- ブラケットが部分的に残る
- 画像は正常に表示されるが、前後にブラケットの断片が残存
- Enterキー押下時とスペースキー押下時で挙動が異なる

### 初期の仮説
1. Enterキーでの手動変換機能が存在する（実際は存在せず）
2. InputRuleが正常に動作していない
3. ブラケット削除処理が不完全

## 調査プロセス

### 1. デバッグ環境の構築
- `gyazo-image.ts`にInputRule発火ログを追加
- `usePageEditorLogic.ts`にトランザクション監視を追加
- Enterキー押下時の手動変換テスト機能を実装

### 2. 根本原因の特定

#### 初期の誤解
- **誤**: Enterキーで手動変換する機能が存在
- **正**: InputRuleは自動で動作し、ペースト→ブラケット化→InputRule発火の流れ

#### 実際の問題
1. **ペースト処理**: `[URL]` 形式でブラケット化は正常動作
2. **InputRule発火**: 複数のInputRuleが競合して2段階で実行
3. **置換処理**: 部分的な置換により、ブラケットの断片が残存

### 3. ログ解析結果

```javascript
// 正常なログ出力
🖼️ GyazoImage: addInputRules called - InputRules are being registered
🖼️ GyazoImage: Returning 4 InputRules
🖼️ GyazoImage: Paste wrapping
🖼️ GyazoImage: Single-bracket InputRule triggered (2回発火)
🔄 Transaction: ReplaceStep detected (複数回実行)
```

**発見事項**: InputRuleが2回発火し、不完全な置換が発生していた

## 修正内容

### 1. 競合するInputRuleの無効化
```typescript
// 無効化対象
// nodeInputRule({ find: /https:\/\/gyazo\.com\/([A-Za-z0-9]+)/ })
// nodeInputRule({ find: /https:\/\/i\.gyazo\.com\/([A-Za-z0-9]+)\.png/ })
```

### 2. 直接変換アプローチの採用
ペースト時の処理を変更：
- **従来**: ペースト → ブラケット化 → InputRule → 画像変換
- **修正後**: ペースト → 直接画像変換

```typescript
// 修正後のペースト処理
handlePaste(view, event) {
    const text = event.clipboardData?.getData("text/plain");
    const match = text?.match(/https:\/\/gyazo\.com\/([A-Za-z0-9]+)/);
    if (match) {
        // 直接画像ノードに変換（ブラケット化をスキップ）
        const imageNode = imageType.create({
            src: `https://i.gyazo.com/${match[1]}.png`
        });
        view.dispatch(view.state.tr.replaceSelectionWith(imageNode));
        return true;
    }
}
```

### 3. InputRuleの簡素化
```typescript
// 修正後: ブラケット専用InputRuleのみ保持
nodeInputRule({
    find: /^\[https:\/\/gyazo\.com\/([A-Za-z0-9]+)\]$/,
    type: this.type,
    // ...
})
```

## テスト結果

### 修正前
```
入力: https://gyazo.com/xxxxx (ペースト)
結果: [https://gyazo.com/xx{画像}]  ❌
```

### 修正後
```
入力: https://gyazo.com/xxxxx (ペースト)
結果: {画像}  ✅
```

## 副次的な問題

### PageLinkとの競合発生
修正により通常のページリンク用ブラケット機能に影響が発生：
- 通常の `[ページ名]` リンクが正常に動作しない可能性
- PageLink ExtensionとGyazoImage Extensionの処理順序要検討

## 技術的な学び

### InputRuleの動作原理
- InputRuleは文字入力時に正規表現マッチングを実行
- 複数のInputRuleが同じパターンにマッチすると競合が発生
- 正規表現の優先順位と精度が重要

### ProseMirrorプラグインの競合
- 複数のExtensionが同じ入力パターンを処理する場合の競合リスク
- プラグインの実行順序とハンドラーの戻り値の重要性

### デバッグ手法の有効性
- ログベースのデバッグが複雑な処理フローの解析に有効
- トランザクション監視によるドキュメント変更の可視化

## 今後の課題

1. **PageLinkとの競合解決**
   - ブラケットパターンの優先順位調整
   - URL判定ロジックの改善

2. **拡張性の考慮**
   - 他の外部サービス画像との競合回避
   - 統一的な画像変換フレームワークの検討

3. **ユーザビリティ向上**
   - 手動変換オプションの提供（Ctrl+Enter）
   - エラー処理とフィードバックの改善

## ファイル変更履歴

### 主要変更
- `lib/tiptap-extensions/gyazo-image.ts`
  - InputRule競合修正
  - 直接変換ロジック実装
  - デバッグログ追加

### デバッグ用変更（本番前削除予定）
- `app/(protected)/pages/[id]/_hooks/usePageEditorLogic.ts`
  - トランザクション監視ログ
  - アップデート監視ログ

## 結論

**根本原因**: 複数InputRuleの競合による部分的置換  
**解決方法**: 直接変換アプローチによる競合回避  
**結果**: Gyazo画像のブラケット残存問題は解決  
**課題**: PageLinkとの新たな競合が発生（次ステップで解決予定）

---
*この作業ログは技術的な問題解決プロセスの記録として作成されました。*
