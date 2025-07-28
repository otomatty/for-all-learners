"use client";

import { generatePageInfo } from "@/app/_actions/generatePageInfo";
import {
	getAllUserPromptTemplates,
	updateUserPromptTemplate,
} from "@/app/_actions/promptTemplate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import React, { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";

// プロンプト行の型定義
interface PromptRow {
	prompt_key: string;
	template: string;
}

export default function PromptTemplates() {
	const [prompts, setPrompts] = useState<PromptRow[]>([]);
	const [promptsLoading, setPromptsLoading] = useState(false);
	const [selectedKey, setSelectedKey] = useState<string>("");
	const [template, setTemplate] = useState("");
	const [isSaving, startSave] = useTransition();
	const [title, setTitle] = useState("");
	const [isGenerating, startGenerate] = useTransition();
	const [preview, setPreview] = useState<string | null>(null);

	// Load all user prompts
	useEffect(() => {
		setPromptsLoading(true);
		getAllUserPromptTemplates()
			.then((rows) => {
				setPrompts(rows);
				if (rows.length > 0) {
					setSelectedKey(rows[0].prompt_key);
					setTemplate(rows[0].template);
				}
			})
			.catch((e) => {
				console.error(e);
				toast.error("プロンプト一覧の読み込みに失敗しました");
			})
			.finally(() => setPromptsLoading(false));
	}, []);

	// プロンプト選択時の処理
	const handleSelect = (key: string) => {
		const row = prompts.find((p) => p.prompt_key === key);
		if (row) {
			setSelectedKey(key);
			setTemplate(row.template);
			setPreview(null);
			setTitle("");
		}
	};

	const handleSave = () => {
		startSave(async () => {
			try {
				await updateUserPromptTemplate(selectedKey, template);
				toast.success("プロンプトを保存しました");
			} catch (e) {
				console.error(e);
				toast.error("保存に失敗しました");
			}
		});
	};

	const handleGenerate = () => {
		startGenerate(async () => {
			try {
				const result = await generatePageInfo(title);
				setPreview(result);
			} catch (e) {
				console.error(e);
				toast.error("生成に失敗しました");
			}
		});
	};

	// Show final prompt with title inserted
	const finalPrompt = template.replace(/{{\s*title\s*}}/g, title);

	return (
		<div className="flex flex-col md:flex-row h-full">
			{/* 左カラム: プロンプト一覧 */}
			<div className="w-full md:w-1/4 border-b md:border-b-0 md:border-r p-2 overflow-auto">
				{promptsLoading ? (
					<p>読み込み中...</p>
				) : (
					<ul>
						{prompts.map((p) => (
							<li key={p.prompt_key} className="mb-1">
								<button
									type="button"
									className={`w-full text-left cursor-pointer p-2 rounded ${
										p.prompt_key === selectedKey
											? "bg-gray-200 font-bold"
											: "hover:bg-gray-100"
									}`}
									onClick={() => handleSelect(p.prompt_key)}
								>
									{p.prompt_key}
								</button>
							</li>
						))}
					</ul>
				)}
			</div>
			{/* 右カラム: 編集 & プレイグラウンド */}
			<div className="w-full md:w-3/4 p-4 overflow-auto">
				<section>
					<h2 className="text-lg font-medium">
						プロンプト設定 ({selectedKey})
					</h2>
					<div className="mt-2">
						<textarea
							className="w-full border rounded p-2 h-40"
							value={template}
							onChange={(e) => setTemplate(e.target.value)}
						/>
					</div>
					<Button onClick={handleSave} disabled={isSaving} className="mt-2">
						{isSaving ? "保存中..." : "保存"}
					</Button>
				</section>

				<section className="mt-6">
					<h2 className="text-lg font-medium">プレイグラウンド</h2>
					<div className="mt-2 flex space-x-2">
						<Input
							placeholder="タイトルを入力"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
						/>
						<Button onClick={handleGenerate} disabled={!title || isGenerating}>
							{isGenerating ? "生成中..." : "生成"}
						</Button>
					</div>
					{title && (
						<div className="mt-4">
							<h3 className="font-medium">最終プロンプト</h3>
							<pre className="whitespace-pre-wrap bg-gray-100 p-2 rounded">
								{finalPrompt}
							</pre>
						</div>
					)}
					{preview && (
						<div className="mt-4">
							<h3 className="font-medium">生成結果</h3>
							<pre className="whitespace-pre-wrap bg-gray-100 p-2 rounded">
								{preview}
							</pre>
						</div>
					)}
				</section>
			</div>
		</div>
	);
}
