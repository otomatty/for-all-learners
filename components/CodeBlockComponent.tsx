import {
	NodeViewContent,
	type NodeViewProps,
	NodeViewWrapper,
} from "@tiptap/react";
import React from "react";

/**
 * React component for rendering code blocks with a copy button.
 */
export default function CodeBlockComponent({ node: _node }: NodeViewProps) {
	const wrapperRef = React.useRef<HTMLDivElement>(null);

	const handleCopy = () => {
		const codeEl = wrapperRef.current?.querySelector("code");
		const text = codeEl?.textContent || "";
		navigator.clipboard.writeText(text);
	};

	return (
		<NodeViewWrapper ref={wrapperRef} className="relative group">
			<pre className="p-4 overflow-auto rounded">
				<NodeViewContent<"code"> as="code" />
			</pre>
			<button
				type="button"
				onClick={handleCopy}
				className="absolute top-2 right-2 bg-secondary/80 hover:bg-secondary p-1 rounded opacity-0 group-hover:opacity-100 text-sm transition-opacity"
			>
				Copy
			</button>
		</NodeViewWrapper>
	);
}
