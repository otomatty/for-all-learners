/**
 * Calendar Grid Component
 * 
 * カレンダーのグリッド表示を担当するコンポーネント
 */

import { DayCell } from './DayCell';
import { generateCalendarGrid } from './utils';
import { WEEKDAY_LABELS } from './constants';
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
  // カレンダーグリッド用のデータ構造を生成
  const calendarDays = generateCalendarGrid(
    monthData.year,
    monthData.month,
    monthData.days
  );

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm">
      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 bg-gray-50 border-b">
        {WEEKDAY_LABELS.map((day, index) => (
          <div
            key={day}
            className={cn(
              'text-center py-3 text-sm font-medium',
              index === 0 && 'text-red-600', // 日曜日
              index === 6 && 'text-blue-600', // 土曜日
              index !== 0 && index !== 6 && 'text-gray-700'
            )}
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* 日付グリッド */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => (
          <DayCell
            key={day?.date || `empty-${index}`}
            day={day}
            isSelected={day?.date === selectedDate}
            onClick={day ? () => onDayClick(day) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
