# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `bun dev` (using Next.js with Turbopack)
- **Build for production**: `bun run build` 
- **Lint and format code**: `bun run lint` (uses Biome for linting and formatting)
- **Generate database types**: `bun run gen:types` (generates TypeScript types from Supabase schema)
- **Install dependencies**: `bun install`

## Code Architecture

### Stack Overview
- **Framework**: Next.js 15 with React 19 and TypeScript
- **Database**: Supabase (PostgreSQL) with SSR support
- **Styling**: Tailwind CSS with custom themes
- **Authentication**: Supabase Auth with middleware-based route protection
- **Package Manager**: Bun
- **Rich Text Editor**: Tiptap with custom extensions
- **AI Integration**: Google Gemini for content generation

### Directory Structure

#### App Router Structure (`app/`)
- `(protected)/` - Authenticated user routes (dashboard, learn, decks, notes, pages, etc.)
- `(public)/` - Public marketing pages and landing pages
- `admin/` - Administrative interface with user management and analytics
- `auth/` - Authentication pages and callbacks
- `api/` - API routes for external integrations and server actions
- `_actions/` - Server Actions organized by feature (notes/, cards, decks, etc.)

#### Key Directories
- `components/` - Reusable UI components, including extensive `ui/` library based on Radix UI
- `lib/` - Utilities including Supabase clients, Tiptap extensions, and AI integration
- `database/` - SQL schema files and migrations
- `types/` - TypeScript type definitions including auto-generated database types
- `hooks/` - Custom React hooks
- `stores/` - Client-side state management

### Database Schema
Uses Supabase with comprehensive tables for:
- User accounts and settings
- Learning content (decks, cards, pages, notes)
- Sharing and collaboration features
- Learning progress tracking
- Action logging and analytics

### Authentication & Route Protection
- Middleware-based authentication using Supabase SSR
- Protected routes require authentication (redirects to `/auth/login`)
- Public routes defined in `middleware.ts` include marketing pages and auth flows

### Supabase Integration
- **Client-side**: `lib/supabase/client.ts` for browser operations
- **Server-side**: `lib/supabase/server.ts` for server components and actions
- **Admin**: `lib/supabase/adminClient.ts` for administrative operations
- **Types**: Auto-generated from schema using `bun run gen:types`

### AI Features
- Google Gemini integration in `lib/gemini/`
- Content generation for flashcards, quizzes, and study materials
- Text-to-speech and OCR capabilities

### Rich Text Editing
- Tiptap editor with custom extensions in `lib/tiptap-extensions/`
- Support for page linking, code blocks, LaTeX, and multimedia content
- Custom node views for images and interactive elements

### External Integrations
- **Gyazo**: Image capture and storage integration
- **Cosense**: Knowledge base synchronization
- API routes handle OAuth callbacks and data sync

### Testing
This codebase does not appear to have a formal testing framework configured. If adding tests, check for existing patterns or ask the team about their preferred testing approach.

### Notes Architecture
The notes system supports:
- Collaborative editing with share permissions
- Page linking and knowledge graph construction
- Public/private visibility settings
- Temporary share links with expiration
- Server Actions in `app/_actions/notes/` with detailed documentation

### UI Components
- Extensive component library based on Radix UI primitives
- Custom theming system with multiple color schemes
- Responsive design with mobile-first approach
- Dark/light mode support with user preferences

## Work Logs

### Work Log Management
Development work logs are maintained in `.docs/work-logs/` directory to track implementation history and decisions.

#### Naming Convention
Work logs follow the format: `YYYY-MM-DD_HHHMM_feature-description.md`

Where:
- `YYYY-MM-DD`: Work date
- `HH`: Hour (24-hour format)
- `MM`: Minute
- `feature-description`: Brief description using kebab-case

Examples:
- `2025-01-21_1430_goal-limits-implementation.md`
- `2025-01-21_1620_user-nav-plan-display-enhancement.md`
- `2025-07-21_1045_goal-limits-bug-fix.md`

This format ensures chronological ordering of work logs completed on the same day.

#### Work Log Contents
Each work log should include:
- **Work Date and Overview**: Date and summary of the task
- **Requirements**: What needed to be implemented
- **Implementation Details**: Code changes, new functions, UI modifications
- **Impact Analysis**: Files affected and scope of changes
- **Test Points**: What should be tested to verify the implementation
- **Future Improvements**: Ideas for further enhancements

### Recent Implementations

#### Goal Limits System (2025-01-21)
- Implemented goal creation limits: 3 for free users, 10 for paid users
- Added server-side validation in `app/_actions/study_goals.ts`
- Enhanced UI with limit display and upgrade prompts in goal creation dialog
- Location: `.docs/work-logs/2025-01-21_goal-limits-implementation.md`

#### User Navigation Plan Display (2025-01-21)
- Enhanced `components/user-nav.tsx` with detailed plan information
- Added real-time goal usage display (current/max goals)
- Implemented upgrade prompts for free users
- Added visual indicators (crown icon) for paid plan users
- Location: `.docs/work-logs/2025-01-21_user-nav-plan-display-enhancement.md`

### Subscription & Plan Features
The application implements a freemium model with the following limits:
- **Free Plan**: Maximum 3 study goals
- **Paid Plan**: Maximum 10 study goals
- Plan status affects UI behavior and feature availability
- Real-time plan information displayed in user navigation

## MCP (Model Context Protocol) Servers

This project uses MCP servers for external integrations and enhanced development capabilities.

### Configured MCP Servers

**Supabase MCP Server**
- Package: `@supabase/mcp-server-supabase@latest`
- Mode: Read-only access
- Purpose: Database structure inspection, query execution, schema analysis
- Features: Table listing, SQL execution, migrations, types generation

**Playwright MCP Server**
- Package: `@playwright/mcp@latest`
- Purpose: Browser automation and testing
- Features: Web scraping, UI testing, screenshot capture

**Context7 MCP Server**
- Package: `@upstash/context7-mcp@latest`
- Purpose: Documentation and library context retrieval
- Features: Library documentation lookup, code examples, API references

### Database Tables (via Supabase MCP)

**Core Tables:**
- `accounts` - User account information
- `study_goals` - Learning objectives and targets
- `plans` - Subscription plans and features
- `subscriptions` - User subscription status

**Learning Content:**
- `decks` - Flashcard collections
- `cards` - Individual flashcards
- `pages` - User-created content pages
- `notes` - Note-taking system
- `questions` - Quiz questions

**Progress Tracking:**
- `learning_logs` - Study session records
- `deck_study_logs` - Deck-specific study tracking
- `action_logs` - User action logging
- `milestones` - Achievement tracking

**Sharing & Collaboration:**
- `deck_shares` - Deck sharing permissions
- `page_shares` - Page sharing settings
- `note_shares` - Note collaboration
- `share_links` - Temporary sharing links

**External Integrations:**
- `cosense_projects` - Cosense knowledge base sync
- `gyazo_albums`, `user_gyazo_images` - Gyazo image integration
- `quizlet_sets` - Quizlet import functionality

**System & Admin:**
- `admin_users` - Administrative access
- `changelog_entries`, `changelog_items` - Release management
- `inquiries`, `inquiry_categories` - Support system
- `version_commit_staging`, `version_release_notes` - Version control