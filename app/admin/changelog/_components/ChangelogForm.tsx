"use client";

import { useActionState, useEffect, useState } from "react"; // useFormState を削除し、useActionState を react からインポート
import { useFormStatus } from "react-dom"; // useFormState を削除
import {
	type ActionResponse,
	type Change,
	type ChangeLogEntry, // createChangelogEntry の戻り値の型として必要
	type CreateChangelogEntryInput,
	createChangelogEntry, // 新規作成時のみ使用
	type UpdateChangelogEntryInput,
	updateChangelogEntry, // 更新時に使用
} from "@/app/_actions/changelog";

const changeTypes: Change["type"][] = ["new", "improvement", "fix", "security"];
const changeTypeLabels: Record<Change["type"], string> = {
	new: "新機能",
	improvement: "改善",
	fix: "修正",
	security: "セキュリティ",
};

interface ClientChange extends Change {
	clientId: string; // フォームでの管理用ID
}

const initialState: ActionResponse<ChangeLogEntry> = {
	success: false,
	error: undefined,
	data: undefined,
};

interface SubmitButtonProps {
	isEditMode: boolean;
}

function SubmitButton({ isEditMode }: SubmitButtonProps) {
	const { pending } = useFormStatus();
	const text = isEditMode
		? pending
			? "更新中..."
			: "更新する"
		: pending
			? "作成中..."
			: "作成する";
	return (
		<button
			type="submit"
			disabled={pending}
			className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
		>
			{text}
		</button>
	);
}

interface ChangelogFormProps {
	initialData?: ChangeLogEntry;
	onSuccess?: () => void;
	onCancel?: () => void;
}

