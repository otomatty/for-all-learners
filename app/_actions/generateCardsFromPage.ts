/**
 * generateCardsFromPage - Generate flashcards from page content (Tiptap JSON)
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   └─ components/pages/generate-cards/generate-cards-form.tsx
 *
 * Dependencies (依存先):
 *   ├─ lib/llm/factory.ts (createClientWithUserKey)
 *   ├─ lib/llm/prompt-builder.ts (buildPrompt)
 *   ├─ lib/logger.ts
 *   └─ lib/supabase/server.ts
 *
 * Related Files:
 *   ├─ Spec: ./generateCardsFromPage.spec.md
 *   ├─ Tests: ./__tests__/generateCardsFromPage.test.ts
 *   └─ Related: ./generateCards.ts (音声トランスクリプト用)
 */

"use server";

import type { LLMProvider } from "@/lib/llm/client";
import { createClientWithUserKey } from "@/lib/llm/factory";
import { buildPrompt } from "@/lib/llm/prompt-builder";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database.types";

// Interface for Tiptap node structure (currently unused, kept for reference)
// interface TiptapNode {
// 	type: string;
// 	content?: TiptapNode[];
// 	text?: string;
// 	// attrs など他のプロパティも存在しうる
// }

// TiptapのJSONBからテキストを抽出するヘルパー関数
// node の型を Json に変更し、内部で TiptapNode ライクなオブジェクトかチェックする
function extractTextFromTiptapNode(node: Json): string {
	let text = "";
	// node がオブジェクトで、null でなく、配列でもないことを確認
	if (typeof node !== "object" || node === null || Array.isArray(node)) {
		return "";
	}

	// TiptapNode のプロパティにアクセスする前に存在確認
	if ("text" in node && typeof node.text === "string") {
		text += node.text;
	}

	if ("content" in node && Array.isArray(node.content)) {
		for (const childNode of node.content) {
			// childNode も Json 型なので、そのまま再帰呼び出し
			text += extractTextFromTiptapNode(childNode);
		}
		// 主要なブロック要素の後に改行を追加して読みやすくする
		if (
			"type" in node &&
			typeof node.type === "string" &&
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
function extractTextFromTiptap(tiptapContent: Json | null | undefined): string {
	if (
		!tiptapContent ||
		typeof tiptapContent !== "object" || // オブジェクトでない
		Array.isArray(tiptapContent) || // 配列である (Json[] のケース)
		!("type" in tiptapContent) || // 'type' プロパティがない
		tiptapContent.type !== "doc" || // 'type' が "doc" でない
		!("content" in tiptapContent) || // 'content' プロパティがない
		!Array.isArray(tiptapContent.content) // 'content' が配列でない
	) {
		return "";
	}
	// 各トップレベルノードからテキストを抽出し、余分な空白や改行をトリム
	// content の各要素は Json 型なので、extractTextFromTiptapNode にそのまま渡せる
	return tiptapContent.content
		.map((childNode) => extractTextFromTiptapNode(childNode as Json))
		.join("")
		.trim();
}

// Options for card generation
interface GenerateCardsOptions {
	provider?: LLMProvider;
	model?: string;
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
	options?: GenerateCardsOptions,
): Promise<{
	generatedRawCards: GeneratedRawCard[];
	error?: string;
}> {
	// 1. Tiptap JSONからテキストを抽出
	// extractTextFromTiptap の引数型を変更したため、キャストが不要になる
	const pageText = extractTextFromTiptap(pageContentTiptap);

	if (!pageText) {
		return {
			error: "ページに抽出可能なテキストコンテンツがありません。",
			generatedRawCards: [],
		};
	}

	// 2. Provider を決定
	const provider = (options?.provider || "google") as LLMProvider;

	logger.info(
		{ provider, pageTextLength: pageText.length, model: options?.model },
		"Starting card generation from page content",
	);

	// 3. プロンプトを構築
	const systemPrompt =
		"以下のテキストから、問題文 (front_content) と回答 (back_content) のペアをJSON配列で生成してください。各ペアは独立した暗記カードとして機能するようにしてください。";

	const prompt = buildPrompt([systemPrompt, pageText]);

	// 4. 動的にLLMクライアントを作成してカードを生成
	let generatedRawCards: GeneratedRawCard[];
	try {
		const client = await createClientWithUserKey({
			provider,
			model: options?.model,
		});

		logger.info(
			{ provider, model: options?.model },
			"Calling LLM API for card generation from page",
		);

		// LLM APIを呼び出し（プロバイダー非依存）
		const response = await client.generate(prompt);

		if (!response || response.trim().length === 0) {
			throw new Error("AIからの応答が空です。");
		}

		let jsonString = response;

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
	} catch (error: unknown) {
		logger.error(
			{
				provider,
				error: error instanceof Error ? error.message : String(error),
			},
			"Failed to generate cards from page content",
		);

		if (error instanceof Error) {
			return {
				error: `AIによるカード生成に失敗しました: ${error.message}`,
				generatedRawCards: [],
			};
		}
		return {
			error: "AIによるカード生成中に予期せぬエラーが発生しました。",
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
	_userId: string, // 念のためuser_idも引数で受け取り、cardsToSave内のものと一致確認しても良い
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
		// カード自体は作成されているので、エラーメッセージは出すが、成功したカード数を返す
		return {
			savedCardsCount: insertedCards.length,
			error: `カードとページのリンク作成に失敗しました: ${insertLinksError.message}. カード自体は作成されています。`,
		};
	}

	return { savedCardsCount: insertedCards.length };
}
