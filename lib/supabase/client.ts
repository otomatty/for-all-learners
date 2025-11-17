"use client";

/**
 * Supabase Client
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   ├─ hooks/notes/*.ts
 *   ├─ hooks/decks/*.ts
 *   ├─ hooks/pages/*.ts
 *   ├─ hooks/cards/*.ts
 *   ├─ hooks/study_goals/*.ts
 *   ├─ hooks/learning_logs/*.ts
 *   ├─ hooks/milestones/*.ts
 *   ├─ hooks/review/*.ts
 *   └─ lib/auth/*.ts
 *
 * Dependencies (External files that this file imports):
 *   └─ lib/supabase/tauri-client.ts
 *
 * Related Documentation:
 *   ├─ Spec: docs/02_research/2025_11/20251109_02_supabase-tauri-integration.md
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */
export { createClient } from "./tauri-client";
