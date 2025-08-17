/**
 * Gemini API クォータ管理システム
 *
 * 無料プランの制限（1日250リクエスト）を監視し、
 * クォータ超過を防ぐための機能を提供
 */

interface QuotaInfo {
	dailyLimit: number;
	usedToday: number;
	resetTime: Date;
	lastRequestTime: Date | null;
}

/**
 * Gemini API クォータマネージャー
 *
 * 注意: これは簡易版です。本格運用には以下を検討してください：
 * - Redisやデータベースでの永続化
 * - 複数インスタンス間での同期
 * - より精密なレート制限
 */
export class GeminiQuotaManager {
	private static instance: GeminiQuotaManager;
	private quotaInfo: QuotaInfo;
	private readonly DAILY_LIMIT = 240; // 250から少し余裕を持たせる
	private readonly MIN_INTERVAL_MS = 100; // 最小リクエスト間隔

	private constructor() {
		this.quotaInfo = this.initializeQuota();
	}

	public static getInstance(): GeminiQuotaManager {
		if (!GeminiQuotaManager.instance) {
			GeminiQuotaManager.instance = new GeminiQuotaManager();
		}
		return GeminiQuotaManager.instance;
	}

	private initializeQuota(): QuotaInfo {
		const now = new Date();
		const tomorrow = new Date(now);
		tomorrow.setDate(tomorrow.getDate() + 1);
		tomorrow.setHours(0, 0, 0, 0);

		return {
			dailyLimit: this.DAILY_LIMIT,
			usedToday: 0,
			resetTime: tomorrow,
			lastRequestTime: null,
		};
	}

	/**
	 * 現在のクォータ状況を取得
	 */
	public getQuotaStatus(): {
		remaining: number;
		used: number;
		limit: number;
		resetTime: Date;
		canMakeRequest: boolean;
	} {
		this.checkAndResetIfNeeded();

		const remaining = Math.max(
			0,
			this.quotaInfo.dailyLimit - this.quotaInfo.usedToday,
		);

		return {
			remaining,
			used: this.quotaInfo.usedToday,
			limit: this.quotaInfo.dailyLimit,
			resetTime: this.quotaInfo.resetTime,
			canMakeRequest: remaining > 0,
		};
	}

	/**
	 * リクエスト実行前にクォータをチェック
	 *
	 * @param requestCount 実行予定のリクエスト数
	 * @returns チェック結果
	 */
	public checkQuota(requestCount = 1): {
		canProceed: boolean;
		reason?: string;
		waitTimeMs?: number;
	} {
		this.checkAndResetIfNeeded();

		const status = this.getQuotaStatus();

		// クォータ不足チェック
		if (status.remaining < requestCount) {
			const timeToReset = status.resetTime.getTime() - Date.now();
			return {
				canProceed: false,
				reason: `クォータ不足: 必要 ${requestCount}、残り ${status.remaining}`,
				waitTimeMs: timeToReset,
			};
		}

		// レート制限チェック
		const now = Date.now();
		if (this.quotaInfo.lastRequestTime) {
			const timeSinceLastRequest =
				now - this.quotaInfo.lastRequestTime.getTime();
			if (timeSinceLastRequest < this.MIN_INTERVAL_MS) {
				return {
					canProceed: false,
					reason: "レート制限: リクエスト間隔が短すぎます",
					waitTimeMs: this.MIN_INTERVAL_MS - timeSinceLastRequest,
				};
			}
		}

		return { canProceed: true };
	}

	/**
	 * リクエスト実行時に呼び出してカウンターを更新
	 *
	 * @param requestCount 実行したリクエスト数
	 */
	public recordRequest(requestCount = 1): void {
		this.checkAndResetIfNeeded();
		this.quotaInfo.usedToday += requestCount;
		this.quotaInfo.lastRequestTime = new Date();

		console.log(
			`[クォータ管理] リクエスト記録: ${this.quotaInfo.usedToday}/${this.quotaInfo.dailyLimit}`,
		);
	}

