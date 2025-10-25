/**
 * UnifiedLinkMark configuration constants
 * Default values and configuration for the UnifiedLinkMark extension
 */

import type { UnifiedLinkMarkOptions } from "./types";

/**
 * Default HTML attributes for the mark
 */
export const DEFAULT_HTML_ATTRIBUTES = {
	class: "unilink underline cursor-pointer",
};

/**
 * Default mark options
 */
export const DEFAULT_OPTIONS: UnifiedLinkMarkOptions = {
	HTMLAttributes: DEFAULT_HTML_ATTRIBUTES,
	autoReconciler: null,
	noteSlug: null,
	userId: null,
	onShowCreatePageDialog: undefined,
};

/**
 * Resolver configuration
 */
export const RESOLVER_CONFIG = {
	batchSize: 10,
	batchDelay: 50,
	maxRetries: 2,
	retryDelayBase: 100, // Base delay for exponential backoff
	resolutionTimeout: 5000, // 5 seconds timeout for resolution
} as const;

/**
 * Regular expression patterns
 */
export const PATTERNS = {
	// Bracket pattern: matches [text] in any context
	// Excludes line breaks to prevent re-matching after line breaks
	// This prevents the duplication bug where brackets multiply on Enter/Space
	bracket: /\[([^[\]\n]+)\]/,
	// Tag pattern: detects #tag in text (not just at line end)
	// Matches: start of line or whitespace, followed by #, then tag characters
	// Lookahead ensures tag ends at whitespace, punctuation, or end of text
	tag: /(?:^|\s)#([a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF\uAC00-\uD7AF]{1,50})(?=\s|$|[^\p{Letter}\p{Number}])/u,
	externalUrl: /^https?:\/\//,
} as const;
