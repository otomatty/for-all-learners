# 画像OCR右クリックメニュー機能 実装計画書

## 概要

Tiptapエディタ内のGyazo画像ノードに対して、右クリックコンテキストメニューから「この画像を文字起こしする」機能を実装する。OCRはクライアントサイドで実行し、抽出されたテキストをエディタに挿入する。

## 技術要件

### フロントエンド技術スタック
- **OCRライブラリ**: Tesseract.js 5.x
- **UIコンポーネント**: shadcn/ui ContextMenu（既存）
- **エディタ**: Tiptap with React NodeView（既存）
- **状態管理**: React useState + custom hooks
- **スタイリング**: Tailwind CSS（既存）

### パフォーマンス要件
- OCR処理時間: 中程度の画像（300x300px）で3-10秒以内
- Worker使用によるUIブロッキング回避
- 画像サイズ最適化（必要に応じてリサイズ）

## アーキテクチャ設計

### ディレクトリ構造

```
lib/
├── ocr/
│   ├── tesseract-worker.ts         # Tesseract.js Worker管理
│   ├── image-processor.ts          # 画像前処理ユーティリティ
│   └── ocr-client.ts              # クライアントOCRメイン処理
│
components/
├── ui/
│   └── context-menu.tsx           # 既存（shadcn/ui）
│
lib/tiptap-extensions/
├── gyazo-image-nodeview.tsx       # 拡張対象（右クリックメニュー追加）
└── gyazo-image.ts                 # 既存（拡張の必要性なし）

hooks/
└── use-image-ocr.ts               # OCR処理専用カスタムフック
```

### 主要コンポーネント設計

#### 1. OCRクライアント (`lib/ocr/ocr-client.ts`)
```typescript
interface OcrResult {
  success: boolean;
  text: string;
  confidence: number;
  processingTime: number;
  error?: string;
}

interface OcrOptions {
  language?: string;          // デフォルト: 'jpn+eng'
  maxImageSize?: number;      // デフォルト: 1024px
  preprocessingLevel?: 'basic' | 'enhanced';
}

export class ClientOcr {
  static async processImage(
    imageUrl: string, 
    options?: OcrOptions
  ): Promise<OcrResult>
}
```

#### 2. 画像NodeView拡張 (`lib/tiptap-extensions/gyazo-image-nodeview.tsx`)
```typescript
interface EnhancedGyazoImageNodeViewProps extends NodeViewProps {
  onOcrComplete?: (text: string) => void;
}

// 既存のGyazoImageNodeViewを拡張
// - ContextMenuでラップ
// - OCR処理ハンドラー追加
// - ローディング状態管理
```

#### 3. OCRカスタムフック (`hooks/use-image-ocr.ts`)
```typescript
interface UseImageOcrReturn {
  processImage: (imageUrl: string) => Promise<void>;
  isProcessing: boolean;
  progress: number;
  error: string | null;
  clearError: () => void;
}

export function useImageOcr(
  onComplete: (text: string) => void
): UseImageOcrReturn
```

## 実装フェーズ

### Phase 1: 依存関係とOCRコア実装 
**推定時間: 2-3時間**

1. **Tesseract.js導入**
   ```bash
   npm install tesseract.js
   npm install @types/tesseract.js --save-dev
   ```

2. **OCRコアライブラリ実装**
   - `lib/ocr/tesseract-worker.ts` - Worker管理
   - `lib/ocr/image-processor.ts` - 画像前処理
   - `lib/ocr/ocr-client.ts` - メイン処理

3. **OCRカスタムフック実装**
   - `hooks/use-image-ocr.ts`

### Phase 2: UI統合と NodeView拡張
**推定時間: 3-4時間**

1. **GyazoImageNodeView拡張**
   - 既存コンポーネントにContextMenu統合
   - OCR処理UI状態管理
   - エラーハンドリング

