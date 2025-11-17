"use client";

import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface UploadAudioOptions {
	file: File | Blob;
	fileName?: string;
	expiresIn?: number; // 秒単位、デフォルトは5分（300秒）
}

export interface UploadAudioResult {
	success: boolean;
	filePath: string;
	signedUrl: string;
	error?: string;
}

/**
 * 音声ファイルをSupabase Storageにアップロードするフック
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ (将来の使用箇所)
 *
 * Dependencies (External files that this file imports):
 *   └─ @/lib/supabase/client
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */
export function useUploadAudio() {
	return useMutation({
		mutationFn: async ({
			file,
			fileName,
			expiresIn = 300, // デフォルト5分
		}: UploadAudioOptions): Promise<UploadAudioResult> => {
			const supabase = createClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				throw new Error("Not authenticated");
			}

			// ファイルサイズチェック（100MB制限）
			const maxSizeBytes = 100 * 1024 * 1024;
			const fileSize = file.size;
			if (fileSize > maxSizeBytes) {
				throw new Error("ファイルサイズが大きすぎます（制限: 100MB）");
			}

			// ファイル名の決定
			const timestamp = Date.now();
			const finalFileName =
				fileName || (file instanceof File ? file.name : `${timestamp}.wav`);
			const filePath = `audio/${user.id}/${timestamp}-${finalFileName}`;

			// Supabase Storageにアップロード
			const uploadResult = await supabase.storage
				.from("audio-recordings")
				.upload(filePath, file, {
					metadata: {
						userId: user.id,
						originalName: finalFileName,
						uploadedAt: new Date().toISOString(),
					},
				});

			if (uploadResult.error) {
				throw new Error(
					`アップロードに失敗しました: ${uploadResult.error.message}`,
				);
			}

			// 署名付きURLを生成
			const signedUrlResult = await supabase.storage
				.from("audio-recordings")
				.createSignedUrl(filePath, expiresIn);

			if (signedUrlResult.error || !signedUrlResult.data?.signedUrl) {
				throw new Error("ファイルURLの生成に失敗しました");
			}

			return {
				success: true,
				filePath,
				signedUrl: signedUrlResult.data.signedUrl,
			};
		},
	});
}

