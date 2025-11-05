/**
 * Create Plugin Command
 *
 * Creates a new plugin from a template.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ scripts/plugins/cli.ts
 *
 * Dependencies:
 *   └─ fs/path utilities (Node.js built-in)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase4-development-tools.md
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import logger from "../../lib/logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEMPLATES_DIR = join(__dirname, "../../templates/plugins");
const PLUGINS_DIR = join(__dirname, "../../plugins/examples");

/**
 * Template types
 */
type TemplateType =
	| "hello-world"
	| "editor-extension"
	| "ai-extension"
	| "ui-extension"
	| "data-processor-extension"
	| "integration-extension";

/**
 * Plugin creation options
 */
interface PluginOptions {
	name: string;
	id: string;
	description: string;
	author: string;
	version: string;
	template: TemplateType;
	extensionPoints: {
		editor: boolean;
		ai: boolean;
		ui: boolean;
		dataProcessor: boolean;
		integration: boolean;
	};
}

/**
 * Generate plugin ID from name
 */
function generatePluginId(name: string): string {
	// Convert to kebab-case
	const kebab = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
	return `com.example.${kebab}`;
}

/**
 * Prompt for plugin information
 */
async function promptPluginInfo(
	name: string,
	template: TemplateType,
): Promise<PluginOptions> {
	const id = generatePluginId(name);
	const defaultDescription = `A F.A.L plugin: ${name}`;
	const defaultAuthor = "Your Name";
	const defaultVersion = "1.0.0";

	// For now, use defaults (can be enhanced with interactive prompts later)
	const description = defaultDescription;
	const author = defaultAuthor;
	const version = defaultVersion;

	// Set extension points based on template
	const extensionPoints = {
		editor: template === "editor-extension",
		ai: template === "ai-extension",
		ui: template === "ui-extension" || template === "hello-world",
		dataProcessor: template === "data-processor-extension",
		integration: template === "integration-extension",
	};

	return {
		name,
		id,
		description,
		author,
		version,
		template,
		extensionPoints,
	};
}

/**
 * Get template directory
 */
function getTemplateDir(template: TemplateType): string {
	return join(TEMPLATES_DIR, template);
}

/**
 * Copy template files
 */
function copyTemplateFiles(
	templateDir: string,
	targetDir: string,
	options: PluginOptions,
): void {
	// Create target directory
	if (!existsSync(targetDir)) {
		mkdirSync(targetDir, { recursive: true });
	}

	// Copy and process files
	const files = [
		"src/index.ts",
		"src/types.ts",
		"plugin.json",
		"package.json",
		"tsconfig.json",
		"README.md",
	];

	for (const file of files) {
		const templatePath = join(templateDir, file);
		const targetPath = join(targetDir, file);

		if (!existsSync(templatePath)) {
			// Skip if file doesn't exist in template
			continue;
		}

		// Create subdirectories if needed
		const targetFileDir = dirname(targetPath);
		if (!existsSync(targetFileDir)) {
			mkdirSync(targetFileDir, { recursive: true });
		}

		// Read template file
		let content = readFileSync(templatePath, "utf-8");

		// Replace placeholders
		content = content.replace(/\{\{PLUGIN_NAME\}\}/g, options.name);
		content = content.replace(/\{\{PLUGIN_ID\}\}/g, options.id);
		content = content.replace(
			/\{\{PLUGIN_DESCRIPTION\}\}/g,
			options.description,
		);
		content = content.replace(/\{\{PLUGIN_AUTHOR\}\}/g, options.author);
		content = content.replace(/\{\{PLUGIN_VERSION\}\}/g, options.version);

		// Write processed file
		writeFileSync(targetPath, content, "utf-8");
	}
}

/**
 * Create plugin from template
 */
export async function createPlugin(
	pluginName: string,
	args: string[] = [],
): Promise<void> {
	// Determine template
	const templateArg = args.find((arg) => arg.startsWith("--template="));
	const templateName = templateArg
		? templateArg.split("=")[1]
		: args.find((arg) => !arg.startsWith("--")) || "hello-world";

	const template = templateName as TemplateType;

	// Validate template
	const validTemplates: TemplateType[] = [
		"hello-world",
		"editor-extension",
		"ai-extension",
		"ui-extension",
		"data-processor-extension",
		"integration-extension",
	];

	if (!validTemplates.includes(template)) {
		logger.error({ template }, "Invalid template");
		logger.info(`Valid templates: ${validTemplates.join(", ")}`);
		process.exit(1);
	}

	// Get plugin options
	const options = await promptPluginInfo(pluginName, template);

	// Get template directory
	const templateDir = getTemplateDir(template);
	if (!existsSync(templateDir)) {
		logger.error({ templateDir }, "Template not found");
		logger.info("Available templates:");
		// List available templates
		process.exit(1);
	}

	// Determine target directory
	const pluginIdKebab = options.id.replace(/\./g, "-");
	const targetDir = join(PLUGINS_DIR, pluginIdKebab);

	// Check if plugin already exists
	if (existsSync(targetDir)) {
		logger.error({ targetDir }, "Plugin directory already exists");
		process.exit(1);
	}

	// Copy template files
	logger.info(
		{ pluginName: options.name, template },
		`Creating plugin "${options.name}" from template "${template}"...`,
	);
	copyTemplateFiles(templateDir, targetDir, options);

	logger.info({ targetDir }, "Plugin created successfully!");
	logger.info({ targetDir }, "Directory");
	logger.info("Next steps:");
	logger.info(`  1. cd ${targetDir}`);
	logger.info("  2. bun install");
	logger.info("  3. Edit src/index.ts to implement your plugin");
	logger.info("  4. bun run build");
	logger.info("  5. bun run test");
}
