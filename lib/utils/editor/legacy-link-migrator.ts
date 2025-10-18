import type { JSONContent } from "@tiptap/core";

/**
 * Text node type with marks for type safety
 */
interface JSONTextNode extends JSONContent {
  type: "text";
  text: string;
  marks?: Array<{ type: string; [key: string]: unknown }>;
}

/**
 * Result of detecting a bracket pattern match
 */
export interface BracketMatch {
  content: string;
  start: number;
  end: number;
  isExternal: boolean;
}

/**
 * Result of detecting a tag pattern match
 */
export interface TagMatch {
  content: string;
  start: number;
  end: number;
  prefix: string;
}

/**
 * Migrate legacy bracket [Title] and tag #tag syntax to unified link marks.
 *
 * This function scans text nodes for:
 * - [bracket] syntax → converts to unilink mark with variant "bracket"
 * - #tag syntax → converts to unilink mark with variant "tag"
 *
 * Text nodes that already have a unilink mark are skipped to avoid double conversion.
 *
 * @param doc - The JSONContent document to migrate
 * @returns A new JSONContent document with bracket/tag syntax converted to unilink marks
 */
export function migrateBracketsToMarks(doc: JSONContent): JSONContent {
  let bracketCount = 0;
  let tagCount = 0;
  let processedTextNodes = 0;
  let skippedNodes = 0;

  const clone = structuredClone(doc) as JSONContent;

  const walk = (node: JSONContent): JSONContent[] => {
    if (node.type === "text" && node.text) {
      processedTextNodes++;

      // Skip if already has unilink mark
      const textNode = node as JSONTextNode;
      const hasMark = textNode.marks?.some((mark) => mark.type === "unilink");
      if (hasMark) {
        skippedNodes++;
        return [node];
      }

      // Find patterns like [Title] and #tag
      const pieces: JSONContent[] = [];
      let lastIndex = 0;
      const text = textNode.text;

      // Combined pattern: [bracket] or #tag (word boundary after tag)
      const pattern = /\[([^\[\]]+)\]|(^|\s)(#[^\s#]+)/g;
      const matches = Array.from(text.matchAll(pattern));

      for (const match of matches) {
        const bracketContent = match[1]; // Content inside []
        const tagPrefix = match[2]; // Whitespace before #tag
        const tagContent = match[3]; // #tag itself
        const start = match.index ?? 0;

        // Add text before match
        if (start > lastIndex) {
          pieces.push({
            type: "text",
            text: text.slice(lastIndex, start),
          });
        }

        if (bracketContent) {
          // [bracket] syntax
          const isExternal = /^https?:\/\//.test(bracketContent);
          const markId = `migrated-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`;
          pieces.push({
            type: "text",
            text: bracketContent,
            marks: [
              {
                type: "unilink",
                attrs: {
                  href: isExternal ? bracketContent : "#",
                  text: bracketContent,
                  key: bracketContent.toLowerCase(),
                  raw: bracketContent,
                  variant: "bracket",
                  external: isExternal || undefined,
                  exists: isExternal ? true : undefined,
                  state: isExternal ? "exists" : "pending",
                  markId,
                  created: false,
                },
              },
            ],
          });
          bracketCount++;
          lastIndex = start + match[0].length;
        } else if (tagContent) {
          // #tag syntax - preserve whitespace before tag
          if (tagPrefix) {
            pieces.push({
              type: "text",
              text: tagPrefix,
            });
            lastIndex = start + tagPrefix.length;
          }

          const tagText = tagContent.slice(1); // Remove # prefix
          const markId = `migrated-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`;
          pieces.push({
            type: "text",
            text: tagText,
            marks: [
              {
                type: "unilink",
                attrs: {
                  href: "#",
                  text: tagText,
                  key: tagText.toLowerCase(),
                  raw: tagText,
                  variant: "tag",
                  external: undefined,
                  exists: undefined,
                  state: "pending",
                  markId,
                  created: false,
                },
              },
            ],
          });
          tagCount++;
          lastIndex = start + (tagPrefix?.length ?? 0) + tagContent.length;
        }
      }

      // If no matches, return original node
      if (pieces.length === 0) return [node];

      // Add remaining text
      if (lastIndex < text.length) {
        pieces.push({
          type: "text",
          text: text.slice(lastIndex),
        });
      }
      return pieces;
    }

    if (Array.isArray(node.content)) {
      return [{ ...node, content: node.content.flatMap(walk) }];
    }

    return [node];
  };

  const result = {
    ...clone,
    content: (clone.content ?? []).flatMap(walk),
  };

  if (bracketCount > 0 || tagCount > 0) {
    // Log migration statistics for debugging
    // biome-ignore lint/suspicious/noConsole: Debug logging for migration statistics
    console.log(
      `[legacy-link-migrator] Processed ${processedTextNodes} text nodes, ` +
        `skipped ${skippedNodes} nodes with existing marks, ` +
        `converted ${bracketCount} brackets and ${tagCount} tags to unilink marks`
    );
  }

  return result;
}

/**
 * Detect bracket pattern [Title] in text
 *
 * @param text - The text to search
 * @returns Array of bracket matches
 */
export function detectBracketPattern(text: string): BracketMatch[] {
  const pattern = /\[([^\[\]]+)\]/g;
  const matches: BracketMatch[] = [];

  let match = pattern.exec(text);
  while (match !== null) {
    const content = match[1];
    const start = match.index;
    const end = start + match[0].length;
    const isExternal = /^https?:\/\//.test(content);

    matches.push({ content, start, end, isExternal });
    match = pattern.exec(text);
  }

  return matches;
}

/**
 * Detect tag pattern #tag in text
 *
 * @param text - The text to search
 * @returns Array of tag matches
 */
export function detectTagPattern(text: string): TagMatch[] {
  const pattern = /(^|\s)(#[^\s#]+)/g;
  const matches: TagMatch[] = [];

  let match = pattern.exec(text);
  while (match !== null) {
    const prefix = match[1];
    const content = match[2].slice(1); // Remove # prefix
    const start = match.index + prefix.length;
    const end = start + match[2].length;

    matches.push({ content, start, end, prefix });
    match = pattern.exec(text);
  }

  return matches;
}
