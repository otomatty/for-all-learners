"use client";

/**
 * Star Rating Component
 *
 * Displays an interactive star rating (1-5 stars).
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ app/(protected)/settings/plugins/_components/PluginRatingForm.tsx
 *
 * Dependencies:
 *   ├─ lucide-react (Star icon)
 *   └─ components/ui/button.tsx
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/implementation-status.md
 */

import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StarRatingProps {
	/**
	 * Current rating value (1-5, or 0 for no rating)
	 */
	rating: number;

	/**
	 * Whether the rating is interactive (clickable)
	 */
	interactive?: boolean;

	/**
	 * Callback when rating is changed (only when interactive)
	 */
	onRatingChange?: (rating: number) => void;

	/**
	 * Size of stars
	 */
	size?: "sm" | "md" | "lg";

	/**
	 * Additional className
	 */
	className?: string;
}

const sizeClasses = {
	sm: "h-4 w-4",
	md: "h-5 w-5",
	lg: "h-6 w-6",
};

export function StarRating({
	rating,
	interactive = false,
	onRatingChange,
	size = "md",
	className,
}: StarRatingProps) {
	const handleClick = (value: number) => {
		if (interactive && onRatingChange) {
			onRatingChange(value);
		}
	};

	const handleMouseEnter = (_value: number) => {
		if (interactive && onRatingChange) {
			// Preview hover effect (optional, can be enhanced with state)
		}
	};

	return (
		<div className={cn("flex items-center gap-0.5", className)}>
			{[1, 2, 3, 4, 5].map((value) => {
				const isFilled = value <= rating;
				const StarIcon = Star;

				if (interactive) {
					return (
						<Button
							key={value}
							variant="ghost"
							size="sm"
							className={cn(
								"h-auto p-0.5 hover:bg-transparent",
								sizeClasses[size],
							)}
							onClick={() => handleClick(value)}
							onMouseEnter={() => handleMouseEnter(value)}
							aria-label={`${value}つ星`}
							type="button"
						>
							<StarIcon
								className={cn(
									sizeClasses[size],
									"transition-colors",
									isFilled
										? "fill-yellow-400 text-yellow-400"
										: "fill-gray-200 text-gray-300",
									interactive && "hover:fill-yellow-300 hover:text-yellow-300",
								)}
							/>
						</Button>
					);
				}

				return (
					<StarIcon
						key={value}
						className={cn(
							sizeClasses[size],
							isFilled
								? "fill-yellow-400 text-yellow-400"
								: "fill-gray-200 text-gray-300",
						)}
					/>
				);
			})}
		</div>
	);
}
