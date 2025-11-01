"use server";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
export async function getAccountById(id: string) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("accounts")
		.select("*")
		.eq("id", id)
		.maybeSingle();
	if (error) throw error;
	return data;
}

export async function createAccount(
	account: Database["public"]["Tables"]["accounts"]["Insert"],
) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("accounts")
		.insert(account)
		.single();
	if (error) throw error;
	return data;
}

export async function updateAccount(
	id: string,
	updates: Database["public"]["Tables"]["accounts"]["Update"],
) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("accounts")
		.update(updates)
		.eq("id", id)
		.select("*")
		.single();
	if (error) throw error;
	return data;
}

export async function deleteAccount(id: string) {
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("accounts")
		.delete()
		.eq("id", id)
		.single();
	if (error) throw error;
	return data;
}

/**
 * Uploads a user avatar to Supabase Storage and updates the account record.
 * @param file The image file to upload.
 * @returns The updated account row.
 */
export async function uploadAvatar(
	file: File,
): Promise<Database["public"]["Tables"]["accounts"]["Row"]> {
	const supabase = await createClient();
	// 1) 認証チェック
	const {
		data: { user: authUser },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !authUser) {
		throw new Error(
			`[uploadAvatar][AuthError] ${authError?.message ?? "Not authenticated"}`,
		);
	}
	const user = authUser;

	// 2) ファイルパス生成
	const ext = file.name.split(".")?.pop();
	const fileName = `${user.id}.${ext}`;
	const filePath = `public/${user.id}/${fileName}`;

	// 3) 既存アバター削除 (存在すれば警告ログ)
	try {
		const { error: removeError } = await supabase.storage
			.from("avatars")
			.remove([filePath]);
		if (removeError) {
		}
	} catch (_e) {
		// 削除失敗でもアップロード処理は継続
	}

	// 4) アップロード
	try {
		const { error: uploadError } = await supabase.storage
			.from("avatars")
			.upload(filePath, file, { upsert: true });
		if (uploadError) throw uploadError;
	} catch (e) {
		throw new Error(
			`[uploadAvatar][UploadException] ${e instanceof Error ? e.message : e}`,
		);
	}

	// 5) 公開URL取得
	let publicUrl: string;
	try {
		const { data: urlData } = supabase.storage
			.from("avatars")
			.getPublicUrl(filePath);
		if (!urlData.publicUrl) {
			throw new Error("publicUrl is empty");
		}
		publicUrl = urlData.publicUrl;
	} catch (e) {
		throw new Error(
			`[uploadAvatar][GetPublicUrlException] ${e instanceof Error ? e.message : e}`,
		);
	}

	// 6) アカウント更新
	try {
		const updatedAccount = await updateAccount(user.id, {
			avatar_url: publicUrl,
		});
		return updatedAccount;
	} catch (e) {
		throw new Error(
			`[uploadAvatar][UpdateAccountException] ${e instanceof Error ? e.message : e}`,
		);
	}
}
