/**
 * Click handler plugin
 * Handles clicks on unified link marks
 *
 * Phase 3.1 Extensions:
 * - Bracket click detection (backward compatibility)
 * - .icon notation support
 * - External link support
 * - noteSlug integration
 */

import type { Editor } from "@tiptap/core";
import type { Mark, ResolvedPos } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { toast } from "sonner";
import logger from "@/lib/logger";
import {
	handleMissingLinkClick,
	navigateToPageWithContext,
	openExternalLink,
	parseBracketContent,
	resolveIconLink,
} from "../../../unilink/resolver";
import type { UnifiedLinkAttributes, UnifiedLinkMarkOptions } from "../types";

/**
 * Phase 3.1: Detect bracket pattern at cursor position (backward compatibility)
 * For content that hasn't been converted to UnifiedLinkMark yet
 */
const detectBracketAtPosition = (
	$pos: ResolvedPos,
): { content: string; start: number; end: number } | null => {
	try {
		const node = $pos.node();

		// Ignore non-text nodes
		if (!node.isText || !node.text) {
			return null;
		}

		// Ignore code blocks and inline code
		if (
			$pos.parent.type.name === "codeBlock" ||
			node.marks.some((mark: Mark) => mark.type.name === "code")
		) {
			return null;
		}

		const text = node.text;
		const posInNode = $pos.textOffset;

		// Find bracket pair that contains the cursor position
		let bracketStart = -1;
		let bracketEnd = -1;
		let inBracket = false;

		for (let i = 0; i < text.length; i++) {
			if (text[i] === "[" && !inBracket) {
				bracketStart = i;
				inBracket = true;
				continue;
			}
			if (text[i] === "]" && inBracket) {
				bracketEnd = i;
				if (posInNode >= bracketStart && posInNode <= bracketEnd) {
					const content = text.substring(bracketStart + 1, bracketEnd);
					return {
						content,
						start: bracketStart,
						end: bracketEnd,
					};
				}
				inBracket = false;
				bracketStart = -1;
			}
		}

		return null;
	} catch (error) {
		logger.error(
			{ error, pos: $pos.pos },
			"Failed to detect bracket at position",
		);
		return null;
	}
};

/**
 * Phase 3.1: Handle bracket click (backward compatibility)
 */
const handleBracketClick = async (
	bracketContent: string,
	context: { editor: Editor; options: UnifiedLinkMarkOptions },
): Promise<boolean> => {
	try {
		const parsed = parseBracketContent(bracketContent);
		const { noteSlug } = context.options;

		// Handle .icon notation
		if (parsed.type === "icon" && parsed.userSlug) {
			const result = await resolveIconLink(parsed.userSlug, noteSlug);
			if (result) {
				window.location.href = result.href;
			}
			return true;
		}

		// Handle external links
		if (parsed.type === "external") {
			openExternalLink(parsed.slug);
			return true;
		}

		// Handle regular page links
		// This will be handled by the existing PageLink extension
		// until full migration is complete
		return false;
	} catch (error) {
		logger.error({ bracketContent, error }, "Failed to handle bracket click");
		toast.error("リンクの処理に失敗しました");
		return false;
	}
};

/**
 * Phase 3.2: Handle DOM click events on anchor tags
 * Handles data-page-title attribute for new page creation
 */
