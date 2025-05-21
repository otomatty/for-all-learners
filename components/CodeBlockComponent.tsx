import React from "react";
import {
	NodeViewWrapper,
	NodeViewContent,
	type NodeViewProps,
} from "@tiptap/react";

/**
 * React component for rendering code blocks with a copy button.
 */
export default function CodeBlockComponent({ node }: NodeViewProps) {
	const wrapperRef = React.useRef<HTMLDivElement>(null);

	const handleCopy = () => {
		const codeEl = wrapperRef.current?.querySelector("code");
		const text = codeEl?.textContent || "";
		navigator.clipboard.writeText(text);
	};

	return (
		<NodeViewWrapper ref={wrapperRef} className="relative group">
			<pre className="p-4 overflow-auto bg-gray-100 dark:bg-gray-800 rounded">
				<NodeViewContent as="code" />
			</pre>
			<button
				type="button"
				onClick={handleCopy}
				className="absolute top-2 right-2 bg-gray-200 dark:bg-gray-700 p-1 rounded opacity-0 group-hover:opacity-100 text-sm"
			>
				Copy
			</button>
		</NodeViewWrapper>
	);
}
