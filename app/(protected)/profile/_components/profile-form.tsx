"use client";

import React, { useRef, useState } from "react";
import { toast } from "sonner";
import { updateAccount, uploadAvatar } from "@/app/_actions/accounts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { Database } from "@/types/database.types";

type Account = Database["public"]["Tables"]["accounts"]["Row"];

interface ProfileFormProps {
	initialAccount: Account;
}

// Convert image file to WebP and ensure size under 1MB by iterative compression
async function convertToWebp(
	file: File,
	maxSize = 1 * 1024 * 1024,
): Promise<File> {
	// Load image
	const img = new Image();
	await new Promise<void>((res, rej) => {
		img.onload = () => res();
		img.onerror = () => rej(new Error("Image load failed"));
		img.src = URL.createObjectURL(file);
	});

	// Draw to canvas
	const canvas = document.createElement("canvas");
	canvas.width = img.width;
	canvas.height = img.height;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Canvas 2D context not supported");
	ctx.drawImage(img, 0, 0);

	// Try different qualities to meet maxSize
	const qualities = [0.8, 0.6, 0.4, 0.2, 0.1];
	for (const q of qualities) {
		const blob = await new Promise<Blob | null>((res) =>
			canvas.toBlob(res, "image/webp", q),
		);
		if (blob && blob.size <= maxSize) {
			return new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), {
				type: "image/webp",
			});
		}
	}
	throw new Error("Cannot compress image below 1MB");
}

export default function ProfileForm({ initialAccount }: ProfileFormProps) {
	const [account, setAccount] = useState<Account>(initialAccount);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [isPending, setIsPending] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleSave = async () => {
		setIsPending(true);
		try {
			// ① アバター画像アップロード
			if (selectedFile) {
				const webp = await convertToWebp(selectedFile);
				const afterAvatar = await uploadAvatar(webp);
				setAccount(afterAvatar);
				setSelectedFile(null);
				setPreviewUrl(null);
			}
			// ② プロフィール情報の更新
			const updates: Partial<Account> = {
				full_name: account.full_name,
				gender: account.gender,
				birthdate: account.birthdate,
			};
			// 既にuploadAvatarでavatar_url更新済の場合はaccount.avatar_urlが新URLなのでinclude不要
			const updated = await updateAccount(account.id, updates);
			setAccount(updated);
			toast.success("プロフィールを保存しました");
		} catch (error: unknown) {
			console.error("[ProfileForm][handleSaveError]", error);
			toast.error(
				(error as Error).message ?? "プロフィールの保存に失敗しました",
			);
		} finally {
			setIsPending(false);
		}
	};

	return (
		<Card className="p-4">
			<CardContent className="space-y-6 p-4">
				<div className="flex flex-col items-center justify-center gap-2">
					<div
						className="relative group w-32 h-32 cursor-pointer m-0"
						onClick={() => fileInputRef.current?.click()}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								fileInputRef.current?.click();
							}
						}}
					>
						<Avatar className="w-full h-full rounded-full">
							{previewUrl || account.avatar_url ? (
								<AvatarImage
									src={previewUrl ?? account.avatar_url ?? ""}
									alt="アバター"
								/>
							) : (
								<AvatarFallback>{account.full_name?.[0] ?? "?"}</AvatarFallback>
							)}
						</Avatar>

						<div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white rounded-full">
							画像を変更
						</div>
					</div>

					<input
						ref={fileInputRef}
						type="file"
						accept="image/*"
						className="hidden"
						onChange={(e) => {
							const file = e.target.files?.[0];
							if (file) {
								setSelectedFile(file);
								setPreviewUrl(URL.createObjectURL(file));
							}
						}}
					/>
					<p className="text-sm text-gray-500">
						画像をクリックすると変更できます
					</p>
				</div>
				<div className="space-y-2">
					<Label htmlFor="full_name">名前</Label>
					<Input
						id="full_name"
						value={account.full_name ?? ""}
						onChange={(e) =>
							setAccount({ ...account, full_name: e.target.value })
						}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="email">メールアドレス</Label>
					<Input id="email" value={account.email ?? ""} readOnly />
				</div>

				<div className="space-y-2">
					<Label htmlFor="gender">性別</Label>
					<Select
						value={account.gender ?? ""}
						onValueChange={(value) =>
							setAccount({ ...account, gender: value as Account["gender"] })
						}
					>
						<SelectTrigger id="gender">
							<SelectValue placeholder="選択してください" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="male">男性</SelectItem>
							<SelectItem value="female">女性</SelectItem>
							<SelectItem value="other">その他</SelectItem>
							<SelectItem value="prefer_not_to_say">未回答</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-2">
					<Label htmlFor="birthdate">生年月日</Label>
					<Input
						id="birthdate"
						type="date"
						value={account.birthdate ?? ""}
						onChange={(e) =>
							setAccount({ ...account, birthdate: e.target.value })
						}
					/>
				</div>
				<Button onClick={handleSave} disabled={isPending}>
					保存
				</Button>
			</CardContent>
		</Card>
	);
}
