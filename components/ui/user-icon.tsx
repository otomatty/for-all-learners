"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface UserIconData {
	thumbnailUrl: string | null;
	pageId: string | null;
	userSlug: string;
	fullName?: string | null;
	avatarUrl?: string | null;
	exists: boolean;
}

interface UserIconProps {
	userSlug: string;
	size?: "xs" | "sm" | "md" | "lg";
	showName?: boolean;
	className?: string;
	onClick?: () => void;
}

const sizeClasses = {
	xs: "w-4 h-4 text-xs",
	sm: "w-6 h-6 text-sm",
	md: "w-8 h-8 text-base",
	lg: "w-12 h-12 text-lg",
};

export function UserIcon({
	userSlug,
	size = "sm",
	showName = false,
	className,
	onClick,
}: UserIconProps) {
	const [iconData, setIconData] = useState<UserIconData | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function fetchIconData() {
			try {
				const response = await fetch(`/api/user-icon/${userSlug}`);
				if (response.ok) {
					const data = await response.json();
					setIconData(data);
				} else {
					// ユーザーが存在しない場合のフォールバック
					setIconData({
						thumbnailUrl: null,
						pageId: null,
						userSlug,
						exists: false,
					});
				}
			} catch (error) {
				console.error("Failed to fetch user icon data:", error);
				setIconData({
					thumbnailUrl: null,
					pageId: null,
					userSlug,
					exists: false,
				});
			} finally {
				setLoading(false);
			}
		}

		fetchIconData();
	}, [userSlug]);

	if (loading) {
		return (
			<div
				className={cn(
					"rounded-full bg-gray-200 animate-pulse",
					sizeClasses[size],
					className,
				)}
			/>
		);
	}

	// フォールバック順序の決定
	let imageUrl: string | null = null;
	let fallbackText = userSlug.charAt(0).toUpperCase();

	if (iconData) {
		// 1. ページサムネイル
		if (iconData.thumbnailUrl) {
			imageUrl = iconData.thumbnailUrl;
		}
		// 2. ユーザーアバター
		else if (iconData.avatarUrl) {
			imageUrl = iconData.avatarUrl;
		}

		// 表示名の決定
		if (iconData.fullName) {
			fallbackText = iconData.fullName.charAt(0).toUpperCase();
		}
	}

	const handleClick = () => {
		if (onClick) {
			onClick();
		} else if (iconData?.pageId) {
			// デフォルトのクリック動作：ユーザーページに遷移
			window.location.href = `/pages/${iconData.pageId}`;
		}
	};

	return (
		<div
			className={cn(
				"inline-flex items-center gap-2",
				onClick || iconData?.pageId ? "cursor-pointer" : "cursor-default",
				className,
			)}
		>
			<Avatar
				className={cn(sizeClasses[size])}
				onClick={handleClick}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						handleClick();
					}
				}}
				tabIndex={onClick || iconData?.pageId ? 0 : -1}
				role={onClick || iconData?.pageId ? "button" : undefined}
			>
				{imageUrl ? (
					<AvatarImage src={imageUrl} alt={`${userSlug}のアイコン`} />
				) : null}
				<AvatarFallback
					className={cn(
						"bg-gradient-to-br from-blue-400 to-purple-500 text-white font-medium",
						!iconData?.exists && "bg-gray-400",
					)}
				>
					{fallbackText}
				</AvatarFallback>
			</Avatar>

			{showName && (
				<span
					className={cn(
						"font-medium",
						!iconData?.exists && "text-gray-500",
						onClick || iconData?.pageId ? "hover:underline" : "",
					)}
					onClick={handleClick}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							handleClick();
						}
					}}
					tabIndex={onClick || iconData?.pageId ? 0 : -1}
					role={onClick || iconData?.pageId ? "button" : undefined}
				>
					{iconData?.fullName || userSlug}
				</span>
			)}
		</div>
	);
}
