export interface FSRSResult {
	stability: number;
	difficulty: number;
	intervalDays: number;
}

/**
 * FSRSアルゴリズムで次回のインターバル、安定性、難易度を計算します
 * @param prevStability 前回の安定性 (stability)
 * @param prevDifficulty 前回の難易度 (difficulty)
 * @param elapsedDays 最終レビューからの経過日数
 * @param quality 品質評価 (0〜5)
 */
export function calculateFSRS(
	prevStability: number,
	prevDifficulty: number,
	elapsedDays: number,
	quality: number,
): FSRSResult {
	// TODO: FSRSアルゴリズムの詳細実装
	// 以下はサンプル実装です。必要に応じて調整してください。
	const q = Math.max(0, Math.min(5, quality));
	// 難易度調整
	const difficulty = Math.max(
		0.1,
		prevDifficulty + 0.1 - (5 - q) * (0.02 + (5 - q) * 0.01),
	);
	// 安定性調整
	const stability = Math.max(
		0.1,
		prevStability * Math.exp(((q - 3) * elapsedDays) / (difficulty * 10)),
	);
	// インターバル（日数）
	const intervalDays = stability * difficulty;
	return { stability, difficulty, intervalDays };
}
