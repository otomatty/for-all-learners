import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";

// 特定期間の型定義
type DateRange = {
	start: string; // "YYYY-MM-DD" (年の部分は無視され、月日で毎年判定)
	end: string; // "YYYY-MM-DD" (年の部分は無視され、月日で毎年判定)
	name?: string; // 例: "夏休み"
};

// 水増し設定の型定義
type BoostConfigItem = {
	id?: string;
	startHour: number;
	endHour: number;
	minBoost: number;
	maxBoost: number;
	probability: number;
	minDisplayUsers: number;
	minDisplayFluctuation: number;
	daysOfWeek?: number[];
	dateRanges?: DateRange[];
};

// --- ヘルパー関数 ---
function getRandomInt(min: number, max: number): number {
	const flooredMin = Math.ceil(min);
	const ceiledMax = Math.floor(max);
	if (ceiledMax < flooredMin) {
		return flooredMin;
	}
	return Math.floor(Math.random() * (ceiledMax - flooredMin + 1)) + flooredMin;
}

// 指定された日付が期間内にあるか判定 (月日で毎年判定)
function isDateInRanges(currentDate: Date, ranges?: DateRange[]): boolean {
	if (!ranges || ranges.length === 0) {
		return true; // 期間指定がなければ常にtrue
	}

	const currentMonth = currentDate.getMonth() + 1; // 1-indexed month
	const currentDay = currentDate.getDate();
	// 現在の月日を数値化 (例: 7月25日 -> 725)
	const currentValue = currentMonth * 100 + currentDay;

	// "YYYY-MM-DD" 形式の文字列から月日を数値化するヘルパー
	const getMonthDayValue = (dateStr: string): number => {
		const parts = dateStr.split("-"); // "YYYY-MM-DD"
		const month = Number.parseInt(parts[1], 10);
		const day = Number.parseInt(parts[2], 10);
		return month * 100 + day; // 例: "2000-07-20" -> 720
	};

	return ranges.some((range) => {
		const startValue = getMonthDayValue(range.start); // 例: 720 (7月20日)
		const endValue = getMonthDayValue(range.end); // 例: 831 (8月31日)

		if (startValue <= endValue) {
			// 年をまたがない期間 (例: 03-01 to 03-15, or 07-20 to 08-31)
			// 現在の月日が開始月日と終了月日の間にあるか
			return currentValue >= startValue && currentValue <= endValue;
		}

		// 年をまたぐ期間 (例: 12-20 to 01-10)
		// 現在の月日が (開始月日以降) OR (終了月日以前) のどちらかであればマッチ
		return currentValue >= startValue || currentValue <= endValue;
	});
}

