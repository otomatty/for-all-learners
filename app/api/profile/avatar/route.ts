/**
 * Profile Avatar API Route
 *
 * API for uploading user avatar images
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this route):
 *   └─ app/(protected)/profile/_components/profile-form.tsx
 *
 * Dependencies (External files that this route uses):
 *   ├─ lib/supabase/server.ts (createClient)
 *   └─ types/database.types.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

import { type NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/profile/avatar - Upload user avatar
 */
export async function POST(request: NextRequest) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json(
				{ error: "Unauthorized", message: "認証が必要です" },
				{ status: 401 },
			);
		}

		const formData = await request.formData();
		const file = formData.get("file") as File | null;

		if (!file) {
			return NextResponse.json(
				{ error: "Bad request", message: "ファイルが指定されていません" },
				{ status: 400 },
			);
		}

		// Upload to storage
		const fileExt = file.name.split(".").pop();
		const fileName = `${user.id}/${Date.now()}.${fileExt}`;
		const filePath = `avatars/${fileName}`;

		const { error: uploadError } = await supabase.storage
			.from("avatars")
			.upload(filePath, file, {
				contentType: file.type,
				upsert: true,
			});

		if (uploadError) {
			logger.error({ error: uploadError }, "Failed to upload avatar");
			return NextResponse.json(
				{
					error: "Upload error",
					message: `アバターのアップロードに失敗しました: ${uploadError.message}`,
				},
				{ status: 500 },
			);
		}

		// Get public URL
		const {
			data: { publicUrl },
		} = supabase.storage.from("avatars").getPublicUrl(filePath);

		// Update account avatar_url
		const { data: account, error: accountError } = await supabase
			.from("accounts")
			.update({ avatar_url: publicUrl })
			.eq("user_id", user.id)
			.select()
			.single();

		if (accountError) {
			logger.error({ error: accountError }, "Failed to update account avatar");
			return NextResponse.json(
				{
					error: "Database error",
					message: `アカウントの更新に失敗しました: ${accountError.message}`,
				},
				{ status: 500 },
			);
		}

		return NextResponse.json(account);
	} catch (error: unknown) {
		logger.error({ error }, "Failed to upload avatar");
		return NextResponse.json(
			{
				error: "Internal server error",
				message: "アバターのアップロード中にエラーが発生しました",
			},
			{ status: 500 },
		);
	}
}
