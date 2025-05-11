"use server";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";
import { geminiClient } from "@/lib/gemini/client";
import { createUserContent } from "@google/genai";

interface TiptapNode {
	type: string;
	content?: TiptapNode[];
	text?: string;
	// attrs など他のプロパティも存在しうる
}

// TiptapのJSONBからテキストを抽出するヘルパー関数
function extractTextFromTiptapNode(node: TiptapNode): string {
	let text = "";
	if (node.text) {
		text += node.text;
	}
	if (node.content && Array.isArray(node.content)) {
		for (const childNode of node.content) {
			text += extractTextFromTiptapNode(childNode);
		}
		// 主要なブロック要素の後に改行を追加して読みやすくする
		if (
			["paragraph", "heading", "listItem", "blockquote", "codeBlock"].includes(
				node.type,
			) &&
			!text.endsWith("\n")
		) {
			text += "\n";
		}
	}
	return text;
}

function extractTextFromTiptap(
	tiptapContent: TiptapNode | null | undefined,
): string {
	if (
		!tiptapContent ||
		tiptapContent.type !== "doc" ||
		!tiptapContent.content
	) {
		return "";
	}
	// 各トップレベルノードからテキストを抽出し、余分な空白や改行をトリム
	return tiptapContent.content.map(extractTextFromTiptapNode).join("").trim();
}

// 生成されたカードの型
interface GeneratedRawCard {
	front_content: string;
	back_content: string;
}

// DBに挿入するカードの型
interface InsertableCard {
	deck_id: string;
	user_id: string;
	front_content: Json;
	back_content: Json;
	// source_audio_url は今回は使用しない
}

// プレーンテキストをTiptapの基本的なdoc構造にラップする関数
export async function wrapTextInTiptapJson(text: string): Promise<Json> {
	if (!text || text.trim() === "") {
		return { type: "doc", content: [] };
	}
	// テキストを改行で分割し、それぞれを段落にする
	const paragraphs = text
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
	if (paragraphs.length === 0) {
		return { type: "doc", content: [] };
	}
	return {
		type: "doc",
		content: paragraphs.map((paragraphText) => ({
			type: "paragraph",
			content: [
				{
					type: "text",
					text: paragraphText,
				},
			],
		})),
	};
}

export async function generateRawCardsFromPageContent(
	pageContentTiptap: Json | null,
): Promise<{
	generatedRawCards: GeneratedRawCard[];
	error?: string;
}> {
	// 1. Tiptap JSONからテキストを抽出
	const pageText = extractTextFromTiptap(pageContentTiptap as TiptapNode);

	if (!pageText) {
		return {
			error: "ページに抽出可能なテキストコンテンツがありません。",
			generatedRawCards: [],
		};
	}

	// 2. AIモデルを呼び出してカードを生成
	const systemPrompt =
		"以下のテキストから、問題文 (front_content) と回答 (back_content) のペアをJSON配列で生成してください。各ペアは独立した暗記カードとして機能するようにしてください。";

	const contents = createUserContent([systemPrompt, pageText]);

	let generatedRawCards: GeneratedRawCard[];
	try {
		const response = await geminiClient.models.generateContent({
			model: "gemini-2.5-flash-preview-04-17", // モデル名は適宜調整してください
			contents,
		});

		const { candidates } = response as unknown as {
			candidates?: { content: { parts: { text: string }[] } }[];
		};
		const raw = candidates?.[0]?.content;
		if (!raw) {
			throw new Error("AIからの応答が空です。");
		}

		let jsonString: string;
		if (typeof raw === "string") {
			jsonString = raw;
		} else if (typeof raw === "object" && Array.isArray(raw.parts)) {
			jsonString = raw.parts.map((p: { text: string }) => p.text).join("");
		} else {
			jsonString = String(raw);
		}

		const fencePattern = /```(?:json)?\s*?\n([\s\S]*?)```/;
		const fenceMatch = jsonString.match(fencePattern);
		if (fenceMatch) {
			jsonString = fenceMatch[1].trim();
		} else {
			const start = jsonString.indexOf("[");
			const end = jsonString.lastIndexOf("]");
			if (start !== -1 && end !== -1 && end > start) {
				jsonString = jsonString.slice(start, end + 1);
			}
		}
		generatedRawCards = JSON.parse(jsonString);
	} catch (error: any) {
		console.error("AIによるカード生成エラー:", error);
		return {
			error: `AIによるカード生成に失敗しました: ${error.message}`,
			generatedRawCards: [],
		};
	}

	if (!generatedRawCards || generatedRawCards.length === 0) {
		return {
			error: "AIによってカードが生成されませんでした。",
			generatedRawCards: [],
		};
	}

	return { generatedRawCards };
}

interface CardToSave extends InsertableCard {
	page_id: string; // リンク作成のため
}

export async function saveGeneratedCards(
	cardsToSave: CardToSave[],
	userId: string, // 念のためuser_idも引数で受け取り、cardsToSave内のものと一致確認しても良い
): Promise<{ savedCardsCount: number; error?: string }> {
	if (!cardsToSave || cardsToSave.length === 0) {
		return { savedCardsCount: 0, error: "保存するカードがありません。" };
	}

	const supabase = await createClient();

	// user_idの検証（任意）
	// if (cardsToSave.some(card => card.user_id !== userId)) {
	// return { savedCardsCount: 0, error: "ユーザーIDが一致しないカードが含まれています。" };
	// }

	const cardsForDbInsert = cardsToSave.map(
		({ page_id, ...cardData }) => cardData,
	);

	const { data: insertedCards, error: insertCardsError } = await supabase
		.from("cards")
		.insert(cardsForDbInsert)
		.select("id");

	if (insertCardsError) {
		console.error("カードのDB保存エラー:", insertCardsError);
		return {
			savedCardsCount: 0,
			error: `カードのDB保存に失敗しました: ${insertCardsError.message}`,
		};
	}
	if (!insertedCards || insertedCards.length === 0) {
		return { savedCardsCount: 0, error: "カードがDBに保存されませんでした。" };
	}

	// すべてのカードは同じページから生成されると仮定
	const pageId = cardsToSave[0].page_id;

	// 4. card_page_links テーブルにリンクを作成
	const cardPageLinksToInsert = insertedCards.map((card) => ({
		card_id: card.id,
		page_id: pageId,
	}));

	const { error: insertLinksError } = await supabase
		.from("card_page_links")
		.insert(cardPageLinksToInsert);

	if (insertLinksError) {
		console.error("カードとページのリンク作成エラー:", insertLinksError);
		// カード自体は作成されているので、エラーメッセージは出すが、成功したカード数を返す
		return {
			savedCardsCount: insertedCards.length,
			error: `カードとページのリンク作成に失敗しました: ${insertLinksError.message}. カード自体は作成されています。`,
		};
	}

	return { savedCardsCount: insertedCards.length };
}