// --- 水増し設定 ---
// 設定は配列の先頭から順に評価されます。
// dateRangesの年の部分は無視され、月日で毎年判定されます (例: "2000-MM-DD")。
const BOOST_CONFIG: BoostConfigItem[] = [
	// 例: ゴールデンウィーク (毎年05月03日～05月05日) の特定日の昼間 (最優先)
	{
		id: "gw_special_day_peak",
		dateRanges: [{ start: "2000-05-03", end: "2000-05-05", name: "GWピーク" }],
		daysOfWeek: [5, 6, 0], // 金土日 (GW中の該当日がこれらの曜日なら)
		startHour: 12,
		endHour: 15,
		minBoost: 200,
		maxBoost: 500,
		probability: 0.95,
		minDisplayUsers: 250,
		minDisplayFluctuation: 50,
	},
	// 例: 夏休み期間 (毎年07月20日～08月31日) の週末 (土日) の昼〜夕方
	{
		id: "summer_weekend_afternoon",
		dateRanges: [{ start: "2000-07-20", end: "2000-08-31", name: "夏休み" }],
		daysOfWeek: [0, 6], // 日曜、土曜
		startHour: 13,
		endHour: 18,
		minBoost: 150,
		maxBoost: 400,
		probability: 0.9,
		minDisplayUsers: 180,
		minDisplayFluctuation: 30,
	},
	// 例: 夏休み期間 (毎年07月20日～08月31日) の平日
	{
		id: "summer_weekday",
		dateRanges: [{ start: "2000-07-20", end: "2000-08-31", name: "夏休み" }],
		// daysOfWeek の指定がないので、上記夏休み週末以外の曜日にマッチ (月〜金)
		startHour: 10,
		endHour: 22,
		minBoost: 100,
		maxBoost: 300,
		probability: 0.8,
		minDisplayUsers: 120,
		minDisplayFluctuation: 20,
	},
	// 例: 年末年始 (毎年12月28日～01月03日)
	{
		id: "new_year_holiday",
		dateRanges: [{ start: "2000-12-28", end: "2000-01-03", name: "年末年始" }],
		startHour: 0,
		endHour: 23,
		minBoost: 180,
		maxBoost: 450,
		probability: 0.9,
		minDisplayUsers: 200,
		minDisplayFluctuation: 40,
	},
	// 通常の週末 (土日) の夜
	{
		id: "normal_weekend_night",
		daysOfWeek: [0, 6],
		startHour: 19,
		endHour: 23,
		minBoost: 100,
		maxBoost: 280,
		probability: 0.85,
		minDisplayUsers: 110,
		minDisplayFluctuation: 15,
	},
	// 通常の平日の夜のピーク
	{
		id: "normal_weekday_night_peak",
		daysOfWeek: [1, 2, 3, 4, 5], // 月〜金
		startHour: 20,
		endHour: 22,
		minBoost: 120,
		maxBoost: 280,
		probability: 0.85,
		minDisplayUsers: 100,
		minDisplayFluctuation: 15,
	},
	// 通常の平日の昼間
	{
		id: "normal_weekday_daytime",
		daysOfWeek: [1, 2, 3, 4, 5], // 月〜金
		startHour: 9,
		endHour: 17,
		minBoost: 40,
		maxBoost: 120,
		probability: 0.7,
		minDisplayUsers: 50,
		minDisplayFluctuation: 10,
	},
	// 深夜～早朝 (全曜日対象、特定期間指定なし)
	{
		id: "late_night_early_morning",
		startHour: 0,
		endHour: 6,
		minBoost: 20,
		maxBoost: 70,
		probability: 0.5,
		minDisplayUsers: 15,
		minDisplayFluctuation: 5,
	},
	// 上記いずれにもマッチしない場合の最終フォールバック (全日全時間帯)
	{
		id: "default_all_time_fallback",
		startHour: 0,
		endHour: 23,
		minBoost: 10,
		maxBoost: 30,
		probability: 0.6,
		minDisplayUsers: 20,
		minDisplayFluctuation: 5,
	},
];

// 水増し後のユーザー数を計算する関数
function calculateBoostedUsers(actualCount: number): number {
	const now = new Date();
	const currentHour = now.getHours();
	const currentDayOfWeek = now.getDay();

	const config = BOOST_CONFIG.find((c) => {
		const timeMatch = currentHour >= c.startHour && currentHour <= c.endHour;
		const dayMatch = !c.daysOfWeek || c.daysOfWeek.includes(currentDayOfWeek);
		const dateRangeMatch = isDateInRanges(now, c.dateRanges);
		return timeMatch && dayMatch && dateRangeMatch;
	});

	let boostAmount = 0;
	let baseMinDisplayUsers = 5;
	let displayFluctuation = 2;
	let probability = 0.5;
	let minBoost = 1;
	let maxBoost = 5;

	if (config) {
		// console.log("Using config:", config.id || "Unnamed config");
		baseMinDisplayUsers = config.minDisplayUsers;
		displayFluctuation = config.minDisplayFluctuation;
		probability = config.probability;
		minBoost = config.minBoost;
		maxBoost = config.maxBoost;

		if (Math.random() < probability) {
			boostAmount = getRandomInt(minBoost, maxBoost);
		} else {
			boostAmount = getRandomInt(0, Math.max(0, Math.floor(minBoost / 3)));
		}
	} else {
		// console.warn("No matching boost config found, using fallback defaults.");
		if (Math.random() < probability) {
			boostAmount = getRandomInt(minBoost, maxBoost);
		}
	}

	const fluctuatingMinDisplay = Math.max(
		0,
		getRandomInt(
			baseMinDisplayUsers - displayFluctuation,
			baseMinDisplayUsers + displayFluctuation,
		),
	);

	if (config) {
		if (actualCount === 0 && boostAmount > baseMinDisplayUsers / 2) {
			boostAmount = getRandomInt(
				0,
				Math.max(5, Math.floor(baseMinDisplayUsers / 2)),
			);
		} else if (
			actualCount > 0 &&
			actualCount < baseMinDisplayUsers / 3 &&
			boostAmount > actualCount * 3 + getRandomInt(1, 10)
		) {
			boostAmount = getRandomInt(
				Math.floor(actualCount / 2),
				actualCount * 3 + getRandomInt(1, 10),
			);
		}
	}

	const calculatedUsersWithBoost = actualCount + boostAmount;
	const finalDisplayedUsers = Math.max(
		calculatedUsersWithBoost,
		fluctuatingMinDisplay,
	);

	return Math.max(0, finalDisplayedUsers);
}

