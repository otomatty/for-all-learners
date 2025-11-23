"use client";

/**
 * Plugin Settings Form Component
 *
 * Dynamically generates a form from JSON Schema for plugin configuration.
 * Supports string, number, boolean, and enum input types.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ app/(protected)/settings/plugins/_components/InstalledPluginCard.tsx
 *
 * Dependencies:
 *   ├─ react-hook-form
 *   ├─ components/ui/form.tsx
 *   ├─ components/ui/input.tsx
 *   ├─ components/ui/select.tsx
 *   ├─ components/ui/switch.tsx
 *   ├─ components/ui/textarea.tsx
 *   ├─ app/_actions/plugin-storage.ts
 *   └─ types/plugin.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/implementation-status.md
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
	useGetAllPluginStorage,
	usePlugin,
	useSetPluginStorage,
} from "@/hooks/plugins";
import { useLoadPlugin } from "@/lib/hooks/use-load-plugin";
import logger from "@/lib/logger";
import { PluginLoader } from "@/lib/plugins/plugin-loader/plugin-loader";
import { getPluginRegistry } from "@/lib/plugins/plugin-registry";
import type { JSONSchema } from "@/types/plugin";
import { GitHubRepoSelector } from "./custom-widgets/GitHubRepoSelector";
import { GitHubUserSelector } from "./custom-widgets/GitHubUserSelector";
import { PasswordInput } from "./custom-widgets/PasswordInput";

interface PluginSettingsFormProps {
	pluginId: string;
	pluginName: string;
	configSchema?: JSONSchema;
	defaultConfig?: Record<string, unknown>;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

/**
 * Convert JSON Schema to Zod schema
 */
function jsonSchemaToZod(schema: JSONSchema): z.ZodTypeAny {
	if (schema.type === "string") {
		if (schema.enum && schema.enum.length > 0) {
			// Enum type
			const enumValues = schema.enum.filter(
				(v): v is string => typeof v === "string",
			);
			if (enumValues.length > 0) {
				return z.enum(enumValues as [string, ...string[]]);
			}
		}

		return z.string();
	}

	if (schema.type === "number") {
		return z.number();
	}

	if (schema.type === "boolean") {
		return z.boolean();
	}

	if (schema.type === "object" && schema.properties) {
		const shape: Record<string, z.ZodTypeAny> = {};

		for (const [key, propSchema] of Object.entries(schema.properties)) {
			const isRequired = schema.required?.includes(key) ?? false;
			const zodProp = jsonSchemaToZod(propSchema);

			if (isRequired) {
				shape[key] = zodProp;
			} else {
				shape[key] = zodProp.optional();
			}
		}

		return z.object(shape);
	}

	return z.record(z.string(), z.unknown());
}

/**
 * Render form field based on JSON Schema type
 *
 * Supports custom widgets via `ui:widget` property:
 * - "githubUserSelector": GitHubユーザー選択
 * - "githubRepoSelector": GitHubリポジトリ選択（複数選択）
 * - "password": パスワード入力
 */
