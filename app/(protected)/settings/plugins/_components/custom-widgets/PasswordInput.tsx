/**
 * Password Input Widget
 *
 * Custom widget for password input fields with show/hide toggle.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ app/(protected)/settings/plugins/_components/PluginSettingsForm.tsx
 *
 * Dependencies:
 *   ├─ components/ui/input.tsx
 *   └─ components/ui/button.tsx
 *
 * Related Documentation:
 *   └─ Issue: docs/01_issues/open/2025_11/20251106_01_github-commit-stats-plugin-enhancement.md
 */

"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GitHubTokenHelp } from "./GitHubTokenHelp";

interface PasswordInputProps {
	value?: string;
	onChange: (value: string) => void;
	label?: string;
	description?: string;
	placeholder?: string;
	disabled?: boolean;
	/**
	 * Show GitHub token help if this is a GitHub token field
	 */
	showGitHubHelp?: boolean;
}

/**
 * Password Input Widget
 *
 * Provides a password input field with show/hide toggle functionality.
 */
export function PasswordInput({
	value = "",
	onChange,
	label,
	description,
	placeholder,
	disabled = false,
	showGitHubHelp = false,
}: PasswordInputProps) {
	const [showPassword, setShowPassword] = useState(false);

	return (
		<div className="space-y-3">
			<div className="space-y-2">
				{label && <Label>{label}</Label>}
				<div className="relative">
					<Input
						type={showPassword ? "text" : "password"}
						value={value}
						onChange={(e) => onChange(e.target.value)}
						placeholder={placeholder}
						disabled={disabled}
						className="pr-10"
					/>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
						onClick={() => setShowPassword(!showPassword)}
						disabled={disabled}
						aria-label={
							showPassword ? "パスワードを非表示" : "パスワードを表示"
						}
					>
						{showPassword ? (
							<EyeOff className="h-4 w-4" />
						) : (
							<Eye className="h-4 w-4" />
						)}
					</Button>
				</div>
				{description && (
					<p className="text-sm text-muted-foreground">{description}</p>
				)}
			</div>
			{showGitHubHelp && <GitHubTokenHelp />}
		</div>
	);
}
