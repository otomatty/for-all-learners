/**
 * Resolver Module Public API
 * Re-exports all resolver functionality while maintaining backward compatibility
 *
 * This index file serves as the central export point for all resolver modules,
 * allowing consumers to import from a single location while the implementation
 * is organized across multiple focused files.
 */

// Broadcast (internal use, but exported for flexibility)
export {
	getBroadcastChannel,
	notifyPageCreated,
	notifyPageUpdated,
} from "./broadcast";
// Link types
export {
	type BracketContent,
	handleMissingLinkClick,
	isExternalLink,
	openExternalLink,
	parseBracketContent,
	resolveIconLink,
} from "./link-types";
// Mark operations
export { batchResolveMarks, updateMarkToExists } from "./mark-operations";
// Navigation
export { navigateToPage, navigateToPageWithContext } from "./navigation";
// Page creation
export { createPageFromLink, createPageFromMark } from "./page-creation";
