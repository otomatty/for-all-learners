import React from "react";
import { getAudioRecordingsByUser } from "@/app/_actions/audio_recordings";
import {
	Table,
	TableHeader,
	TableBody,
	TableRow,
	TableHead,
	TableCell,
} from "@/components/ui/table";
import type { AudioRecording } from "@/app/_actions/audio_recordings";

interface AudioRecordingsProps {
	userId: string;
}

/**
 * Component to display a list of user audio recordings with playback.
 */
export default async function AudioRecordings({
	userId,
}: AudioRecordingsProps) {
	const recordings: AudioRecording[] = await getAudioRecordingsByUser(userId);
	// 作成日で新しい順にソート
	const sortedRecordings = recordings.sort(
		(a, b) =>
			new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
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
							<TableCell>{new Date(rec.created_at).toLocaleString()}</TableCell>
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
