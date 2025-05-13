"use client";

import { createCards } from "@/app/_actions/cards";
import type { GeneratedCard } from "@/app/_actions/generateCards";
import { generateCardsFromTranscript } from "@/app/_actions/generateCards";
import { createRawInput } from "@/app/_actions/rawInputs";
import { transcribeImage } from "@/app/_actions/transcribeImage";
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
import { createClient } from "@/lib/supabase/client";
import { Loader2, Save, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface ImageCardGeneratorProps {
	deckId: string;
	userId: string;
}

type CardWithId = GeneratedCard & { id: string };

// Function to convert image Blob to WebP format
async function convertImageToWebp(blob: Blob, quality = 0.8): Promise<Blob> {
	return new Promise<Blob>((resolve, reject) => {
		const img = new Image();
		img.onload = () => {
			const canvas = document.createElement("canvas");
			canvas.width = img.width;
			canvas.height = img.height;
			const ctx = canvas.getContext("2d");
			if (!ctx) return reject(new Error("Canvas context not available"));
			ctx.drawImage(img, 0, 0);
			canvas.toBlob(
				(webpBlob) => {
					if (webpBlob) resolve(webpBlob);
					else reject(new Error("WebP conversion failed"));
				},
				"image/webp",
				quality,
			);
		};
		img.onerror = () =>
			reject(new Error("Failed to load image for conversion"));
		img.src = URL.createObjectURL(blob);
	});
}

export function ImageCardGenerator({
	deckId,
	userId,
}: ImageCardGeneratorProps) {
	const supabase = createClient();
	const router = useRouter();
	const [isProcessing, setIsProcessing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [imageBlob, setImageBlob] = useState<Blob | null>(null);
	const [imageUrl, setImageUrl] = useState("");
	const [generatedCards, setGeneratedCards] = useState<CardWithId[]>([]);
	const [selectedCards, setSelectedCards] = useState<Record<string, boolean>>(
		{},
	);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const cameraInputRef = useRef<HTMLInputElement>(null);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			const blob = file;
			setImageBlob(blob);
			setImageUrl(URL.createObjectURL(blob));
			setGeneratedCards([]);
			setSelectedCards({});
		}
	};

	const selectFile = () => {
		fileInputRef.current?.click();
	};

	const takePhoto = () => {
		cameraInputRef.current?.click();
	};

	const processImage = async () => {
		if (!imageBlob) {
			toast.error("画像が選択されていません", {
				description: "先に画像を選択してください。",
			});
			return;
		}
		setIsProcessing(true);
		try {
			// Convert image to WebP to reduce size
			const webpBlob = await convertImageToWebp(imageBlob, 0.8);
			const timestamp = Date.now();
			const filePath = `ocr-images/${userId}/${timestamp}.webp`;
			const { data: uploadData, error: uploadError } = await supabase.storage
				.from("ocr-images")
				.upload(filePath, webpBlob, { metadata: { userId } });
			if (uploadError) throw uploadError;

			const { data: signedData, error: signedError } = await supabase.storage
				.from("ocr-images")
				.createSignedUrl(filePath, 60 * 5);
			if (signedError || !signedData.signedUrl)
				throw signedError || new Error("Signed URL取得失敗");
			const imageFileUrl = signedData.signedUrl;

			const transcript = await transcribeImage(imageFileUrl);
			await createRawInput({
				user_id: userId,
				type: "ocr",
				source_url: imageFileUrl,
				text_content: transcript,
			});
			toast.success("OCR完了", {
				description: `${transcript.substring(0, 50)}...`,
			});

			const raw = await generateCardsFromTranscript(transcript, imageFileUrl);
			const cardsWithId: CardWithId[] = raw.map((card) => ({
				...card,
				id: crypto.randomUUID(),
			}));
			setGeneratedCards(cardsWithId);
			const initial: Record<string, boolean> = {};
			for (const c of cardsWithId) {
				initial[c.id] = true;
			}
			setSelectedCards(initial);
			toast.success("カードを生成しました", {
				description: `${cardsWithId.length}件の候補が生成されました。`,
			});
		} catch (error) {
			console.error("Error processing image:", error);
			toast.error("エラーが発生しました", {
				description:
					error instanceof Error
						? error.message
						: "OCR処理中にエラーが発生しました。",
			});
		} finally {
			setIsProcessing(false);
		}
	};

	const toggleCardSelection = (id: string) => {
		setSelectedCards((prev) => ({ ...prev, [id]: !prev[id] }));
	};

	const saveSelectedCards = async () => {
		const selected = generatedCards.filter((card) => selectedCards[card.id]);
		if (selected.length === 0) {
			toast.error("カードが選択されていません", {
				description: "保存するカードを1件以上選択してください。",
			});
			return;
		}
		setIsSaving(true);
		try {
			const cardsToInsert = selected.map((card) => {
				const frontJson = {
					type: "doc",
					content: [
						{
							type: "paragraph",
							content: [{ type: "text", text: card.front_content }],
						},
					],
				};
				const backJson = {
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
					source_ocr_image_url: card.source_audio_url,
				};
			});
			await createCards(cardsToInsert);
			toast.success("カードを保存しました", {
				description: `${cardsToInsert.length}件保存されました。`,
			});
			router.push(`/decks/${deckId}`);
		} catch (error) {
			console.error("Error saving cards:", error);
			toast.error("エラーが発生しました", {
				description:
					error instanceof Error
						? error.message
						: "カード保存中にエラーが発生しました。",
			});
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>OCR画像選択</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<input
						type="file"
						accept="image/*"
						ref={fileInputRef}
						onChange={handleFileChange}
						hidden
					/>
					<input
						type="file"
						accept="image/*"
						capture="environment"
						ref={cameraInputRef}
						onChange={handleFileChange}
						hidden
					/>
					<div className="flex justify-center space-x-4">
						<Button onClick={selectFile} disabled={isProcessing || isSaving}>
							画像を選択
						</Button>
						<Button
							onClick={takePhoto}
							disabled={isProcessing || isSaving}
							className="md:hidden"
						>
							カメラ起動
						</Button>
					</div>
					{imageUrl && (
						<div className="flex justify-center">
							<div className="w-full max-w-md overflow-hidden">
								<img
									src={imageUrl}
									alt="preview"
									className="w-full h-auto object-contain rounded"
								/>
							</div>
						</div>
					)}
				</CardContent>
				<CardFooter className="flex justify-end">
					<Button
						onClick={processImage}
						disabled={!imageUrl || isProcessing || isSaving}
					>
						{isProcessing ? (
							<>
								<Loader2 className="animate-spin mr-2 h-4 w-4" />
								処理中...
							</>
						) : (
							"OCRを実行"
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
						{generatedCards.map((card) => (
							<div key={card.id} className="border rounded-lg p-4 space-y-2">
								<div className="flex items-start space-x-2">
									<Checkbox
										id={`card-${card.id}`}
										checked={selectedCards[card.id] || false}
										onCheckedChange={() => toggleCardSelection(card.id)}
									/>
									<div className="flex-1 space-y-2">
										<div>
											<Label
												htmlFor={`card-${card.id}`}
												className="font-medium"
											>
												表面
											</Label>
											<Textarea
												value={card.front_content}
												onChange={(e) => {
													setGeneratedCards((prev) =>
														prev.map((c) =>
															c.id === card.id
																? { ...c, front_content: e.target.value }
																: c,
														),
													);
												}}
												rows={2}
											/>
										</div>
										<div>
											<Label className="font-medium">裏面</Label>
											<Textarea
												value={card.back_content}
												onChange={(e) => {
													setGeneratedCards((prev) =>
														prev.map((c) =>
															c.id === card.id
																? { ...c, back_content: e.target.value }
																: c,
														),
													);
												}}
												rows={3}
											/>
										</div>
									</div>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => {
											setGeneratedCards((prev) =>
												prev.filter((c) => c.id !== card.id),
											);
											setSelectedCards((prev) => {
												const next = { ...prev };
												delete next[card.id];
												return next;
											});
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
									<Loader2 className="animate-spin mr-2 h-4 w-4" />
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