export function ChangelogForm({
	initialData,
	onSuccess,
	onCancel,
}: ChangelogFormProps) {
	const isEditMode = !!initialData;

	const [version, setVersion] = useState(initialData?.version || "");
	const [title, setTitle] = useState(initialData?.title || "");
	const [publishedAt, setPublishedAt] = useState(() => {
		if (initialData?.date) {
			return new Date(
				initialData.date.replace(/(\d+)年(\d+)月(\d+)日/, "$1-$2-$3"),
			)
				.toISOString()
				.split("T")[0];
		}
		return new Date().toISOString().split("T")[0];
	});
	const [changes, setChanges] = useState<ClientChange[]>(
		() =>
			initialData?.changes.map((change) => ({
				...change,
				clientId: crypto.randomUUID(),
			})) || [{ clientId: crypto.randomUUID(), type: "new", description: "" }],
	);

	// useFormState に渡すサーバーアクションをラップ
	const createChangelogEntryWithChanges = async (
		_prevState: ActionResponse<ChangeLogEntry>,
		formData: FormData,
	): Promise<ActionResponse<ChangeLogEntry>> => {
		// Ensure published_at is retrieved as string
		const publishedAtValue = formData.get("published_at");
		if (publishedAtValue === null) {
			throw new Error("公開日が取得できませんでした");
		}
		// Build input data for changelog entry
		const inputData: CreateChangelogEntryInput = {
			// id は CreateChangelogEntryInput にはない
			version: formData.get("version") as string,
			title: formData.get("title") as string | null,
			published_at: publishedAtValue.toString(),
			changes: changes.map(({ type, description }) => ({ type, description })),
		};
		if (isEditMode && initialData?.id) {
			const updateInput: UpdateChangelogEntryInput = {
				...inputData,
				entryId: initialData.id,
			};
			return updateChangelogEntry(updateInput);
		}
		return createChangelogEntry(inputData); // 新規作成
	};

	const [state, formAction] = useActionState(
		// useFormState を useActionState に変更
		createChangelogEntryWithChanges,
		initialState,
	);

	useEffect(() => {
		if (state.success) {
			if (!isEditMode) {
				// 新規作成時のみフォームリセット
				setVersion("");
				setTitle("");
				setPublishedAt(new Date().toISOString().split("T")[0]);
				setChanges([
					{ clientId: crypto.randomUUID(), type: "new", description: "" },
				]);
			}
			onSuccess?.(); // 親コンポーネントに成功を通知
		} else if (state.error) {
			// エラーメッセージはフォーム下部に表示されるので、alertは不要かもしれません
			alert(`エラー: ${state.error}`);
		}
	}, [state, onSuccess, isEditMode]);

	const handleAddChange = () => {
		setChanges([
			...changes,
			{ clientId: crypto.randomUUID(), type: "new", description: "" },
		]);
	};

	const handleRemoveChange = (clientId: string) => {
		setChanges(changes.filter((change) => change.clientId !== clientId));
	};

	const handleChangesChange = (
		clientId: string,
		field: keyof Omit<ClientChange, "clientId">,
		value: string,
	) => {
		setChanges(
			changes.map((change) =>
				change.clientId === clientId ? { ...change, [field]: value } : change,
			),
		);
	};

	return (
		<form action={formAction} className="space-y-6">
			<div>
				<label
					htmlFor="version"
					className="block text-sm font-medium leading-6 text-gray-900 dark:text-white"
				>
					バージョン (例: 1.0.0)
				</label>
				<input
					type="text"
					name="version"
					id="version"
					required
					value={version}
					onChange={(e) => setVersion(e.target.value)}
					className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2"
				/>
			</div>

			<div>
				<label
					htmlFor="title"
					className="block text-sm font-medium leading-6 text-gray-900 dark:text-white"
				>
					タイトル (任意)
				</label>
				<input
					type="text"
					name="title"
					id="title"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2"
				/>
			</div>

			<div>
				<label
					htmlFor="published_at"
					className="block text-sm font-medium leading-6 text-gray-900 dark:text-white"
				>
					公開日
				</label>
				<input
					type="date"
					name="published_at"
					id="published_at"
					required
					value={publishedAt}
					onChange={(e) => setPublishedAt(e.target.value)}
					className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2"
				/>
			</div>

			<fieldset className="space-y-4">
				<legend className="text-sm font-medium leading-6 text-gray-900 dark:text-white">
					変更点
				</legend>
				{changes.map((change, _index) => (
					<div
						key={change.clientId}
						className="p-4 border border-gray-200 dark:border-gray-700 rounded-md space-y-3"
					>
						<div className="grid grid-cols-1 gap-y-3 gap-x-4 sm:grid-cols-6">
							<div className="sm:col-span-2">
								<label
									htmlFor={`change-type-${change.clientId}`}
									className="block text-xs font-medium text-gray-700 dark:text-gray-300"
								>
									種類
								</label>
								<select
									id={`change-type-${change.clientId}`}
									name={`change-type-${change.clientId}`} // name属性はフォーム送信には直接使わないが、慣習的に
									value={change.type}
									onChange={(e) =>
										handleChangesChange(
											change.clientId,
											"type",
											e.target.value as Change["type"],
										)
									}
									className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2"
								>
									{changeTypes.map((type) => (
										<option key={type} value={type}>
											{changeTypeLabels[type]}
										</option>
									))}
								</select>
							</div>
							<div className="sm:col-span-4">
								<label
									htmlFor={`change-description-${change.clientId}`}
									className="block text-xs font-medium text-gray-700 dark:text-gray-300"
								>
									説明
								</label>
								<textarea
									id={`change-description-${change.clientId}`}
									name={`change-description-${change.clientId}`} // name属性はフォーム送信には直接使わない
									rows={2}
									required
									value={change.description}
									onChange={(e) =>
										handleChangesChange(
											change.clientId,
											"description",
											e.target.value,
										)
									}
									className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2"
								/>
							</div>
						</div>
						{changes.length > 1 && (
							<div className="text-right">
								<button
									type="button"
									onClick={() => handleRemoveChange(change.clientId)}
									className="text-sm font-medium text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
								>
									この変更点を削除
								</button>
							</div>
						)}
					</div>
				))}
				<div>
					<button
						type="button"
						onClick={handleAddChange}
						className="rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-200 dark:hover:bg-gray-600"
					>
						変更点を追加
					</button>
				</div>
			</fieldset>

			{state.error && (
				<p className="text-sm text-red-600 dark:text-red-400" role="alert">
					エラー: {state.error}
				</p>
			)}

			<div className="flex justify-end space-x-3">
				<button
					type="button"
					onClick={() => {
						onCancel?.(); // 親コンポーネントにキャンセルを通知
					}}
					className="rounded-md bg-white dark:bg-gray-600 px-3.5 py-2.5 text-sm font-semibold text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500"
				>
					キャンセル
				</button>
				<SubmitButton isEditMode={isEditMode} />
			</div>
		</form>
	);
}
