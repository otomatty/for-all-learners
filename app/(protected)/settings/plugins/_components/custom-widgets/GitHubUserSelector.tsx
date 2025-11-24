/**
 * GitHub User Selector Widget
 *
 * Custom widget for selecting a GitHub user and fetching their repositories.
 * This widget fetches repositories when a user is selected.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ app/(protected)/settings/plugins/_components/PluginSettingsForm.tsx
 *
 * Dependencies:
 *   ├─ components/ui/input.tsx
 *   ├─ components/ui/button.tsx
 *   └─ app/_actions/plugin-storage.ts (for storing GitHub token)
 *
 * Related Documentation:
 *   └─ Issue: docs/01_issues/open/2025_11/20251106_01_github-commit-stats-plugin-enhancement.md
 */

"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface GitHubUserSelectorProps {
	value?: string;
	onChange: (value: string) => void;
	onReposFetched?: (repos: Array<{ full_name: string; name: string }>) => void;
	githubToken?: string;
	disabled?: boolean;
}

/**
 * GitHub User Selector Widget
 *
 * Allows users to enter a GitHub username and fetch their repositories.
 */
export function GitHubUserSelector({
	value = "",
	onChange,
	onReposFetched,
	githubToken,
	disabled = false,
}: GitHubUserSelectorProps) {
	const [username, setUsername] = useState(value);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Sync external value changes
	useEffect(() => {
		setUsername(value);
	}, [value]);

	const handleFetchRepos = async () => {
		if (!username.trim()) {
			setError("ユーザー名を入力してください");
			return;
		}

		if (!githubToken) {
			setError("GitHub認証トークンが設定されていません");
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			// Use Next.js API route to avoid CORS issues
			const apiUrl = `/api/github/repos?username=${encodeURIComponent(username)}&token=${encodeURIComponent(githubToken)}`;

			const response = await fetch(apiUrl, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				const errorMessage =
					errorData.error || `エラーが発生しました (${response.status})`;
				throw new Error(errorMessage);
			}

			const data = await response.json();

			if (!data.repos || !Array.isArray(data.repos)) {
				throw new Error("予期しないレスポンス形式");
			}

			const repos = data.repos;

			// Transform to simpler format
			const repoList = repos.map(
				(repo: { full_name: string; name: string }) => ({
					full_name: repo.full_name,
					name: repo.name,
				}),
			);

			// Notify parent component
			if (onReposFetched) {
				onReposFetched(repoList);
			}

			// Update value
			onChange(username.trim());
		} catch (err) {
			let errorMessage = "リポジトリの取得に失敗しました";

			if (err instanceof Error) {
				errorMessage = err.message;
			} else if (typeof err === "string") {
				errorMessage = err;
			}

			setError(errorMessage);
		} finally {
			setIsLoading(false);
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && !isLoading) {
			handleFetchRepos();
		}
	};

	return (
		<div className="space-y-2">
			<Label htmlFor="github-username">GitHubユーザー名</Label>
			<div className="flex gap-2">
				<Input
					id="github-username"
					type="text"
					value={username}
					onChange={(e) => {
						setUsername(e.target.value);
						setError(null);
					}}
					onKeyPress={handleKeyPress}
					placeholder="例: octocat"
					disabled={disabled || isLoading}
					className="flex-1"
				/>
				<Button
					type="button"
					onClick={handleFetchRepos}
					disabled={disabled || isLoading || !username.trim()}
				>
					{isLoading ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							取得中...
						</>
					) : (
						"リポジトリを取得"
					)}
				</Button>
			</div>
			{error && (
				<p className="text-sm text-destructive" role="alert">
					{error}
				</p>
			)}
			{value && !error && (
				<p className="text-sm text-muted-foreground">
					選択中のユーザー: <strong>{value}</strong>
				</p>
			)}
		</div>
	);
}
