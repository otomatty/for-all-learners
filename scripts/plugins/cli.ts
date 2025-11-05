#!/usr/bin/env bun

/**
 * F.A.L Plugin Development CLI
 *
 * CLI tool for creating, building, testing, and developing plugins.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ package.json (scripts)
 *
 * Dependencies:
 *   ├─ scripts/plugins/create-plugin.ts
 *   ├─ scripts/plugins/build-plugin.ts
 *   ├─ scripts/plugins/test-plugin.ts
 *   └─ scripts/plugins/dev-plugin.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase4-development-tools.md
 */

import logger from "../../lib/logger";
import { buildPlugin } from "./build-plugin";
import { createPlugin } from "./create-plugin";
import { devPlugin } from "./dev-plugin";
import { testPlugin } from "./test-plugin";

// Helper functions for CLI output (logger wrapper for user-facing messages)
function cliLog(message: string): void {
	logger.info(message);
}

function cliError(message: string): void {
	logger.error(message);
}

export async function main(
	commandOverride?: string,
	argsOverride?: string[],
): Promise<void> {
	const command = commandOverride ?? process.argv[2];
	const args = argsOverride ?? process.argv.slice(3);

	switch (command) {
		case "create":
		case "new": {
			const pluginName = args[0];
			if (!pluginName) {
				cliError("Error: Plugin name is required");
				cliLog("Usage: bun run plugins:create <plugin-name>");
				process.exit(1);
			}
			await createPlugin(pluginName, args.slice(1));
			break;
		}

		case "build": {
			const pluginId = args[0];
			if (!pluginId) {
				cliError("Error: Plugin ID is required");
				cliLog("Usage: bun run plugins:build <plugin-id>");
				process.exit(1);
			}
			await buildPlugin(pluginId);
			break;
		}

		case "test": {
			const pluginId = args[0];
			if (!pluginId) {
				cliError("Error: Plugin ID is required");
				cliLog("Usage: bun run plugins:test <plugin-id>");
				process.exit(1);
			}
			await testPlugin(pluginId);
			break;
		}

		case "dev": {
			const pluginId = args[0];
			if (!pluginId) {
				cliError("Error: Plugin ID is required");
				cliLog("Usage: bun run plugins:dev <plugin-id>");
				process.exit(1);
			}
			await devPlugin(pluginId);
			break;
		}

		case "help":
		case "--help":
		case "-h": {
			cliLog(`
F.A.L Plugin Development CLI

Usage:
  bun run plugins:<command> [options]

Commands:
  create <plugin-name>    Create a new plugin from template
  build <plugin-id>       Build a plugin
  test <plugin-id>        Run plugin tests
  dev <plugin-id>         Start development mode with hot reload

Examples:
  bun run plugins:create my-plugin
  bun run plugins:build my-plugin
  bun run plugins:test my-plugin
  bun run plugins:dev my-plugin

For more information, see:
  docs/03_plans/plugin-system/phase4-development-tools.md
`);
			break;
		}

		default: {
			if (!command) {
				cliError("Error: No command specified");
			} else {
				cliError(`Error: Unknown command "${command}"`);
			}
			cliLog("Run 'bun run plugins:help' for usage information");
			process.exit(1);
		}
	}
}

// Only run main if this file is executed directly (not imported)
if (import.meta.main) {
	main().catch((error) => {
		logger.error({ error }, "Fatal error");
		process.exit(1);
	});
}
