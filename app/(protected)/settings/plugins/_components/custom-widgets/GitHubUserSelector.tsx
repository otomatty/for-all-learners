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
import logger from "@/lib/logger";

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
			// Fetch user's repositories from GitHub API
			const response = await fetch(
				`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`,
				{
					headers: {
						Accept: "application/vnd.github.v3+json",
						Authorization: `Bearer ${githubToken}`,
					},
				},
			);

			if (!response.ok) {
				if (response.status === 404) {
					throw new Error(`ユーザー "${username}" が見つかりません`);
				} else if (response.status === 401) {
					throw new Error("GitHub認証トークンが無効です");
				}
				throw new Error(`GitHub API エラー: ${response.statusText}`);
			}

			const repos = await response.json();

			if (!Array.isArray(repos)) {
				throw new Error("予期しないレスポンス形式");
			}

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

			logger.info(
				{ username, repoCount: repoList.length },
				"GitHub repositories fetched successfully",
			);
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "リポジトリの取得に失敗しました";
			setError(errorMessage);
			logger.error(
				{ error: err, username },
				"Failed to fetch GitHub repositories",
			);
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
