/**
 * GitHub Repository Selector Widget
 *
 * Custom widget for selecting multiple GitHub repositories.
 * This widget displays a list of repositories fetched from GitHub API.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ app/(protected)/settings/plugins/_components/PluginSettingsForm.tsx
 *
 * Dependencies:
 *   ├─ components/ui/checkbox.tsx
 *   └─ components/ui/label.tsx
 *
 * Related Documentation:
 *   └─ Issue: docs/01_issues/open/2025_11/20251106_01_github-commit-stats-plugin-enhancement.md
 */

"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

interface GitHubRepo {
	full_name: string;
	name: string;
}

interface GitHubRepoSelectorProps {
	repos: Array<GitHubRepo>;
	selectedRepos: string[];
	onChange: (selectedRepos: string[]) => void;
	disabled?: boolean;
}

/**
 * GitHub Repository Selector Widget
 *
 * Displays a list of GitHub repositories with checkboxes for multi-select.
 */
export function GitHubRepoSelector({
	repos,
	selectedRepos = [],
	onChange,
	disabled = false,
}: GitHubRepoSelectorProps) {
	const handleToggle = (repoFullName: string) => {
		if (disabled) return;

		const isSelected = selectedRepos.includes(repoFullName);
		if (isSelected) {
			onChange(selectedRepos.filter((name) => name !== repoFullName));
		} else {
			onChange([...selectedRepos, repoFullName]);
		}
	};

	const handleSelectAll = () => {
		if (disabled) return;
		if (selectedRepos.length === repos.length) {
			onChange([]);
		} else {
			onChange(repos.map((repo) => repo.full_name));
		}
	};

	if (repos.length === 0) {
		return (
			<div className="space-y-2">
				<Label>監視するリポジトリ</Label>
				<p className="text-sm text-muted-foreground">
					リポジトリを取得するには、まずGitHubユーザー名を入力して「リポジトリを取得」をクリックしてください。
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<Label>監視するリポジトリ</Label>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={handleSelectAll}
					disabled={disabled}
					className="h-auto py-1 px-2 text-xs"
				>
					{selectedRepos.length === repos.length ? "すべて解除" : "すべて選択"}
				</Button>
			</div>
			<ScrollArea className="h-48 rounded-md border p-4">
				<div className="space-y-2">
					{repos.map((repo) => {
						const isSelected = selectedRepos.includes(repo.full_name);
						return (
							<div
								key={repo.full_name}
								className="flex items-center space-x-2 rounded-md p-2 hover:bg-accent"
							>
								<Checkbox
									id={`repo-${repo.full_name}`}
									checked={isSelected}
									onCheckedChange={() => handleToggle(repo.full_name)}
									disabled={disabled}
								/>
								<Label
									htmlFor={`repo-${repo.full_name}`}
									className="flex-1 cursor-pointer text-sm font-normal"
								>
									{repo.full_name}
								</Label>
							</div>
						);
					})}
				</div>
			</ScrollArea>
			{selectedRepos.length > 0 && (
				<p className="text-sm text-muted-foreground">
					{selectedRepos.length}個のリポジトリが選択されています
				</p>
			)}
		</div>
	);
}
