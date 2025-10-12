# Lint エラーの根本原因分析

## 発生しているエラー

`jsdom-setup.ts` の `cleanupJSDOMEnvironment()` 関数で以下の型エラーが発生：

```typescript
// Line 91-93
global.document = undefined; // ❌ 型 'undefined' を型 'Document' に割り当てることはできません
global.window = undefined; // ❌ 型 'undefined' を型 'Window & typeof globalThis' に割り当てることはできません
global.requestAnimationFrame = undefined; // ❌ 型 'undefined' を型 '(callback: FrameRequestCallback) => number' に割り当てることはできません
```

## 根本原因の詳細分析

### 1. TypeScript の strict モード

`tsconfig.json` で `"strict": true` が設定されており、これには以下が含まれます：

```jsonc
{
  "compilerOptions": {
    "strict": true // 以下のすべてを有効化
    // "strictNullChecks": true,      ← これが原因
    // "strictPropertyInitialization": true,
    // "noImplicitAny": true,
    // etc...
  }
}
```

### 2. strictNullChecks の影響

**strictNullChecks が有効な場合**:

- `null` と `undefined` は他の型とは別の型として扱われる
- 明示的に型に含めない限り、代入できない

```typescript
// strictNullChecks: true の場合
let doc: Document = undefined; // ❌ エラー
let doc: Document | undefined = undefined; // ✅ OK
```

### 3. グローバル変数の型定義

TypeScript の `lib.dom.d.ts` では、グローバル変数は以下のように定義されています：

```typescript
// lib.dom.d.ts (簡略化)
declare var document: Document;
declare var window: Window & typeof globalThis;
declare var requestAnimationFrame: (callback: FrameRequestCallback) => number;
```

**重要**: これらは `Document | undefined` ではなく、単なる `Document` として定義されています。

### 4. なぜ undefined を代入したいのか？

テスト環境のクリーンアップで、以下を実現したい：

```typescript
// JSDOM環境を「なかったこと」にする
global.document = undefined;
global.window = undefined;
global.requestAnimationFrame = undefined;
```

しかし、TypeScript の型システムは「グローバル変数は常に存在する」という前提で設計されているため、`undefined` への再代入を許可していません。

## 解決策の比較

### ❌ 解決策 1: @ts-ignore を使用（推奨しない）

```typescript
// @ts-ignore
global.document = undefined;
```

**問題点**:

- エラーを隠蔽するだけで根本解決にならない
- 型安全性が失われる
- 将来的なバグの温床になる

### ❌ 解決策 2: any を使用（推奨しない）

```typescript
(global as any).document = undefined;
```

**問題点**:

- 型チェックを完全に無効化
- プロジェクトの no-explicit-any ルールに違反
- 保守性が低下

### ⚠️ 解決策 3: delete を使用（部分的に有効）

```typescript
delete (global as any).document;
```

**問題点**:

- `any` を使用する必要がある（上記の問題）
- グローバル変数は `delete` で削除できない場合がある
- 実行時に予期しない動作をする可能性

### ✅ 解決策 4: 型アサーションを使用（現実的）

```typescript
global.document = undefined as unknown as Document;
global.window = undefined as unknown as Window & typeof globalThis;
global.requestAnimationFrame =
  undefined as unknown as typeof requestAnimationFrame;
```

**利点**:

- 型システムに対して「意図的な型変換」を明示
- 実行時の動作は変わらない
- コードレビューで意図が明確

**欠点**:

- 冗長に見える
- 型安全性を一部犠牲にする

### ✅ 解決策 5: Optional 化された型定義を追加（理想的だが大規模）

```typescript
// custom-globals.d.ts
declare global {
  var document: Document | undefined;
  var window: (Window & typeof globalThis) | undefined;
  var requestAnimationFrame:
    | ((callback: FrameRequestCallback) => number)
    | undefined;
}
```

**利点**:

- 型システムと実態が一致
- 完全な型安全性

**欠点**:

- グローバルな型定義の変更が必要
- 他のコードに影響を与える可能性
- テストコード専用の型定義が必要

### ✅ 解決策 6: クリーンアップを不要にする（最も推奨）

**本質的な問題**: そもそもクリーンアップが必要か？

```typescript
// 各テストファイルで独立した環境を作成
setupJSDOMEnvironment();

// テスト実行
describe("My Test", () => {
  // グローバル変数を上書きするだけ
});
```

**理由**:

1. **テストファイルごとに独立した環境**: Node.js ではファイルごとに分離されている
2. **上書きで十分**: 新しい値で上書きすれば、古い値は参照されない
3. **メモリリーク防止は別の方法で**: JSDOM インスタンス自体の破棄は不要
4. **実際の使用パターン**: クリーンアップを呼び出しているテストは 0 件

## 実装時の考慮事項

### なぜ cleanupJSDOMEnvironment() を提供したか

```typescript
/**
 * Cleanup JSDOM environment
 *
 * Removes the global.document and global.window references.
 * Usually not needed as each test file creates its own environment,
 * but can be useful in specific cleanup scenarios.
 */
```

- **意図**: 「もしかしたら必要かも」という配慮
- **現実**: 実際には使われていない
- **問題**: 型システムと衝突

## 推奨される解決策

### オプション A: 関数を削除（最もクリーン）

```typescript
// cleanupJSDOMEnvironment() 関数を完全に削除
// 理由: 実際には不要で、型エラーの原因になっている
```

**根拠**:

1. 現在のコードベースで使用されていない
2. Node.js のテスト環境では通常不要
3. 型システムと自然に調和する

### オプション B: 型アサーションで実装（柔軟性重視）

```typescript
export function cleanupJSDOMEnvironment(): void {
  // 明示的な型アサーションで意図を示す
  global.document = undefined as unknown as Document;
  global.window = undefined as unknown as Window & typeof globalThis;
  global.requestAnimationFrame =
    undefined as unknown as typeof requestAnimationFrame;
}
```

**根拠**:

1. 将来的に必要になる可能性に備える
2. 型アサーションで意図を明示
3. 実行時の動作は正しい

### オプション C: 削除可能なプロパティとして再定義（完全な型安全性）

```typescript
export function cleanupJSDOMEnvironment(): void {
  // defineProperty で削除可能に設定
  Object.defineProperty(global, "document", {
    value: undefined,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(global, "window", {
    value: undefined,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(global, "requestAnimationFrame", {
    value: undefined,
    writable: true,
    configurable: true,
  });
}
```

**根拠**:

1. 型エラーが発生しない
2. 実行時に確実に動作
3. より明示的な意図

## 結論

**推奨順位**:

1. **オプション A（関数削除）** - 最もクリーンで実用的

   - 現在使用されていない
   - 将来も不要である可能性が高い
   - YAGNI の原則（You Aren't Gonna Need It）に従う

2. **オプション C（defineProperty 使用）** - 将来の拡張性を考慮

   - 型エラーなし
   - 完全に動作する
   - やや複雑

3. **オプション B（型アサーション）** - バランス型
   - シンプル
   - 意図が明確
   - わずかな型安全性の犠牲

**次のアクション**:
ユーザーと相談して、プロジェクトのニーズに最も適した解決策を選択する。

## 学び

1. **strictNullChecks の重要性**: TypeScript の型安全性の中核
2. **グローバル変数の扱い**: 型システムは「常に存在する」前提
3. **YAGNI 原則**: 使われない機能は削除すべき
4. **型アサーション**: 意図的な型変換を明示する手段
5. **実装前の検証**: 型システムとの整合性を事前に確認

---

**作成日**: 2025-10-12  
**関連**: Phase 2.2 JSDOM 環境セットアップ共通化
