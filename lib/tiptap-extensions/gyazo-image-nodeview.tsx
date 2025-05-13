import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { type NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import Image from "next/image";
import type React from "react";

/**
 * A NodeView component that displays the Gyazo image normally,
 * but shows the wrapped URL when the node is selected (caret on the node).
 */
export const GyazoImageNodeView: React.FC<NodeViewProps> = ({
	node,
	selected,
}) => {
	const src = node.attrs.src as string;
	const fullWidth = node.attrs.fullWidth as boolean;
	// Convert back to gyazo.com URL without .png
	const pageUrl = src
		.replace(/^https:\/\/i\.gyazo\.com\//, "https://gyazo.com/")
		.replace(/\.png$/, "");
	// Use raw endpoint for Gyazo images
	const rawUrl = `${pageUrl}/raw`;

	return (
		<NodeViewWrapper
			as="span"
			contentEditable={selected}
			suppressContentEditableWarning
		>
			{selected ? (
				<span contentEditable suppressContentEditableWarning>
					{fullWidth ? `[[${pageUrl}]]` : `[${pageUrl}]`}
				</span>
			) : (
				<Dialog>
					<DialogTrigger asChild>
						<div
							onMouseDown={(e) => {
								e.preventDefault();
								e.stopPropagation();
							}}
							className={`relative inline-block cursor-pointer h-[300px] ${fullWidth ? "w-full" : "w-auto"}`}
							contentEditable={false}
						>
							<Image
								src={rawUrl}
								alt={`Gyazo image: ${pageUrl}`}
								width={300}
								height={300}
								style={{
									width: "auto",
									height: 300,
									borderRadius: 8,
									objectFit: fullWidth ? "cover" : "contain",
									transition: "box-shadow 0.3s ease",
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.boxShadow =
										"0 0 1rem 0 rgba(0, 0, 0, 0.3)";
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.boxShadow = "none";
								}}
							/>
						</div>
					</DialogTrigger>
					<DialogContent className="md:!max-w-[90vw]">
						<DialogTitle className="sr-only">Gyazo Image</DialogTitle>
						<div className="relative w-full h-[90vh]">
							<Image
								src={rawUrl}
								alt={`Gyazo (enlarged): ${pageUrl}`}
								fill
								style={{ objectFit: "contain" }}
							/>
						</div>
					</DialogContent>
				</Dialog>
			)}
		</NodeViewWrapper>
	);
};
