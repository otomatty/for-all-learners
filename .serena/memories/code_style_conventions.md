# Code Style and Conventions

## General Conventions

### Language & Framework Standards
- **TypeScript**: Strict mode enabled in `tsconfig.json`
- **React**: Uses React 19 with functional components and hooks
- **Next.js**: App Router structure with server and client components
- **File naming**: kebab-case for files, PascalCase for components

### Code Formatting
- **Linter**: Biome (configured in package.json)
- **Formatting**: Handled automatically by Biome via `bun run lint`
- **Import paths**: Uses `@/*` alias for absolute imports from project root

### TypeScript Configuration
```json
{
  "target": "ES2017",
  "strict": true,
  "noEmit": true,
  "jsx": "preserve",
  "moduleResolution": "bundler"
}
```

## Component Conventions

### React Components
- **Functional components**: Use arrow functions for components
- **Export pattern**: Use `export default` for main component, named exports for utilities
- **Props typing**: Always type component props with TypeScript interfaces

### Example Component Structure
```tsx
export default async function ComponentName({
  children,
}: {
  children: React.ReactNode;
}) {
  // Component logic
  return (
    // JSX structure
  );
}
```

### State Management
- **React hooks**: useState, useEffect, useCallback for local state
- **Global state**: Uses Jotai for client-side state management
- **Server state**: React Query (TanStack Query) for server state caching

## File Organization

### Directory Structure
- Components use PascalCase for filenames
- Utilities and configurations use kebab-case
- Server Actions organized in `app/_actions/` by feature
- Types in dedicated `types/` directory

### Import Organization
1. React and Next.js imports
2. Third-party library imports
3. Internal imports (using `@/` alias)
4. Type imports (using `import type`)

## Database & API Conventions

### Supabase Integration
- **Client setup**: Separate clients for browser (`client.ts`), server (`server.ts`), and admin (`adminClient.ts`)
- **Type generation**: Auto-generated types from Supabase schema
- **Server Actions**: Used for mutations, placed in `app/_actions/`

### Authentication
- **Middleware-based**: Route protection handled in `middleware.ts`
- **SSR support**: Uses Supabase SSR package for server-side authentication

## Styling Conventions

### Tailwind CSS
- **Utility-first**: Uses Tailwind utility classes
- **Custom themes**: Theme system with multiple color schemes
- **Responsive design**: Mobile-first approach
- **Dark mode**: Built-in dark/light mode support

### Component Libraries
- **Radix UI**: Base for all interactive components
- **Shadcn/ui**: Component patterns and structure
- **Custom components**: Built on top of Radix primitives