"use client";

/**
 * PageCard Component - Pure UI Component for displaying page cards
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   ├─ app/(protected)/pages/_components/pages-list.tsx (planned)
 *   ├─ app/(protected)/pages/[id]/_components/target-page-card.tsx (planned)
 *   ├─ app/(protected)/pages/[id]/_components/grouped-page-card.tsx (planned)
 *   └─ app/(protected)/pages/[id]/_components/create-page-card.tsx (planned)
 *
 * Dependencies (依存先):
 *   ├─ @/components/ui/card
 *   ├─ next/image
 *   └─ next/link
 *
 * Related Files:
 *   ├─ Spec: ./PageCard.spec.md (to be created)
 *   └─ Tests: ./PageCard.test.tsx (to be created)
 */

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type PageCardVariant = "default" | "highlighted" | "dashed";

export interface PageCardProps {
	/**
	 * Card title
	 */
	title: string;

	/**
	 * Thumbnail image URL
	 */
	thumbnailUrl?: string | null;

	/**
	 * Text content preview (displayed when no thumbnail)
	 */
	contentPreview?: string;

	/**
	 * Link destination (if provided, card becomes clickable)
	 */
	href?: string;

	/**
	 * Visual variant of the card
	 * - default: Standard card
	 * - highlighted: Card with ring border (for emphasis)
	 * - dashed: Dashed border card (typically for creation actions)
	 */
	variant?: PageCardVariant;

	/**
	 * Click handler (used when href is not provided)
	 */
	onClick?: () => void;

	/**
	 * Icon to display in the card (typically used with dashed variant)
	 */
	icon?: ReactNode;

	/**
	 * Additional custom content
	 */
	children?: ReactNode;

	/**
	 * Additional CSS classes
	 */
	className?: string;

	/**
	 * Thumbnail alt text (defaults to title)
	 */
	thumbnailAlt?: string;

	/**
	 * Whether the image domain is allowed (for security)
	 */
	isImageAllowed?: boolean;

	/**
	 * Whether to show security warning for disallowed images
	 */
	showSecurityWarning?: boolean;
}

/**
 * Get variant-specific CSS classes
 */
function getVariantClasses(variant: PageCardVariant): string {
	switch (variant) {
		case "highlighted":
			return "ring-2 ring-primary/20";
		case "dashed":
			return "border-dashed border-2 hover:border-primary hover:bg-accent cursor-pointer";
		default:
			return "";
	}
}

/**
 * PageCard - Pure UI component for displaying page information
 *
 * This component provides a consistent card design for pages across the application.
 * It supports multiple variants, optional thumbnails, content previews, and both
 * link-based and click-handler-based interactions.
 *
 * @example
 * // Basic usage with link
 * <PageCard
 *   title="My Page"
 *   href="/pages/123"
 *   contentPreview="This is a preview..."
 * />
 *
 * @example
 * // Highlighted variant with thumbnail
 * <PageCard
 *   title="Important Page"
 *   variant="highlighted"
 *   thumbnailUrl="https://example.com/image.jpg"
 *   href="/pages/456"
 * />
 *
 * @example
 * // Dashed variant with click handler (for creation)
 * <PageCard
 *   title="Create New Page"
 *   variant="dashed"
 *   onClick={handleCreatePage}
 *   icon={<PlusCircle />}
 * />
 */
export function PageCard({
	title,
	thumbnailUrl,
	contentPreview,
	href,
	variant = "default",
	onClick,
	icon,
	children,
	className = "",
	thumbnailAlt,
	isImageAllowed = true,
	showSecurityWarning = true,
}: PageCardProps) {
	const variantClasses = getVariantClasses(variant);
	const baseClasses =
		"h-full overflow-hidden transition-all hover:shadow-md py-4 gap-2";
	const combinedClasses =
		`${baseClasses} ${variantClasses} ${className}`.trim();

	// For dashed variant (typically creation card)
	if (variant === "dashed") {
		const content = (
			<Card
				className={`${combinedClasses} flex flex-col items-center justify-center py-8 gap-3`}
				onClick={onClick}
				role={onClick ? "button" : undefined}
				tabIndex={onClick ? 0 : undefined}
				onKeyDown={
					onClick
						? (e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									onClick();
								}
							}
						: undefined
				}
			>
				{icon && <div className="text-muted-foreground">{icon}</div>}
				<CardTitle className="text-center text-sm">{title}</CardTitle>
				{children}
			</Card>
		);

		return href ? <Link href={href}>{content}</Link> : content;
	}

	// Standard card content
	const cardContent = (
		<Card className={combinedClasses}>
			<CardHeader className="px-4 py-2">
				<CardTitle className="text-sm">{title}</CardTitle>
			</CardHeader>
			<CardContent className="px-4">
				{thumbnailUrl ? (
					isImageAllowed ? (
						<Image
							src={thumbnailUrl}
							alt={thumbnailAlt || title}
							width={400}
							height={200}
							className="w-full h-32 object-contain"
						/>
					) : showSecurityWarning ? (
						<div className="w-full h-32 flex items-center justify-center bg-muted text-sm text-center text-muted-foreground p-4">
							この画像のドメインは許可されていません。
							<br />
							<span className="text-xs">URL: {thumbnailUrl}</span>
						</div>
					) : null
				) : contentPreview ? (
					<p className="line-clamp-5 text-sm text-muted-foreground">
						{contentPreview}
					</p>
				) : null}
				{children}
			</CardContent>
		</Card>
	);

	// Wrap with Link if href is provided
	if (href) {
		return <Link href={href}>{cardContent}</Link>;
	}

	// Add onClick handler if provided
	if (onClick) {
		return (
			<button
				type="button"
				onClick={onClick}
				className="cursor-pointer w-full text-left border-0 bg-transparent p-0"
			>
				{cardContent}
			</button>
		);
	}

	return cardContent;
}
