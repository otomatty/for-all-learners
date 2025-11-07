# @fal/plugin-types

TypeScript type definitions for developing plugins for F.A.L (For All Learners).

## Installation

```bash
npm install @fal/plugin-types
# or
bun add @fal/plugin-types
# or
yarn add @fal/plugin-types
```

## Usage

```typescript
import type { PluginAPI } from "@fal/plugin-types";

/**
 * Plugin activation function
 */
async function activate(
  api: PluginAPI,
  config?: Record<string, unknown>,
): Promise<{
  methods?: Record<string, (...args: unknown[]) => unknown | Promise<unknown>>;
  dispose?: () => void | Promise<void>;
}> {
  // Use the API
  api.notifications.success("Plugin activated!");

  const userId = await api.app.getUserId();
  console.log("User ID:", userId);

  // Register a command
  await api.ui.registerCommand({
    id: "my-command",
    label: "My Command",
    handler: async () => {
      api.notifications.info("Command executed!");
    },
  });

  return {
    dispose: async () => {
      // Cleanup
    },
  };
}

export default activate;
```

## API Reference

### PluginAPI

The main API interface that provides access to all plugin functionality:

- `app`: Application information (version, name, user ID)
- `storage`: Plugin-specific key-value storage
- `notifications`: Show notifications to users
- `ui`: UI extensions (commands, dialogs, widgets, pages, sidebar panels)
- `editor`: Editor extensions (custom nodes, marks, plugins)
- `ai`: AI extensions (question generators, prompt templates, content analyzers)
- `data`: Data processor extensions (importers, exporters, transformers)
- `integration`: Integration extensions (OAuth, webhooks, external APIs)
- `calendar`: Calendar extensions (custom data providers)

### Type Definitions

All types are exported from this package. See `index.d.ts` for complete type definitions.

## Development

This package is automatically generated from the plugin system implementation.
To regenerate the types:

```bash
bun run plugins:generate-types
```

## License

MIT
