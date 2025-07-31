export interface ConflictInfo {
	pageId: string;
	pageTitle: string;
	existingPages: {
		id: string;
		title: string;
		createdAt: Date;
		updatedAt: Date;
		preview?: string;
	}[];
}

export interface ConflictResolution {
	pageId: string;
	action: "rename" | "manual-rename" | "skip" | "replace";
	newTitle?: string;
}

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
