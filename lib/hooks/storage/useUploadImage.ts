"use client";

import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface UploadImageResult {
	publicUrl: string;
	error: string | null;
}

/**
 * 画像をSupabase Storageにアップロードするフック
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ (将来の使用箇所)
 *
 * Dependencies (External files that this file imports):
 *   ├─ @/lib/supabase/client
 *   └─ crypto-js
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */
export function useUploadImage() {
	return useMutation({
		mutationFn: async (file: File): Promise<UploadImageResult> => {
			const supabase = createClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				throw new Error("Not authenticated");
			}

			const fileExtension = file.name.split(".").pop();
			// クライアント側では crypto.randomUUID() を使用
			const uuid = crypto.randomUUID();
			const fileName = `${user.id}/${uuid}.${fileExtension}`;
			const bucketName = "card-images";

			const { data, error } = await supabase.storage
				.from(bucketName)
				.upload(fileName, file);

			if (error) {
				throw new Error(error.message);
			}

			if (!data) {
				throw new Error("No data returned from storage upload.");
			}

			const { data: publicUrlData } = supabase.storage
				.from(bucketName)
				.getPublicUrl(data.path);

			if (!publicUrlData || !publicUrlData.publicUrl) {
				throw new Error("Failed to get public URL for uploaded image.");
			}

			return { publicUrl: publicUrlData.publicUrl, error: null };
		},
	});
}
