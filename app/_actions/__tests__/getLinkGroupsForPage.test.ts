/**
 * Tests for getLinkGroupsForPage server action
 */

import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { getLinkGroupsForPage } from "../linkGroups";
import type { SupabaseClient } from "@supabase/supabase-js";

// Mock Supabase client
let supabase: SupabaseClient;

beforeEach(async () => {
	supabase = await createClient();
});

afterEach(async () => {
	// Cleanup test data
	await supabase.from("link_occurrences").delete().neq("id", "00000000-0000-0000-0000-000000000000");
	await supabase.from("link_groups").delete().neq("id", "00000000-0000-0000-0000-000000000000");
	await supabase.from("pages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
});

describe("getLinkGroupsForPage", () => {
	test("should return empty array when page has no links", async () => {
		// Arrange: Create a page with no links
		const { data: user } = await supabase.auth.getUser();
		if (!user.user) throw new Error("User not authenticated");

		const { data: page } = await supabase
			.from("pages")
			.insert({
				user_id: user.user.id,
				title: "Test Page",
				content_tiptap: { type: "doc", content: [] },
				is_public: false,
			})
			.select("id")
			.single();

		if (!page) throw new Error("Failed to create page");

		// Act
		const { data, error } = await getLinkGroupsForPage(page.id);

		// Assert
		expect(error).toBeNull();
		expect(data).toEqual([]);
	});

	test("should return empty array when all links have linkCount = 1", async () => {
		// Arrange: Create page with link that has linkCount = 1
		const { data: user } = await supabase.auth.getUser();
		if (!user.user) throw new Error("User not authenticated");

		const { data: page } = await supabase
			.from("pages")
			.insert({
				user_id: user.user.id,
				title: "Test Page",
				content_tiptap: {
					type: "doc",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									text: "React",
									marks: [
										{
											type: "unilink",
											attrs: {
												key: "react",
												text: "React",
												markId: "mark-1",
												variant: "bracket",
											},
										},
									],
								},
							],
						},
					],
				},
				is_public: false,
			})
			.select("id")
			.single();

		if (!page) throw new Error("Failed to create page");

		// Create link group with linkCount = 1
		const { data: linkGroup } = await supabase
			.from("link_groups")
			.insert({
				key: "react",
				raw_text: "React",
				page_id: null,
				link_count: 1,
			})
			.select("id")
			.single();

		if (!linkGroup) throw new Error("Failed to create link group");

		await supabase.from("link_occurrences").insert({
			link_group_id: linkGroup.id,
			source_page_id: page.id,
			mark_id: "mark-1",
		});

		// Act
		const { data, error } = await getLinkGroupsForPage(page.id);

		// Assert
		expect(error).toBeNull();
		expect(data).toEqual([]);
	});

	test("should return link groups with linkCount > 1", async () => {
		// Arrange: Create pages and link group
		const { data: user } = await supabase.auth.getUser();
		if (!user.user) throw new Error("User not authenticated");

		// Create target page
		const { data: targetPage } = await supabase
			.from("pages")
			.insert({
				user_id: user.user.id,
				title: "React Framework",
				content_tiptap: { type: "doc", content: [] },
				is_public: false,
			})
			.select("id, title, thumbnail_url, content_tiptap, updated_at")
			.single();

		if (!targetPage) throw new Error("Failed to create target page");

		// Create referencing pages
		const { data: refPage1 } = await supabase
			.from("pages")
			.insert({
				user_id: user.user.id,
				title: "Page 1",
				content_tiptap: {
					type: "doc",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									text: "React",
									marks: [
										{
											type: "unilink",
											attrs: {
												key: "react",
												text: "React",
												markId: "mark-1",
												variant: "bracket",
											},
										},
									],
								},
							],
						},
					],
				},
				is_public: false,
			})
			.select("id")
			.single();

		if (!refPage1) throw new Error("Failed to create ref page 1");

		const { data: refPage2 } = await supabase
			.from("pages")
			.insert({
				user_id: user.user.id,
				title: "Page 2",
				content_tiptap: {
					type: "doc",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									text: "React",
									marks: [
										{
											type: "unilink",
											attrs: {
												key: "react",
												text: "React",
												markId: "mark-2",
												variant: "bracket",
											},
										},
									],
								},
							],
						},
					],
				},
				is_public: false,
			})
			.select("id")
			.single();

		if (!refPage2) throw new Error("Failed to create ref page 2");

		// Create link group with linkCount > 1
		const { data: linkGroup } = await supabase
			.from("link_groups")
			.insert({
				key: "react",
				raw_text: "React",
				page_id: targetPage.id,
				link_count: 3,
			})
			.select("id")
			.single();

		if (!linkGroup) throw new Error("Failed to create link group");

		// Create link occurrences
		await supabase.from("link_occurrences").insert([
			{
				link_group_id: linkGroup.id,
				source_page_id: refPage1.id,
				mark_id: "mark-1",
			},
			{
				link_group_id: linkGroup.id,
				source_page_id: refPage2.id,
				mark_id: "mark-2",
			},
		]);

		// Act
		const { data, error } = await getLinkGroupsForPage(refPage1.id);

		// Assert
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
		expect(data?.[0]).toMatchObject({
			key: "react",
			displayText: "React",
			linkGroupId: linkGroup.id,
			pageId: targetPage.id,
			linkCount: 3,
		});
		expect(data?.[0].targetPage).toBeDefined();
		expect(data?.[0].targetPage?.id).toBe(targetPage.id);
		expect(data?.[0].referencingPages).toHaveLength(1);
		expect(data?.[0].referencingPages[0].id).toBe(refPage2.id);
	});

	test("should exclude current page from referencingPages", async () => {
		// Arrange
		const { data: user } = await supabase.auth.getUser();
		if (!user.user) throw new Error("User not authenticated");

		const { data: currentPage } = await supabase
			.from("pages")
			.insert({
				user_id: user.user.id,
				title: "Current Page",
				content_tiptap: {
					type: "doc",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									text: "TypeScript",
									marks: [
										{
											type: "unilink",
											attrs: {
												key: "typescript",
												text: "TypeScript",
												markId: "mark-1",
												variant: "bracket",
											},
										},
									],
								},
							],
						},
					],
				},
				is_public: false,
			})
			.select("id")
			.single();

		if (!currentPage) throw new Error("Failed to create current page");

		const { data: otherPage } = await supabase
			.from("pages")
			.insert({
				user_id: user.user.id,
				title: "Other Page",
				content_tiptap: {
					type: "doc",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									text: "TypeScript",
									marks: [
										{
											type: "unilink",
											attrs: {
												key: "typescript",
												text: "TypeScript",
												markId: "mark-2",
												variant: "bracket",
											},
										},
									],
								},
							],
						},
					],
				},
				is_public: false,
			})
			.select("id")
			.single();

		if (!otherPage) throw new Error("Failed to create other page");

		const { data: linkGroup } = await supabase
			.from("link_groups")
			.insert({
				key: "typescript",
				raw_text: "TypeScript",
				page_id: null,
				link_count: 2,
			})
			.select("id")
			.single();

		if (!linkGroup) throw new Error("Failed to create link group");

		await supabase.from("link_occurrences").insert([
			{
				link_group_id: linkGroup.id,
				source_page_id: currentPage.id,
				mark_id: "mark-1",
			},
			{
				link_group_id: linkGroup.id,
				source_page_id: otherPage.id,
				mark_id: "mark-2",
			},
		]);

		// Act
		const { data, error } = await getLinkGroupsForPage(currentPage.id);

		// Assert
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
		expect(data?.[0].referencingPages).toHaveLength(1);
		expect(data?.[0].referencingPages[0].id).toBe(otherPage.id);
		expect(data?.[0].referencingPages.find((p) => p.id === currentPage.id)).toBeUndefined();
	});

	test("should exclude target page from referencingPages", async () => {
		// Arrange
		const { data: user } = await supabase.auth.getUser();
		if (!user.user) throw new Error("User not authenticated");

		const { data: targetPage } = await supabase
			.from("pages")
			.insert({
				user_id: user.user.id,
				title: "Target Page",
				content_tiptap: { type: "doc", content: [] },
				is_public: false,
			})
			.select("id")
			.single();

		if (!targetPage) throw new Error("Failed to create target page");

		const { data: currentPage } = await supabase
			.from("pages")
			.insert({
				user_id: user.user.id,
				title: "Current Page",
				content_tiptap: {
					type: "doc",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									text: "Vue",
									marks: [
										{
											type: "unilink",
											attrs: {
												key: "vue",
												text: "Vue",
												markId: "mark-1",
												variant: "bracket",
											},
										},
									],
								},
							],
						},
					],
				},
				is_public: false,
			})
			.select("id")
			.single();

		if (!currentPage) throw new Error("Failed to create current page");

		const { data: linkGroup } = await supabase
			.from("link_groups")
			.insert({
				key: "vue",
				raw_text: "Vue",
				page_id: targetPage.id,
				link_count: 2,
			})
			.select("id")
			.single();

		if (!linkGroup) throw new Error("Failed to create link group");

		await supabase.from("link_occurrences").insert([
			{
				link_group_id: linkGroup.id,
				source_page_id: targetPage.id,
				mark_id: "mark-target",
			},
			{
				link_group_id: linkGroup.id,
				source_page_id: currentPage.id,
				mark_id: "mark-1",
			},
		]);

		// Act
		const { data, error } = await getLinkGroupsForPage(currentPage.id);

		// Assert
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
		expect(data?.[0].targetPage?.id).toBe(targetPage.id);
		expect(data?.[0].referencingPages).toHaveLength(0);
		expect(data?.[0].referencingPages.find((p) => p.id === targetPage.id)).toBeUndefined();
	});

	test("should order referencingPages by updated_at DESC", async () => {
		// Arrange
		const { data: user } = await supabase.auth.getUser();
		if (!user.user) throw new Error("User not authenticated");

		const now = new Date();
		const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
		const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

		const { data: currentPage } = await supabase
			.from("pages")
			.insert({
				user_id: user.user.id,
				title: "Current Page",
				content_tiptap: {
					type: "doc",
					content: [
						{
							type: "paragraph",
							content: [
								{
									type: "text",
									text: "Angular",
									marks: [
										{
											type: "unilink",
											attrs: {
												key: "angular",
												text: "Angular",
												markId: "mark-current",
												variant: "bracket",
											},
										},
									],
								},
							],
						},
					],
				},
				is_public: false,
			})
			.select("id")
			.single();

		if (!currentPage) throw new Error("Failed to create current page");

		const { data: oldPage } = await supabase
			.from("pages")
			.insert({
				user_id: user.user.id,
				title: "Old Page",
				content_tiptap: { type: "doc", content: [] },
				is_public: false,
				updated_at: twoDaysAgo.toISOString(),
			})
			.select("id")
			.single();

		if (!oldPage) throw new Error("Failed to create old page");

		const { data: newPage } = await supabase
			.from("pages")
			.insert({
				user_id: user.user.id,
				title: "New Page",
				content_tiptap: { type: "doc", content: [] },
				is_public: false,
				updated_at: yesterday.toISOString(),
			})
			.select("id")
			.single();

		if (!newPage) throw new Error("Failed to create new page");

		const { data: linkGroup } = await supabase
			.from("link_groups")
			.insert({
				key: "angular",
				raw_text: "Angular",
				page_id: null,
				link_count: 3,
			})
			.select("id")
			.single();

		if (!linkGroup) throw new Error("Failed to create link group");

		await supabase.from("link_occurrences").insert([
			{
				link_group_id: linkGroup.id,
				source_page_id: currentPage.id,
				mark_id: "mark-current",
			},
			{
				link_group_id: linkGroup.id,
				source_page_id: oldPage.id,
				mark_id: "mark-old",
			},
			{
				link_group_id: linkGroup.id,
				source_page_id: newPage.id,
				mark_id: "mark-new",
			},
		]);

		// Act
		const { data, error } = await getLinkGroupsForPage(currentPage.id);

		// Assert
		expect(error).toBeNull();
		expect(data).toHaveLength(1);
		expect(data?.[0].referencingPages).toHaveLength(2);
		expect(data?.[0].referencingPages[0].id).toBe(newPage.id);
		expect(data?.[0].referencingPages[1].id).toBe(oldPage.id);
	});
});
