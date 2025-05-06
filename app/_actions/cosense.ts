"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

/**
 * Fetches linked Cosense projects for the authenticated user.
 * @returns List of projects with id, project_name, and lastSyncedAt.
 */
export async function getUserCosenseProjects(): Promise<
	Array<{
		id: string;
		project_name: string;
		lastSyncedAt: string;
		page_count: number;
		accessible: boolean;
	}>
> {
	const supabase = await createClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		console.error("getUserCosenseProjects auth error:", authError);
		throw new Error(authError?.message ?? "Not authenticated");
	}

	const { data, error } = await supabase
		.from("user_cosense_projects")
		.select(
			"id, updated_at, page_count, accessible, cosense_projects(project_name)",
		)
		.eq("user_id", user.id);

	if (error) {
		console.error("getUserCosenseProjects fetch error:", error);
		throw new Error(error.message);
	}

	return data.map((item) => ({
		id: item.id,
		project_name: item.cosense_projects.project_name,
		lastSyncedAt: item.updated_at as string,
		page_count: item.page_count,
		accessible: item.accessible,
	}));
}

/**
 * Adds a new Cosense project (upserting by project_name) and links it to the authenticated user.
 * @param projectName Cosense プロジェクト名
 * @param pageCountArg Optional page count to skip Scrapbox fetch
 * @returns Linked project info with id, project_name, and lastSyncedAt
 */
export async function addUserCosenseProject(
	projectName: string,
	pageCountArg?: number,
): Promise<{
	id: string;
	project_name: string;
	lastSyncedAt: string;
	page_count: number;
	accessible: boolean;
}> {
	const supabase = await createClient();
	// 認証ユーザー取得
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		console.error("addUserCosenseProject auth error:", authError);
		throw new Error(authError?.message ?? "Not authenticated");
	}

	const { data: project, error: projectError } = await supabase
		.from("cosense_projects")
		.upsert({ project_name: projectName }, { onConflict: "project_name" })
		.select("id, project_name")
		.single();

	if (projectError || !project) {
		console.error("addUserCosenseProject project upsert error:", projectError);
		throw new Error(projectError?.message ?? "Failed to upsert project");
	}

	// クライアントから pageCount が渡されていれば Scrapbox フェッチをスキップ
	let pageCount: number;
	let accessible: boolean;
	if (pageCountArg !== undefined) {
		accessible = true;
		pageCount = pageCountArg;
	} else {
		// Scrapbox API でアクセス確認とページ数取得 (デバッグ強化・Cookie転送)
		const apiUrl = `https://scrapbox.io/api/pages/${encodeURIComponent(
			projectName,
		)}`;
		const cookieHeader = (await cookies()).toString();
		let res: Response;
		try {
			res = await fetch(apiUrl, { headers: { cookie: cookieHeader } });
		} catch (fetchErr) {
			console.error("Scrapbox API fetch error:", fetchErr);
			throw new Error(
				`Failed to fetch Scrapbox API for project ${projectName}: ${
					fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
				}`,
			);
		}

		if (!res.ok) {
			const text = await res.text().catch(() => "<no body>");
			console.error(
				`Scrapbox API returned non-OK status: ${res.status}, body=${text}`,
			);
			throw new Error(
				`Scrapbox API returned status ${res.status} for project ${projectName}`,
			);
		}
		// JSON parse and page count抽出
		let dataScrap: { count: number; pages: { title: string }[] };
		try {
			dataScrap = await res.json();
		} catch (parseErr) {
			const raw = await res.text().catch(() => "<no body>");
			console.error(
				"Error parsing Scrapbox API JSON:",
				parseErr,
				"raw response:",
				raw,
			);
			throw new Error(
				`Failed to parse Scrapbox API response for project ${projectName}`,
			);
		}
		pageCount =
			typeof dataScrap.count === "number"
				? dataScrap.count
				: Array.isArray(dataScrap.pages)
					? dataScrap.pages.length
					: 0;
		accessible = true;
	}
	const { data: userProj, error: linkError } = await supabase
		.from("user_cosense_projects")
		.insert({
			user_id: user.id,
			cosense_project_id: project.id,
			page_count: pageCount,
			accessible: accessible,
		})
		.select(
			"id, updated_at, cosense_projects(project_name), page_count, accessible",
		)
		.single();
	if (linkError || !userProj) {
		console.error("addUserCosenseProject link error:", linkError);
		throw new Error(linkError?.message ?? "Failed to link project");
	}
	return {
		id: userProj.id,
		project_name: userProj.cosense_projects.project_name,
		lastSyncedAt: userProj.updated_at as string,
		page_count: userProj.page_count,
		accessible: userProj.accessible,
	};
}

/**
 * Removes a Cosense project link for the authenticated user.
 * @param projectId user_cosense_projects.id
 */
export async function removeUserCosenseProject(
	projectId: string,
): Promise<void> {
	const supabase = await createClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		console.error("removeUserCosenseProject auth error:", authError);
		throw new Error(authError?.message ?? "Not authenticated");
	}

	const { error } = await supabase
		.from("user_cosense_projects")
		.delete()
		.eq("id", projectId)
		.eq("user_id", user.id);

	if (error) {
		console.error("removeUserCosenseProject error:", error);
		throw new Error(error.message);
	}
}
