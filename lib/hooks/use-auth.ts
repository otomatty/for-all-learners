"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * 認証状態を管理するカスタムフック
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/layout.tsx (将来)
 *
 * Dependencies (External files that this file imports):
 *   ├─ @/lib/supabase/client
 *   └─ @supabase/supabase-js
 *
 * Related Documentation:
 *   ├─ Spec: docs/02_research/2025_11/20251109_02_supabase-tauri-integration.md
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md
 */
export function useAuth() {
	const supabase = createClient();
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		// 初期セッション取得
		supabase.auth
			.getSession()
			.then(({ data: { session } }) => {
				setUser(session?.user ?? null);
				setLoading(false);
			})
			.catch(() => {
				// エラー時もloadingをfalseにする
				setUser(null);
				setLoading(false);
			});

		// 認証状態の変更をリッスン
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setUser(session?.user ?? null);
			setLoading(false);
		});

		return () => subscription.unsubscribe();
	}, [supabase]);

	return { user, loading };
}
