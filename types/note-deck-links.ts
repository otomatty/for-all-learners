// Note-Deck Links 関連の型定義
export interface NoteDeckLink {
	id: string;
	note_id: string;
	deck_id: string;
	created_at: string;
	created_by: string;
}

export interface NoteDeckLinkWithRelations extends NoteDeckLink {
	note: {
		id: string;
		title: string;
		slug: string;
		visibility: string;
		owner_id: string;
	};
	deck: {
		id: string;
		title: string;
		description: string | null;
		is_public: boolean;
		user_id: string;
	};
}

export interface CreateNoteDeckLinkPayload {
	note_id: string;
	deck_id: string;
}

export interface NoteDeckLinkInsert {
	note_id: string;
	deck_id: string;
	created_by?: string;
}

export interface NoteDeckLinkUpdate {
	note_id?: string;
	deck_id?: string;
}
