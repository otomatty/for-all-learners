"use client";

/**
 * Link Groups Section Component
 * Displays groups of pages linked by the same text (wiki-style linking)
 */

import type { LinkGroupForUI } from "@/types/link-group";
import { CreatePageCard } from "./create-page-card";
import { GroupedPageCard } from "./grouped-page-card";
import { TargetPageCard } from "./target-page-card";

interface LinkGroupsSectionProps {
	linkGroups: LinkGroupForUI[];
	noteSlug?: string;
}

export function LinkGroupsSection({
	linkGroups,
	noteSlug,
}: LinkGroupsSectionProps) {
	// DEBUG: Display data for debugging
	return (
		<div className="my-8 space-y-6">
			{linkGroups.length > 0 && (
				<div className="space-y-6">
					{linkGroups.map((group) => (
						<section key={group.linkGroupId}>
							{/* Grid layout (same as pages-list.tsx) */}
							<div className="grid gap-2 md:gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
								{/* First card: Target page (if exists) or Create page card */}
								{group.targetPage ? (
									<TargetPageCard page={group.targetPage} noteSlug={noteSlug} />
								) : (
									<CreatePageCard
										displayText={group.displayText}
										linkGroupId={group.linkGroupId}
										noteSlug={noteSlug}
									/>
								)}

								{/* Referencing pages */}
								{group.referencingPages.map((page) => (
									<GroupedPageCard
										key={page.id}
										page={page}
										noteSlug={noteSlug}
									/>
								))}
							</div>
						</section>
					))}
				</div>
			)}
		</div>
	);
}
