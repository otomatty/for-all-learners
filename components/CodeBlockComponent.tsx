import {
	NodeViewContent,
	type NodeViewProps,
	NodeViewWrapper,
} from "@tiptap/react";
import { Edit2, Copy } from "lucide-react";
import mermaid from "mermaid";
import React, { useEffect, useMemo, useRef, useState } from "react";
import logger from "@/lib/logger";

/**
 * React component for rendering code blocks with a copy button.
 * Supports Mermaid diagram rendering with edit/diagram view toggle.
 */
export default function CodeBlockComponent({ node }: NodeViewProps) {
	const wrapperRef = React.useRef<HTMLDivElement>(null);
	const mermaidRef = useRef<HTMLDivElement>(null);
	const [viewMode, setViewMode] = useState<"diagram" | "edit">("diagram");
	const [mermaidError, setMermaidError] = useState<string | null>(null);
	const [isRendering, setIsRendering] = useState(false);

	const isMermaid = node.attrs.language === "mermaid";

	// Extract code text from node content
	// For code blocks, text is typically stored in a single text node within content array
	const codeText = useMemo(() => {
		if (node.content && Array.isArray(node.content)) {
			// Extract text from text nodes in the content
			// Code blocks usually have a single text node with all the code
			const extractText = (content: unknown[]): string => {
				return content
					.map((item) => {
						if (typeof item === "object" && item !== null) {
							if ("text" in item && typeof item.text === "string") {
								return item.text;
							}
							if ("content" in item && Array.isArray(item.content)) {
								return extractText(item.content);
							}
						}
						return "";
					})
					.join("");
			};
			const extracted = extractText(node.content);
			// Preserve newlines - don't trim if it's empty, but trim trailing whitespace
			return extracted ? extracted.replace(/\r\n/g, "\n") : "";
		}
		return "";
	}, [node.content]);

	// Also get text from DOM as fallback (useful when editing)
	const [domCodeText, setDomCodeText] = useState<string>("");

	useEffect(() => {
		if (viewMode === "edit" && wrapperRef.current) {
			// When in edit mode, sync with DOM
			const codeEl = wrapperRef.current.querySelector("code");
			if (codeEl) {
				setDomCodeText(codeEl.textContent || "");
			}
		}
	}, [viewMode]);

	// Use DOM text if available (more reliable for edited content), otherwise use node content
	const effectiveCodeText = useMemo(() => {
		return domCodeText || codeText;
	}, [domCodeText, codeText]);

	const handleCopy = () => {
		// Try to get text from effectiveCodeText first, fallback to DOM
		let text = effectiveCodeText;
		if (!text) {
			const codeEl = wrapperRef.current?.querySelector("code");
			text = codeEl?.textContent || "";
		}
		navigator.clipboard.writeText(text);
	};

	const handleToggleEdit = () => {
		const newMode = viewMode === "diagram" ? "edit" : "diagram";

		// When switching to diagram mode, get latest text from DOM before switching
		if (newMode === "diagram" && wrapperRef.current) {
			const codeEl = wrapperRef.current.querySelector("code");
			if (codeEl) {
				const latestText = codeEl.textContent || "";
				// Update domCodeText immediately so it's available when useEffect runs
				setDomCodeText(latestText);
			}
		}

		setViewMode(newMode);
		setMermaidError(null);
	};

	// Initialize Mermaid once
	useEffect(() => {
		if (typeof window === "undefined") return;

		// Initialize Mermaid with default config
		mermaid.initialize({
			startOnLoad: false,
			theme: "default",
			securityLevel: "loose",
		});
	}, []);

	// Render Mermaid diagram
	useEffect(() => {
		if (!isMermaid || viewMode !== "diagram" || typeof window === "undefined") {
			return;
		}

		if (!mermaidRef.current) {
			return;
		}

		// Function to render Mermaid diagram
		const renderMermaid = async (text: string) => {
			if (!text || !mermaidRef.current) {
				return;
			}

			setIsRendering(true);
			setMermaidError(null);

			// Clear previous content
			mermaidRef.current.innerHTML = "";

			// Create a unique ID for this diagram (regenerate to avoid conflicts)
			const diagramId = `mermaid-${Date.now()}-${Math.random().toString(36).substring(7)}`;

			try {
				const { svg } = await mermaid.render(diagramId, text);
				if (mermaidRef.current) {
					mermaidRef.current.innerHTML = svg;
					setIsRendering(false);
					setMermaidError(null);
				}
			} catch (error) {
				logger.error(
					{
						error,
						codeText: text.substring(0, 500),
						codeTextLength: text.length,
						errorMessage:
							error instanceof Error ? error.message : String(error),
					},
					"Mermaid rendering error",
				);
				setMermaidError(
					error instanceof Error ? error.message : "Failed to render diagram",
				);
				setIsRendering(false);
			}
		};

		// Get the actual code text - try multiple sources to ensure we get complete content
		let actualCodeText = codeText || "";

		// Try to get from DOM (for edited content)
		const getTextFromDOM = (): string => {
			if (wrapperRef.current) {
				const codeEl = wrapperRef.current.querySelector("code");
				const domText = codeEl?.textContent || "";
				// Use DOM text if it's longer (more complete) than node content
				if (domText.length > actualCodeText.length) {
					return domText;
				}
			}
			return actualCodeText;
		};

		// Get text from DOM immediately
		actualCodeText = getTextFromDOM();

		// Render immediately if we have text
		if (actualCodeText) {
			renderMermaid(actualCodeText);
		}

		// Also try DOM after a short delay (in case DOM hasn't updated yet)
		const timeoutId = setTimeout(() => {
			const updatedText = getTextFromDOM();
			if (updatedText && updatedText !== actualCodeText) {
				renderMermaid(updatedText);
			}
		}, 100);

		return () => clearTimeout(timeoutId);
	}, [isMermaid, viewMode, codeText]);

	// For non-Mermaid code blocks, render normally
	if (!isMermaid) {
		return (
			<NodeViewWrapper ref={wrapperRef} className="relative group">
				<pre className="p-6 overflow-auto rounded shiki">
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

	// For Mermaid code blocks, render with diagram/edit toggle
	return (
		<NodeViewWrapper ref={wrapperRef} className="relative group">
			{viewMode === "diagram" ? (
				<div className="p-6 rounded bg-secondary/5 border border-border overflow-auto">
					{isRendering && (
						<div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
							Rendering diagram...
						</div>
					)}
					{mermaidError && (
						<div className="p-4 rounded bg-destructive/10 border border-destructive/20 text-destructive text-sm">
							<p className="font-semibold mb-1">Mermaid Error</p>
							<p className="wrap-break-word">{mermaidError}</p>
							<button
								type="button"
								onClick={handleToggleEdit}
								className="mt-2 text-xs underline hover:no-underline"
							>
								Edit code
							</button>
						</div>
					)}
					{!isRendering && !mermaidError && (
						<div
							ref={mermaidRef}
							className="mermaid-container flex items-center justify-center min-h-[100px] w-full overflow-auto [&_svg]:max-w-full [&_svg]:h-auto"
						/>
					)}
				</div>
			) : (
				<pre className="p-6 overflow-auto rounded shiki">
					<NodeViewContent<"code"> as="code" />
				</pre>
			)}
			<div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
				<button
					type="button"
					onClick={handleToggleEdit}
					className="bg-secondary/90 hover:bg-secondary backdrop-blur-sm p-1.5 rounded text-xs flex items-center gap-1.5 shadow-sm border border-border/50"
					title={viewMode === "diagram" ? "Edit code" : "View diagram"}
				>
					<Edit2 className="w-3.5 h-3.5" />
					<span className="hidden sm:inline">
						{viewMode === "diagram" ? "Edit" : "View"}
					</span>
				</button>
				<button
					type="button"
					onClick={handleCopy}
					className="bg-secondary/90 hover:bg-secondary backdrop-blur-sm p-1.5 rounded text-xs flex items-center gap-1.5 shadow-sm border border-border/50"
					title="Copy code"
				>
					<Copy className="w-3.5 h-3.5" />
					<span className="hidden sm:inline">Copy</span>
				</button>
			</div>
		</NodeViewWrapper>
	);
}
