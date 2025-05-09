"use server";

import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "node:crypto";

export async function uploadImageToCardImages(
	userId: string,
	file: File,
): Promise<{ publicUrl: string; error: string | null }> {
	const supabase = await createClient();
	const fileExtension = file.name.split(".").pop();
	const fileName = `${userId}/${randomUUID()}.${fileExtension}`;
	const bucketName = "card-images"; // ユーザーが作成したバケット名

	const { data, error } = await supabase.storage
		.from(bucketName)
		.upload(fileName, file);

	if (error) {
		console.error("Error uploading image to Supabase Storage:", error);
		return { publicUrl: "", error: error.message };
	}

	if (!data) {
		return { publicUrl: "", error: "No data returned from storage upload." };
	}

	const { data: publicUrlData } = supabase.storage
		.from(bucketName)
		.getPublicUrl(data.path);

	if (!publicUrlData || !publicUrlData.publicUrl) {
		return {
			publicUrl: "",
			error: "Failed to get public URL for uploaded image.",
		};
	}

	return { publicUrl: publicUrlData.publicUrl, error: null };
}
