/**
 * Batch Processing Hooks
 *
 * Collection of hooks for batch processing operations
 */

export type {
	AudioBatchInput,
	AudioBatchResult,
	UseAudioBatchTranscribeOptions,
} from "./useAudioBatchTranscribe";
// Audio Transcription
export { useAudioBatchTranscribe } from "./useAudioBatchTranscribe";
export type {
	DualPdfBatchOcrResult,
	DualPdfImagePage,
	UseDualPdfBatchOcrOptions,
} from "./useDualPdfBatchOcr";
// Dual PDF OCR
export { useDualPdfBatchOcr } from "./useDualPdfBatchOcr";
export type {
	PdfBatchOcrResult,
	PdfOcrImagePage,
	UsePdfBatchOcrOptions,
} from "./usePdfBatchOcr";
// PDF OCR
export { usePdfBatchOcr } from "./usePdfBatchOcr";
export type {
	BatchOcrPage,
	BatchOcrResult,
	UseTranscribeImagesBatchOptions,
} from "./useTranscribeImagesBatch";
// Image OCR
export { useTranscribeImagesBatch } from "./useTranscribeImagesBatch";
