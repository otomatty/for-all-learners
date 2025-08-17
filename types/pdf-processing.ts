/**
 * PDF処理関連の型定義
 */

export interface PdfProcessingOptions {
	questionType: "auto" | "multiple_choice" | "descriptive";
	generateMode: "all" | "problems_only" | "key_points";
	chunkSize: number;
}

export interface PdfProcessingJob {
	id: string;
	user_id: string;
	deck_id: string;
	status: "pending" | "processing" | "completed" | "failed" | "cancelled";
	priority: number;

	// ファイル情報
	pdf_file_url: string;
	original_filename: string;
	file_size_bytes: number;
	processing_options: PdfProcessingOptions;

	// 進捗情報
	progress_percentage: number;
	current_step: string;
	total_chunks: number;
	processed_chunks: number;
	generated_cards: number;

	// 処理結果
	result_summary?: PdfProcessingResult;
	error_details?: PdfProcessingError;

	// パフォーマンス情報
	estimated_duration_seconds?: number;
	actual_duration_seconds?: number;

	// タイムスタンプ
	created_at: string;
	started_at?: string;
	completed_at?: string;
	updated_at: string;

	// ワーカー情報
	worker_id?: string;
	worker_started_at?: string;
	last_heartbeat_at?: string;

	// 関連データ
	deck?: {
		id: string;
		title: string;
		description?: string;
	};
}

export interface PdfProcessingResult {
	total_cards: number;
	processing_time_seconds: number;
	success_rate?: number;
	total_chunks?: number;
	completed_at: string;

	// 詳細統計
	chunk_success_rates?: number[];
	failed_chunks?: number[];
	warning_count?: number;

	// パフォーマンス情報
	avg_chunk_processing_time?: number;
	memory_usage_peak?: number;
	api_calls_made?: number;
}

export interface PdfProcessingError {
	error_type:
		| "validation"
		| "upload"
		| "processing"
		| "timeout"
		| "quota"
		| "worker_timeout"
		| "unknown";
	message: string;
	details?: Record<string, unknown>;
	stack?: string;
	timestamp: string;

	// エラー文脈
	current_step?: string;
	chunk_id?: string;
	worker_id?: string;

	// 復旧情報
	retryable?: boolean;
	suggested_action?: string;
}

export interface PdfChunk {
	chunk_id: string;
	page_numbers: number[];
	text_content: string;
	token_count: number;

	// 処理状態
	status?: "pending" | "processing" | "completed" | "failed";
	processing_started_at?: string;
	processing_completed_at?: string;

	// 抽出結果
	detected_problems?: PdfProblem[];
	processing_error?: string;
}

export interface PdfProblem {
	problem_id: string;
	problem_text: string;
	answer_text?: string;
	problem_type: "multiple_choice" | "descriptive" | "unknown";
	confidence_score: number; // 0-1
	page_number: number;
	chunk_id: string;

	// メタデータ
	choices?: string[]; // 選択式問題の選択肢
	correct_answer?: string | number; // 正解
	explanation?: string; // 解説
	difficulty?: "easy" | "medium" | "hard";
	category?: string; // 問題カテゴリ
}

/**
 * TiptapエディタのJSONコンテンツ形式
 */
export interface TiptapContent {
	type: string;
	content?: TiptapContent[];
	attrs?: Record<string, unknown>;
	text?: string;
	marks?: Array<{
		type: string;
		attrs?: Record<string, unknown>;
	}>;
}

export interface GeneratedPdfCard {
	id?: string;
	front_content: TiptapContent; // TiptapJSON
	back_content: TiptapContent; // TiptapJSON
	source_pdf_url: string;
	source_page: number;
	pdf_job_id: string;

	// メタデータ
	pdf_metadata: {
		problem_id: string;
		confidence_score: number;
		chunk_id: string;
		processing_model: string;
		problem_type?: string;
		original_text?: string;
	};

	// FSRS フィールド (既存カードとの互換性)
	ease_factor?: number;
	repetition_count?: number;
	review_interval?: number;
	next_review_at?: string;
	stability?: number;
	difficulty?: number;
	last_reviewed_at?: string;

	// タイムスタンプ
	created_at?: string;
	updated_at?: string;
}

export interface PdfJobStatistics {
	// 基本統計
	total_jobs: number;
	completed_jobs: number;
	failed_jobs: number;
	cancelled_jobs: number;
	processing_jobs: number;
	pending_jobs: number;

	// 成果統計
	total_cards_generated: number;
	avg_duration_seconds: number;
	avg_file_size_bytes: number;
	success_rate_percentage: number;
	cards_per_job: number;

