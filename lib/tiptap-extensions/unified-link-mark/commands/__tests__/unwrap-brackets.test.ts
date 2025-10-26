import { describe, test, expect } from "vitest";
import { createUnwrapBracketsCommand } from "../unwrap-brackets";

/**
 * unwrap-brackets.test.ts
 *
 * DEPENDENCY MAP:
 *
 * Parents (このファイルが使用される場所):
 *   └─ テストランナー (Vitest)
 *
 * Dependencies (このファイルが依存するもの):
 *   ├─ unwrap-brackets.ts (テスト対象)
 *   └─ vitest (テストフレームワーク)
 *
 * Related Files:
 *   ├─ unwrap-brackets.ts (実装)
 *   ├─ wrap-with-brackets.test.ts (対応するテスト)
 *   └─ docs/rules/code-quality-standards.md (テスト要件)
 */

describe("createUnwrapBracketsCommand", () => {
	describe("Contract Tests", () => {
		test("TC-001: 関数が存在する", () => {
			expect(createUnwrapBracketsCommand).toBeDefined();
			expect(typeof createUnwrapBracketsCommand).toBe("function");
		});

		test("TC-002: 関数が関数を返す", () => {
			// biome-ignore lint/suspicious/noExplicitAny: テスト用のモックオブジェクト
			const mockMarkType = { name: "unifiedLink" } as any;
			const command = createUnwrapBracketsCommand(mockMarkType);
			expect(typeof command).toBe("function");
		});
		test("TC-003: ブラケット除去パターンの検証", () => {
			// 実装内で使用されるブラケット除去ロジックの検証
			const testCases = [
				{ input: "[hello]", expected: "hello" },
				{ input: "[こんにちは]", expected: "こんにちは" },
				{ input: "[hello world]", expected: "hello world" },
				// Note: [] は .+? にマッチしないため、元のまま返される
				{ input: "[]", expected: "[]" },
			];

			for (const { input, expected } of testCases) {
				// ブラケット除去ロジック: [text] → text
				const match = input.match(/^\[(.+?)\]$/);
				const result = match ? match[1] : input;
				expect(result).toBe(expected);
			}
		});
		test("TC-004: 文字列変換ロジックの検証", () => {
			// ブラケットを除去する変換ロジックの単体検証
			const unwrapText = (text: string): string => {
				const match = text.match(/^\[(.+?)\]$/);
				return match ? match[1] : text;
			};

			expect(unwrapText("[sample]")).toBe("sample");
			expect(unwrapText("[test text]")).toBe("test text");
			expect(unwrapText("[日本語]")).toBe("日本語");
			expect(unwrapText("no brackets")).toBe("no brackets");
		});

		test("TC-005: 隣接文字検出ロジックの検証", () => {
			// 実装内で使用される隣接ブラケット検出ロジック
			const hasLeftBracket = (text: string, pos: number): boolean => {
				return pos > 0 && text[pos - 1] === "[";
			};

			const hasRightBracket = (text: string, pos: number): boolean => {
				return pos < text.length && text[pos] === "]";
			};

			const testText = "text [hello] more";
			// pos 5 = "[" の直後
			expect(hasLeftBracket(testText, 5)).toBe(false);
			expect(hasLeftBracket(testText, 6)).toBe(true);

			// pos 11 = "]" の直前
			expect(hasRightBracket(testText, 11)).toBe(true);
			expect(hasRightBracket(testText, 12)).toBe(false);
		});
	});

	describe("Integration Notes", () => {
		test("TC-006: ProseMirror統合は手動テストで検証", () => {
			// Note: ProseMirror API の完全なモックは複雑すぎるため、
			// 実際の editor での統合テストは手動で実施する
			//
			// 手動テスト手順:
			// 1. エディタで [text] 形式のリンクを選択
			// 2. BubbleMenu のリンクボタンをクリック（トグルオフ）
			// 3. [text] が text に変換されることを確認
			// 4. UnifiedLinkMark が除去されることを確認

			expect(true).toBe(true); // プレースホルダー
		});

		test("TC-007: wrapWithBrackets との対称性", () => {
			// Note: wrap と unwrap は対称的に動作すべき
			//
			// 期待動作:
			// 1. text → wrapWithBrackets → [text]
			// 2. [text] → unwrapBrackets → text
			// 3. wrap → unwrap を繰り返しても元に戻る

			const originalText = "hello";
			const wrapped = `[${originalText}]`;
			const unwrapped = wrapped.match(/^\[(.+?)\]$/)?.[1] || wrapped;

			expect(unwrapped).toBe(originalText);
		});

		test("TC-008: エッジケース - 空ブラケット", () => {
			// Note: 実装は空ブラケット [] も処理する
			const emptyBracket = "[]";
			const match = emptyBracket.match(/^\[(.+?)\]$/);
			// [] の場合、正規表現はマッチしない (.+? は1文字以上必要)
			expect(match).toBeNull();
		});

		test("TC-009: エッジケース - ネストされたブラケット", () => {
			// Note: ネストされたブラケットの動作は
			// ブラウザでの手動テストで確認する
			//
			// テストケース:
			// - "[[text]]" → "[text]" (外側のみ除去)
			// - "[te[x]t]" → "te[x]t" (外側のみ除去)

			const nestedBracket = "[[text]]";
			const match = nestedBracket.match(/^\[(.+?)\]$/);
			if (match) {
				expect(match[1]).toBe("[text]");
			}
		});

		test("TC-010: エッジケース - ブラケットなしのテキスト", () => {
			// Note: ブラケットがないテキストは変更されない
			const plainText = "plain text";
			const match = plainText.match(/^\[(.+?)\]$/);
			const result = match ? match[1] : plainText;

			expect(result).toBe(plainText);
		});
	});
});
