"use server";

import { geminiClient } from "@/lib/gemini/client";
import { createUserContent, createPartFromUri } from "@google/genai";

// Define types for OCR response to avoid any
interface ImageOcrCandidate {
	parts: { text: string }[];
}
type ImageOcrContent = string | ImageOcrCandidate;
interface ImageOcrResponse {
	candidates?: { content: ImageOcrContent }[];
}

/**
 * Server action to extract text from an image via Gemini API.
 */
export async function transcribeImage(imageUrl: string): Promise<string> {
	if (!imageUrl) {
		throw new Error("No image URL provided for transcription");
	}
	// 画像データを取得
	const res = await fetch(imageUrl);
	if (!res.ok) {
		throw new Error(`Failed to fetch image for OCR: ${res.status}`);
	}
	const arrayBuffer = await res.arrayBuffer();
	const blob = new Blob([arrayBuffer], {
		type: res.headers.get("content-type") ?? "image/png",
	});
	// Gemini Files API にアップロード
	const { uri, mimeType } = await geminiClient.files.upload({
		file: blob,
		config: { mimeType: blob.type },
	});
	if (!uri) throw new Error("Upload failed: missing URI");
	// 画像ファイル部分を準備
	const part = createPartFromUri(uri, mimeType ?? blob.type);
	const contents = createUserContent([
		"以下の画像からテキストを抽出してください。",
		part,
	]);
	// Gemini に OCR を要求
	const responseRaw = await geminiClient.models.generateContent({
		model: "gemini-2.5-flash-preview-04-17",
		contents,
	});
	const { candidates } = responseRaw as ImageOcrResponse;
	const candidate = candidates?.[0]?.content;
	if (!candidate) {
		throw new Error("OCR failed: no content returned");
	}
	let text: string;
	if (typeof candidate === "string") {
		text = candidate;
	} else if (
		typeof candidate === "object" &&
		Array.isArray((candidate as { parts: { text: string }[] }).parts)
	) {
		text = (candidate as { parts: { text: string }[] }).parts
			.map((p) => p.text)
			.join("");
	} else {
		text = String(candidate);
	}
	return text;
}
