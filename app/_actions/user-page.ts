"use server";

import type { JSONContent } from "@tiptap/core";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import { linkPageToNote } from "./notes/linkPageToNote";
import { createPage } from "./pages";

/**
 * ユーザーページ作成・確認結果
 */
export interface UserPageResult {
	pageId: string;
	pageCreated: boolean;
	iconSet: boolean;
	linkedToNote: boolean;
	error?: string;
}

/**
 * ユーザーページ作成パラメータ
 */
export interface UserPageParams {
	userId: string;
	userSlug: string;
	noteId: string;
	avatarUrl?: string | null;
	fullName?: string | null;
}

/**
 * ユーザーページが存在するかチェック
 */
export async function checkUserPageExists(
	userId: string,
	userSlug: string,
): Promise<{ exists: boolean; pageId: string | null }> {
	const supabase = await createClient();

	const { data: existingPage, error } = await supabase
		.from("pages")
		.select("id")
		.eq("user_id", userId)
		.eq("title", userSlug)
		.single();

	if (error && error.code !== "PGRST116") {
		// PGRST116 = not found
		throw error;
	}

	return {
		exists: Boolean(existingPage),
		pageId: existingPage?.id || null,
	};
}

/**
 * ユーザーページのデフォルトコンテンツ生成
 */
export async function generateUserPageContent(
	userSlug: string,
	avatarUrl?: string | null,
	fullName?: string | null,
): Promise<JSONContent> {
	const displayName = fullName || userSlug;
	const imageUrl = avatarUrl || "/default-avatar.png";

	return {
		type: "doc",
		content: [
			{
				type: "heading",
				attrs: { level: 2 },
				content: [{ type: "text", text: displayName }],
			},
			{
				type: "paragraph",
				content: [
					{
						type: "image",
						attrs: {
							src: imageUrl,
							alt: `${displayName}のアバター`,
							title: "ユーザーアイコン",
						},
					},
				],
			},
			{
				type: "paragraph",
				content: [{ type: "text", text: `こんにちは！${displayName}です。` }],
			},
			{
				type: "paragraph",
				content: [
					{
						type: "text",
						text: "このページは自動的に作成されました。自由に編集してください。",
					},
				],
			},
		],
	};
}

/**
 * ユーザーページを作成または取得し、ノートに紐付け
 */
export async function ensureUserPageInNote(
	params: UserPageParams,
): Promise<UserPageResult> {
	const { userId, userSlug, noteId, avatarUrl, fullName } = params;

	try {
		// 1. ページ存在確認
		const { exists, pageId: existingPageId } = await checkUserPageExists(
			userId,
			userSlug,
		);

		let pageId: string;
		let pageCreated = false;
		let iconSet = false;

		if (exists && existingPageId) {
			// 既存ページを使用
			pageId = existingPageId;
			console.log(
				`[ensureUserPageInNote] 既存ユーザーページを使用: ${userSlug} (${pageId})`,
			);
		} else {
			// 新規ページ作成
			const pageContent = await generateUserPageContent(
				userSlug,
				avatarUrl,
				fullName,
			);

			const newPage = await createPage(
				{
					user_id: userId,
					title: userSlug,
					content_tiptap: pageContent,
					is_public: false, // ユーザーページは基本的に非公開
				},
				true,
			); // 自動サムネイル生成を有効

			pageId = newPage.id;
			pageCreated = true;
			iconSet = Boolean(avatarUrl); // アバターがあればアイコンが設定された

			console.log(
				`[ensureUserPageInNote] 新規ユーザーページを作成: ${userSlug} (${pageId})`,
			);
		}

		// 2. ノートとの紐付け確認・実行
		let linkedToNote = false;
		try {
			await linkPageToNote(noteId, pageId);
			linkedToNote = true;
			console.log(
				`[ensureUserPageInNote] ノートに紐付け完了: ${noteId} - ${pageId}`,
			);
		} catch (linkError: unknown) {
			// 既に紐付け済みの場合はエラーを無視
			if (
				linkError &&
				typeof linkError === "object" &&
				"code" in linkError &&
				linkError.code === "23505"
			) {
				// unique constraint violation
				linkedToNote = true;
				console.log(
					`[ensureUserPageInNote] 既に紐付け済み: ${noteId} - ${pageId}`,
				);
			} else {
				throw linkError;
			}
		}

		return {
			pageId,
			pageCreated,
			iconSet,
			linkedToNote,
		};
	} catch (error) {
		console.error("[ensureUserPageInNote] エラー:", error);
		throw error;
	}
}

/**
 * ユーザー情報を取得
 */
export async function getUserInfo(userId: string): Promise<{
	userSlug: string | null;
	avatarUrl: string | null;
	fullName: string | null;
}> {
	const supabase = await createClient();

	const { data: account, error } = await supabase
		.from("accounts")
		.select("user_slug, avatar_url, full_name")
		.eq("id", userId)
		.single();

	if (error) {
		throw error;
	}

	return {
		userSlug: account.user_slug,
		avatarUrl: account.avatar_url,
		fullName: account.full_name,
	};
}