	// 時系列データ
	daily_breakdown?: DailyJobStats[];

	// 処理時間分析
	processing_time_stats?: {
		min_duration: number;
		max_duration: number;
		median_duration: number;
		avg_duration: number;
		percentiles: {
			p25: number;
			p50: number;
			p75: number;
			p90: number;
			p95: number;
		};
	};
}

export interface DailyJobStats {
	date: string;
	jobs_created: number;
	jobs_completed: number;
	cards_generated: number;
	total_processing_time: number;
}

// API レスポンス型
export interface PdfJobListResponse {
	success: boolean;
	jobs: PdfProcessingJob[];
	pagination?: {
		offset: number;
		limit: number;
		total: number;
	};
	message?: string;
}

export interface PdfJobDetailResponse {
	success: boolean;
	job?: PdfProcessingJob;
	message?: string;
}

export interface PdfJobStatsResponse {
	success: boolean;
	period: {
		days: number;
		start_date: string;
		end_date: string;
	};
	stats: {
		period: PdfJobStatistics;
		all_time: PdfJobStatistics;
		processing_time: PdfJobStatistics["processing_time_stats"];
	};
	message?: string;
}

// フォーム・UI関連型
export interface PdfUploadFormData {
	file: File;
	deckId: string;
	processingOptions: PdfProcessingOptions;
}

export interface PdfValidationResult {
	valid: boolean;
	error?: string;
	warnings?: string[];
	fileInfo?: {
		name: string;
		size: number;
		type: string;
		sizeFormatted: string;
		estimatedPages?: number;
	};
}

export interface PdfUploadProgress {
	stage: "validation" | "upload" | "job_creation" | "completed" | "error";
	percentage: number;
	message: string;
	error?: string;
}

export interface PdfPreviewInfo {
	fileName: string;
	fileSize: string;
	estimatedPages: number;
	estimatedProcessingTime: string;
	estimatedChunks: number;
	warnings?: string[];
}

// ワーカー関連型
export interface WorkerJobRequest {
	job_id: string;
	user_id: string;
	deck_id: string;
	pdf_file_url: string;
	original_filename: string;
	file_size_bytes: number;
	processing_options: PdfProcessingOptions;
	estimated_duration_seconds?: number;
}

export interface WorkerProgressUpdate {
	job_id: string;
	worker_id: string;
	progress_percentage: number;
	current_step: string;
	processed_chunks?: number;
	total_chunks?: number;
	generated_cards?: number;
	error?: PdfProcessingError;
}

export interface WorkerHeartbeat {
	job_id: string;
	worker_id: string;
	timestamp: string;
	status: "healthy" | "warning" | "error";
	memory_usage?: number;
	cpu_usage?: number;
}

// 設定・制約関連型
export interface PdfProcessingConstraints {
	MAX_FILE_SIZE: number;
	MIN_FILE_SIZE: number;
	MAX_CHUNK_SIZE: number;
	MIN_CHUNK_SIZE: number;
	SUPPORTED_MIME_TYPES: readonly string[];
	MAX_FILENAME_LENGTH: number;
	ESTIMATED_PAGES_PER_MB: number;
	MAX_CONCURRENT_JOBS_PER_USER: number;
	JOB_TIMEOUT_MINUTES: number;
	WORKER_HEARTBEAT_INTERVAL_SECONDS: number;
}

// エラー型の詳細化
export type PdfProcessingErrorType =
	| "file_too_large"
	| "file_too_small"
	| "invalid_file_type"
	| "upload_failed"
	| "pdf_parsing_failed"
	| "text_extraction_failed"
	| "llm_quota_exceeded"
	| "llm_request_failed"
	| "card_generation_failed"
	| "database_error"
	| "worker_timeout"
	| "user_cancelled"
	| "system_overload"
	| "unknown_error";

// フィルタ・検索関連
export interface PdfJobFilters {
	status?:
		| "all"
		| "pending"
		| "processing"
		| "completed"
		| "failed"
		| "cancelled";
	deck_id?: string;
	date_from?: string;
	date_to?: string;
	filename_search?: string;
	min_file_size?: number;
	max_file_size?: number;
}

export interface PdfJobSortOptions {
	field:
		| "created_at"
		| "updated_at"
		| "progress_percentage"
		| "file_size_bytes"
		| "generated_cards";
	direction: "asc" | "desc";
}

// リアルタイム更新用
export interface PdfJobRealtimeEvent {
	type:
		| "job_created"
		| "job_updated"
		| "job_completed"
		| "job_failed"
		| "job_cancelled";
	job_id: string;
	user_id: string;
	timestamp: string;
	data: Partial<PdfProcessingJob>;
}
