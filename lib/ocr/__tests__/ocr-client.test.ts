/**
 * OCRクライアント機能のテスト
 *
 * @vitest-environment jsdom
 */

import {
	beforeEach,
	describe,
	expect,
	it,
	type MockedFunction,
	vi,
} from "vitest";
import type { OcrProcessingEvent } from "../ocr-client";
import { ClientOcr } from "../ocr-client";

/**
 * Mock Setup
 *
 * 保守性のため、すべてのモックを一箇所で管理します。
 * Tesseract.jsとDOM APIのモックを提供します。
 * JSDOM環境は vitest.setup.ts で設定されています。
 */

// Mock Tesseract.js module
vi.mock("tesseract.js", () => {
	const mockWorker = {
		loadLanguage: vi.fn().mockResolvedValue(undefined),
		initialize: vi.fn().mockResolvedValue(undefined),
		setParameters: vi.fn().mockResolvedValue(undefined),
		recognize: vi.fn(() =>
			Promise.resolve({
				data: {
					text: "Test OCR Result",
					confidence: 85.5,
					blocks: [],
				},
			}),
		),
		terminate: vi.fn().mockResolvedValue(undefined),
	};

	return {
		createWorker: vi.fn(() => Promise.resolve(mockWorker)),
		OEM: {
			LSTM_ONLY: 1,
			DEFAULT: 3,
		},
		PSM: {
			AUTO: 3,
			SINGLE_BLOCK: 6,
		},
	};
});

// interface MockImage extends Partial<HTMLImageElement> {
// 	addEventListener: MockedFunction<HTMLImageElement["addEventListener"]>;
// 	removeEventListener: MockedFunction<HTMLImageElement["removeEventListener"]>;
// 	onload: (() => void) | null;
// 	onerror: OnErrorEventHandler;
// }

type MockFetch = MockedFunction<typeof fetch> & {
	mockResolvedValueOnce: (value: unknown) => MockFetch;
	mockRejectedValueOnce: (value: unknown) => MockFetch;
};

// Fetch APIのモック
global.fetch = vi.fn();

describe("ClientOcr", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Canvas APIのモック
		const mockCanvas = {
			getContext: vi.fn(() => ({
				drawImage: vi.fn(),
				getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
				putImageData: vi.fn(),
				fillRect: vi.fn(),
				fillStyle: "",
				imageSmoothingEnabled: true,
				imageSmoothingQuality: "high",
			})),
			toBlob: vi.fn((callback) => {
				const blob = new Blob(["test"], { type: "image/jpeg" });
				callback(blob);
			}),
			width: 0,
			height: 0,
		};

		// document.createElement のモック
		vi.spyOn(document, "createElement").mockImplementation((tagName) => {
			if (tagName === "canvas") {
				return mockCanvas as unknown as HTMLCanvasElement;
			}
			if (tagName === "img") {
				const img = {
					addEventListener: vi.fn(),
					removeEventListener: vi.fn(),
					crossOrigin: "",
					src: "",
					width: 300,
					height: 200,
					onload: null,
					onerror: null,
				};
				// src設定時に即座にonloadを呼び出す（タイムアウト問題を回避）
				Object.defineProperty(img, "src", {
					set: function (value) {
						this._src = value;
						// setTimeoutを使わず、即座にonloadを実行
						if (this.onload) {
							this.onload();
						}
					},
					get: function () {
						return this._src;
					},
				});
				return img as unknown as HTMLImageElement;
			}
			return {} as unknown as HTMLElement;
		});
	});

	describe("processImage", () => {
		it("正常な画像URLでOCR処理が成功する", async () => {
			// fetch のモック設定
			(global.fetch as unknown as MockFetch).mockResolvedValueOnce({
				ok: true,
				blob: () =>
					Promise.resolve(new Blob(["test image"], { type: "image/png" })),
				headers: {
					get: () => "image/png",
				},
			});

			const result = await ClientOcr.processImage(
				"https://i.gyazo.com/test.png",
			);

			expect(result.success).toBe(true);
			expect(result.text).toBe("Test OCR Result");
			expect(result.confidence).toBe(85.5);
			expect(result.processingTime).toBeGreaterThan(0);
		});

		it("無効な画像URLでエラーが発生する", async () => {
			const result = await ClientOcr.processImage("invalid-url");

			expect(result.success).toBe(false);
			expect(result.error).toContain("Unsupported image URL format");
		});

		it("fetch失敗時にエラーが発生する", async () => {
			(global.fetch as unknown as MockFetch).mockRejectedValueOnce(
				new Error("Network error"),
			);

			const result = await ClientOcr.processImage(
				"https://i.gyazo.com/test.png",
			);

			expect(result.success).toBe(false);
			expect(result.error).toContain("Network error");
		});

		it("プログレスコールバックが呼び出される", async () => {
			(global.fetch as unknown as MockFetch).mockResolvedValueOnce({
				ok: true,
				blob: () => Promise.resolve(new Blob(["test"], { type: "image/png" })),
				headers: { get: () => "image/png" },
			});

			const progressEvents: OcrProcessingEvent[] = [];

			await ClientOcr.processImage(
				"https://i.gyazo.com/test.png",
				{},
				(event) => progressEvents.push(event),
			);

			expect(progressEvents.length).toBeGreaterThan(0);
			expect(progressEvents[0]).toHaveProperty("stage");
			expect(progressEvents[0]).toHaveProperty("progress");
			expect(progressEvents[0]).toHaveProperty("message");
		});
	});

	describe("checkSupport", () => {
		it("ブラウザサポート状況を正しく返す", async () => {
			// WebAssembly のモック
			global.WebAssembly = {
				validate: vi.fn(() => true),
			} as unknown as typeof WebAssembly;

			// Worker のモック
			global.Worker = vi.fn() as unknown as typeof Worker;

			const support = await ClientOcr.checkSupport();

			expect(support).toHaveProperty("supported");
			expect(support).toHaveProperty("webAssembly");
			expect(support).toHaveProperty("workers");
			expect(support).toHaveProperty("canvas");
			expect(support).toHaveProperty("issues");
		});
	});

	describe("estimateProcessingTime", () => {
		it("ファイルサイズに基づいて適切な処理時間を推定する", () => {
			expect(ClientOcr.estimateProcessingTime(100 * 1024)).toBe(3); // 100KB = 0.097MB < 0.5MB → 3
			expect(ClientOcr.estimateProcessingTime(500 * 1024)).toBe(3); // 500KB = 0.488MB < 0.5MB → 3
			expect(ClientOcr.estimateProcessingTime(600 * 1024)).toBe(5); // 600KB = 0.586MB >= 0.5MB, < 1MB → 5
			expect(ClientOcr.estimateProcessingTime(1024 * 1024)).toBe(8); // 1MB = 1MB, < 2MB → 8
			expect(ClientOcr.estimateProcessingTime(1.5 * 1024 * 1024)).toBe(8); // 1.5MB < 2MB → 8
			expect(ClientOcr.estimateProcessingTime(3 * 1024 * 1024)).toBe(12); // 3MB >= 2MB, < 5MB → 12
			expect(ClientOcr.estimateProcessingTime(10 * 1024 * 1024)).toBe(15); // 10MB >= 5MB → 15
		});
	});
});
