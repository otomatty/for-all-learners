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
import {
	getAllPluginStorage,
	setPluginStorage,
} from "@/app/_actions/plugin-storage";
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
import type { JSONSchema } from "@/types/plugin";

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
 */
function renderFormField(
	schema: JSONSchema,
	name: string,
	control: Parameters<typeof FormField>[0]["control"],
	defaultValue: unknown,
) {
	const fieldName = name.split(".").slice(1).join(".") || name;

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
		if (open && configSchema) {
			setIsLoading(true);
			getAllPluginStorage(pluginId)
				.then((config) => {
					setSavedConfig(config);
					// Merge saved config with defaults
					const mergedConfig = {
						...(defaultConfig || {}),
						...config,
					};
					form.reset(mergedConfig as FormValues);
				})
				.catch(() => {
					toast.error("設定の読み込みに失敗しました");
				})
				.finally(() => {
					setIsLoading(false);
				});
		}
	}, [open, pluginId, configSchema, defaultConfig, form]);

	const handleSubmit = async (values: FormValues) => {
		setIsLoading(true);
		try {
			// Save each field to plugin storage
			const valuesObj = values as Record<string, unknown>;
			for (const [key, value] of Object.entries(valuesObj)) {
				await setPluginStorage(pluginId, key, value);
			}

			toast.success("設定を保存しました");
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
									);
								},
							)}
						</div>

						<DialogFooter className="flex justify-between">
							<Button
								type="button"
								variant="outline"
								onClick={handleReset}
								disabled={isLoading}
							>
								デフォルトにリセット
							</Button>
							<div className="flex gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => onOpenChange(false)}
									disabled={isLoading}
								>
									キャンセル
								</Button>
								<Button type="submit" disabled={isLoading}>
									{isLoading ? "保存中..." : "保存"}
								</Button>
							</div>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
