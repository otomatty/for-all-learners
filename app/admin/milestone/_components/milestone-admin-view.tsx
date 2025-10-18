"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import {
	createMilestone,
	deleteMilestone,
	type MilestoneInsert,
	type MilestoneUpdate,
	updateMilestone,
} from "@/app/_actions/milestone";
import type { MilestoneEntry } from "@/app/(public)/milestones/_components/milestone-timeline";

const initialFormData: MilestoneInsert = {
	milestone_id: "",
	title: "",
	timeframe: "",
	description: "",
	status: "planning",
	progress: null,
	image_url: null,
	features: null,
	related_links: null,
	sort_order: 0,
};

interface MilestoneAdminViewProps {
	initialMilestones: MilestoneEntry[];
}

export default function MilestoneAdminView({
	initialMilestones,
}: MilestoneAdminViewProps) {
	const router = useRouter();
	const [milestones, setMilestones] =
		useState<MilestoneEntry[]>(initialMilestones);
	const [isLoading, setIsLoading] = useState(false); // 初期ロードはサーバーで行うためfalseに
	const [error, setError] = useState<string | null>(null);

	const [isFormOpen, setIsFormOpen] = useState(false);
	const [editingMilestone, setEditingMilestone] =
		useState<MilestoneEntry | null>(null);
	const [formData, setFormData] = useState<MilestoneInsert | MilestoneUpdate>(
		initialFormData,
	);

	// initialMilestonesが変更された場合（例：ページ遷移なしでのデータ更新後など）、ローカルステートも更新
	useEffect(() => {
		setMilestones(initialMilestones);
	}, [initialMilestones]);

	const handleInputChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>,
	) => {
		const { name, value } = e.target;
		let processedValue: string | number | string[] | object | null = value;

		if (name === "progress") {
			processedValue = value === "" ? null : Number(value);
		} else if (name === "sort_order") {
			processedValue = Number(value);
		} else if (name === "features") {
			processedValue = value
				.split(",")
				.map((s) => s.trim())
				.filter((s) => s.length > 0);
			if ((processedValue as string[]).length === 0) processedValue = null;
		} else if (name === "related_links") {
			try {
				processedValue = value ? JSON.parse(value) : null;
			} catch {
				console.warn("Related links JSON is invalid");
				// エラー時は元の値を維持するか、エラー表示する
				return; // 不正なJSONの場合は更新しない
			}
		}

		setFormData((prev) => ({ ...prev, [name]: processedValue }));
	};

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError(null);

		try {
			if (editingMilestone) {
				const result = await updateMilestone(
					editingMilestone.id,
					formData as MilestoneUpdate,
				);
				if (!result) throw new Error("Update failed");
			} else {
				const result = await createMilestone(formData as MilestoneInsert);
				if (!result) throw new Error("Create failed");
			}
			// revalidatePathがサーバーアクション内で行われるため、router.refresh()でUIを更新
			router.refresh();
			closeForm();
		} catch (err: any) {
			setError(
				editingMilestone
					? `マイルストーンの更新に失敗しました: ${err.message}`
					: `マイルストーンの作成に失敗しました: ${err.message}`,
			);
			console.error(err);
		} finally {
			setIsLoading(false);
		}
	};

	const handleEdit = (milestone: MilestoneEntry) => {
		setEditingMilestone(milestone);
		setFormData({
			title: milestone.title,
			timeframe: milestone.timeframe,
			description: milestone.description,
			status: milestone.status,
			progress: milestone.progress ?? null,
			image_url: milestone.imageUrl ?? null,
			features: milestone.features ?? null,
			related_links: milestone.relatedLinks ?? null,
			sort_order: milestone.sort_order, // MilestoneEntryから直接取得
		});
		setIsFormOpen(true);
	};

	const handleDelete = async (id: string) => {
		if (!confirm("本当にこのマイルストーンを削除しますか？")) return;
		setIsLoading(true);
		setError(null);
		try {
			const result = await deleteMilestone(id);
			if (!result.success) throw new Error(result.error || "Delete failed");
			router.refresh(); // UIを更新
		} catch (err: any) {
			setError(`マイルストーンの削除に失敗しました: ${err.message}`);
			console.error(err);
		} finally {
			setIsLoading(false);
		}
	};

	const openForm = () => {
		setEditingMilestone(null);
		setFormData(initialFormData);
		setIsFormOpen(true);
	};

	const closeForm = () => {
		setIsFormOpen(false);
		setEditingMilestone(null);
	};

	return (
		<div style={{ padding: "20px" }}>
			<button type="button" onClick={openForm} style={{ marginBottom: "20px" }}>
				新規マイルストーン作成
			</button>

			{error && <p style={{ color: "red" }}>エラー: {error}</p>}

			{isFormOpen && (
				<div
					style={{
						border: "1px solid #ccc",
						padding: "20px",
						marginBottom: "20px",
					}}
				>
					<h2>
						{editingMilestone ? "マイルストーン編集" : "新規マイルストーン作成"}
					</h2>
					<form onSubmit={handleSubmit}>
						{/* フォームフィールドは変更なし、valueのfeaturesとrelated_linksの表示を調整 */}
						<div>
							<label>
								タイトル:{" "}
								<input
									type="text"
									name="title"
									value={formData.title || ""}
									onChange={handleInputChange}
									required
								/>
							</label>
						</div>
						<div>
							<label>
								期間:{" "}
								<input
									type="text"
									name="timeframe"
									value={formData.timeframe || ""}
									onChange={handleInputChange}
									required
								/>
							</label>
						</div>
						<div>
							<label>
								説明:{" "}
								<textarea
									name="description"
									value={formData.description || ""}
									onChange={handleInputChange}
								/>
							</label>
						</div>
						<div>
							<label>
								ステータス:
								<select
									name="status"
									value={formData.status}
									onChange={handleInputChange}
								>
									<option value="planning">計画中</option>
									<option value="in-progress">進行中</option>
									<option value="launched">ローンチ済</option>
									<option value="on-hold">保留中</option>
									<option value="completed">完了</option>
								</select>
							</label>
						</div>
						<div>
							<label>
								進捗 (%):{" "}
								<input
									type="number"
									name="progress"
									value={formData.progress ?? ""}
									onChange={handleInputChange}
									min="0"
									max="100"
								/>
							</label>
						</div>
						<div>
							<label>
								画像URL:{" "}
								<input
									type="url"
									name="image_url"
									value={formData.image_url || ""}
									onChange={handleInputChange}
								/>
							</label>
						</div>
						<div>
							<label>
								機能 (カンマ区切り):{" "}
								<input
									type="text"
									name="features"
									value={
										(formData.features as string[] | null)?.join(",") || ""
									}
									onChange={handleInputChange}
								/>
							</label>
						</div>
						<div>
							<label>
								関連リンク (JSON形式):{" "}
								<textarea
									name="related_links"
									placeholder='[{"label": "例", "url": "https://example.com"}]'
									value={
										formData.related_links
											? JSON.stringify(formData.related_links, null, 2)
											: ""
									}
									onChange={handleInputChange}
								/>
							</label>
						</div>
						<div>
							<label>
								表示順:{" "}
								<input
									type="number"
									name="sort_order"
									value={formData.sort_order || 0}
									onChange={handleInputChange}
								/>
							</label>
						</div>

						<button
							type="submit"
							disabled={isLoading}
							style={{ marginRight: "10px" }}
						>
							{isLoading ? "処理中..." : editingMilestone ? "更新" : "作成"}
						</button>
						<button type="button" onClick={closeForm} disabled={isLoading}>
							キャンセル
						</button>
					</form>
				</div>
			)}

			<h2>マイルストーン一覧</h2>
			{milestones.length === 0 && !isLoading ? (
				<p>マイルストーンはありません。</p>
			) : (
				<ul style={{ listStyle: "none", padding: 0 }}>
					{milestones.map((milestone) => (
						<li
							key={milestone.id}
							style={{
								border: "1px solid #eee",
								padding: "10px",
								marginBottom: "10px",
							}}
						>
							<h3>
								{milestone.title} ({milestone.timeframe}) - (順序:{" "}
								{milestone.sort_order})
							</h3>
							<p>ステータス: {milestone.status}</p>
							{milestone.description && <p>{milestone.description}</p>}
							<button
								type="button"
								onClick={() => handleEdit(milestone)}
								style={{ marginRight: "10px" }}
								disabled={isLoading}
							>
								編集
							</button>
							<button
								type="button"
								onClick={() => handleDelete(milestone.id)}
								disabled={isLoading}
							>
								削除
							</button>
						</li>
					))}
				</ul>
			)}
			{isLoading && <p>処理中...</p>}
		</div>
	);
}