function renderFormField(
	schema: JSONSchema,
	name: string,
	control: Parameters<typeof FormField>[0]["control"],
	defaultValue: unknown,
	_pluginId: string,
	githubToken: string | undefined,
	onReposFetched?: (repos: Array<{ full_name: string; name: string }>) => void,
	availableRepos?: Array<{ full_name: string; name: string }>,
) {
	const fieldName = name.split(".").slice(1).join(".") || name;
	const customWidget = schema["ui:widget"];

	// Handle custom widgets
	if (customWidget === "githubUserSelector") {
		return (
			<FormField
				key={name}
				control={control}
				name={fieldName}
				render={({ field }) => (
					<FormItem>
						<FormControl>
							<GitHubUserSelector
								value={String(field.value ?? defaultValue ?? "")}
								onChange={field.onChange}
								onReposFetched={onReposFetched}
								githubToken={githubToken}
							/>
						</FormControl>
						{schema.description && (
							<FormDescription>{schema.description}</FormDescription>
						)}
						<FormMessage />
					</FormItem>
				)}
			/>
		);
	}

	if (customWidget === "githubRepoSelector") {
		// For array type, store as JSON string in storage
		const selectedRepos = Array.isArray(defaultValue)
			? (defaultValue as string[])
			: typeof defaultValue === "string" && defaultValue.trim()
				? (JSON.parse(defaultValue) as string[])
				: [];

		return (
			<FormField
				key={name}
				control={control}
				name={fieldName}
				render={({ field }) => {
					const currentValue = field.value;
					const repos = Array.isArray(currentValue)
						? (currentValue as string[])
						: typeof currentValue === "string" && currentValue.trim()
							? (JSON.parse(currentValue) as string[])
							: selectedRepos;

					return (
						<FormItem>
							<FormControl>
								<GitHubRepoSelector
									repos={availableRepos || []}
									selectedRepos={repos}
									onChange={(newRepos) => {
										// Store as JSON string for compatibility
										field.onChange(JSON.stringify(newRepos));
									}}
								/>
							</FormControl>
							{schema.description && (
								<FormDescription>{schema.description}</FormDescription>
							)}
							<FormMessage />
						</FormItem>
					);
				}}
			/>
		);
	}

	if (customWidget === "password") {
		// Check if this is a GitHub token field
		const isGitHubToken =
			fieldName.toLowerCase().includes("github") &&
			(fieldName.toLowerCase().includes("token") ||
				fieldName.toLowerCase().includes("oauth"));

		return (
			<FormField
				key={name}
				control={control}
				name={fieldName}
				render={({ field }) => (
					<FormItem>
						<FormControl>
							<PasswordInput
								value={String(field.value ?? defaultValue ?? "")}
								onChange={field.onChange}
								label={fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
								description={schema.description}
								placeholder={schema.description}
								showGitHubHelp={isGitHubToken}
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
		);
	}

	if (schema.type === "boolean") {
		return (
			<FormField
				key={name}
				control={control}
				name={fieldName}
				render={({ field }) => (
					<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
						<div className="space-y-0.5">
							<FormLabel className="text-base">
								{fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
							</FormLabel>
							{schema.description && (
								<FormDescription>{schema.description}</FormDescription>
							)}
						</div>
						<FormControl>
							<Switch
								checked={field.value ?? (defaultValue as boolean) ?? false}
								onCheckedChange={field.onChange}
							/>
						</FormControl>
					</FormItem>
				)}
			/>
		);
	}

	if (schema.type === "string" && schema.enum && schema.enum.length > 0) {
		// Enum/Select type
		return (
			<FormField
				key={name}
				control={control}
				name={fieldName}
				render={({ field }) => (
					<FormItem>
						<FormLabel>
							{fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
						</FormLabel>
						<Select
							onValueChange={field.onChange}
							defaultValue={String(field.value ?? defaultValue ?? "")}
						>
							<FormControl>
								<SelectTrigger>
									<SelectValue placeholder="選択してください" />
								</SelectTrigger>
							</FormControl>
							<SelectContent>
								{schema.enum?.map((value) => (
									<SelectItem key={String(value)} value={String(value)}>
										{String(value)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{schema.description && (
							<FormDescription>{schema.description}</FormDescription>
						)}
						<FormMessage />
					</FormItem>
				)}
			/>
		);
	}

	if (schema.type === "string") {
		// String input (multiline if description suggests it)
		const isMultiline =
			schema.description?.toLowerCase().includes("複数行") ||
			schema.description?.toLowerCase().includes("multiline");

		return (
			<FormField
				key={name}
				control={control}
				name={fieldName}
				render={({ field }) => (
					<FormItem>
						<FormLabel>
							{fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
						</FormLabel>
						<FormControl>
							{isMultiline ? (
								<Textarea
									{...field}
									value={String(field.value ?? defaultValue ?? "")}
									placeholder={schema.description}
								/>
							) : (
								<Input
									{...field}
									value={String(field.value ?? defaultValue ?? "")}
									placeholder={schema.description}
								/>
							)}
						</FormControl>
						{schema.description && (
							<FormDescription>{schema.description}</FormDescription>
						)}
						<FormMessage />
					</FormItem>
				)}
			/>
		);
	}

	if (schema.type === "number") {
		return (
			<FormField
				key={name}
				control={control}
				name={fieldName}
				render={({ field }) => (
					<FormItem>
						<FormLabel>
							{fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
						</FormLabel>
						<FormControl>
							<Input
								{...field}
								type="number"
								value={field.value ?? defaultValue ?? ""}
								onChange={(e) => {
									const value = e.target.value;
									field.onChange(value === "" ? undefined : Number(value));
								}}
								placeholder={schema.description}
							/>
						</FormControl>
						{schema.description && (
							<FormDescription>{schema.description}</FormDescription>
						)}
						<FormMessage />
					</FormItem>
				)}
			/>
		);
	}

	return null;
}

export function PluginSettingsForm({
	pluginId,
	pluginName,
	configSchema,
	defaultConfig,
	open,
	onOpenChange,
}: PluginSettingsFormProps) {
	const [isLoading, setIsLoading] = useState(false);
	const [_savedConfig, setSavedConfig] = useState<Record<string, unknown>>({});
	const [githubToken, setGithubToken] = useState<string | undefined>(undefined);
	const [availableRepos, setAvailableRepos] = useState<
		Array<{ full_name: string; name: string }>
	>([]);
	const { loadPlugin } = useLoadPlugin();
	const { data: pluginMetadata } = usePlugin(pluginId);
	const { data: savedStorage, isLoading: isLoadingStorage } =
		useGetAllPluginStorage(pluginId);
	const setPluginStorageMutation = useSetPluginStorage();

	// Generate Zod schema from JSON Schema
	const zodSchema = configSchema ? jsonSchemaToZod(configSchema) : z.object({});

	type FormValues = Record<string, unknown>;

	const form = useForm<FormValues>({
		resolver: zodResolver(
			zodSchema as z.ZodObject<Record<string, z.ZodTypeAny>>,
		),
		defaultValues: (defaultConfig || {}) as FormValues,
	});

	// Load saved configuration
	useEffect(() => {
		if (open && configSchema && savedStorage) {
			const config = savedStorage;
			setSavedConfig(config);

			// Get GitHub token if exists
			const token = config.github_oauth_token as string | undefined;
			setGithubToken(token);

			// Parse repo list if exists
			if (config.selectedRepos) {
				const repos =
					typeof config.selectedRepos === "string"
						? JSON.parse(config.selectedRepos)
						: config.selectedRepos;
				if (Array.isArray(repos) && repos.length > 0) {
					// Repos are stored as full_name strings, we need to reconstruct
					// For now, we'll rely on user to re-fetch repos
					setAvailableRepos([]);
				}
			}

			// Merge saved config with defaults
			const mergedConfig = {
				...(defaultConfig || {}),
				...config,
			};
			form.reset(mergedConfig as FormValues);
		}
	}, [open, configSchema, defaultConfig, form, savedStorage]);

	const handleReposFetched = (
		repos: Array<{ full_name: string; name: string }>,
	) => {
		setAvailableRepos(repos);
		toast.success(`${repos.length}個のリポジトリを取得しました`);
	};

	const handleSubmit = async (values: FormValues) => {
		setIsLoading(true);
		try {
			// Save each field to plugin storage
			const valuesObj = values as Record<string, unknown>;
			for (const [key, value] of Object.entries(valuesObj)) {
				await setPluginStorageMutation.mutateAsync({
					pluginId,
					key,
					value,
				});
			}

			// Reload plugin with new configuration
			try {
				// Check if plugin is currently loaded
				const registry = getPluginRegistry();
				const loadedPlugin = registry.get(pluginId);

				if (loadedPlugin) {
					// Unload existing plugin first
					const loader = PluginLoader.getInstance();
					try {
						await loader.unloadPlugin(pluginId);
					} catch (_unloadError) {
						// Continue even if unload fails
					}
				}

				// Load plugin with new configuration
				if (pluginMetadata) {
					const result = await loadPlugin(pluginMetadata);
					if (result.success) {
						toast.success("設定を保存し、プラグインを再読み込みしました");
					} else {
						toast.warning(
							"設定を保存しましたが、プラグインの再読み込みに失敗しました: " +
								(result.error || "不明なエラー"),
						);
					}
				} else {
					toast.success("設定を保存しました");
				}
			} catch (reloadError) {
				logger.error(
					{ error: reloadError, pluginId },
					"Failed to reload plugin after saving settings",
				);
				// If reload fails, still show success for config save
				toast.warning(
					"設定を保存しましたが、プラグインの再読み込みに失敗しました。ページをリロードしてください。",
				);
			}

			setSavedConfig(valuesObj);
			onOpenChange(false);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "設定の保存に失敗しました",
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleReset = () => {
		form.reset((defaultConfig || {}) as FormValues);
		toast.info("デフォルト値にリセットしました");
	};

	if (
		!configSchema ||
		configSchema.type !== "object" ||
		!configSchema.properties
	) {
		return (
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>プラグイン設定</DialogTitle>
						<DialogDescription>
							{pluginName}の設定はありません
						</DialogDescription>
					</DialogHeader>
				</DialogContent>
			</Dialog>
		);
	}

	const isFormLoading =
		isLoading || isLoadingStorage || setPluginStorageMutation.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Settings className="h-5 w-5" />
						プラグイン設定: {pluginName}
					</DialogTitle>
					<DialogDescription>
						プラグインの動作をカスタマイズできます
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(handleSubmit)}
						className="space-y-6"
					>
						<div className="space-y-4">
							{Object.entries(configSchema.properties).map(
								([key, propSchema]) => {
									const defaultValue =
										defaultConfig?.[key] ?? propSchema.default;
									return renderFormField(
										propSchema,
										key,
										form.control,
										defaultValue,
										pluginId,
										githubToken,
										handleReposFetched,
										availableRepos,
									);
								},
							)}
						</div>

						<DialogFooter className="flex justify-between">
							<Button
								type="button"
								variant="outline"
								onClick={handleReset}
								disabled={isFormLoading}
							>
								デフォルトにリセット
							</Button>
							<div className="flex gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => onOpenChange(false)}
									disabled={isFormLoading}
								>
									キャンセル
								</Button>
								<Button type="submit" disabled={isFormLoading}>
									{isFormLoading ? "保存中..." : "保存"}
								</Button>
							</div>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
