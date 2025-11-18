/**
 * Tests for Tauri file dialog utility
 *
 * Test Coverage:
 * - TC-001: 正常系 - Tauri環境でのファイル選択ダイアログ
 * - TC-002: 正常系 - Web環境でのファイル選択（input要素を使用）
 * - TC-003: 異常系 - Tauri環境でない場合のフォールバック
 * - TC-004: エッジケース - ファイル選択がキャンセルされた場合
 */

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanupTauriMock, setupTauriMock } from "../../auth/__tests__/helpers";
import { openFileDialog } from "../tauri-file-dialog";

// Mock @tauri-apps/plugin-dialog
vi.mock("@tauri-apps/plugin-dialog", () => ({
	open: vi.fn(),
}));

// Mock @tauri-apps/plugin-fs
vi.mock("@tauri-apps/plugin-fs", () => ({
	readFile: vi.fn(),
}));

describe("openFileDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		cleanupTauriMock();
	});

	// TC-001: 正常系 - Tauri環境でのファイル選択ダイアログ
	test("TC-001: Should open file dialog in Tauri environment", async () => {
		setupTauriMock();

		const { open } = await import("@tauri-apps/plugin-dialog");
		const { readFile } = await import("@tauri-apps/plugin-fs");
		const mockPath = "/path/to/file.pdf";
		const mockFileData = new Uint8Array([1, 2, 3, 4]);
		vi.mocked(open).mockResolvedValue(mockPath);
		vi.mocked(readFile).mockResolvedValue(mockFileData);

		const result = await openFileDialog({
			filters: [{ name: "PDF", extensions: ["pdf"] }],
		});

		expect(open).toHaveBeenCalledWith({
			filters: [{ name: "PDF", extensions: ["pdf"] }],
			multiple: false,
			directory: false,
		});
		expect(readFile).toHaveBeenCalledWith(mockPath);
		expect(result).toBeInstanceOf(File);
		expect(result?.name).toBe("file.pdf");
	});

	// TC-002: 正常系 - Web環境でのファイル選択（input要素を使用）
	test("TC-002: Should use input element in web environment", async () => {
		// window.__TAURI__ を設定しない

		// Mock FileList and File
		const mockFile = new File(["test"], "test.pdf", {
			type: "application/pdf",
		});
		const mockFileList = {
			length: 1,
			0: mockFile,
			item: (index: number) => (index === 0 ? mockFile : null),
			[Symbol.iterator]: function* () {
				yield mockFile;
			},
		} as FileList;

		// Mock input element
		const mockInput = document.createElement("input");
		mockInput.type = "file";
		Object.defineProperty(mockInput, "files", {
			get: () => mockFileList,
		});

		// Mock document.createElement
		const createElementSpy = vi
			.spyOn(document, "createElement")
			.mockReturnValue(mockInput as unknown as HTMLElement);

		// Mock click and change events
		const clickPromise = new Promise<void>((resolve) => {
			mockInput.addEventListener("click", () => {
				setTimeout(() => {
					mockInput.dispatchEvent(new Event("change"));
					resolve();
				}, 10);
			});
		});

		const resultPromise = openFileDialog({
			filters: [{ name: "PDF", extensions: ["pdf"] }],
		});

		// Trigger click
		mockInput.click();
		await clickPromise;

		const result = await resultPromise;

		expect(createElementSpy).toHaveBeenCalledWith("input");
		expect(mockInput.type).toBe("file");
		expect(result).toEqual(mockFile);

		createElementSpy.mockRestore();
	});

	// TC-003: 異常系 - Tauri環境でない場合のフォールバック
	test("TC-003: Should fallback to input element when not in Tauri", async () => {
		// window.__TAURI__ を設定しない

		const mockFile = new File(["test"], "test.pdf", {
			type: "application/pdf",
		});
		const mockFileList = {
			length: 1,
			0: mockFile,
			item: (index: number) => (index === 0 ? mockFile : null),
			[Symbol.iterator]: function* () {
				yield mockFile;
			},
		} as FileList;

		const mockInput = document.createElement("input");
		mockInput.type = "file";
		Object.defineProperty(mockInput, "files", {
			get: () => mockFileList,
		});

		const createElementSpy = vi
			.spyOn(document, "createElement")
			.mockReturnValue(mockInput as unknown as HTMLElement);

		const clickPromise = new Promise<void>((resolve) => {
			mockInput.addEventListener("click", () => {
				setTimeout(() => {
					mockInput.dispatchEvent(new Event("change"));
					resolve();
				}, 10);
			});
		});

		const resultPromise = openFileDialog({
			filters: [{ name: "PDF", extensions: ["pdf"] }],
		});

		mockInput.click();
		await clickPromise;

		const result = await resultPromise;

		expect(result).toEqual(mockFile);

		createElementSpy.mockRestore();
	});

	// TC-004: エッジケース - ファイル選択がキャンセルされた場合
	test("TC-004: Should return null when file selection is cancelled", async () => {
		setupTauriMock();

		const { open } = await import("@tauri-apps/plugin-dialog");
		vi.mocked(open).mockResolvedValue(null);

		const result = await openFileDialog({
			filters: [{ name: "PDF", extensions: ["pdf"] }],
		});

		expect(result).toBeNull();
	});
});
