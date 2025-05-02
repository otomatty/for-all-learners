"use server";

import { createClient } from "@/lib/supabase/server";

export interface AudioRecording {
	name: string;
	created_at: string;
	updated_at: string;
	url: string;
	title: string | null;
	duration_sec: number | null;
}

/**
 * Server action to list audio recordings of a user and create signed URLs.
 */
export async function getAudioRecordingsByUser(
	userId: string,
): Promise<AudioRecording[]> {
	const supabase = await createClient();

	// サーバー側 transcription メタデータを先に取得
	const { data: transData, error: transError } = await supabase
		.from("audio_transcriptions")
		.select("file_path, title, duration_sec")
		.eq("user_id", userId);
	if (transError) throw transError;
	const transMap = new Map<
		string,
		{ file_path: string; title: string | null; duration_sec: number | null }
	>(transData.map((t) => [t.file_path, t]));

	const { data, error } = await supabase.storage
		.from("audio-recordings")
		.list(`audio/${userId}`, { limit: 100, offset: 0 });
	if (error) throw error;

	const recordings: AudioRecording[] = [];
	for (const file of data) {
		const filePath = `audio/${userId}/${file.name}`;
		const { data: signedData, error: signedError } = await supabase.storage
			.from("audio-recordings")
			.createSignedUrl(filePath, 60 * 60);
		if (signedError) throw signedError;

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
}