const handleAnchorClick = async (
	target: HTMLAnchorElement,
	event: MouseEvent,
	context: { editor: Editor; options: UnifiedLinkMarkOptions },
): Promise<boolean> => {
	try {
		// Handle data-page-title attribute (new page creation)
		const newTitle = target.getAttribute("data-page-title");
		if (newTitle) {
			event.preventDefault();

			// Get userId from options or fetch from auth
			let userId = context.options.userId;

			if (!userId) {
				try {
					// Dynamic import to avoid circular dependency
					const { createClient } = await import("@/lib/supabase/client");
					const supabase = createClient();

					const {
						data: { user },
						error: authError,
					} = await supabase.auth.getUser();

					if (authError || !user) {
						logger.warn({ error: authError }, "User not authenticated");
						toast.error("ログインしてください");
						return true;
					}

					userId = user.id;
				} catch (error) {
					logger.error({ error }, "Failed to get user authentication");
					toast.error("認証情報の取得に失敗しました");
					return true;
				}
			}

			try {
				// Import createPageFromLink dynamically
				const { createPageFromLink } = await import(
					"../../../unilink/resolver"
				);

				// Create page and navigate
				const result = await createPageFromLink(
					newTitle,
					userId,
					context.options.noteSlug,
				);

				if (result) {
					window.location.href = result.href;
				}
			} catch (error) {
				logger.error(
					{ newTitle, userId, error },
					"Failed to create page from link",
				);
				toast.error("ページの作成に失敗しました");
			}

			return true;
		}

		// Handle normal href navigation
		if (target.hasAttribute("href")) {
			const href = target.getAttribute("href");
			if (href && href !== "#") {
				event.preventDefault();

				if (target.target === "_blank") {
					window.open(href, "_blank", "noopener,noreferrer");
				} else {
					window.location.href = href;
				}

				return true;
			}
		}

		return false;
	} catch (error) {
		logger.error({ error }, "Failed to handle anchor click");
		toast.error("リンクの処理に失敗しました");
		return false;
	}
};

/**
 * Create the click handler plugin
 * @param context - Plugin context
 * @returns ProseMirror Plugin
 */
export const createClickHandlerPlugin = (context: {
	editor: Editor;
	options: UnifiedLinkMarkOptions;
}) => {
	return new Plugin({
		key: new PluginKey("unifiedLinkClickHandler"),
		props: {
			handleClick: (view, pos, event) => {
				try {
					const { state } = view;
					const { doc } = state;
					const $pos = doc.resolve(pos);

					// Phase 3.1: Priority 1 - Check for unilink mark
					const unilinkMark = $pos
						.marks()
						.find((mark) => mark.type.name === "unilink");

					if (unilinkMark) {
						event.preventDefault();
						const attrs = unilinkMark.attrs as UnifiedLinkAttributes;

						// Phase 3.1: Handle by linkType
						if (attrs.linkType === "icon" && attrs.userSlug) {
							// Handle .icon links
							resolveIconLink(attrs.userSlug, context.options.noteSlug)
								.then((result) => {
									if (result) {
										window.location.href = result.href;
									}
								})
								.catch((error) => {
									logger.error(
										{ userSlug: attrs.userSlug, error },
										"Failed to resolve icon link",
									);
									toast.error("リンクの解決に失敗しました");
								});
							return true;
						}

						if (attrs.linkType === "external" && attrs.href) {
							// Handle external links
							openExternalLink(attrs.href);
							return true;
						}

						// Handle regular page links with noteSlug support
						if (attrs.state === "exists" && attrs.pageId) {
							navigateToPageWithContext(
								attrs.pageId,
								context.options.noteSlug,
								attrs.created,
							);
						} else if (
							attrs.state === "missing" &&
							attrs.text &&
							attrs.markId
						) {
							handleMissingLinkClick(
								context.editor,
								attrs.markId,
								attrs.text,
								context.options.userId || undefined,
								context.options.onShowCreatePageDialog,
							);
						} else if (attrs.state === "pending") {
							logger.debug({ attrs }, "[UnifiedLinkMark] Link is pending");
						} else {
							logger.warn(
								{ attrs },
								"[UnifiedLinkMark] Unknown state or missing data",
							);
						}

						return true;
					}

					// Phase 3.1: Priority 2 - Check for bracket pattern (backward compatibility)
					const bracketDetection = detectBracketAtPosition($pos);
					if (bracketDetection) {
						event.preventDefault();
						handleBracketClick(bracketDetection.content, context);
						return true;
					}

					return false;
				} catch (error) {
					logger.error({ pos, error }, "Failed to handle click");
					return false;
				}
			},
			// Phase 3.2: DOM click handler for anchor tags
			handleDOMEvents: {
				click: (_view, event) => {
					try {
						const target = event.target as HTMLElement;

						if (target.tagName === "A") {
							handleAnchorClick(target as HTMLAnchorElement, event, context);
							return true;
						}

						return false;
					} catch (error) {
						logger.error({ error }, "Failed to handle DOM click event");
						return false;
					}
				},
			},
		},
	});
};
