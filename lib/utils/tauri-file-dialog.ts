/**
 * Tauriファイルダイアログユーティリティ
 *
 * Tauri環境とWeb環境の両方に対応したファイル選択ダイアログを提供します。
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ lib/hooks/use-storage.ts (将来)
 *
 * Dependencies (External files that this file imports):
 *   ├─ @tauri-apps/plugin-dialog
 *   └─ @/lib/utils/environment
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */

import { isTauri } from "./environment";

export interface FileDialogFilter {
	name: string;
	extensions: string[];
}

export interface FileDialogOptions {
	filters?: FileDialogFilter[];
	multiple?: boolean;
	directory?: boolean;
}

/**
 * ファイル選択ダイアログを開く
 *
 * Tauri環境では `@tauri-apps/plugin-dialog` を使用し、
 * Web環境では `<input type="file">` 要素を使用します。
 *
 * @param options ダイアログオプション
 * @returns 選択されたファイル、またはキャンセル時は null
 */
export async function openFileDialog(
	options: FileDialogOptions = {},
): Promise<File | null> {
	if (isTauri()) {
		// Tauri環境では plugin-dialog を使用
		const { open } = await import("@tauri-apps/plugin-dialog");

		const result = await open({
			filters: options.filters,
			multiple: options.multiple ?? false,
			directory: options.directory ?? false,
		});

		if (!result) {
			return null;
		}

		// Tauriの結果は文字列（パス）または配列（複数選択時）
		// ここでは単一ファイルのみをサポート
		if (typeof result === "string") {
			// パスからFileオブジェクトを作成
			// Tauri環境では、@tauri-apps/plugin-fs を使用してファイルを読み込む
			try {
				const { readFile } = await import("@tauri-apps/plugin-fs");
				const fileData = await readFile(result);
				const fileName =
					result.split("/").pop() ?? result.split("\\").pop() ?? "file";
				// Uint8ArrayをBlobに変換
				const blob = new Blob([fileData]);
				return new File([blob], fileName);
			} catch (error) {
				throw new Error(
					`Failed to read file: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
			}
		}

		return null;
	}

	// Web環境では input 要素を使用
	return new Promise<File | null>((resolve) => {
		const input = document.createElement("input");
		input.type = "file";
		input.style.display = "none";

		if (options.filters) {
			const accept = options.filters
				.map((filter) => filter.extensions.map((ext) => `.${ext}`).join(","))
				.join(",");
			input.accept = accept;
		}

		if (options.multiple) {
			input.multiple = true;
		}

		input.addEventListener("change", () => {
			const files = input.files;
			if (files && files.length > 0) {
				resolve(files[0]);
			} else {
				resolve(null);
			}
			if (input.parentNode) {
				input.parentNode.removeChild(input);
			}
		});

		input.addEventListener("cancel", () => {
			resolve(null);
			if (input.parentNode) {
				input.parentNode.removeChild(input);
			}
		});

		document.body.appendChild(input);
		input.click();
	});
}
