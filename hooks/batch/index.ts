/**
 * Batch Processing Hooks
 * 
 * Collection of hooks for batch processing operations
 */

// Image OCR
export { useTranscribeImagesBatch } from "./useTranscribeImagesBatch";
export type {
	BatchOcrPage,
	BatchOcrResult,
	UseTranscribeImagesBatchOptions,
} from "./useTranscribeImagesBatch";

// PDF OCR
export { usePdfBatchOcr } from "./usePdfBatchOcr";
export type {
	PdfOcrImagePage,
	PdfBatchOcrResult,
	UsePdfBatchOcrOptions,
} from "./usePdfBatchOcr";

// Dual PDF OCR
export { useDualPdfBatchOcr } from "./useDualPdfBatchOcr";
export type {
	DualPdfImagePage,
	DualPdfBatchOcrResult,
	UseDualPdfBatchOcrOptions,
} from "./useDualPdfBatchOcr";

// Audio Transcription
export { useAudioBatchTranscribe } from "./useAudioBatchTranscribe";
export type {
	AudioBatchInput,
	AudioBatchResult,
	UseAudioBatchTranscribeOptions,
} from "./useAudioBatchTranscribe";
