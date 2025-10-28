# ダッシュボード カレンダーUI 仕様書

**作成日**: 2025-10-28  
**対象機能**: ダッシュボードページのカレンダーUI実装  
**関連Issue**: TBD  
**実装フェーズ**: Phase 1 - カレンダーUIのみ

---

## 📋 目次

1. [概要](#概要)
2. [目的と背景](#目的と背景)
3. [機能要件](#機能要件)
4. [UI/UX仕様](#uiux仕様)
5. [技術仕様](#技術仕様)
6. [データモデル](#データモデル)
7. [コンポーネント設計](#コンポーネント設計)
8. [実装計画](#実装計画)
9. [将来の拡張](#将来の拡張)

---

## 概要

ダッシュボードページに学習活動とノート作成活動を日別に可視化するカレンダーUIを実装します。ユーザーは月単位でカレンダーを表示し、各日の活動状況を一目で把握できます。

### スコープ

**Phase 1 (本仕様):**
- 月表示カレンダーの実装
- 日別の活動サマリー表示
- **既存テーブルからのリアルタイム集計** （DB修正不要）
- 日付選択による詳細パネル表示

**データソース（既存テーブル）:**
- `learning_logs`: 学習活動データ（カード数、正答率、学習時間）
- `pages`: ノート作成・編集データ（`created_at`, `updated_at`）
- `card_page_links`: リンク作成データ

---

## 目的と背景

### 目的

1. **学習の可視化**: 日々の学習活動とノート作成活動を視覚的に把握
2. **モチベーション向上**: 学習の継続性を確認し、連続学習日数を意識
3. **振り返りの促進**: 過去の活動を振り返り、学習パターンを認識
4. **目標達成の支援**: 目標に対する進捗を日別に確認

### 背景

現在のダッシュボードには以下の機能があります:
- 学習目標サマリー (`GoalSummary`)
- クイックアクション (`QuickActionTiles`)
- 学習ヒートマップ (`GoalHeatmap`)

しかし、**日別の詳細な活動内容**や**ノート作成活動**が可視化されていません。カレンダーUIを導入することで、学習とノート作成の両方を統合的に表示し、ユーザーの学習体験を向上させます。

---

## 機能要件

### FR-1: 月表示カレンダー

**要件ID**: FR-CAL-001  
**優先度**: High

#### 説明
月単位で日付をカレンダー形式で表示します。

#### 詳細要件
- 現在月をデフォルト表示
- 前月・次月への移動ボタン
- 今月に戻るボタン
- 週の開始曜日: 日曜日（将来的に設定可能）
- 各日付セルに以下を表示:
  - 日付番号
  - 活動状況インジケーター（色・アイコン）
  - 簡易統計（カード枚数、ページ数、学習時間）

#### 受け入れ基準
- ✅ 月の全日付が正しく表示される
- ✅ 前月・次月に正しく遷移できる
- ✅ 今月ボタンで現在月に戻れる
- ✅ 各日付に活動情報が正しく表示される

---

### FR-2: 日別活動サマリー表示

**要件ID**: FR-CAL-002  
**優先度**: High

#### 説明
各日付セルに、その日の活動サマリーを視覚的に表示します。

#### 表示内容

**学習活動:**
- 🃏 復習カード枚数
- ✨ 新規カード枚数
- ⏱️ 学習時間（分）

**ノート活動:**
- ✍️ 新規ページ作成数
- 📝 ページ編集数
- 🔗 リンク作成数

**活動レベル表示:**
- 🟢 目標達成（優秀）
- 🟡 一部達成（良好）
- 🟠 わずかな活動
- ⚪ 活動なし

#### データソース
- `learning_logs` テーブル: 学習活動（既存）
  - `answered_at`: 回答日時
  - `is_correct`: 正誤
  - `effort_time`: 学習時間（秒）
  - `practice_mode`: 学習モード（review/new/cramming）
- `pages` テーブル: ページ作成・編集（既存）
  - `created_at`: ページ作成日時
  - `updated_at`: ページ更新日時
- `card_page_links` テーブル: リンク作成（既存）
  - `created_at`: リンク作成日時

**Phase 1の集計方法:**
既存テーブルから日別にリアルタイム集計（DB修正不要）

**Phase 2の最適化案:**
`daily_activity_summary` テーブル追加（パフォーマンス改善時）

#### 受け入れ基準
- ✅ 各日付に正しい活動データが表示される
- ✅ 活動レベルが正しく色分けされる
- ✅ アイコンと数値が読みやすい
- ✅ データがない日は適切に表示される（⚪）

---

### FR-3: 日付選択と詳細パネル

**要件ID**: FR-CAL-003  
**優先度**: High

#### 説明
日付をクリックすると、その日の詳細な活動内容を表示するパネルが開きます。

#### 詳細パネルの表示内容

**1. ヘッダー**
- 📅 選択日付
- 総活動時間
- 達成レベル

**2. 学習活動セクション**
```
🃏 カード学習活動 (45分)
  ┌────────────────────────────────────┐
  │ ITパスポート試験対策               │
  │   ├─ 復習: 15枚 (正答率: 87%)     │
  │   ├─ 新規: 5枚                    │
  │   └─ 学習時間: 25分               │
  │                                    │
  │ 英単語マスター                     │
  │   ├─ 復習: 10枚 (正答率: 90%)     │
  │   └─ 学習時間: 20分               │
  └────────────────────────────────────┘
```

**3. ノート活動セクション**
```
📝 ノート活動 (90分)
  ┌────────────────────────────────────┐
  │ ✍️ 新規作成 (2ページ)             │
  │   ├─ "プロジェクトマネジメント基礎" │
  │   └─ "スコープ定義のテクニック"    │
  │                                    │
  │ 📝 編集 (3ページ)                  │
  │   ├─ "PMBOK 第6版 要約"            │
  │   ├─ "リスクマネジメント"          │
  │   └─ "ステークホルダー分析"        │
  └────────────────────────────────────┘
```

**4. 達成目標セクション**
```
🎯 達成した目標
  ✅ 毎日60分以上学習 (達成: 135分)
  ✅ カード20枚以上復習 (達成: 25枚)
  ❌ 正答率90%以上 (実績: 87%)
```

#### インタラクション
- 日付セルをクリック → 詳細パネルが右側にスライドイン
- 閉じるボタンで詳細パネルを非表示
- 別の日付をクリック → 内容が更新される
- ESCキーで詳細パネルを閉じる

#### 受け入れ基準
- ✅ 日付クリックで詳細パネルが表示される
- ✅ 詳細パネルに正しいデータが表示される
- ✅ 閉じるボタンとESCキーで閉じられる
- ✅ 別の日付選択で内容が更新される
- ✅ スムーズなアニメーション

---

### FR-4: レスポンシブ対応

**要件ID**: FR-CAL-004  
**優先度**: Medium

#### 説明
デスクトップ・タブレット・モバイルで適切に表示されます。

#### 表示仕様

**デスクトップ (1024px以上):**
- カレンダーと詳細パネルを横並び表示
- 詳細パネルは右側にスライドイン

**タブレット (768px - 1023px):**
- カレンダーは小さめ表示
- 詳細パネルはオーバーレイ表示

**モバイル (767px以下):**
- カレンダーはコンパクト表示
- 詳細パネルは全画面モーダル表示
- 週表示への切り替えボタンを提供（将来実装）

#### 受け入れ基準
- ✅ 各デバイスで適切に表示される
- ✅ タッチ操作に対応
- ✅ 横スクロールが発生しない

---

## UI/UX仕様

### カラーパレット

#### 活動レベル色

```typescript
const ACTIVITY_COLORS = {
  excellent: {
    bg: 'bg-green-100',
    border: 'border-green-500',
    text: 'text-green-700',
    icon: '🟢'
  },
  good: {
    bg: 'bg-yellow-100',
    border: 'border-yellow-500',
    text: 'text-yellow-700',
    icon: '🟡'
  },
  partial: {
    bg: 'bg-orange-100',
    border: 'border-orange-500',
    text: 'text-orange-700',
    icon: '🟠'
  },
  none: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-400',
    icon: '⚪'
  }
} as const;
```

#### アクティビティタイプアイコン

```typescript
const ACTIVITY_ICONS = {
  card_review: '🃏',      // カード復習
  card_new: '✨',         // 新規カード
  page_created: '✍️',     // ページ作成
  page_updated: '📝',     // ページ編集
  link_created: '🔗',     // リンク作成
  time: '⏱️',            // 学習時間
  goal: '🎯',             // 目標
  streak: '🔥',           // ストリーク
} as const;
```

### レイアウト

#### デスクトップレイアウト

```
┌─────────────────────────────────────────────────────────────┐
│ Dashboard                                                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ ┌─────────────────────┐  ┌───────────────────────────────┐ │
│ │                     │  │                               │ │
│ │                     │  │  詳細パネル                   │ │
│ │   カレンダー        │  │  (選択時のみ表示)             │ │
│ │   (60%)             │  │  (40%)                        │ │
│ │                     │  │                               │ │
│ │                     │  │                               │ │
│ │                     │  │                               │ │
│ └─────────────────────┘  └───────────────────────────────┘ │
│                                                               │
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ クイックアクション                                        │ │
│ └───────────────────────────────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### モバイルレイアウト

```
┌───────────────────┐
│ Dashboard         │
├───────────────────┤
│                   │
│  カレンダー       │
│  (コンパクト)     │
│                   │
├───────────────────┤
│                   │
│ クイックアクション │
│                   │
└───────────────────┘

(日付タップ時)
┌───────────────────┐
│ ← 2025/10/28      │
├───────────────────┤
│                   │
│                   │
│  詳細パネル       │
│  (全画面モーダル) │
│                   │
│                   │
│                   │
└───────────────────┘
```

### アニメーション

- 詳細パネルのスライドイン: `300ms ease-out`
- 日付ホバー: `150ms ease-in-out`
- 月切り替え: `200ms ease-in-out`

---

## 技術仕様

### 使用技術

- **フレームワーク**: Next.js 14 (App Router)
- **UI**: React + TypeScript
- **スタイリング**: Tailwind CSS
- **データ取得**: Server Actions
- **日付処理**: date-fns
- **アイコン**: Lucide React
- **状態管理**: React hooks (useState, useEffect)

### コンポーネント構成

```
app/(protected)/dashboard/
├── page.tsx                              # ダッシュボードページ
└── _components/
    ├── GoalSummary/                      # 既存: 目標サマリー
    ├── QuickActionTiles.tsx              # 既存: クイックアクション
    └── ActivityCalendar/                 # NEW: カレンダー機能
        ├── index.tsx                     # カレンダーのエントリーポイント
        ├── CalendarHeader.tsx            # 月選択ヘッダー
        ├── CalendarGrid.tsx              # カレンダーグリッド
        ├── DayCell.tsx                   # 日付セル
        ├── DayDetailPanel.tsx            # 詳細パネル
        ├── ActivityIndicator.tsx         # 活動レベル表示
        ├── LearningActivitySection.tsx   # 学習活動セクション
        ├── NoteActivitySection.tsx       # ノート活動セクション
        ├── GoalAchievementSection.tsx    # 目標達成セクション
        └── types.ts                      # 型定義
```

### Server Actions

```typescript
// app/_actions/activity_calendar.ts

/**
 * 指定月の日別活動サマリーを取得
 * 既存テーブル（learning_logs, pages）からリアルタイム集計
 */
export async function getMonthlyActivitySummary(
  userId: string,
  year: number,
  month: number
): Promise<DailyActivitySummary[]>;

/**
 * 特定日の詳細な活動データを取得
 * 既存テーブルからリアルタイム集計
 */
export async function getDayActivityDetail(
  userId: string,
  date: Date
): Promise<DayActivityDetail>;

/**
 * 学習ログから日別の統計を計算
 * データソース: learning_logs テーブル
 */
async function calculateLearningStats(
  userId: string,
  date: Date
): Promise<LearningStats>;

/**
 * ページ作成・編集から日別の統計を計算
 * データソース: pages, card_page_links テーブル
 */
async function calculateNoteStats(
  userId: string,
  date: Date
): Promise<NoteStats>;
```

---

## データモデル

### 型定義

```typescript
---

## データモデル

### データベース構成

**Phase 1: 既存テーブルを使用（DB修正不要）**

#### 使用するテーブル

1. **learning_logs** - 学習活動データ
```sql
-- 必要なカラム
user_id UUID              -- ユーザー識別
answered_at TIMESTAMP     -- 回答日時（日付グルーピング用）
is_correct BOOLEAN        -- 正誤（正答率計算用）
effort_time INTEGER       -- 学習時間（秒）
practice_mode VARCHAR(20) -- 学習モード（review/new/cramming）
```

2. **pages** - ノート作成・編集データ
```sql
-- 必要なカラム
user_id UUID           -- ユーザー識別
created_at TIMESTAMP   -- 作成日時（新規ページカウント用）
updated_at TIMESTAMP   -- 更新日時（編集ページカウント用）
```

3. **card_page_links** - リンク作成データ
```sql
-- 必要なカラム
created_at TIMESTAMP   -- リンク作成日時
```

#### 集計クエリ例

```sql
-- 日別学習統計
SELECT 
  DATE(answered_at) as activity_date,
  COUNT(*) as total_cards,
  COUNT(*) FILTER (WHERE practice_mode = 'review') as reviewed_cards,
  COUNT(*) FILTER (WHERE practice_mode = 'new') as new_cards,
  AVG(CASE WHEN is_correct THEN 100.0 ELSE 0.0 END) as correct_rate,
  SUM(effort_time) / 60 as total_minutes
FROM learning_logs
WHERE user_id = $1
  AND DATE(answered_at) BETWEEN $2 AND $3
GROUP BY DATE(answered_at);

-- 日別ノート統計
SELECT 
  DATE(created_at) as activity_date,
  COUNT(*) as pages_created
FROM pages
WHERE user_id = $1
  AND DATE(created_at) = $2
GROUP BY DATE(created_at);
```

**パフォーマンス考慮事項:**
- 月単位（最大31日）の集計のため、リアルタイム集計でも許容範囲
- 既存インデックス（user_id, answered_at等）を活用
- 必要に応じてクエリ最適化

### 型定義

```typescript
// app/(protected)/dashboard/_components/ActivityCalendar/types.ts

/**
 * 日別活動サマリー（カレンダー表示用）
 */
export interface DailyActivitySummary {
  date: string; // YYYY-MM-DD
  
  // 学習統計
  learning: {
    totalCards: number;           // 総カード数
    reviewedCards: number;        // 復習カード数
    newCards: number;             // 新規カード数
```

/**
 * 日別活動詳細（詳細パネル表示用）
 */
export interface DayActivityDetail {
  date: string;
  summary: DailyActivitySummary;
  
  // 学習活動詳細
  learningActivities: {
    deckName: string;
    reviewedCards: number;
    newCards: number;
    correctRate: number;
    timeSpentMinutes: number;
  }[];
  
  // ノート活動詳細
  noteActivities: {
    created: {
      title: string;
      id: string;
      createdAt: string;
      estimatedCharacters: number;
    }[];
    updated: {
      title: string;
      id: string;
      updatedAt: string;
      estimatedCharacters: number;
    }[];
    linksCreated: number;
  };
  
  // 目標達成状況
  goalAchievements: {
    goalTitle: string;
    targetValue: number;
    actualValue: number;
    achieved: boolean;
  }[];
}

/**
 * カレンダー表示用の月データ
 */
export interface MonthData {
  year: number;
  month: number; // 1-12
  days: DailyActivitySummary[];
  totalActiveDays: number;
  streakCount: number;
}
```

---

## コンポーネント設計

### 1. ActivityCalendar (メインコンポーネント)

```typescript
// app/(protected)/dashboard/_components/ActivityCalendar/index.tsx

'use client';

import { useState } from 'react';
import { CalendarHeader } from './CalendarHeader';
import { CalendarGrid } from './CalendarGrid';
import { DayDetailPanel } from './DayDetailPanel';
import type { MonthData, DailyActivitySummary } from './types';

interface ActivityCalendarProps {
  initialMonthData: MonthData;
  userId: string;
}

export function ActivityCalendar({ 
  initialMonthData, 
  userId 
}: ActivityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState({
    year: initialMonthData.year,
    month: initialMonthData.month,
  });
  const [monthData, setMonthData] = useState(initialMonthData);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const handlePreviousMonth = async () => {
    // 前月データを取得して更新
  };

  const handleNextMonth = async () => {
    // 次月データを取得して更新
  };

  const handleToday = async () => {
    // 今月にリセット
  };

  const handleDayClick = (day: DailyActivitySummary) => {
    setSelectedDate(day.date);
    setIsDetailOpen(true);
  };

  return (
    <div className="flex gap-4">
      <div className="flex-1">
        <CalendarHeader
          year={currentMonth.year}
          month={currentMonth.month}
          onPreviousMonth={handlePreviousMonth}
          onNextMonth={handleNextMonth}
          onToday={handleToday}
        />
        <CalendarGrid
          monthData={monthData}
          onDayClick={handleDayClick}
          selectedDate={selectedDate}
        />
      </div>
      
      {isDetailOpen && selectedDate && (
        <DayDetailPanel
          date={selectedDate}
          userId={userId}
          onClose={() => setIsDetailOpen(false)}
        />
      )}
    </div>
  );
}
```

### 2. CalendarHeader

```typescript
// app/(protected)/dashboard/_components/ActivityCalendar/CalendarHeader.tsx

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CalendarHeaderProps {
  year: number;
  month: number;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}

export function CalendarHeader({
  year,
  month,
  onPreviousMonth,
  onNextMonth,
  onToday,
}: CalendarHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-2xl font-bold">
        {year}年{month}月
      </h2>
      
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPreviousMonth}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onToday}
        >
          今月
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onNextMonth}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

### 3. CalendarGrid

```typescript
// app/(protected)/dashboard/_components/ActivityCalendar/CalendarGrid.tsx

import { DayCell } from './DayCell';
import type { MonthData, DailyActivitySummary } from './types';

interface CalendarGridProps {
  monthData: MonthData;
  onDayClick: (day: DailyActivitySummary) => void;
  selectedDate: string | null;
}

export function CalendarGrid({
  monthData,
  onDayClick,
  selectedDate,
}: CalendarGridProps) {
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  
  // カレンダーグリッド用のデータ構造を生成
  const calendarDays = generateCalendarDays(monthData);

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 bg-gray-50">
        {weekdays.map((day) => (
          <div
            key={day}
            className="text-center py-2 text-sm font-medium text-gray-600"
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* 日付グリッド */}
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {calendarDays.map((day, index) => (
          <DayCell
            key={index}
            day={day}
            isSelected={day?.date === selectedDate}
            onClick={day ? () => onDayClick(day) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function generateCalendarDays(monthData: MonthData) {
  // カレンダーグリッド用のデータを生成
  // 前月・翌月の日付も含む
}
```

### 4. DayCell

```typescript
// app/(protected)/dashboard/_components/ActivityCalendar/DayCell.tsx

import { cn } from '@/lib/utils';
import { ActivityIndicator } from './ActivityIndicator';
import type { DailyActivitySummary } from './types';

interface DayCellProps {
  day: DailyActivitySummary | null;
  isSelected: boolean;
  onClick?: () => void;
}

export function DayCell({ day, isSelected, onClick }: DayCellProps) {
  if (!day) {
    return <div className="bg-gray-50 min-h-24" />;
  }

  const dayNumber = new Date(day.date).getDate();

  return (
    <button
      onClick={onClick}
      className={cn(
        'bg-white p-2 min-h-24 hover:bg-gray-50 transition-colors',
        'flex flex-col items-start text-left',
        'border-2 border-transparent',
        isSelected && 'border-blue-500 bg-blue-50',
        day.isToday && 'ring-2 ring-blue-400'
      )}
    >
      {/* 日付番号 */}
      <span className={cn(
        'text-sm font-medium mb-1',
        day.isToday && 'text-blue-600 font-bold'
      )}>
        {dayNumber}
      </span>
      
      {/* 活動インジケーター */}
      <ActivityIndicator summary={day} />
    </button>
  );
}
```

### 5. ActivityIndicator

```typescript
// app/(protected)/dashboard/_components/ActivityCalendar/ActivityIndicator.tsx

import type { DailyActivitySummary } from './types';
import { ACTIVITY_ICONS } from './constants';

interface ActivityIndicatorProps {
  summary: DailyActivitySummary;
}

export function ActivityIndicator({ summary }: ActivityIndicatorProps) {
  if (summary.activityLevel === 'none') {
    return (
      <div className="text-xs text-gray-400">
        活動なし
      </div>
    );
  }

  return (
    <div className="space-y-1 text-xs">
      {/* 学習活動 */}
      {summary.learning.totalCards > 0 && (
        <div className="flex items-center gap-1">
          <span>{ACTIVITY_ICONS.card_review}</span>
          <span>{summary.learning.totalCards}</span>
        </div>
      )}
      
      {/* ノート活動 */}
      {summary.notes.pagesCreated > 0 && (
        <div className="flex items-center gap-1">
          <span>{ACTIVITY_ICONS.page_created}</span>
          <span>{summary.notes.pagesCreated}</span>
        </div>
      )}
      
      {summary.notes.pagesUpdated > 0 && (
        <div className="flex items-center gap-1">
          <span>{ACTIVITY_ICONS.page_updated}</span>
          <span>{summary.notes.pagesUpdated}</span>
        </div>
      )}
      
      {/* 学習時間 */}
      {summary.learning.totalMinutes > 0 && (
        <div className="flex items-center gap-1 text-gray-600">
          <span>{ACTIVITY_ICONS.time}</span>
          <span>{summary.learning.totalMinutes}m</span>
        </div>
      )}
    </div>
  );
}
```

### 6. DayDetailPanel

```typescript
// app/(protected)/dashboard/_components/ActivityCalendar/DayDetailPanel.tsx

'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDayActivityDetail } from '@/app/_actions/activity_calendar';
import { LearningActivitySection } from './LearningActivitySection';
import { NoteActivitySection } from './NoteActivitySection';
import { GoalAchievementSection } from './GoalAchievementSection';
import type { DayActivityDetail } from './types';

interface DayDetailPanelProps {
  date: string;
  userId: string;
  onClose: () => void;
}

export function DayDetailPanel({ 
  date, 
  userId, 
  onClose 
}: DayDetailPanelProps) {
  const [detail, setDetail] = useState<DayActivityDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDetail() {
      setLoading(true);
      const data = await getDayActivityDetail(userId, new Date(date));
      setDetail(data);
      setLoading(false);
    }
    fetchDetail();
  }, [date, userId]);

  if (loading) {
    return (
      <div className="w-96 border-l bg-white p-6">
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!detail) {
    return null;
  }

  return (
    <div className="w-96 border-l bg-white overflow-y-auto animate-slide-in-right">
      {/* ヘッダー */}
      <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
        <h3 className="text-lg font-bold">
          📅 {new Date(date).toLocaleDateString('ja-JP')}
        </h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* コンテンツ */}
      <div className="p-4 space-y-6">
        {/* 総合サマリー */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">総活動時間</p>
          <p className="text-2xl font-bold">
            {detail.summary.learning.totalMinutes + 
             detail.summary.notes.totalEditMinutes}分
          </p>
        </div>

        {/* 学習活動 */}
        <LearningActivitySection activities={detail.learningActivities} />

        {/* ノート活動 */}
        <NoteActivitySection activities={detail.noteActivities} />

        {/* 目標達成 */}
        <GoalAchievementSection achievements={detail.goalAchievements} />
      </div>
    </div>
  );
}
```

---

## 実装計画

### Phase 1: 基本実装 (1週間)

#### ステップ1: データ取得層の実装 (2日)

**タスク:**
- [ ] `app/_actions/activity_calendar.ts` 作成
- [ ] `getMonthlyActivitySummary()` 実装
- [ ] `getDayActivityDetail()` 実装
- [ ] 既存の `learning_logs` からデータ集計
- [ ] 既存の `pages` からデータ集計
- [ ] テストデータでの動作確認

**成果物:**
- Server Actions ファイル
- 型定義ファイル

---

#### ステップ2: カレンダーUI基本実装 (3日)

**タスク:**
- [ ] コンポーネントディレクトリ作成
- [ ] `types.ts` 型定義
- [ ] `constants.ts` 定数定義
- [ ] `CalendarHeader` 実装
- [ ] `CalendarGrid` 実装
- [ ] `DayCell` 実装
- [ ] `ActivityIndicator` 実装
- [ ] 月切り替え機能実装
- [ ] スタイリング調整

**成果物:**
- カレンダー表示機能
- 月切り替え機能

---

#### ステップ3: 詳細パネル実装 (2日)

**タスク:**
- [ ] `DayDetailPanel` 実装
- [ ] `LearningActivitySection` 実装
- [ ] `NoteActivitySection` 実装
- [ ] `GoalAchievementSection` 実装
- [ ] データフェッチング実装
- [ ] アニメーション実装
- [ ] スタイリング調整

**成果物:**
- 詳細パネル表示機能
- スライドインアニメーション

---

### Phase 2: 統合とテスト (3日)

#### ステップ4: ダッシュボード統合 (1日)

**タスク:**
- [ ] `dashboard/page.tsx` に統合
- [ ] 既存コンポーネントとのレイアウト調整
- [ ] データフロー確認

---

#### ステップ5: レスポンシブ対応 (1日)

**タスク:**
- [ ] デスクトップ表示調整
- [ ] タブレット表示調整
- [ ] モバイル表示調整
- [ ] 詳細パネルのモーダル化（モバイル）

---

#### ステップ6: テストとバグ修正 (1日)

**タスク:**
- [ ] 各機能の動作確認
- [ ] エッジケーステスト
  - データがない日
  - 月の境界
  - 閏年対応
- [ ] パフォーマンステスト
- [ ] バグ修正

---

### 実装スケジュール

```
Week 1:
  Mon-Tue:  データ取得層実装
  Wed-Fri:  カレンダーUI実装
  
Week 2:
  Mon-Tue:  詳細パネル実装
  Wed:      ダッシュボード統合
  Thu:      レスポンシブ対応
  Fri:      テスト・バグ修正
```

---

## 将来の拡張

### Phase 2 機能 (実装予定)

1. **データベース最適化（パフォーマンス改善時のみ）**
   
   **専用テーブル追加案:**
   ```sql
   CREATE TABLE daily_activity_summary (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id UUID REFERENCES accounts(id) NOT NULL,
     activity_date DATE NOT NULL,
     
     -- 事前集計データ
     total_cards_reviewed INTEGER DEFAULT 0,
     total_cards_new INTEGER DEFAULT 0,
     total_learning_minutes INTEGER DEFAULT 0,
     correct_rate DECIMAL(5,2),
     pages_created INTEGER DEFAULT 0,
     pages_updated INTEGER DEFAULT 0,
     links_created INTEGER DEFAULT 0,
     
     -- キャッシュ管理
     calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     
     UNIQUE(user_id, activity_date)
   );
   ```
   
   **メリット:**
   - カレンダー表示の高速化
   - 過去データへの効率的アクセス
   
   **デメリット:**
   - データ整合性の管理コスト
   - トリガーまたはバッチ処理が必要
   
   **判断基準:**
   - ユーザー数が増えてパフォーマンス問題が発生した場合のみ実装

2. **週表示・年表示**
   - 週単位のカレンダー表示
   - 年間ヒートマップ表示

3. **活動パターン分析**
   - 時間帯別の学習効率分析
   - 曜日別の活動パターン
   - 学習とノート作成の相関分析

4. **レコメンデーション**
   - 最適な学習時間の提案
   - 復習タイミングの提案
   - 目標達成のためのアドバイス

5. **ストリーク機能**
   - 連続学習日数の計算
   - ストリークバッジの表示
   - ストリーク継続のリマインド

6. **エクスポート機能**
   - CSV/PDF形式での活動レポート
   - 画像としてのカレンダー保存

---

## 参考資料

### 参考アプリ

- **GitHub Contributions**: ヒートマップデザイン
- **Google Calendar**: カレンダーUI
- **Notion Calendar**: 詳細パネルのデザイン
- **Forest App**: 活動可視化とモチベーション

### 関連ドキュメント

- `docs/03_design/architecture/technology-stack.md`: 技術スタック
- `FRONTEND_DESIGN_PRINCIPLES.md`: フロントエンド設計原則
- `app/(protected)/dashboard/`: 既存ダッシュボード実装

---

## 変更履歴

| 日付 | 変更内容 | 担当 |
|------|---------|------|
| 2025-10-28 | 初版作成 | AI Assistant |
| 2025-10-28 | データベース構成セクション追加（既存テーブル使用を明記） | AI Assistant |

---

**重要事項:**
- **Phase 1ではデータベース修正不要**
- 既存テーブル（learning_logs, pages, card_page_links）から集計
- パフォーマンス問題が発生した場合のみPhase 2で最適化を検討

**承認者**: TBD  
**レビュー日**: TBD  
**実装開始予定**: 2025-10-29
