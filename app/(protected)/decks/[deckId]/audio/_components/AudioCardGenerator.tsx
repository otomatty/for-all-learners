"use client";

import type { JSONContent } from "@tiptap/core";
import { Loader2, Mic, MicOff, Save, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { createActionLog } from "@/app/_actions/actionLogs";
import { createAudioTranscription } from "@/app/_actions/audio_transcriptions";
import { generateCardsFromTranscript } from "@/app/_actions/generateCards";
import { generateTitleFromTranscript } from "@/app/_actions/generateTitle";
import { transcribeAudio } from "@/app/_actions/transcribe";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateCards } from "@/hooks/cards";
import { createClient } from "@/lib/supabase/client";

interface AudioCardGeneratorProps {
	deckId: string;
	userId: string;
}

export function AudioCardGenerator({
	deckId,
	userId,
}: AudioCardGeneratorProps) {
	const supabase = createClient();
	const router = useRouter();
	const createCardsMutation = useCreateCards();
	const [isRecording, setIsRecording] = useState(false);
	const recordingStartRef = useRef<number>(0);
	const [isProcessing, setIsProcessing] = useState(false);
	const isSaving = createCardsMutation.isPending;
	const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
	const [audioUrl, setAudioUrl] = useState("");
	const [generatedCards, setGeneratedCards] = useState<
		{
			front_content: string;
			back_content: string;
			source_audio_url: string;
		}[]
	>([]);
	const [selectedCards, setSelectedCards] = useState<Record<number, boolean>>(
		{},
	);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const audioChunksRef = useRef<Blob[]>([]);

	const startRecording = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			mediaRecorderRef.current = new MediaRecorder(stream);
			audioChunksRef.current = [];

			mediaRecorderRef.current.ondataavailable = (e) => {
				audioChunksRef.current.push(e.data);
			};

			mediaRecorderRef.current.onstop = () => {
				const audioBlob = new Blob(audioChunksRef.current, {
					type: "audio/wav",
				});
				const audioUrl = URL.createObjectURL(audioBlob);
				setAudioBlob(audioBlob);
				setAudioUrl(audioUrl);
			};

			mediaRecorderRef.current.start();
			recordingStartRef.current = Date.now();
			setIsRecording(true);
		} catch (_error) {
			toast.error("マイクへのアクセスエラー", {
				description: "マイクへのアクセスが許可されていないか、利用できません。",
			});
		}
	};

	const stopRecording = async () => {
		if (mediaRecorderRef.current && isRecording) {
			mediaRecorderRef.current.stop();
			setIsRecording(false);
			const durationMs = Date.now() - recordingStartRef.current;
			const durationSec = Math.floor(durationMs / 1000);
			try {
				await createActionLog("audio", durationSec);
				toast.success("学習時間を記録しました", {
					description: `音読時間: ${durationSec}秒`,
				});
			} catch (_error) {
				toast.error("学習時間の記録に失敗しました");
			}
			for (const track of mediaRecorderRef.current.stream.getTracks()) {
				track.stop();
			}
		}
	};

	const processAudio = async () => {
		if (!audioBlob) {
			toast.error("音声データがありません", {
				description: "先に音声を録音してください。",
			});
			return;
		}

		setIsProcessing(true);

		try {
			// 音声データをアップロード
			const timestamp = Date.now();
			const filePath = `audio/${userId}/${timestamp}.wav`;

			const { data: _uploadData, error: uploadError } = await supabase.storage
				.from("audio-recordings")
				.upload(filePath, audioBlob);

			if (uploadError) {
				throw uploadError;
			}

			// 音声ファイルの署名付きURLを取得（プライベートバケット対応）
			const { data: signedData, error: signedError } = await supabase.storage
				.from("audio-recordings")
				.createSignedUrl(filePath, 60 * 5); // 有効期限5分
			if (signedError || !signedData.signedUrl) {
				throw signedError || new Error("Failed to create signed URL");
			}
			const audioFileUrl = signedData.signedUrl;

			// 1. サーバーアクションで文字起こしを実行 (URLを渡す)
			const transcript = await transcribeAudio(audioFileUrl);
			// タイトルを自動生成
			const title = await generateTitleFromTranscript(transcript);
			// 1.1. 音声文字起こしレコードをDBに保存
			await createAudioTranscription({
				user_id: userId,
				deck_id: deckId,
				file_path: filePath,
				signed_url: audioFileUrl,
				transcript,
				title,
				duration_sec: Math.floor(
					(Date.now() - recordingStartRef.current) / 1000,
				),
				model_name: "gemini-2.5-flash",
			});
			toast.success("文字起こし完了", {
				description: `${transcript.substring(0, 50)}...`,
			});

			// 2. サーバーアクションでカードを生成
			const cards = await generateCardsFromTranscript(transcript, audioFileUrl);
			setGeneratedCards(cards);
			// 初期状態ですべてのカードを選択
			const initialSelection: Record<number, boolean> = {};
			cards.forEach((_, index) => {
				initialSelection[index] = true;
			});
			setSelectedCards(initialSelection);
			toast.success("カードを生成しました", {
				description: `${cards.length}件のカード候補を生成しました。保存するカードを選択してください。`,
			});
			setIsProcessing(false);
		} catch (error) {
			toast.error("エラーが発生しました", {
				description:
					error instanceof Error
						? error.message
						: "音声処理中にエラーが発生しました。",
			});
			setIsProcessing(false);
		}
	};

	const toggleCardSelection = (index: number) => {
		setSelectedCards((prev) => ({
			...prev,
			[index]: !prev[index],
		}));
	};

	const saveSelectedCards = async () => {
		const selectedCardsList = generatedCards.filter(
			(_, index) => selectedCards[index],
		);

		if (selectedCardsList.length === 0) {
			toast.error("カードが選択されていません", {
				description: "保存するカードを少なくとも1つ選択してください。",
			});
			return;
		}

		try {
			// 選択されたカードをデータベースに保存 (JSONContent にラップ)
			const cardsToInsert = selectedCardsList.map((card) => {
				const frontJson: JSONContent = {
					type: "doc",
					content: [
						{
							type: "paragraph",
							content: [{ type: "text", text: card.front_content }],
						},
					],
				};
				const backJson: JSONContent = {
					type: "doc",
					content: [
						{
							type: "paragraph",
							content: [{ type: "text", text: card.back_content }],
						},
					],
				};
				return {
					user_id: userId,
					deck_id: deckId,
					front_content: frontJson,
					back_content: backJson,
					source_audio_url: card.source_audio_url,
				};
			});

			await createCardsMutation.mutateAsync(cardsToInsert);

			toast.success("カードを保存しました", {
				description: `${selectedCardsList.length}件のカードを保存しました。`,
			});

			router.push(`/decks/${deckId}`);
		} catch (error) {
			toast.error("エラーが発生しました", {
				description:
					error instanceof Error
						? error.message
						: "カードの保存中にエラーが発生しました。",
			});
		}
	};

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>音声録音</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex justify-center">
						{isRecording ? (
							<Button
								variant="destructive"
								size="lg"
								className="rounded-full w-16 h-16"
								onClick={stopRecording}
							>
								<MicOff className="h-6 w-6" />
							</Button>
						) : (
							<Button
								variant="outline"
								size="lg"
								className="rounded-full w-16 h-16"
								onClick={startRecording}
								disabled={isProcessing}
							>
								<Mic className="h-6 w-6" />
							</Button>
						)}
					</div>
					{isRecording && (
						<p className="text-center text-sm text-red-500">録音中...</p>
					)}
					{audioUrl && !isRecording && (
						<div className="flex justify-center">
							<audio src={audioUrl} controls className="w-full max-w-md">
								<track
									kind="captions"
									src={undefined}
									srcLang="ja"
									label="日本語"
									default
								/>
							</audio>
						</div>
					)}
				</CardContent>
				<CardFooter className="flex justify-between">
					<Button
						variant="outline"
						onClick={() => router.push(`/decks/${deckId}`)}
						disabled={isProcessing}
					>
						キャンセル
					</Button>
					<Button
						onClick={processAudio}
						disabled={!audioUrl || isProcessing || isRecording}
					>
						{isProcessing ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								処理中...
							</>
						) : (
							"音声を処理する"
						)}
					</Button>
				</CardFooter>
			</Card>

			{generatedCards.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>生成されたカード</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{generatedCards.map((card, index) => (
							<div
								key={card.front_content}
								className="border rounded-lg p-4 space-y-2"
							>
								<div className="flex items-start space-x-2">
									<Checkbox
										id={`card-${index}`}
										checked={selectedCards[index] || false}
										onCheckedChange={() => toggleCardSelection(index)}
									/>
									<div className="flex-1 space-y-2">
										<div>
											<Label htmlFor={`card-${index}`} className="font-medium">
												表面
											</Label>
											<Textarea
												value={card.front_content}
												onChange={(e) => {
													const updatedCards = [...generatedCards];
													updatedCards[index].front_content = e.target.value;
													setGeneratedCards(updatedCards);
												}}
												rows={2}
											/>
										</div>
										<div>
											<Label className="font-medium">裏面</Label>
											<Textarea
												value={card.back_content}
												onChange={(e) => {
													const updatedCards = [...generatedCards];
													updatedCards[index].back_content = e.target.value;
													setGeneratedCards(updatedCards);
												}}
												rows={3}
											/>
										</div>
									</div>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => {
											const updatedCards = [...generatedCards];
											updatedCards.splice(index, 1);
											setGeneratedCards(updatedCards);

											const updatedSelection = { ...selectedCards };
											delete updatedSelection[index];
											// インデックスを再調整
											const newSelection: Record<number, boolean> = {};
											for (const key of Object.keys(updatedSelection)) {
												const keyNum = Number.parseInt(key, 10);
												const value = updatedSelection[keyNum];
												if (keyNum > index) {
													newSelection[keyNum - 1] = value;
												} else {
													newSelection[keyNum] = value;
												}
											}
											setSelectedCards(newSelection);
										}}
									>
										<Trash className="h-4 w-4" />
									</Button>
								</div>
							</div>
						))}
					</CardContent>
					<CardFooter className="flex justify-end">
						<Button onClick={saveSelectedCards} disabled={isSaving}>
							{isSaving ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									保存中...
								</>
							) : (
								<>
									<Save className="mr-2 h-4 w-4" />
									選択したカードを保存
								</>
							)}
						</Button>
					</CardFooter>
				</Card>
			)}
		</div>
	);
}
