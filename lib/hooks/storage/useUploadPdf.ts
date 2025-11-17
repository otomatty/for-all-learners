"use client";

import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface UploadPdfOptions {
	file: File;
	userId: string;
}

export interface UploadPdfResult {
	success: boolean;
	message: string;
	pdfUrl?: string;
	error?: string;
}

/**
 * PDFファイルをSupabase Storageにアップロードするフック
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
export function useUploadPdf() {
	return useMutation({
		mutationFn: async ({
			file,
			userId,
		}: UploadPdfOptions): Promise<UploadPdfResult> => {
			const supabase = createClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				throw new Error("Not authenticated");
			}

			// userIdパラメータと認証ユーザーのIDが一致することを確認
			if (user.id !== userId) {
				throw new Error("User ID mismatch");
			}

			// ファイルサイズチェック（50MB制限）
			const maxSizeBytes = 50 * 1024 * 1024;
			if (file.size > maxSizeBytes) {
				throw new Error("ファイルサイズが大きすぎます（制限: 50MB）");
			}

			// ファイルタイプチェック
			if (file.type !== "application/pdf") {
				throw new Error("PDFファイルのみアップロード可能です");
			}

			const timestamp = Date.now();
			const filePath = `pdf-uploads/${userId}/${timestamp}-${file.name}`;

			// Supabase Storageにアップロード
			const { error: uploadError } = await supabase.storage
				.from("pdf-files")
				.upload(filePath, file, {
					metadata: {
						userId,
						originalName: file.name,
						uploadedAt: new Date().toISOString(),
					},
				});

			if (uploadError) {
				throw new Error(`アップロードに失敗しました: ${uploadError.message}`);
			}

			// 署名付きURLを生成（24時間有効）
			const { data: signedData, error: signedError } = await supabase.storage
				.from("pdf-files")
				.createSignedUrl(filePath, 60 * 60 * 24); // 24時間

			if (signedError || !signedData?.signedUrl) {
				throw new Error("ファイルURLの生成に失敗しました");
			}

			return {
				success: true,
				message: "PDFアップロードが完了しました",
				pdfUrl: signedData.signedUrl,
			};
		},
	});
}
