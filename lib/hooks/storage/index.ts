/**
 * Storage hooks exports
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ (将来の使用箇所)
 *
 * Dependencies (External files that this file imports):
 *   ├─ ./useUploadImage
 *   ├─ ./useUploadPdf
 *   └─ ./useAudioRecordings
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

export type { AudioRecording } from "./useAudioRecordings";
export { useAudioRecordings } from "./useAudioRecordings";
export type { UploadImageResult } from "./useUploadImage";
export { useUploadImage } from "./useUploadImage";
export type { UploadPdfOptions, UploadPdfResult } from "./useUploadPdf";
export { useUploadPdf } from "./useUploadPdf";
