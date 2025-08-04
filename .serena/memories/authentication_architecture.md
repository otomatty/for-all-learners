# Authentication Architecture

## Overview
The application uses Supabase Auth with Next.js middleware for route protection and SSR support.

## Authentication Flow

### Middleware-Based Protection
- **File**: `middleware.ts`
- **Purpose**: Protects routes requiring authentication
- **Mechanism**: Checks Supabase session before allowing access to protected routes

### Public Routes
```typescript
const PUBLIC_PATHS = [
  "/",                    // Landing page
  "/auth/login",          // Login page
  "/auth/callback",       // OAuth callback
  "/features",            // Feature showcase
  "/pricing",             // Pricing information
  "/guides",              // User guides
  "/faq",                 // FAQ page
  "/inquiry",             // Contact/inquiry
  "/changelog",           // Change log
  "/milestones",          // Project milestones
];
```

### Protected Routes
- All routes not in `PUBLIC_PATHS` require authentication
- Unauthenticated users are redirected to `/auth/login`
- Uses route groups: `app/(protected)/` for authenticated areas

## Supabase Client Configuration

### Multiple Client Types
1. **Browser Client** (`lib/supabase/client.ts`)
   - For client-side operations
   - Used in React components and client-side code

2. **Server Client** (`lib/supabase/server.ts`)
   - For server components and API routes
   - Handles SSR authentication

3. **Admin Client** (`lib/supabase/adminClient.ts`)
   - For administrative operations
   - Used in admin interfaces and privileged operations

## User Account Management

### Account Information
- User accounts stored in `accounts` table
- Includes profile information (avatar, email, etc.)
- Plan information linked via `plans` and `subscriptions` tables

### Plan-Based Features
- **Free Plan**: Limited to 3 study goals
- **Paid Plan**: Up to 10 study goals
- Real-time plan status displayed in user navigation
- Plan enforcement via server-side validation

## Session Management

### SSR Support
- Uses `@supabase/ssr` package for server-side session handling
- Cookies managed through Next.js middleware
- Session state maintained across server and client

### Authentication State
- Session checked in middleware on every request
- User information available in server components
- Client-side auth state managed by Supabase client