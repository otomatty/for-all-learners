# 20251029_03 マジックナンバーを定数に抽出

**作成日**: 2025-10-29
**関連Issue**: #37
**優先度**: ⭐⭐⭐ (中)
**ステータス**: ✅ 完了

## 実施した作業

### 問題の概要

編集時間の推定値（15分、10分、1分）がハードコードされており、メンテナンス性が低下していました。将来的に値を変更する際に、複数箇所を修正する必要があり、修正漏れのリスクがありました。

### 実装内容

#### 1. 定数の定義（constants.ts）

`app/(protected)/dashboard/_components/ActivityCalendar/constants.ts` に新しい定数を追加：

```typescript
/**
 * ノート編集時間の推定値（分）
 */
export const NOTE_EDIT_TIME_ESTIMATES = {
	CREATE: 15, // ページ作成の推定時間（分）
	UPDATE: 10, // ページ更新の推定時間（分）
	LINK: 1,    // リンク作成の推定時間（分）
} as const;

/**
 * 目標達成判定閾値（%）
 */
export const GOAL_THRESHOLDS = {
	HIGH: 80,   // 高達成率の閾値（80%以上）
	MEDIUM: 50, // 中達成率の閾値（50%以上）
	LOW: 20,    // 低達成率の閾値（20%以上）
} as const;
```

#### 2. マジックナンバーの置き換え（activity_calendar.ts）

**修正箇所: 2箇所**

**箇所1: `calculateNoteStats()` 関数**

```typescript
// Before: Magic numbers
const totalEditMinutes =
  pagesCreated * 15 + pagesUpdated * 10 + linksCreated * 1;

// After: Named constants
const totalEditMinutes =
  pagesCreated * NOTE_EDIT_TIME_ESTIMATES.CREATE +
  pagesUpdated * NOTE_EDIT_TIME_ESTIMATES.UPDATE +
  linksCreated * NOTE_EDIT_TIME_ESTIMATES.LINK;
```

**箇所2: `calculateNoteStatsFromData()` 関数**

```typescript
// Before: Magic numbers
const totalEditMinutes =
  pagesCreated * 15 + pagesUpdated * 10 + linksCreated * 1;

// After: Named constants
const totalEditMinutes =
  pagesCreated * NOTE_EDIT_TIME_ESTIMATES.CREATE +
  pagesUpdated * NOTE_EDIT_TIME_ESTIMATES.UPDATE +
  linksCreated * NOTE_EDIT_TIME_ESTIMATES.LINK;
```

#### 3. importの追加

```typescript
import {
  ACTIVITY_THRESHOLDS,
  NOTE_EDIT_TIME_ESTIMATES,  // 追加
} from "@/app/(protected)/dashboard/_components/ActivityCalendar/constants";
```

### 改善のメリット

#### 1. 保守性の向上

**Before:**
```typescript
// 3箇所に同じマジックナンバーが存在
const time1 = created * 15 + updated * 10 + links * 1;  // 箇所1
const time2 = created * 15 + updated * 10 + links * 1;  // 箇所2
const time3 = created * 15 + updated * 10 + links * 1;  // 箇所3
```

**After:**
```typescript
// 1箇所の定数定義を参照
const time = created * NOTE_EDIT_TIME_ESTIMATES.CREATE +
             updated * NOTE_EDIT_TIME_ESTIMATES.UPDATE +
             links * NOTE_EDIT_TIME_ESTIMATES.LINK;
```

値を変更する場合、**constants.ts の1箇所のみ修正**すればよい。

#### 2. 可読性の向上

```typescript
// ❌ Bad: 数字だけでは意味が不明瞭
const time = created * 15 + updated * 10 + links * 1;
// 15とは何？10とは？

// ✅ Good: 定数名で意味が明確
const time = created * NOTE_EDIT_TIME_ESTIMATES.CREATE +
             updated * NOTE_EDIT_TIME_ESTIMATES.UPDATE +
             links * NOTE_EDIT_TIME_ESTIMATES.LINK;
// CREATE = 作成、UPDATE = 更新、LINK = リンク
```

#### 3. 型安全性

```typescript
export const NOTE_EDIT_TIME_ESTIMATES = {
  CREATE: 15,
  UPDATE: 10,
  LINK: 1,
} as const;  // ← 'as const' で readonly に
```

- `as const`により、値が変更されないことを保証
- TypeScriptがリテラル型として認識
- 誤って値を変更しようとするとコンパイルエラー

#### 4. 将来的な拡張性

```typescript
// 将来的に新しい種類の編集を追加する場合
export const NOTE_EDIT_TIME_ESTIMATES = {
  CREATE: 15,
  UPDATE: 10,
  LINK: 1,
  DELETE: 2,    // ← 追加が容易
  ARCHIVE: 5,   // ← 追加が容易
} as const;
```

### ベストプラクティス

#### 1. マジックナンバーを避けるべき場合

以下の場合は、マジックナンバーを定数に抽出すべきです：