2. **コンテキストメニュー実装**
   - shadcn/ui ContextMenuコンポーネント使用
   - "この画像を文字起こしする" メニュー項目
   - アイコン付きメニュー項目（OCRアイコン）

### Phase 3: エディタ統合とテキスト挿入
**推定時間: 2-3時間**

1. **Tiptapエディタとの統合**
   - OCR完了後のテキスト挿入ロジック
   - 挿入位置の制御（画像ノードの後ろ）
   - 既存のusePageEditorLogicとの統合

2. **UX改善**
   - OCR処理中のプログレスインジケータ
   - 成功/失敗のトースト通知
   - キーボードショートカット（オプション）

### Phase 4: テストと最適化
**推定時間: 2-3時間**

1. **単体テスト実装**
   - OCRユーティリティのテスト
   - カスタムフックのテスト
   - 画像前処理関数のテスト

2. **パフォーマンス最適化**
   - Worker初期化の最適化
   - 画像サイズ自動調整
   - メモリリーク対策

## セキュリティ・パフォーマンス考慮事項

### セキュリティ
- **画像URLバリデーション**: Gyazo URLのみ許可
- **CORS対応**: 画像取得時のCORS制約対応
- **XSS対策**: 抽出テキストのサニタイズ

### パフォーマンス
- **Worker利用**: メインスレッドブロッキング回避
- **画像最適化**: 大きな画像の自動リサイズ
- **キャッシュ戦略**: Tesseract.jsモデルのキャッシュ
- **メモリ管理**: 処理完了後のリソース解放

## エラーハンドリング戦略

### OCR処理エラー
1. **ネットワークエラー**: 画像取得失敗
2. **画像形式エラー**: サポートされていない形式
3. **OCR処理エラー**: Tesseract処理失敗
4. **メモリ不足**: 大きな画像処理時

### ユーザーフィードバック
- 各エラーに対する適切なメッセージ表示
- リトライ機能（ネットワークエラー時）
- 処理キャンセル機能
- プログレス表示

## 将来的な拡張性

### 追加機能候補
1. **OCR言語設定**: ユーザー設定で日本語/英語選択
2. **バッチ処理**: 複数画像の一括OCR
3. **OCR精度向上**: 画像前処理オプション
4. **テキスト編集**: OCR結果の手動修正機能
5. **履歴機能**: OCR処理履歴の保存

### スケーラビリティ
- サーバーサイドOCRとの切り替え機能
- OCR API（Google Vision等）との統合準備
- 処理量制限とクォータ管理

## 実装優先度

### 必須（MVP）
- [x] 基本OCR機能
- [x] 右クリックメニュー
- [x] エディタテキスト挿入
- [x] エラーハンドリング

### 推奨
- [ ] プログレス表示
- [ ] 画像最適化
- [ ] パフォーマンス最適化

### オプション
- [ ] OCR言語設定
- [ ] バッチ処理
- [ ] 履歴機能

## 技術的制約・リスク

### 制約
1. **ブラウザ対応**: Tesseract.js対応ブラウザのみ
2. **処理速度**: サーバーサイドOCRより低速
3. **精度**: 複雑な画像での認識精度制限
4. **メモリ使用量**: 大きな画像処理時の高メモリ使用

### リスク軽減策
1. **フォールバック**: クライアントOCR失敗時はサーバーサイド処理
2. **プログレッシブエンハンスメント**: OCR機能なしでも基本機能動作
3. **適切な制限**: 画像サイズ・処理時間の制限設定
4. **ユーザー教育**: 機能説明とベストプラクティス提示

---

## 実装順序まとめ

1. **Phase 1**: OCRコア実装 → Tesseract.js統合
2. **Phase 2**: NodeView拡張 → UI統合  
3. **Phase 3**: エディタ統合 → UX改善
4. **Phase 4**: テスト → 最適化

**推定総実装時間: 9-13時間**

この計画書に基づき、段階的な実装を進めることで、安定したOCR機能付きコンテキストメニューを実現できる。
