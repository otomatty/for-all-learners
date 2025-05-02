/**
 * SM-2アルゴリズムで次回のインターバルとイージーファクター、繰り返し回数を計算します
 * @param prevInterval 前回のインターバル（日数）
 * @param prevEF 前回のイージーファクター
 * @param prevRepCount 前回の繰り返し回数
 * @param quality 品質評価（0〜5）
 */
export function calculateSM2(
	prevInterval: number,
	prevEF: number,
	prevRepCount: number,
	quality: number,
): { interval: number; ef: number; repetitionCount: number } {
	// EF更新
	let ef = prevEF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
	ef = ef < 1.3 ? 1.3 : ef;

	let interval: number;
	let repetitionCount: number;

	if (quality < 3) {
		// 失敗：繰り返し回数リセット、次は翌日
		repetitionCount = 0;
		interval = 1;
	} else {
		// 成功：繰り返し回数増加
		repetitionCount = prevRepCount + 1;
		if (prevRepCount === 0) {
			interval = 1;
		} else if (prevRepCount === 1) {
			interval = 6;
		} else {
			interval = Math.ceil(prevInterval * ef);
		}
	}

	return { interval, ef, repetitionCount };
}
