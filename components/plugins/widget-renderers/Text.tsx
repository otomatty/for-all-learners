/**
 * Text Widget Component
 *
 * Displays formatted text content.
 *
 * Props:
 * - content: string - Text content to display
 * - variant?: "default" | "muted" | "primary" | "success" | "warning" | "danger" - Text variant
 * - size?: "sm" | "md" | "lg" - Text size
 * - align?: "left" | "center" | "right" - Text alignment
 */

interface TextProps {
	content: string;
	variant?: "default" | "muted" | "primary" | "success" | "warning" | "danger";
	size?: "sm" | "md" | "lg";
	align?: "left" | "center" | "right";
}

const variantClasses = {
	default: "text-foreground",
	muted: "text-muted-foreground",
	primary: "text-blue-600 dark:text-blue-400",
	success: "text-green-600 dark:text-green-400",
	warning: "text-yellow-600 dark:text-yellow-400",
	danger: "text-red-600 dark:text-red-400",
};

const sizeClasses = {
	sm: "text-sm",
	md: "text-base",
	lg: "text-lg",
};

const alignClasses = {
	left: "text-left",
	center: "text-center",
	right: "text-right",
};

export function Text({
	content,
	variant = "default",
	size = "md",
	align = "left",
}: TextProps) {
	return (
		<p
			className={`${variantClasses[variant]} ${sizeClasses[size]} ${alignClasses[align]}`}
		>
			{content}
		</p>
	);
}
