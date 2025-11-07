/**
 * List Widget Component
 *
 * Displays a list of items.
 *
 * Props:
 * - items: Array<{ label: string; value?: string | number; icon?: string }> - List items
 * - ordered?: boolean - Whether to use ordered list
 */

interface ListItem {
	label: string;
	value?: string | number;
	icon?: string;
}

interface ListProps {
	items: ListItem[];
	ordered?: boolean;
}

export function List({ items, ordered = false }: ListProps) {
	if (!Array.isArray(items) || items.length === 0) {
		return null;
	}

	const ListTag = ordered ? "ol" : "ul";

	return (
		<ListTag
			className={ordered ? "list-decimal list-inside" : "list-disc list-inside"}
		>
			{items.map((item, index) => (
				<li key={index} className="text-sm py-1">
					<div className="flex items-center gap-2">
						{item.icon && <span>{item.icon}</span>}
						<span>{item.label}</span>
						{item.value !== undefined && (
							<span className="text-muted-foreground ml-auto">
								{item.value}
							</span>
						)}
					</div>
				</li>
			))}
		</ListTag>
	);
}
