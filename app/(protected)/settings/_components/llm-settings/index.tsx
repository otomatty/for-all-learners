/**
 * LLM Settings Component (Integrated)
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   └─ app/(protected)/settings/_components/user-settings-form.tsx
 *
 * Dependencies (依存先):
 *   └─ components/settings/LLMSettingsIntegrated.tsx
 *
 * Related Files:
 *   ├─ Plan: docs/03_plans/ai-integration/20251103_02_settings-consolidation-plan.md
 *   ├─ Design: docs/03_plans/ai-integration/20251103_03_llm-settings-integration-design.md
 *   └─ Integrated: components/settings/LLMSettingsIntegrated.tsx
 */

"use client";

import { LLMSettingsIntegrated } from "@/components/settings/LLMSettingsIntegrated";

export default function LlmSettings() {
	return <LLMSettingsIntegrated />;
}