- [ ] 同じ数字が複数箇所に出現
- [ ] ビジネスロジックに関連する値
- [ ] 将来変更される可能性がある値
- [ ] 単位や意味を持つ値（時間、距離、金額など）

#### 2. マジックナンバーのままで良い場合

以下の場合は、マジックナンバーのままでも問題ありません：

- 数学的定数（`Math.PI`は既に定数として定義済み）
- 配列のインデックス（`array[0]`, `array[1]`）
- 小数点の丸め（`Math.round(x * 10) / 10`）
- ループカウンタ（`for (let i = 0; i < 10; i++)`）

### 命名規則

今回採用した命名規則：

```typescript
// ✅ Good: 意味が明確
NOTE_EDIT_TIME_ESTIMATES  // ノート編集時間の推定値
GOAL_THRESHOLDS           // 目標達成閾値
ACTIVITY_THRESHOLDS       // 活動レベル閾値

// ❌ Bad: 意味が不明瞭
TIMES          // 何の時間？
NUMBERS        // 何の数字？
CONFIG         // 何の設定？
```

- **大文字スネークケース**: 定数オブジェクト名
- **PascalCase**: オブジェクトのプロパティ名（`CREATE`, `UPDATE`, `LINK`）
- **具体的な名前**: 何の値か明確にする

## 変更ファイル

1. `app/(protected)/dashboard/_components/ActivityCalendar/constants.ts`
   - `NOTE_EDIT_TIME_ESTIMATES` 追加
   - `GOAL_THRESHOLDS` 追加（今後使用予定）

2. `app/_actions/activity_calendar.ts`
   - import に `NOTE_EDIT_TIME_ESTIMATES` 追加
   - `calculateNoteStats()` で定数使用
   - `calculateNoteStatsFromData()` で定数使用

## テスト確認項目

- [x] TypeScriptコンパイルエラーなし
- [x] Lintエラーなし
- [ ] 計算結果が変更前と一致（手動テスト必要）
- [ ] 定数の値が正しく使用されている（コードレビュー）

## 影響範囲

### 動作への影響

- **なし**: 計算結果は変更前と同一
- 定数の値は変更していないため、動作は完全に同じ

### 将来的な影響

- **メンテナンス**: 値の変更が容易
- **拡張性**: 新しい種類の編集時間を追加しやすい
- **可読性**: コードの意図が明確

## 次のステップ

### 今回実装したこと
- ✅ マジックナンバーを定数に抽出
- ✅ `NOTE_EDIT_TIME_ESTIMATES` の定義と使用
- ✅ `GOAL_THRESHOLDS` の定義（今後使用予定）

### 今後の改善（Phase 2以降）

1. **GOAL_THRESHOLDSの活用**
   - 目標達成判定ロジックで使用
   - ハードコードされた閾値を定数化

2. **その他のマジックナンバー**
   - タイムアウト値
   - リトライ回数
   - ページネーション設定

3. **設定の外部化（将来的）**
   - ユーザーごとにカスタマイズ可能に
   - データベースで管理
   - 管理画面から変更可能に

## 関連ドキュメント

- **Issue**: #37 - Extract magic numbers to constants
- **実装計画**: `docs/03_plans/dashboard-calendar-ui/20251028_01_calendar-ui-specification.md`
- **前回の作業**: 
  - `docs/05_logs/2025_10/20251029/01_fix-n-plus-1-query-issue.md`
  - `docs/05_logs/2025_10/20251029/02_fix-supabase-neq-bug.md`

## 学び・気づき

### コード品質の原則

1. **マジックナンバーは保守性を下げる**
   - 同じ数字が複数箇所に存在すると修正漏れのリスク
   - コメントだけでは不十分（コメントと実装がズレる可能性）

2. **定数化のコスト vs メリット**
   - **コスト**: 定数定義とimportが必要（わずか）
   - **メリット**: 保守性・可読性の大幅向上

3. **単一責任の原則**
   - 定数は `constants.ts` に集約
   - ロジックは別ファイル
   - 明確な責任分担

### TypeScriptの活用

1. **`as const` の重要性**
   ```typescript
   // ❌ Bad: 値が変更可能
   export const CONFIG = { value: 10 };
   CONFIG.value = 20; // OK（意図しない変更）

   // ✅ Good: readonly で保護
   export const CONFIG = { value: 10 } as const;
   CONFIG.value = 20; // Error!
   ```

2. **型推論の活用**
   ```typescript
   const time = NOTE_EDIT_TIME_ESTIMATES.CREATE;
   // 型: 15 (リテラル型)
   ```

### プロジェクト管理

1. **段階的なリファクタリング**
   - 動作に影響しない範囲で改善
   - 大規模な変更は避ける
   - 小さな改善を積み重ねる

2. **ドキュメントの重要性**
   - なぜその値なのか
   - 将来どう変更する可能性があるか
   - コメントで明記

---

**作成者**: GitHub Copilot
**最終更新**: 2025-10-29
