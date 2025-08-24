/**
 * 画像前処理ユーティリティ
 * OCR精度向上のための画像最適化機能
 */

export interface ImageProcessingOptions {
	maxWidth?: number;
	maxHeight?: number;
	quality?: number;
	format?: "jpeg" | "png" | "webp";
}

export interface ProcessedImageResult {
	blob: Blob;
	width: number;
	height: number;
	originalSize: number;
	processedSize: number;
	compressionRatio: number;
}

/**
 * 画像をOCR用に最適化して処理
 */
export async function processImageForOcr(
	imageUrl: string,
	options: ImageProcessingOptions = {},
): Promise<ProcessedImageResult> {
	const {
		maxWidth = 1024,
		maxHeight = 1024,
		quality = 0.9,
		format = "jpeg",
	} = options;

	try {
		// 画像を取得
		const response = await fetch(imageUrl);
		if (!response.ok) {
			throw new Error(`Failed to fetch image: ${response.status}`);
		}

		const originalBlob = await response.blob();
		const originalSize = originalBlob.size;

		// Canvas で画像を読み込み
		const img = new Image();
		img.crossOrigin = "anonymous";

		const imageLoadPromise = new Promise<HTMLImageElement>(
			(resolve, reject) => {
				img.onload = () => resolve(img);
				img.onerror = reject;
			},
		);

		img.src = imageUrl;
		const loadedImage = await imageLoadPromise;

		// リサイズが必要かチェック
		const { width: newWidth, height: newHeight } = calculateOptimalSize(
			loadedImage.width,
			loadedImage.height,
			maxWidth,
			maxHeight,
		);

		// Canvas で画像を描画
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			throw new Error("Failed to get canvas context");
		}

		canvas.width = newWidth;
		canvas.height = newHeight;

		// 高品質な描画設定
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = "high";

		// 白背景を設定（透明部分対策）
		ctx.fillStyle = "#FFFFFF";
		ctx.fillRect(0, 0, newWidth, newHeight);

		// 画像を描画
		ctx.drawImage(loadedImage, 0, 0, newWidth, newHeight);

		// OCR用のコントラスト調整（オプション）
		if (options.quality && options.quality > 0.95) {
			enhanceContrastForOcr(ctx, newWidth, newHeight);
		}

		// Blobに変換
		const processedBlob = await new Promise<Blob>((resolve, reject) => {
			canvas.toBlob(
				(blob) => {
					if (blob) {
						resolve(blob);
					} else {
						reject(new Error("Failed to convert canvas to blob"));
					}
				},
				`image/${format}`,
				quality,
			);
		});

		return {
			blob: processedBlob,
			width: newWidth,
			height: newHeight,
			originalSize,
			processedSize: processedBlob.size,
			compressionRatio: originalSize / processedBlob.size,
		};
	} catch (error) {
		console.error("Image processing failed:", error);
		throw new Error(
			`Image processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

/**
 * 最適なサイズを計算（アスペクト比を維持）
 */
function calculateOptimalSize(
	originalWidth: number,
	originalHeight: number,
	maxWidth: number,
	maxHeight: number,
): { width: number; height: number } {
	if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
		return { width: originalWidth, height: originalHeight };
	}

	const widthRatio = maxWidth / originalWidth;
	const heightRatio = maxHeight / originalHeight;
	const ratio = Math.min(widthRatio, heightRatio);

	return {
		width: Math.floor(originalWidth * ratio),
		height: Math.floor(originalHeight * ratio),
	};
}

/**
 * OCR用のコントラスト強化（軽微な調整）
 */
function enhanceContrastForOcr(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
): void {
	const imageData = ctx.getImageData(0, 0, width, height);
	const data = imageData.data;

	// 軽微なコントラスト調整
	const contrast = 1.1;
	const factor =
		(259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100));

	for (let i = 0; i < data.length; i += 4) {
		data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128)); // R
		data[i + 1] = Math.min(
			255,
			Math.max(0, factor * (data[i + 1] - 128) + 128),
		); // G
		data[i + 2] = Math.min(
			255,
			Math.max(0, factor * (data[i + 2] - 128) + 128),
		); // B
	}

	ctx.putImageData(imageData, 0, 0);
}

/**
 * 画像URLから基本情報を取得
 */
export async function getImageInfo(imageUrl: string): Promise<{
	width: number;
	height: number;
	size: number;
	type: string;
}> {
	const img = new Image();
	img.crossOrigin = "anonymous";

	const loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
		img.onload = () => resolve(img);
		img.onerror = reject;
	});

	img.src = imageUrl;
	const loadedImage = await loadPromise;

	// ファイルサイズを取得
	const response = await fetch(imageUrl);
	const blob = await response.blob();

	return {
		width: loadedImage.width,
		height: loadedImage.height,
		size: blob.size,
		type: blob.type,
	};
}
