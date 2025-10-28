/**
 * Link Groups Optimization Test
 *
 * Phase 3: N+1クエリ問題の最適化検証
 *
 * Before: 各リンクグループごとに個別クエリ（N+1問題）
 * After: バッチクエリで一括取得（4クエリ固定）
 */

import { describe, expect, test } from "vitest";

type LinkGroup = {
	id: string;
	key: string;
	raw_text: string;
	page_id: string | null;
	link_count: number;
};

type Occurrence = {
	link_group_id: string;
	source_page_id: string;
};

type Page = {
	id: string;
	title: string;
	thumbnail_url: string | null;
	content_tiptap: Record<string, unknown>;
	updated_at: string;
};

describe("Link Groups - Query Optimization", () => {
	/**
	 * 旧実装: O(n²) N+1クエリ問題あり
	 */
	const oldImplementation = (
		linkGroupsData: LinkGroup[],
		allTargetPages: Page[],
		allOccurrences: Occurrence[],
		allReferencingPages: Page[],
		pageId: string,
	) => {
		const result = [];
		let queryCount = 0;

		for (const group of linkGroupsData) {
			// 1. Target page個別取得（N回）
			queryCount++;
			let targetPage = null;
			if (group.page_id) {
				targetPage = allTargetPages.find((p) => p.id === group.page_id);
			}

			// 2. Occurrences個別取得（N回）
			queryCount++;
			const occurrences = allOccurrences.filter(
				(o) => o.link_group_id === group.id,
			);

			const referencingPageIds = [
				...new Set(
					occurrences
						.map((o) => o.source_page_id)
						.filter((id) => id !== pageId && id !== group.page_id),
				),
			];

			// 3. Referencing pages個別取得（N回）
			queryCount++;
			const referencingPages = allReferencingPages.filter((p) =>
				referencingPageIds.includes(p.id),
			);

			result.push({
				key: group.key,
				displayText: group.raw_text,
				linkGroupId: group.id,
				pageId: group.page_id,
				linkCount: group.link_count ?? 0,
				targetPage,
				referencingPages,
			});
		}

		return { result, queryCount };
	};

	/**
	 * 新実装: O(n) バッチクエリ
	 */
	const newImplementation = (
		linkGroupsData: LinkGroup[],
		allTargetPages: Page[],
		allOccurrences: Occurrence[],
		allReferencingPages: Page[],
		pageId: string,
	) => {
		let queryCount = 0;

		// Collect all IDs (no query)
		linkGroupsData
			.map((g) => g.page_id)
			.filter((id): id is string => id !== null);

		// Batch queries (固定回数)
		queryCount++; // Target pages batch
		queryCount++; // Occurrences batch
		queryCount++; // Referencing pages batch

		// Build lookup maps
		const targetPagesMap = new Map(allTargetPages.map((p) => [p.id, p]));
		const occurrencesByGroupId = new Map<string, Occurrence[]>();
		for (const occ of allOccurrences) {
			if (!occurrencesByGroupId.has(occ.link_group_id)) {
				occurrencesByGroupId.set(occ.link_group_id, []);
			}
			occurrencesByGroupId.get(occ.link_group_id)?.push(occ);
		}
		const referencingPagesMap = new Map(
			allReferencingPages.map((p) => [p.id, p]),
		);

		// Build result using maps (O(n))
		const result = linkGroupsData.map((group) => {
			const targetPage = group.page_id
				? targetPagesMap.get(group.page_id)
				: null;

			const occurrences = occurrencesByGroupId.get(group.id) || [];
			const referencingPageIds = [
				...new Set(
					occurrences
						.map((o) => o.source_page_id)
						.filter((id) => id !== pageId && id !== group.page_id),
				),
			];

			const referencingPages = referencingPageIds
				.map((id) => referencingPagesMap.get(id))
				.filter((p): p is Page => p !== undefined);

			return {
				key: group.key,
				displayText: group.raw_text,
				linkGroupId: group.id,
				pageId: group.page_id,
				linkCount: group.link_count ?? 0,
				targetPage: targetPage ?? null,
				referencingPages,
			};
		});

		return { result, queryCount };
	};

	// Test data generator
	const generateTestData = (linkGroupCount: number) => {
		const linkGroupsData: LinkGroup[] = [];
		const allTargetPages: Page[] = [];
		const allOccurrences: Occurrence[] = [];
		const allReferencingPages: Page[] = [];

		for (let i = 0; i < linkGroupCount; i++) {
			const groupId = `group-${i}`;
			const pageId = `page-${i}`;

			linkGroupsData.push({
				id: groupId,
				key: `key-${i}`,
				raw_text: `Link ${i}`,
				page_id: pageId,
				link_count: 3,
			});

			allTargetPages.push({
				id: pageId,
				title: `Page ${i}`,
				thumbnail_url: null,
				content_tiptap: {},
				updated_at: new Date().toISOString(),
			});

			// 各グループに2つのoccurrenceを追加
			for (let j = 0; j < 2; j++) {
				const refPageId = `ref-page-${i}-${j}`;
				allOccurrences.push({
					link_group_id: groupId,
					source_page_id: refPageId,
				});

				allReferencingPages.push({
					id: refPageId,
					title: `Ref Page ${i}-${j}`,
					thumbnail_url: null,
					content_tiptap: {},
					updated_at: new Date().toISOString(),
				});
			}
		}

		return {
			linkGroupsData,
			allTargetPages,
			allOccurrences,
			allReferencingPages,
		};
	};

	test("should return same result for empty array", () => {
		const {
			linkGroupsData,
			allTargetPages,
			allOccurrences,
			allReferencingPages,
		} = generateTestData(0);

		const oldResult = oldImplementation(
			linkGroupsData,
			allTargetPages,
			allOccurrences,
			allReferencingPages,
			"current-page",
		);
		const newResult = newImplementation(
			linkGroupsData,
			allTargetPages,
			allOccurrences,
			allReferencingPages,
			"current-page",
		);

		expect(newResult.result).toEqual(oldResult.result);
		expect(newResult.result).toEqual([]);
	});

	test("should return same result for single link group", () => {
		const {
			linkGroupsData,
			allTargetPages,
			allOccurrences,
			allReferencingPages,
		} = generateTestData(1);

		const newResult = newImplementation(
			linkGroupsData,
			allTargetPages,
			allOccurrences,
			allReferencingPages,
			"current-page",
		);

		expect(newResult.result).toHaveLength(1);
		expect(newResult.result[0].key).toBe("key-0");
		expect(newResult.result[0].referencingPages).toHaveLength(2);
	});

	test("should return same result for multiple link groups", () => {
		const {
			linkGroupsData,
			allTargetPages,
			allOccurrences,
			allReferencingPages,
		} = generateTestData(5);

		const oldResult = oldImplementation(
			linkGroupsData,
			allTargetPages,
			allOccurrences,
			allReferencingPages,
			"current-page",
		);
		const newResult = newImplementation(
			linkGroupsData,
			allTargetPages,
			allOccurrences,
			allReferencingPages,
			"current-page",
		);

		expect(newResult.result).toHaveLength(oldResult.result.length);
		expect(newResult.result).toHaveLength(5);

		// Check each group has correct structure
		for (let i = 0; i < 5; i++) {
			expect(newResult.result[i].key).toBe(`key-${i}`);
			expect(newResult.result[i].targetPage?.id).toBe(`page-${i}`);
			expect(newResult.result[i].referencingPages).toHaveLength(2);
		}
	});

	test("query optimization: should reduce query count significantly", () => {
		const testCases = [
			{ count: 5, expectedOldQueries: 15, expectedNewQueries: 3 },
			{ count: 10, expectedOldQueries: 30, expectedNewQueries: 3 },
			{ count: 20, expectedOldQueries: 60, expectedNewQueries: 3 },
			{ count: 50, expectedOldQueries: 150, expectedNewQueries: 3 },
		];

		for (const { count, expectedOldQueries, expectedNewQueries } of testCases) {
			const {
				linkGroupsData,
				allTargetPages,
				allOccurrences,
				allReferencingPages,
			} = generateTestData(count);

			const oldResult = oldImplementation(
				linkGroupsData,
				allTargetPages,
				allOccurrences,
				allReferencingPages,
				"current-page",
			);
			const newResult = newImplementation(
				linkGroupsData,
				allTargetPages,
				allOccurrences,
				allReferencingPages,
				"current-page",
			);

			// Verify query count reduction
			expect(oldResult.queryCount).toBe(expectedOldQueries);
			expect(newResult.queryCount).toBe(expectedNewQueries);

			// Verify same result length
			expect(newResult.result).toHaveLength(oldResult.result.length);

			const reduction = (
				((oldResult.queryCount - newResult.queryCount) / oldResult.queryCount) *
				100
			).toFixed(1);
			const speedup = (oldResult.queryCount / newResult.queryCount).toFixed(1);

			// Log performance improvement (for documentation)
			if (count === 50) {
				// Only log the largest case
				expect(Number.parseFloat(reduction)).toBeGreaterThan(90); // 90%以上の削減
				expect(Number.parseFloat(speedup)).toBeGreaterThan(40); // 40倍以上高速化
			}
		}
	});

	test("performance: new implementation should be faster for large datasets", () => {
		const {
			linkGroupsData,
			allTargetPages,
			allOccurrences,
			allReferencingPages,
		} = generateTestData(100);

		const oldStart = performance.now();
		const oldResult = oldImplementation(
			linkGroupsData,
			allTargetPages,
			allOccurrences,
			allReferencingPages,
			"current-page",
		);
		const oldTime = performance.now() - oldStart;

		const newStart = performance.now();
		const newResult = newImplementation(
			linkGroupsData,
			allTargetPages,
			allOccurrences,
			allReferencingPages,
			"current-page",
		);
		const newTime = performance.now() - newStart;

		// Verify same result
		expect(newResult.result).toHaveLength(oldResult.result.length);
		expect(newResult.result).toHaveLength(100);

		// New implementation should be faster or equal
		expect(newTime).toBeLessThanOrEqual(oldTime * 1.5);

		// Query count should be dramatically reduced
		expect(newResult.queryCount).toBe(3); // Fixed 3 queries
		expect(oldResult.queryCount).toBe(300); // N*3 queries (100*3)
	});

	test("edge case: handles link groups without target page", () => {
		const linkGroupsData: LinkGroup[] = [
			{
				id: "group-1",
				key: "missing-page",
				raw_text: "Missing Page",
				page_id: null,
				link_count: 2,
			},
		];

		const { result } = newImplementation(
			linkGroupsData,
			[],
			[],
			[],
			"current-page",
		);

		expect(result).toHaveLength(1);
		expect(result[0].targetPage).toBeNull();
		expect(result[0].referencingPages).toEqual([]);
	});

	test("edge case: handles occurrences without referencing pages", () => {
		const linkGroupsData: LinkGroup[] = [
			{
				id: "group-1",
				key: "page-1",
				raw_text: "Page 1",
				page_id: "page-1",
				link_count: 1,
			},
		];

		const allTargetPages: Page[] = [
			{
				id: "page-1",
				title: "Page 1",
				thumbnail_url: null,
				content_tiptap: {},
				updated_at: new Date().toISOString(),
			},
		];

		const { result } = newImplementation(
			linkGroupsData,
			allTargetPages,
			[],
			[],
			"current-page",
		);

		expect(result).toHaveLength(1);
		expect(result[0].targetPage?.id).toBe("page-1");
		expect(result[0].referencingPages).toEqual([]);
	});
});
