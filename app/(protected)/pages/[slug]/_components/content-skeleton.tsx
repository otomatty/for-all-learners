import React from "react";

/**
 * A skeleton placeholder shown while generating page content.
 */
export function ContentSkeleton() {
	return (
		<div className="p-4 space-y-2 animate-pulse">
			{/* セクション1 */}
			<div className="h-10 bg-gray-200 rounded w-1/3" />
			<div className="h-6 bg-gray-200 rounded w-full" />
			<div className="h-6 bg-gray-200 rounded w-full" />
			<div className="h-6 bg-gray-200 rounded w-full" />
			<div className="h-6 bg-gray-200 rounded w-2/3" />
			<div className="h-6 bg-gray-200 rounded w-full" />
			<div className="h-6 bg-gray-200 rounded w-full" />
			<div className="h-6 bg-gray-200 rounded w-full" />
			<div className="h-6 bg-gray-200 rounded w-full" />
			<div className="h-6 bg-gray-200 rounded w-5/6 mb-8" />
			{/* セクション2 */}
			<div className="h-10 bg-gray-200 rounded w-1/3" />
			<div className="h-6 bg-gray-200 rounded w-full" />
			<div className="h-6 bg-gray-200 rounded w-full" />
			<div className="h-6 bg-gray-200 rounded w-full" />
			<div className="h-6 bg-gray-200 rounded w-full" />
			<div className="h-6 bg-gray-200 rounded w-2/3" />
			<div className="h-6 bg-gray-200 rounded w-full" />
			<div className="h-6 bg-gray-200 rounded w-full" />
			<div className="h-6 bg-gray-200 rounded w-full" />
			<div className="h-6 bg-gray-200 rounded w-5/6" />
		</div>
	);
}
