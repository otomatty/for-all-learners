// Re-export types from hooks for backward compatibility
import type { ConflictResolution } from "@/hooks/notes/useBatchMovePages";
import type { ConflictInfo } from "@/hooks/notes/useCheckBatchConflicts";

export type { ConflictResolution } from "@/hooks/notes/useBatchMovePages";
export type { ConflictInfo } from "@/hooks/notes/useCheckBatchConflicts";

export interface BatchMovePageParams {
	pageIds: string[];
	sourceNoteId: string;
	targetNoteId: string;
	isCopy?: boolean;
	conflictResolutions?: ConflictResolution[];
}

export interface BatchMoveResult {
	success: boolean;
	movedPages: string[];
	conflicts: ConflictInfo[];
	errors: Array<{
		pageId: string;
		error: string;
	}>;
}
