import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { AudioRecording } from "@/lib/hooks/storage/useAudioRecordings";
import { createClient } from "@/lib/supabase/server";

interface AudioRecordingsProps {
	userId: string;
}

/**
 * Component to display a list of user audio recordings with playback.
 */
export default async function AudioRecordings({
	userId,
}: AudioRecordingsProps) {
	const supabase = await createClient();

	// Get transcription metadata
	const { data: transData, error: transError } = await supabase
		.from("audio_transcriptions")
		.select("file_path, title, duration_sec")
		.eq("user_id", userId);

	if (transError) {
		throw new Error(
			`音声メタデータの取得に失敗しました: ${transError.message}`,
		);
	}

	const transMap = new Map<
		string,
		{ file_path: string; title: string | null; duration_sec: number | null }
	>((transData || []).map((t) => [t.file_path, t]));

	// Get audio files from storage
	const { data: storageData, error: storageError } = await supabase.storage
		.from("audio-recordings")
		.list(`audio/${userId}`, { limit: 100, offset: 0 });

	if (storageError) {
		throw new Error(
			`音声ファイルの取得に失敗しました: ${storageError.message}`,
		);
	}

	// Create signed URLs and merge with metadata
	const recordings: AudioRecording[] = await Promise.all(
		(storageData || []).map(async (file) => {
			const filePath = `audio/${userId}/${file.name}`;
			const { data: signedData, error: signedError } = await supabase.storage
				.from("audio-recordings")
				.createSignedUrl(filePath, 60 * 60);

			if (signedError) {
				throw new Error(
					`署名付きURLの作成に失敗しました: ${signedError.message}`,
				);
			}

			// Merge transcription metadata
			const meta = transMap.get(filePath);
			return {
				name: file.name,
				created_at: file.created_at ?? null,
				updated_at: file.updated_at ?? null,
				url: signedData.signedUrl,
				title: meta?.title ?? null,
				duration_sec: meta?.duration_sec ?? null,
			};
		}),
	);

	// 作成日で新しい順にソート
	const sortedRecordings = recordings.sort(
		(a, b) =>
			new Date(b.created_at || "").getTime() -
			new Date(a.created_at || "").getTime(),
	);

	return (
		<section className="space-y-2">
			<h2 className="text-lg font-semibold">音読データ</h2>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>作成日</TableHead>
						<TableHead>タイトル</TableHead>
						<TableHead>録音時間</TableHead>
						<TableHead className="w-1/4">再生</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{sortedRecordings.map((rec) => (
						<TableRow key={rec.name}>
							<TableCell>
								{rec.created_at
									? new Date(rec.created_at).toLocaleString()
									: "-"}
							</TableCell>
							<TableCell>{rec.title ?? "-"}</TableCell>
							<TableCell>
								{rec.duration_sec != null ? `${rec.duration_sec}秒` : "-"}
							</TableCell>
							<TableCell>
								<audio controls src={rec.url} className="w-full">
									<track
										kind="captions"
										srcLang="ja"
										src={`/api/audio/${userId}/${rec.name}/captions.vtt`}
										label="日本語字幕"
										default
									/>
									お使いのブラウザはオーディオ要素に対応していません。
								</audio>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</section>
	);
}
