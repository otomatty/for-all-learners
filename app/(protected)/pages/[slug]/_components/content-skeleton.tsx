import React from "react";

/**
 * A skeleton placeholder shown while generating page content.
 */
export function ContentSkeleton() {
	return (
		<div className="p-4 space-y-2 animate-pulse">
			<div className="h-10 bg-gray-200 rounded w-1/3" />
			<div className="h-4 bg-gray-200 rounded w-full" />
			<div className="h-4 bg-gray-200 rounded w-full" />
			<div className="h-4 bg-gray-200 rounded w-5/6" />
		</div>
	);
}
