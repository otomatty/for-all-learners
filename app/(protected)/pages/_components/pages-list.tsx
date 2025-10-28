"use client";

import { PagesList as SharedPagesList } from "@/components/notes/PagesList";
import type { Database } from "@/types/database.types";

/**
 * @deprecated This component is deprecated.
 * Use components/notes/PagesList directly.
 * This file will be removed in Phase 5.
 */

interface PagesListProps {
	pages: Database["public"]["Tables"]["pages"]["Row"][];
}

export function PagesList({ pages }: PagesListProps) {
	// Default to "all-pages" slug for backward compatibility
	return <SharedPagesList pages={pages} slug="all-pages" />;
}
