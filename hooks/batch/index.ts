/**
 * Batch Processing Hooks
 *
 * Exports all batch processing hooks for easy importing
 */

export { useImageBatchOcr } from "./useImageBatchOcr";
export type {
	BatchOcrPage,
	BatchOcrResult,
} from "./useImageBatchOcr";

export { useAudioBatchProcessing } from "./useAudioBatchProcessing";
export type {
	AudioBatchInput,
	AudioBatchResult,
} from "./useAudioBatchProcessing";
