"use client";

import { uploadImageToCardImages } from "@/app/_actions/storage"; // Server Actionをインポート
import { Button } from "@/components/ui/button"; // Buttonをインポート
import { CustomCodeBlock } from "@/lib/tiptap-extensions/code-block";
import { CustomBlockquote } from "@/lib/tiptap-extensions/custom-blockquote";
import { Highlight } from "@/lib/tiptap-extensions/highlight-extension";
import { LatexInlineNode } from "@/lib/tiptap-extensions/latex-inline-node";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Typography from "@tiptap/extension-typography";
import { Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Upload } from "lucide-react"; // Uploadアイコンをインポート
import { useRef } from "react";
import { toast } from "sonner"; // toastをインポート

interface TiptapEditorProps {
	content: string; // 初期コンテンツはJSON文字列として受け取る想定
	onChange: (richText: string) => void; // 変更時にJSON文字列を返す
	placeholder?: string;
	userId: string; // ユーザーIDを追加
}

const TiptapEditor = ({
	content,
	onChange,
	placeholder,
	userId, // userIdを受け取る
}: TiptapEditorProps) => {
	const fileInputRef = useRef<HTMLInputElement>(null);

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				// 必要に応じてStarterKitのオプションを設定
				// 例: heading: { levels: [1, 2, 3] }
				// history: false, // use y-prosemirror history if you use collaboration
				blockquote: false, // Disable default blockquote in favor of CustomBlockquote
				codeBlock: false, // Disable default codeBlock in favor of CustomCodeBlock
			}),
			CustomBlockquote, // Add the custom blockquote extension
			CustomCodeBlock, // Add the custom code block extension
			LatexInlineNode, // Add the new LaTeX inline node extension
			Image.configure({
				inline: false,
				// allowBase64: true, // Base64は重いので基本的には非推奨
			}),
			Placeholder.configure({
				placeholder: placeholder || "入力してください...",
			}),
			Link.configure({
				openOnClick: false, // リンククリック時の挙動
				autolink: true,
			}),
			TextAlign.configure({
				types: ["heading", "paragraph"],
			}),
			Typography, // タイポグラフィ関連のショートカット（例: (c) -> ©）
			Highlight,
		],
		content: content ? JSON.parse(content) : undefined, // JSON文字列をパース
		onUpdate: ({ editor }) => {
			onChange(JSON.stringify(editor.getJSON())); // JSON文字列として変更を通知
		},
		editorProps: {
			attributes: {
				class:
					"prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mb-4 focus:outline-none border p-2 rounded-md min-h-[150px]",
			},
		},
	});

	if (!editor) {
		return null;
	}

	return (
		<>
			{editor && (
				<div className="toolbar py-2 border-b flex items-center gap-1">
					<Button
						type="button"
						onClick={() => editor.chain().focus().toggleBold().run()}
						variant={editor.isActive("bold") ? "default" : "outline"}
						size="sm"
					>
						Bold
					</Button>
					<Button
						type="button"
						onClick={() => editor.chain().focus().toggleItalic().run()}
						variant={editor.isActive("italic") ? "default" : "outline"}
						size="sm"
					>
						Italic
					</Button>
					<Button
						type="button"
						onClick={() => editor.chain().focus().toggleStrike().run()}
						variant={editor.isActive("strike") ? "default" : "outline"}
						size="sm"
					>
						Strike
					</Button>
					<Button
						type="button"
						onClick={() => fileInputRef.current?.click()}
						variant="outline"
						size="sm"
					>
						<Upload className="h-4 w-4 mr-2" />
						Image
					</Button>
					<input
						type="file"
						accept="image/*"
						ref={fileInputRef}
						style={{ display: "none" }}
						onChange={async (event) => {
							const file = event.target.files?.[0];
							if (file && userId) {
								toast.info("画像をアップロードしています...");
								const { publicUrl, error } = await uploadImageToCardImages(
									userId,
									file,
								);
								if (error) {
									toast.error(`画像アップロードエラー: ${error}`);
								} else if (publicUrl) {
									editor.chain().focus().setImage({ src: publicUrl }).run();
									toast.success("画像を挿入しました");
								}
								// Reset file input
								if (fileInputRef.current) {
									fileInputRef.current.value = "";
								}
							}
						}}
					/>
					{/* 他のツールバーボタンをここに追加 */}
				</div>
			)}
			<EditorContent editor={editor} />
		</>
	);
};

export default TiptapEditor;
