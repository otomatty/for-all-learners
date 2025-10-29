# コード品質改善とパフォーマンス最適化

**日付:** 2025-10-29
**担当者:** AI Assistant (Grok Code Fast 1)
**関連 Issue:** GitHub Issues #38, #39, #40

---

## 📋 実施内容の概要

アクティビティカレンダー機能のコード品質と追加的なパフォーマンス最適化を実施しました。

---

## ✅ Issue #38: コード品質の改善

### 変更内容

#### 1. 重複コードの削除

**ファイル:** `app/(protected)/dashboard/_components/ActivityCalendar/CalendarGrid.tsx`

**問題:**
- `cn()` ユーティリティ関数が CalendarGrid.tsx 内で重複定義されていた (lines 65-66)
- 既に `@/lib/utils` で定義されている関数の重複

**修正内容:**
```diff
+ import { cn } from "@/lib/utils";

- const cn = (...classes: string[]) =>
-   classes.filter(Boolean).join(" ");
```

#### 2. マジックテキストの定数化

**ファイル:** `app/(protected)/dashboard/_components/ActivityCalendar/constants.ts`

**問題:**
- `activity_calendar.ts` line 588 で `as typeof ACTIVITY_LEVEL_TEXT[keyof typeof ACTIVITY_LEVEL_TEXT]` という型アサーションを使用
- インラインテキスト値 ("優秀", "良好" など) が散在している可能性

**修正内容:**
```typescript
// Added to constants.ts
export const ACTIVITY_LEVEL_TEXT = {
  excellent: "優秀",
  good: "良好",
  partial: "わずか",
  none: "活動なし",
} as const;
```

**注記:**
- `ActivityIndicator.tsx` を確認したが、既に適切に実装されており修正不要だった
- 型アサーションは Supabase の型推論の制限により必要なもので、適切な実装と判断

---

## ✅ Issue #39: ドキュメント修正

### 変更内容

**ファイル:** `docs/03_plans/dashboard-calendar-ui/20251028_01_calendar-ui-specification.md`

#### 1. 重複セクションの削除

**問題:**
- "### データモデル" セクションが lines 433 と 440 で重複していた

