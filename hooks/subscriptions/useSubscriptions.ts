"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];

export interface PlanFeatures {
	maxDecks: number | null;
	maxCardsPerDeck: number | null;
	maxNotes: number | null;
	maxPagesPerNote: number | null;
	canUsePlugins: boolean;
	canUseAI: boolean;
	canUseOCR: boolean;
	canUseAudioRecording: boolean;
	canUseAdvancedQuiz: boolean;
	canUseAnalytics: boolean;
	canUseExport: boolean;
	canUseImport: boolean;
	canUseSync: boolean;
	canUseCollaboration: boolean;
	canUseCustomThemes: boolean;
	canUsePrioritySupport: boolean;
}

export interface Plan {
	id: string;
	name: string;
	displayName: string;
	features: PlanFeatures;
}

/**
 * Hook for fetching user subscription
 */
export function useUserSubscription(userId: string) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["user_subscription", userId],
		queryFn: async (): Promise<Subscription | null> => {
			const { data, error } = await supabase
				.from("subscriptions")
				.select("*")
				.eq("user_id", userId)
				.maybeSingle();

			if (error) {
				throw error;
			}

			return data;
		},
	});
}

/**
 * Hook for checking if user has paid plan
 */
export function useIsUserPaid(userId: string) {
	const subscriptionQuery = useUserSubscription(userId);

	return {
		...subscriptionQuery,
		data: subscriptionQuery.data
			? subscriptionQuery.data.plan_id !== "free"
			: false,
	};
}

/**
 * Hook for fetching user plan features
 */
export function useUserPlanFeatures(userId: string) {
	const subscriptionQuery = useUserSubscription(userId);
	const supabase = createClient();

	return useQuery({
		queryKey: ["user_plan_features", userId],
		queryFn: async (): Promise<PlanFeatures> => {
			const subscription = subscriptionQuery.data;

			if (!subscription || subscription.plan_id === "free") {
				// Free plan features
				return {
					maxDecks: 10,
					maxCardsPerDeck: 100,
					maxNotes: 10,
					maxPagesPerNote: 50,
					canUsePlugins: false,
					canUseAI: false,
					canUseOCR: false,
					canUseAudioRecording: false,
					canUseAdvancedQuiz: false,
					canUseAnalytics: false,
					canUseExport: false,
					canUseImport: false,
					canUseSync: false,
					canUseCollaboration: false,
					canUseCustomThemes: false,
					canUsePrioritySupport: false,
				};
			}

			// Fetch plan features from plans table
			const { data: plan, error } = await supabase
				.from("plans")
				.select("*")
				.eq("id", subscription.plan_id)
				.single();

			if (error || !plan) {
				// Fallback to free plan features
				return {
					maxDecks: 10,
					maxCardsPerDeck: 100,
					maxNotes: 10,
					maxPagesPerNote: 50,
					canUsePlugins: false,
					canUseAI: false,
					canUseOCR: false,
					canUseAudioRecording: false,
					canUseAdvancedQuiz: false,
					canUseAnalytics: false,
					canUseExport: false,
					canUseImport: false,
					canUseSync: false,
					canUseCollaboration: false,
					canUseCustomThemes: false,
					canUsePrioritySupport: false,
				};
			}

			// plan.features is Json type, cast to PlanFeatures via unknown
			const features = plan.features as unknown as PlanFeatures;

			return {
				maxDecks: features.maxDecks ?? null,
				maxCardsPerDeck: features.maxCardsPerDeck ?? null,
				maxNotes: features.maxNotes ?? null,
				maxPagesPerNote: features.maxPagesPerNote ?? null,
				canUsePlugins: features.canUsePlugins ?? false,
				canUseAI: features.canUseAI ?? false,
				canUseOCR: features.canUseOCR ?? false,
				canUseAudioRecording: features.canUseAudioRecording ?? false,
				canUseAdvancedQuiz: features.canUseAdvancedQuiz ?? false,
				canUseAnalytics: features.canUseAnalytics ?? false,
				canUseExport: features.canUseExport ?? false,
				canUseImport: features.canUseImport ?? false,
				canUseSync: features.canUseSync ?? false,
				canUseCollaboration: features.canUseCollaboration ?? false,
				canUseCustomThemes: features.canUseCustomThemes ?? false,
				canUsePrioritySupport: features.canUsePrioritySupport ?? false,
			};
		},
		enabled: subscriptionQuery.isSuccess,
	});
}

/**
 * Hook for fetching user plan information
 */
export function useUserPlan(userId: string) {
	const subscriptionQuery = useUserSubscription(userId);
	const supabase = createClient();

	return useQuery({
		queryKey: ["user_plan", userId],
		queryFn: async (): Promise<Plan | null> => {
			const subscription = subscriptionQuery.data;

			if (!subscription) {
				return null;
			}

			// Fetch plan from plans table
			const { data: plan, error } = await supabase
				.from("plans")
				.select("*")
				.eq("id", subscription.plan_id)
				.single();

			if (error || !plan) {
				return null;
			}

			// plan.features is Json type, cast to PlanFeatures via unknown
			const features = plan.features as unknown as PlanFeatures;

			return {
				id: plan.id,
				name: plan.name,
				displayName: plan.name, // Use name as displayName fallback
				features,
			};
		},
		enabled: subscriptionQuery.isSuccess,
	});
}
