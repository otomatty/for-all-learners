/**
 * Resolver Module Public API
 * Re-exports all resolver functionality while maintaining backward compatibility
 *
 * This index file serves as the central export point for all resolver modules,
 * allowing consumers to import from a single location while the implementation
 * is organized across multiple focused files.
 */

// Page creation
export { createPageFromMark, createPageFromLink } from "./page-creation";

// Navigation
export { navigateToPage, navigateToPageWithContext } from "./navigation";

// Link types
export {
  resolveIconLink,
  parseBracketContent,
  isExternalLink,
  openExternalLink,
  handleMissingLinkClick,
  type BracketContent,
} from "./link-types";

// Mark operations
export { updateMarkToExists, batchResolveMarks } from "./mark-operations";

// Broadcast (internal use, but exported for flexibility)
export {
  getBroadcastChannel,
  notifyPageCreated,
  notifyPageUpdated,
} from "./broadcast";
