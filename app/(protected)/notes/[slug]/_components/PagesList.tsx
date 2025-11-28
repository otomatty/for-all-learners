"use client";

import { PagesList as SharedPagesList } from "@/components/notes/PagesList";
import type { Database } from "@/types/database.types";

/**
 * Wrapper component for note-specific pages list.
 * Uses the shared PagesList component from components/notes/PagesList.
 */

interface PagesListProps {
	pages: Database["public"]["Tables"]["pages"]["Row"][];
	slug: string;
}

export function PagesList({ pages, slug }: PagesListProps) {
	return <SharedPagesList pages={pages} slug={slug} />;
}
