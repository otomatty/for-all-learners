/**
 * Activity Calendar Constants
 *
 * カレンダーUIで使用する定数定義
 */

/**
 * 活動レベル色設定
 */
export const ACTIVITY_COLORS = {
	excellent: {
		bg: "bg-green-100",
		border: "border-green-500",
		text: "text-green-700",
		ring: "ring-green-500",
		icon: "🟢",
	},
	good: {
		bg: "bg-yellow-100",
		border: "border-yellow-500",
		text: "text-yellow-700",
		ring: "ring-yellow-500",
		icon: "🟡",
	},
	partial: {
		bg: "bg-orange-100",
		border: "border-orange-500",
		text: "text-orange-700",
		ring: "ring-orange-500",
		icon: "🟠",
	},
	none: {
		bg: "bg-gray-50",
		border: "border-gray-200",
		text: "text-gray-400",
		ring: "ring-gray-200",
		icon: "⚪",
	},
} as const;

/**
 * アクティビティタイプアイコン
 */
export const ACTIVITY_ICONS = {
	card_review: "🃏", // カード復習
	card_new: "✨", // 新規カード
	page_created: "✍️", // ページ作成
	page_updated: "📝", // ページ編集
	link_created: "🔗", // リンク作成
	time: "⏱️", // 学習時間
	goal: "🎯", // 目標
	streak: "🔥", // ストリーク
	calendar: "📅", // カレンダー
} as const;

/**
 * 曜日ラベル
 */
export const WEEKDAY_LABELS = [
	"日",
	"月",
	"火",
	"水",
	"木",
	"金",
	"土",
] as const;

/**
 * 活動レベル判定閾値
 */
export const ACTIVITY_THRESHOLDS = {
	// 優秀: カード30枚以上 または 学習時間60分以上
	excellent: {
		cards: 30,
		minutes: 60,
	},
	// 良好: カード20枚以上 または 学習時間30分以上
	good: {
		cards: 20,
		minutes: 30,
	},
	// わずか: カード10枚以上 または 学習時間15分以上
	partial: {
		cards: 10,
		minutes: 15,
	},
} as const;
