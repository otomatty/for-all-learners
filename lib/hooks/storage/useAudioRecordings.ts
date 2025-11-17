"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface AudioRecording {
	name: string;
	created_at: string;
	updated_at: string;
	url: string;
	title: string | null;
	duration_sec: number | null;
}

/**
 * ユーザーの音声ファイル一覧を取得するフック
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
export function useAudioRecordings() {
	const supabase = createClient();

	return useQuery({
		queryKey: ["audioRecordings"],
		queryFn: async (): Promise<AudioRecording[]> => {
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				throw new Error("Not authenticated");
			}

			// サーバー側 transcription メタデータを先に取得
			const { data: transData, error: transError } = await supabase
				.from("audio_transcriptions")
				.select("file_path, title, duration_sec")
				.eq("user_id", user.id);

			if (transError) {
				throw transError;
			}

			const transMap = new Map<
				string,
				{ file_path: string; title: string | null; duration_sec: number | null }
			>(transData.map((t) => [t.file_path, t]));

			const { data, error } = await supabase.storage
				.from("audio-recordings")
				.list(`audio/${user.id}`, { limit: 100, offset: 0 });

			if (error) {
				throw error;
			}

			const recordings: AudioRecording[] = [];
			for (const file of data) {
				const filePath = `audio/${user.id}/${file.name}`;
				const { data: signedData, error: signedError } = await supabase.storage
					.from("audio-recordings")
					.createSignedUrl(filePath, 60 * 60);

				if (signedError) {
					throw signedError;
				}

				// transcription メタデータをマージ
				const meta = transMap.get(filePath);
				recordings.push({
					name: file.name,
					created_at: file.created_at ?? "",
					updated_at: file.updated_at ?? "",
					url: signedData.signedUrl,
					title: meta?.title ?? null,
					duration_sec: meta?.duration_sec ?? null,
				});
			}

			return recordings;
		},
	});
}
