/**
 * Plugin System Type Definitions
 *
 * This file defines the core types for the F.A.L plugin system.
 * Plugins can extend various aspects of the application including
 * editor, AI, UI, data processing, and external integrations.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   ├─ lib/plugins/types.ts
 *   ├─ lib/plugins/plugin-loader.ts
 *   ├─ lib/plugins/plugin-registry.ts
 *   └─ app/_actions/plugins.ts
 *
 * Dependencies: None (base type definitions)
 *
 * Related Documentation:
 *   ├─ Plan: docs/03_plans/plugin-system/phase1-core-system.md
 *   └─ Guide: docs/guides/plugin-development.md
 */

// ============================================================================
// Extension Points
// ============================================================================

/**
 * Extension point types that plugins can provide
 */
export type ExtensionPoint =
	| "editor" // Tiptap editor extensions
	| "ai" // AI functionality extensions
	| "ui" // UI component extensions
	| "dataProcessor" // Import/Export data processors
	| "integration"; // External service integrations

/**
 * Extension points configuration in plugin manifest
 */
export interface ExtensionPointsConfig {
	/** Editor extensions (Tiptap nodes/marks/plugins) */
	editor?: boolean;
	/** AI functionality extensions (prompts, question generation) */
	ai?: boolean;
	/** UI extensions (components, widgets) */
	ui?: boolean;
	/** Data processing extensions (importers/exporters) */
	dataProcessor?: boolean;
	/** External integration extensions (API connectors) */
	integration?: boolean;
}

// ============================================================================
// JSON Schema (simplified)
// ============================================================================

/**
 * Simplified JSON Schema for plugin configuration
 * Full JSON Schema spec can be added in future phases
 */
export interface JSONSchema {
	type: "object" | "array" | "string" | "number" | "boolean" | "null";
	properties?: Record<string, JSONSchema>;
	items?: JSONSchema;
	required?: string[];
	description?: string;
	default?: unknown;
	enum?: unknown[];
}

// ============================================================================
// Plugin Manifest
// ============================================================================

/**
 * Plugin manifest structure (plugin.json)
 *
 * This defines all metadata and configuration for a plugin.
 * Every plugin must have a valid manifest file.
 */
export interface PluginManifest {
	/** Unique plugin identifier (e.g., "com.example.my-plugin") */
	id: string;

	/** Display name of the plugin */
	name: string;

	/** Semantic version (e.g., "1.0.0") */
	version: string;

	/** Short description of the plugin */
	description: string;

	/** Plugin author name or organization */
	author: string;

	/** Homepage URL (optional) */
	homepage?: string;

	/** Repository URL (optional) */
	repository?: string;

	/** License identifier (e.g., "MIT", "Apache-2.0") */
	license?: string;

	// --------------------------------------------------------------------
	// Entry Point
	// --------------------------------------------------------------------

	/** Main script path (e.g., "dist/index.js") */
	main: string;

	// --------------------------------------------------------------------
	// Extension Points
	// --------------------------------------------------------------------

	/** Extension points this plugin provides */
	extensionPoints: ExtensionPointsConfig;

	// --------------------------------------------------------------------
	// Dependencies
	// --------------------------------------------------------------------

	/**
	 * Plugin dependencies
	 * Key: plugin ID, Value: version range (semver)
	 * Example: { "com.example.base-plugin": "^1.0.0" }
	 */
	dependencies?: Record<string, string>;

	// --------------------------------------------------------------------
	// Assets
	// --------------------------------------------------------------------

	/**
	 * Static assets (CSS, images, etc.)
	 */
	assets?: {
		/** CSS file paths */
		styles?: string[];
		/** Icon URLs by size */
		icons?: {
			[size: string]: string; // e.g., { "16": "icons/icon-16.png" }
		};
	};

	// --------------------------------------------------------------------
	// Configuration
	// --------------------------------------------------------------------

	/**
	 * Configuration schema (JSON Schema)
	 * Defines the structure of user-configurable settings
	 */
	configSchema?: JSONSchema;

	/**
	 * Default configuration values
	 */
	defaultConfig?: Record<string, unknown>;

	// --------------------------------------------------------------------
	// Metadata
	// --------------------------------------------------------------------

	/**
	 * Minimum F.A.L version required
	 */
	minAppVersion?: string;

	/**
	 * Keywords for search/discovery
	 */
	keywords?: string[];
}

// ============================================================================
// Plugin Metadata (Database)
// ============================================================================

/**
 * Plugin metadata stored in database
 * Corresponds to 'plugins' table
 */
export interface PluginMetadata {
	id: string; // UUID
	pluginId: string; // Manifest id
	name: string;
	version: string;
	description: string;
	author: string;
	homepage?: string;
	repository?: string;
	manifest: PluginManifest; // Full manifest as JSONB
	codeUrl: string; // URL to plugin code in Supabase Storage
	isOfficial: boolean; // Official F.A.L plugin
	isReviewed: boolean; // Code reviewed and approved
	downloadsCount: number;
	ratingAverage?: number;
	createdAt: Date;
	updatedAt: Date;
}

// ============================================================================
// User Plugin Installation
// ============================================================================

/**
 * User's installed plugin information
 * Corresponds to 'user_plugins' table
 */
export interface UserPlugin {
	id: string; // UUID
	userId: string; // User UUID
	pluginId: string; // Plugin ID from manifest
	installedVersion: string;
	enabled: boolean;
	config?: Record<string, unknown>; // User configuration
	installedAt: Date;
}

// ============================================================================
// Plugin Storage
// ============================================================================

/**
 * Plugin-specific key-value storage
 * Corresponds to 'plugin_storage' table
 */
export interface PluginStorageEntry {
	id: string; // UUID
	userId: string;
	pluginId: string;
	key: string;
	value: unknown; // Stored as JSONB
	createdAt: Date;
	updatedAt: Date;
}

// ============================================================================
// Plugin Runtime State
// ============================================================================

/**
 * Runtime state of a loaded plugin
 */
export interface LoadedPlugin {
	/** Plugin manifest */
	manifest: PluginManifest;

	/** Plugin enabled state */
	enabled: boolean;

	/** Web Worker instance (if applicable) */
	worker?: Worker;

	/** Plugin API instance */
	api?: unknown; // Will be typed more specifically in plugin-api.ts

	/** Load timestamp */
	loadedAt: Date;

	/** Error state (if failed to load) */
	error?: string;
}

// ============================================================================
// Plugin Lifecycle Events
// ============================================================================

/**
 * Plugin lifecycle events
 */
export type PluginLifecycleEvent =
	| "loading" // Plugin is being loaded
	| "loaded" // Plugin successfully loaded
	| "activating" // Plugin is being activated
	| "activated" // Plugin successfully activated
	| "deactivating" // Plugin is being deactivated
	| "deactivated" // Plugin successfully deactivated
	| "unloading" // Plugin is being unloaded
	| "unloaded" // Plugin successfully unloaded
	| "error"; // Plugin encountered an error

/**
 * Plugin event data
 */
export interface PluginEvent {
	pluginId: string;
	event: PluginLifecycleEvent;
	timestamp: Date;
	error?: string;
	metadata?: Record<string, unknown>;
}
