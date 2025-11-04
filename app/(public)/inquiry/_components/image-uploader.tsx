"use client";

import imageCompression from "browser-image-compression";
import { Loader2, PlusCircle, XCircle } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

import { cn } from "@/lib/utils";

export interface FileDetail {
	id: string;
	originalFile: File;
	processedFile: File | null;
	previewUrl: string;
	isProcessing: boolean;
	error?: string | null;
}

interface ImageUploaderProps {
	maxFiles: number;
	maxFileSizeMB: number;
	targetCompressionSizeMB: number;
	onFilesChange: (files: File[]) => void; // Callback to parent with processed files
	className?: string;
	disabled?: boolean;
}

const MAX_FILE_SIZE_BYTES_FACTOR = 1024 * 1024;

export function ImageUploader({
	maxFiles,
	maxFileSizeMB,
	targetCompressionSizeMB,
	onFilesChange,
	className,
	disabled = false,
}: ImageUploaderProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [fileDetails, setFileDetails] = useState<FileDetail[]>([]);
	const [isOverallProcessing, setIsOverallProcessing] = useState(false);
	const fileInputId = useId();

	const maxFileSizeBytes = maxFileSizeMB * MAX_FILE_SIZE_BYTES_FACTOR;

	useEffect(() => {
		// Notify parent about processed files change
		const processedFiles = fileDetails
			.map((detail) => detail.processedFile)
			.filter((file): file is File => file !== null);
		onFilesChange(processedFiles);

		// Update overall processing state
		const currentlyProcessing = fileDetails.some(
			(detail) => detail.isProcessing,
		);
		if (isOverallProcessing !== currentlyProcessing) {
			setIsOverallProcessing(currentlyProcessing);
		}

		// Cleanup preview URLs on component unmount or when fileDetails change
		return () => {
			// This cleanup runs when the component unmounts or fileDetails changes.
			// If it runs on every fileDetails change, it might revoke URLs too early.
			// Consider moving this to a more specific cleanup if issues arise.
		};
	}, [fileDetails, onFilesChange, isOverallProcessing]);

	// More specific cleanup for preview URLs when a file is removed
	useEffect(() => {
		const currentPreviewUrls = new Set(fileDetails.map((fd) => fd.previewUrl));
		return () => {
			for (const detail of fileDetails) {
				if (!currentPreviewUrls.has(detail.previewUrl)) {
					URL.revokeObjectURL(detail.previewUrl);
				}
			}
		};
	}, [fileDetails]);

	const processFile = useCallback(
		async (file: File, id: string) => {
			try {
				const options = {
					maxSizeMB: targetCompressionSizeMB,
					maxWidthOrHeight: 1920,
					useWebWorker: true,
					fileType: "image/webp",
					initialQuality: 0.7,
					alwaysKeepResolution: true,
				};
				const compressedFile = await imageCompression(file, options);
				setFileDetails((prevDetails) =>
					prevDetails.map((detail) =>
						detail.id === id
							? {
									...detail,
									processedFile: compressedFile,
									isProcessing: false,
									error: null,
								}
							: detail,
					),
				);
				// toast.success(`ファイル "${file.name}" の処理が完了しました。`); // Individual success can be noisy
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "画像の処理に失敗しました。";
				setFileDetails((prevDetails) =>
					prevDetails.map((detail) =>
						detail.id === id
							? {
									...detail,
									processedFile: null,
									isProcessing: false,
									error: errorMessage,
								}
							: detail,
					),
				);
				toast.error(
					`ファイル "${file.name}" の処理に失敗しました: ${errorMessage}`,
				);
			}
		},
		[targetCompressionSizeMB],
	);

	const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		const files = event.target.files ? Array.from(event.target.files) : [];
		if (files.length === 0) return;

		const currentFileCount = fileDetails.length;
		if (currentFileCount >= maxFiles) {
			toast.error(`添付できるファイルは最大${maxFiles}枚までです。`);
			if (fileInputRef.current) fileInputRef.current.value = "";
			return;
		}

		const newFileDetails: FileDetail[] = [];
		let filesToProcessCount = 0;

		for (const file of files) {
			if (fileDetails.length + newFileDetails.length >= maxFiles) {
				toast.info(
					`最大${maxFiles}枚の制限に達したため、一部ファイルは追加されません。`,
				);
				break;
			}
			if (file.size > maxFileSizeBytes) {
				toast.error(
					`ファイル "${file.name}" (${(file.size / MAX_FILE_SIZE_BYTES_FACTOR).toFixed(2)}MB) はサイズが大きすぎます。${maxFileSizeMB}MB以下のファイルを選択してください。`,
				);
				continue;
			}
			if (!file.type.startsWith("image/")) {
				toast.error(
					`ファイル "${file.name}" は画像形式ではありません。画像ファイルを選択してください。`,
				);
				continue;
			}

			const fileId = uuidv4();
			const previewUrl = URL.createObjectURL(file);
			newFileDetails.push({
				id: fileId,
				originalFile: file,
				processedFile: null,
				previewUrl,
				isProcessing: true,
				error: null,
			});
			processFile(file, fileId);
			filesToProcessCount++;
		}

		if (newFileDetails.length > 0) {
			setFileDetails((prevDetails) => [...prevDetails, ...newFileDetails]);
		}
		if (filesToProcessCount > 0) {
			toast.info(`${filesToProcessCount}件の画像の処理を開始しました...`);
		}
		if (fileInputRef.current) fileInputRef.current.value = ""; // Allow re-selecting the same file(s)
	};

	const removeFile = (idToRemove: string) => {
		const detailToRemove = fileDetails.find(
			(detail) => detail.id === idToRemove,
		);
		if (detailToRemove) {
			URL.revokeObjectURL(detailToRemove.previewUrl);
		}
		setFileDetails((prevDetails) =>
			prevDetails.filter((detail) => detail.id !== idToRemove),
		);
	};

	const triggerFileInput = () => {
		if (!disabled && fileDetails.length < maxFiles && fileInputRef.current) {
			fileInputRef.current.click();
		}
	};

	return (
		<div className={cn("space-y-4", className)}>
			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
				{fileDetails.map((detail) => (
					<div
						key={detail.id}
						className="relative group border rounded-md p-2 space-y-1 text-xs aspect-square flex flex-col items-center justify-center"
					>
						<div className="relative w-full h-20 mb-1">
							<Image
								src={detail.previewUrl}
								alt={`プレビュー ${detail.originalFile.name}`}
								fill
								className="object-contain rounded-md"
								unoptimized
							/>
						</div>
						<button
							type="button"
							onClick={() => removeFile(detail.id)}
							className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity z-10"
							aria-label={`ファイル ${detail.originalFile.name} を削除`}
						>
							<XCircle size={18} />
						</button>
						<p
							className="w-full font-medium truncate text-center"
							title={detail.originalFile.name}
						>
							{detail.originalFile.name}
						</p>
						{/* <p className="text-muted-foreground text-center">
							元: ({(detail.originalFile.size / MAX_FILE_SIZE_BYTES_FACTOR).toFixed(2)} MB)
						</p> */}
						{detail.isProcessing && (
							<div className="flex items-center text-blue-600">
								<Loader2 size={14} className="animate-spin mr-1" />
								処理中...
							</div>
						)}
						{detail.error && (
							<p
								className="text-red-600 truncate text-center"
								title={detail.error}
							>
								エラー
							</p>
						)}
						{detail.processedFile && !detail.isProcessing && (
							<p className="text-green-600 text-center">
								済 (
								{(
									detail.processedFile.size / MAX_FILE_SIZE_BYTES_FACTOR
								).toFixed(2)}{" "}
								MB)
							</p>
						)}
					</div>
				))}

				{fileDetails.length < maxFiles && (
					<button
						type="button"
						onClick={triggerFileInput}
						className={cn(
							"border-2 border-dashed border-muted-foreground/50 rounded-md aspect-square flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors",
							(disabled || isOverallProcessing) &&
								"cursor-not-allowed opacity-50 hover:border-muted-foreground/50 hover:text-muted-foreground",
							!disabled && !isOverallProcessing && "cursor-pointer",
						)}
						disabled={
							disabled || isOverallProcessing || fileDetails.length >= maxFiles
						}
						aria-label="画像を追加"
					>
						{isOverallProcessing ? (
							<Loader2 size={36} className="animate-spin" />
						) : (
							<PlusCircle size={36} />
						)}
						<p className="mt-2 text-sm">
							{isOverallProcessing
								? "処理中..."
								: `画像を追加 (${fileDetails.length}/${maxFiles})`}
						</p>
					</button>
				)}
			</div>

			<input
				id={fileInputId}
				ref={fileInputRef}
				type="file"
				accept="image/*"
				multiple
				onChange={handleFileSelect}
				className="hidden"
				disabled={
					disabled || isOverallProcessing || fileDetails.length >= maxFiles
				}
			/>
			{fileDetails.length >= maxFiles && (
				<p className="text-sm text-muted-foreground">
					最大{maxFiles}枚まで添付できます。
				</p>
			)}
		</div>
	);
}
