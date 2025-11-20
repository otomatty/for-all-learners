/**
 * Batch Processing Hooks
 *
 * Collection of hooks for batch processing operations
 */

// Audio Transcription
export type {
	AudioBatchInput,
	AudioBatchResult,
	UseAudioBatchTranscribeOptions,
} from "./useAudioBatchTranscribe";
export { useAudioBatchTranscribe } from "./useAudioBatchTranscribe";

// Dual PDF OCR
export type {
	DualPdfBatchOcrResult,
	DualPdfImagePage,
	UseDualPdfBatchOcrOptions,
} from "./useDualPdfBatchOcr";
export { useDualPdfBatchOcr } from "./useDualPdfBatchOcr";

// PDF OCR
export type {
	PdfBatchOcrResult,
	PdfOcrImagePage,
	UsePdfBatchOcrOptions,
} from "./usePdfBatchOcr";
export { usePdfBatchOcr } from "./usePdfBatchOcr";

// Image OCR
export type {
	BatchOcrPage,
	BatchOcrResult,
	UseTranscribeImagesBatchOptions,
} from "./useTranscribeImagesBatch";
export { useTranscribeImagesBatch } from "./useTranscribeImagesBatch";
