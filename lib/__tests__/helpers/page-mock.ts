/**
 * Page Mock Helper
 *
 * Provides utilities for creating mock Page data objects
 * to be used across tests, reducing duplication and ensuring consistency.
 *
 * @example
 * ```typescript
 * import { createMockPage } from '@/lib/__tests__/helpers';
 *
 * const page = createMockPage({ title: 'Test Page' });
 * ```
 */

import type { Json } from "@/types/database.types";

/**
 * Page data type from database
 */
export type PageRow = {
	id: string;
	title: string;
	content_tiptap: Json;
	user_id: string;
	is_public: boolean;
	created_at: string | null;
	updated_at: string | null;
	thumbnail_url: string | null;
	scrapbox_page_id: string | null;
	scrapbox_page_content_synced_at: string | null;
	scrapbox_page_list_synced_at: string | null;
};

/**
 * Configuration options for creating mock Page objects
 */
export interface MockPageData {
	id?: string;
	title?: string;
	user_id?: string;
	content_tiptap?: Json;
	is_public?: boolean;
	created_at?: string | null;
	updated_at?: string | null;
	thumbnail_url?: string | null;
	scrapbox_page_id?: string | null;
	scrapbox_page_content_synced_at?: string | null;
	scrapbox_page_list_synced_at?: string | null;
}

/**
 * Generate a random page ID
 *
 * @returns A random string suitable for use as a page ID
 *
 * @example
 * const id = generatePageId();
 * // => 'page-a1b2c3d'
 */
export function generatePageId(): string {
	return `page-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Create a mock Page object for testing
 *
 * Provides sensible defaults for all fields while allowing customization.
 *
 * @param data - Optional configuration to override defaults
 * @returns A complete Page object
 *
 * @example
 * // Default page
 * const page = createMockPage();
 *
 * @example
 * // Page with custom title
 * const page = createMockPage({ title: 'My Custom Page' });
 *
 * @example
 * // Public page
 * const page = createMockPage({ is_public: true });
 *
 * @example
 * // Page with content
 * const page = createMockPage({
 *   title: 'Test Page',
 *   content_tiptap: {
 *     type: 'doc',
 *     content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }]
 *   }
 * });
 */
export function createMockPage(data: MockPageData = {}): PageRow {
	const now = new Date().toISOString();

	return {
		id: data.id ?? generatePageId(),
		title: data.title ?? "Test Page",
		content_tiptap: data.content_tiptap ?? {},
		user_id: data.user_id ?? "test-user-id",
		is_public: data.is_public ?? false,
		created_at: data.created_at ?? now,
		updated_at: data.updated_at ?? now,
		thumbnail_url: data.thumbnail_url ?? null,
		scrapbox_page_id: data.scrapbox_page_id ?? null,
		scrapbox_page_content_synced_at:
			data.scrapbox_page_content_synced_at ?? null,
		scrapbox_page_list_synced_at: data.scrapbox_page_list_synced_at ?? null,
	};
}

/**
 * Create multiple mock pages at once
 *
 * Useful for testing list views, search results, etc.
 *
 * @param count - Number of pages to create
 * @param baseData - Base configuration to apply to all pages
 * @returns An array of mock Page objects
 *
 * @example
 * // Create 5 pages
 * const pages = createMockPages(5);
 *
 * @example
 * // Create 3 public pages with same user
 * const pages = createMockPages(3, {
 *   user_id: 'user-123',
 *   is_public: true
 * });
 */
export function createMockPages(
	count: number,
	baseData: MockPageData = {},
): PageRow[] {
	return Array.from({ length: count }, (_, i) =>
		createMockPage({
			...baseData,
			title: baseData.title
				? `${baseData.title} ${i + 1}`
				: `Test Page ${i + 1}`,
		}),
	);
}

/**
 * Create a mock page with TipTap content
 *
 * @param title - The page title
 * @param textContent - The text content to include
 * @returns A Page object with TipTap formatted content
 *
 * @example
 * const page = createMockPageWithContent('My Page', 'Hello World');
 * // Page will have properly formatted TipTap content
 */
export function createMockPageWithContent(
	title: string,
	textContent: string,
): PageRow {
	return createMockPage({
		title,
		content_tiptap: {
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{
							type: "text",
							text: textContent,
						},
					],
				},
			],
		},
	});
}

/**
 * Create a mock public page
 *
 * @param data - Optional configuration
 * @returns A Page object with is_public set to true
 *
 * @example
 * const page = createMockPublicPage({ title: 'Public Page' });
 * expect(page.is_public).toBe(true);
 */
export function createMockPublicPage(data: MockPageData = {}): PageRow {
	return createMockPage({ ...data, is_public: true });
}

/**
 * Create a mock page for a specific user
 *
 * @param userId - The user ID
 * @param data - Optional additional configuration
 * @returns A Page object for the specified user
 *
 * @example
 * const page = createMockPageForUser('user-123', { title: 'User Page' });
 * expect(page.user_id).toBe('user-123');
 */
export function createMockPageForUser(
	userId: string,
	data: MockPageData = {},
): PageRow {
	return createMockPage({ ...data, user_id: userId });
}
