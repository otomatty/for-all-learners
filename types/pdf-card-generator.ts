/**
 * PDF処理モード
 */
export type ProcessingMode = "single" | "dual";

/**
 * 処理状況インターフェース
 */
export interface ProcessingStatus {
	step: "upload" | "extract" | "process" | "complete";
	progress: number;
	message: string;
}

/**
 * 処理結果
 */
export interface ProcessingResult {
	totalPages?: number;
	processingTimeMs?: number;
}

/**
 * PDF Card Generator Props
 */
export interface PdfCardGeneratorProps {
	deckId: string;
	userId: string;
}

/**
 * カード選択状態
 */
export type CardSelectionState = Record<string, boolean>;

/**
 * 生成されたPDFカードの基本型
 */
export interface GeneratedPdfCard {
	front_content: string;
	back_content: string;
	source_audio_url?: string;
}

/**
 * 拡張されたPDFカード（解説付き）
 */
export interface EnhancedPdfCard extends GeneratedPdfCard {
	explanation?: string;
}

/**
 * 生成されたカードの型
 */
export type GeneratedCard = GeneratedPdfCard | EnhancedPdfCard;

/**
 * PDF処理フック戻り値の型
 */
export interface UsePdfProcessingReturn {
	// ファイル管理
	files: File[];
	onFilesChange: (files: File[]) => void;
	onFileRemove: (index: number) => void;

	// ファイル種別指定
	questionFileIndex: number | null;
	answerFileIndex: number | null;
	onQuestionFileSelect: (index: number) => void;
	onAnswerFileSelect: (index: number) => void;

	// 処理実行
	processFiles: () => Promise<void>;

	// 現在のモード（ファイル数から自動決定）
	currentMode: ProcessingMode;

	// 共通状態
	isProcessing: boolean;
	processingStatus: ProcessingStatus;
	generatedCards: GeneratedCard[];
	processingResult: ProcessingResult;
	isClient: boolean;
}

/**
 * カードリストProps
 */
export interface GeneratedCardListProps {
	cards: GeneratedCard[];
	selectedCards: CardSelectionState;
	onCardSelection: (index: string, checked: boolean) => void;
	onSelectAll: () => void;
	onDeselectAll: () => void;
	onSaveCards: () => Promise<void>;
	isSaving: boolean;
	deckId: string;
	userId: string;
}

/**
 * 処理ステータス表示Props
 */
export interface ProcessingStatusDisplayProps {
	status: ProcessingStatus;
	processingResult: ProcessingResult;
	isVisible: boolean;
}

/**
 * ファイル選択Props
 */
export interface FileSelectionProps {
	// ファイル管理
	files: File[];
	onFilesChange: (files: File[]) => void;
	onFileRemove: (index: number) => void;

	// ファイル種別指定（デュアルモード用）
	questionFileIndex: number | null;
	answerFileIndex: number | null;
	onQuestionFileSelect: (index: number) => void;
	onAnswerFileSelect: (index: number) => void;

	// 現在の処理モード（読み取り専用、ファイル数から自動決定）
	currentMode: ProcessingMode;

	isProcessing: boolean;
}

/**
 * Tiptap JSON 形式の型定義
 */
export interface TiptapContent {
	content?: Array<{
		type: string;
		content?: Array<{ text?: string }>;
	}>;
}