// --- カスタムフック本体 (変更なし) ---
export function useActiveUsers(supabase: SupabaseClient) {
	const [displayedUsers, setDisplayedUsers] = useState<number | null>(null);
	const actualUsersCountRef = useRef<number>(0);
	const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

	useEffect(() => {
		const channelName = "online-users";

		const setupChannel = async () => {
			const {
				data: { session },
			} = await supabase.auth.getSession();

			if (channelRef.current) {
				try {
					await supabase.removeChannel(channelRef.current);
				} catch (error) {
					console.warn("Error removing previous channel:", error);
				}
				channelRef.current = null;
			}

			if (session?.user) {
				channelRef.current = supabase.channel(channelName, {
					config: {
						presence: {
							key: session.user.id,
						},
					},
				});

				const handlePresenceUpdate = () => {
					if (channelRef.current) {
						const presenceState = channelRef.current.presenceState<{
							online_at: string;
						}>();
						const count = Object.keys(presenceState).length;
						actualUsersCountRef.current = count;
						const newDisplayedUsers = calculateBoostedUsers(count);
						setDisplayedUsers(newDisplayedUsers);
					}
				};

				channelRef.current
					.on("presence", { event: "sync" }, handlePresenceUpdate)
					.on("presence", { event: "join" }, handlePresenceUpdate)
					.on("presence", { event: "leave" }, handlePresenceUpdate)
					.subscribe(async (status) => {
						if (status === "SUBSCRIBED") {
							await channelRef.current?.track({
								online_at: new Date().toISOString(),
							});
							if (channelRef.current) {
								const presenceState = channelRef.current.presenceState<{
									online_at: string;
								}>();
								const count = Object.keys(presenceState).length;
								actualUsersCountRef.current = count;
								const newDisplayedUsers = calculateBoostedUsers(count);
								setDisplayedUsers(newDisplayedUsers);
							}
						} else if (
							status === "CLOSED" ||
							status === "CHANNEL_ERROR" ||
							status === "TIMED_OUT"
						) {
							actualUsersCountRef.current = 0;
							setDisplayedUsers(calculateBoostedUsers(0));
						}
					});
			} else {
				actualUsersCountRef.current = 0;
				setDisplayedUsers(calculateBoostedUsers(0));
			}
		};

		setupChannel();

		const intervalId = setInterval(async () => {
			const {
				data: { session },
			} = await supabase.auth.getSession();

			let currentActualUsers = 0;
			if (session?.user && channelRef.current) {
				currentActualUsers = actualUsersCountRef.current;
			} else {
				actualUsersCountRef.current = 0;
			}
			const newDisplayedUsers = calculateBoostedUsers(currentActualUsers);
			setDisplayedUsers(newDisplayedUsers);
		}, 60 * 1000);

		return () => {
			clearInterval(intervalId);
			if (channelRef.current) {
				supabase
					.removeChannel(channelRef.current)
					.catch((err) =>
						console.warn("Error removing channel on cleanup:", err),
					);
				channelRef.current = null;
			}
		};
	}, [supabase]);

	return displayedUsers;
}