	/**
	 * 指定した時間だけ待機（レート制限対応）
	 */
	public async waitForRateLimit(waitTimeMs: number): Promise<void> {
		if (waitTimeMs > 0) {
			console.log(`[クォータ管理] ${waitTimeMs}ms待機中...`);
			await new Promise((resolve) => setTimeout(resolve, waitTimeMs));
		}
	}

	/**
	 * 日付が変わった場合にクォータをリセット
	 */
	private checkAndResetIfNeeded(): void {
		const now = new Date();
		if (now >= this.quotaInfo.resetTime) {
			console.log("[クォータ管理] 日次クォータをリセット");
			this.quotaInfo = this.initializeQuota();
		}
	}

	/**
	 * PDF処理前の事前チェック（ユーザー向け）
	 */
	public validatePdfProcessing(pageCount: number): {
		canProcess: boolean;
		message: string;
		suggestion?: string;
	} {
		const status = this.getQuotaStatus();

		if (!status.canMakeRequest) {
			const hoursToReset = Math.ceil(
				(status.resetTime.getTime() - Date.now()) / (1000 * 60 * 60),
			);
			return {
				canProcess: false,
				message: "本日のAPIクォータを使い切りました。",
				suggestion: `${hoursToReset}時間後（${status.resetTime.toLocaleString()}）にリセットされます。`,
			};
		}

		// バッチ処理での推定リクエスト数を計算
		const estimatedRequests = Math.ceil(pageCount / 4); // 4ページずつバッチ処理

		if (status.remaining < estimatedRequests) {
			return {
				canProcess: false,
				message: `クォータ不足: ${pageCount}ページ処理には約${estimatedRequests}リクエスト必要（残り${status.remaining}）`,
				suggestion: `ページ数を${Math.floor(status.remaining * 4)}ページ以下に減らすか、明日再試行してください。`,
			};
		}

		// 警告レベル（残り10%以下）
		if (status.remaining < this.quotaInfo.dailyLimit * 0.1) {
			return {
				canProcess: true,
				message: `処理可能ですが、残りクォータが少なくなっています（残り${status.remaining}）`,
				suggestion: "大量処理は明日に回すことをお勧めします。",
			};
		}

		return {
			canProcess: true,
			message: `処理可能: ${pageCount}ページ（推定${estimatedRequests}リクエスト、残り${status.remaining}）`,
		};
	}
}

/**
 * シングルトンインスタンスを取得するヘルパー関数
 */
export function getGeminiQuotaManager(): GeminiQuotaManager {
	return GeminiQuotaManager.getInstance();
}

/**
 * クォータチェック付きでGemini APIを呼び出すヘルパー関数
 */
export async function executeWithQuotaCheck<T>(
	operation: () => Promise<T>,
	requestCount = 1,
	description = "Gemini API呼び出し",
): Promise<T> {
	const quotaManager = getGeminiQuotaManager();

	// 事前チェック
	const check = quotaManager.checkQuota(requestCount);
	if (!check.canProceed) {
		if (check.waitTimeMs) {
			await quotaManager.waitForRateLimit(check.waitTimeMs);
			// 再チェック
			const recheck = quotaManager.checkQuota(requestCount);
			if (!recheck.canProceed) {
				throw new Error(`${description} - ${recheck.reason}`);
			}
		} else {
			throw new Error(`${description} - ${check.reason}`);
		}
	}

	try {
		console.log(`[クォータ管理] ${description} 実行開始`);
		const result = await operation();
		quotaManager.recordRequest(requestCount);
		console.log(`[クォータ管理] ${description} 成功`);
		return result;
	} catch (error) {
		console.error(`[クォータ管理] ${description} エラー:`, error);

		// クォータエラーの場合は記録（実際にリクエストが消費された可能性）
		if (error instanceof Error && error.message.includes("429")) {
			quotaManager.recordRequest(requestCount);
		}

		throw error;
	}
}