**修正前 (lines 433-445):**
```markdown
### データモデル

```typescript
type DayData = {
  // ...
``  // ← 壊れたコードブロック閉じタグ

### データモデル  // ← 重複ヘッダー

型定義は以下のようになります:
```

**修正後:**
```markdown
### データモデル

型定義は以下のようになります:

```typescript
type DayData = {
  date: string;
  dayOfWeek: number;
  learningMinutes: number;
  noteCreated: number;
  noteUpdated: number;
  estimatedTotalMinutes: number;
};
```
```

---

## ✅ Issue #40: 追加的なパフォーマンス最適化

### 変更内容

#### 1. カレンダーグリッド生成の最適化

**ファイル:** `app/(protected)/dashboard/_components/ActivityCalendar/utils.ts`

**問題:**
- `generateCalendarGrid()` 関数で O(n*m) の時間計算量
- 各日付 (35-42日分) に対して `days.find()` を実行 → O(n) 操作を m 回繰り返し

**修正前 (lines 37-55):**
```typescript
export function generateCalendarGrid(
  days: DayData[],
  firstDate: Date,
  lastDate: Date,
): CalendarGridDay[] {
  const result: CalendarGridDay[] = [];
  const current = startOfDay(firstDate);
  const end = startOfDay(lastDate);

  while (current <= end) {
    const dateStr = format(current, "yyyy-MM-dd");
    const dayData = days.find((d) => d.date === dateStr);  // ← O(n) 操作
    
    result.push({
      date: dateStr,
      dayOfWeek: getDay(current),
      dayData: dayData ?? null,
    });
    
    current.setDate(current.getDate() + 1);
  }

  return result;
}
```

**修正後:**
```typescript
export function generateCalendarGrid(
  days: DayData[],
  firstDate: Date,
  lastDate: Date,
): CalendarGridDay[] {
  const result: CalendarGridDay[] = [];
  const current = startOfDay(firstDate);
  const end = startOfDay(lastDate);

  // Create a Map for O(1) lookups instead of O(n) find operations
  const daysMap = new Map(days.map((d) => [d.date, d]));

  while (current <= end) {
    const dateStr = format(current, "yyyy-MM-dd");
    const dayData = daysMap.get(dateStr);  // ← O(1) 操作
    
    result.push({
      date: dateStr,
      dayOfWeek: getDay(current),
      dayData: dayData ?? null,
    });
    
    current.setDate(current.getDate() + 1);
  }

  return result;
}
```

**パフォーマンス改善:**
- **修正前:** O(n*m) → 35日 × 最大31データ = 最大1,085回の比較操作
- **修正後:** O(n) → Map 作成: 31回 + ルックアップ: 35回 = 合計66回の操作
- **改善率:** 約94% (1,085 → 66 操作)

#### 2. 並列データ取得の実装

**ファイル:** `app/(protected)/dashboard/page.tsx`

**問題:**
- 複数のデータ取得が逐次的に実行されていた
- 以下の箇所で順次 await:
  1. `getAccountById()` (line 33)
  2. `studyGoals` と `logs` を Promise.all (lines 34-37)
  3. `decks` クエリ (lines 47-51)
  4. `dueMap` (line 61)
  5. `monthData` (lines 74-78)

**修正前:**
```typescript
// Fetch account info, dashboard stats, and study data
await getAccountById(user.id);
const [studyGoals, logs] = await Promise.all([
  getStudyGoalsByUser(user.id),
  getLearningLogsByUser(user.id),
]);

// ... その後に続く
const { data: deckRows, error: deckError } = await supabase
  .from("decks")
  .select("*")
  .eq("user_id", user.id);

// ... さらに後で
const dueMap = await getAllDueCountsByUser(user.id);

// ... さらに後で
const monthData = await getMonthlyActivitySummary(
  user.id,
  currentYear,
  currentMonth,
);
```

**修正後:**
```typescript
// Fetch account info first (may have side effects)
await getAccountById(user.id);

// Fetch all required data in parallel to minimize latency
const [studyGoals, logs, decksResult, dueMap, monthData] = await Promise.all([
  getStudyGoalsByUser(user.id),
  getLearningLogsByUser(user.id),
  supabase.from("decks").select("*").eq("user_id", user.id),
  getAllDueCountsByUser(user.id),
  getMonthlyActivitySummary(user.id, currentYear, currentMonth),
]);

// Check decks result
if (decksResult.error || !decksResult.data) {
  return (
    <Container>
      <p>デッキの取得に失敗しました。</p>
    </Container>
  );
}
```

**パフォーマンス改善:**
- **修正前:** 順次実行 → 各クエリのレイテンシが加算される
  - 例: 50ms + 50ms + 50ms + 50ms + 50ms = 250ms
- **修正後:** 並列実行 → 最も遅いクエリのレイテンシのみ
  - 例: max(50ms, 50ms, 50ms, 50ms, 50ms) = 50ms
- **改善率:** 約80% (250ms → 50ms) ※ネットワーク条件による

---

## 📊 総合的なパフォーマンス改善

### カレンダーUI機能全体の最適化結果

| 項目 | 修正前 | 修正後 | 改善率 |
|------|--------|--------|--------|
| **月次クエリ数** (Issue #35) | 62-93回 | 3回 | 96% |
| **カレンダーグリッド生成** (Issue #40) | O(n*m) 1,085操作 | O(n) 66操作 | 94% |
| **ダッシュボードデータ取得** (Issue #40) | 250ms (推定) | 50ms (推定) | 80% |

### コード品質改善

- ✅ 重複コード削除 (Issue #38)
- ✅ マジックナンバー/テキストの定数化 (Issue #37, #38)
- ✅ ドキュメント整合性の確保 (Issue #39)
- ✅ クエリバグ修正 (Issue #36)

---

## 🧪 テスト結果

### Lint チェック

すべての修正ファイルで lint エラーなし:

```bash
# CalendarGrid.tsx
$ bun run lint app/(protected)/dashboard/_components/ActivityCalendar/CalendarGrid.tsx
Checked 1 file in 5ms. No fixes applied.

# constants.ts
$ bun run lint app/(protected)/dashboard/_components/ActivityCalendar/constants.ts
Checked 1 file in 5ms. No fixes applied.

# utils.ts
$ bun run lint app/(protected)/dashboard/_components/ActivityCalendar/utils.ts
Checked 1 file in 5ms. No fixes applied.

# page.tsx
$ bun run lint 'app/(protected)/dashboard/page.tsx'
Checked 1 file in 6ms. No fixes applied.
```

---

## 📝 学び・気づき

### 1. パフォーマンス最適化の多層的アプローチ

今回の改善作業で、以下の3層でパフォーマンス最適化を実施:

1. **データベースレイヤー** (Issue #35):
   - N+1クエリ問題の解決
   - バルクフェッチ + クライアント集計パターン

2. **アプリケーションレイヤー** (Issue #40):
   - 並列データ取得で待ち時間を削減
   - Promise.all による最適化

3. **アルゴリズムレイヤー** (Issue #40):
   - データ構造の選択 (Array → Map)
   - 時間計算量の削減 (O(n*m) → O(n))

### 2. コード品質改善の重要性

- 小さな重複コードも放置せず、共通化することでメンテナンス性向上
- マジックナンバー/テキストの定数化により、変更時の影響範囲を限定
- ドキュメントの整合性確保により、チームの理解を統一

### 3. Map の効果的な活用

JavaScript の Map は O(1) ルックアップを提供し、以下の場合に有効:

- ループ内で繰り返し検索する場合
- 一意キーでデータを管理する場合
- find() や filter() の代替として

### 4. Promise.all のベストプラクティス

並列化する際の考慮事項:

- **並列化すべき:** 互いに依存しない独立したデータ取得
- **並列化すべきでない:** 副作用がある操作、後続処理が依存する操作
- 今回のケースでは `getAccountById()` のみ先に実行し、残りを並列化

---

## 🔄 次回の作業

- [ ] GitHub Issue #38, #39, #40 にコメントを投稿
- [ ] 実際のパフォーマンス測定結果を記録 (可能であれば)
- [ ] さらなる最適化の可能性を調査:
  - カレンダーのプリフェッチ
  - サーバーコンポーネントでのストリーミング
  - React Server Components の活用

---

## 📂 関連ドキュメント

- **仕様書:** `docs/03_plans/dashboard-calendar-ui/20251028_01_calendar-ui-specification.md`
- **作業ログ (Issue #35):** `docs/05_logs/2025_10/20251029/01_fix-n-plus-1-query-issue.md`
- **作業ログ (Issue #36):** `docs/05_logs/2025_10/20251029/02_fix-supabase-neq-bug.md`
- **作業ログ (Issue #37):** `docs/05_logs/2025_10/20251029/03_extract-magic-numbers.md`
- **GitHub Issues:** otomatty/for-all-learners #38, #39, #40

---

**最終更新:** 2025-10-29
**ブランチ:** feature/dashboard-calendar-ui
