/**
 * Supabase Realtime listener for page creation events
 */

import type { RealtimeChannel } from "@supabase/supabase-js";
import logger from "../logger";
import { addPageToCache } from "./page-cache-preloader";
import { normalizeTitleToKey } from "./utils";

export interface RealtimePageEvent {
	eventType: "INSERT" | "UPDATE" | "DELETE";
	new?: {
		id: string;
		title: string;
		[key: string]: unknown;
	};
	old?: {
		id: string;
		title: string;
		[key: string]: unknown;
	};
}

export type RealtimePageHandler = (key: string, pageId: string) => void;

interface RealtimeListenerState {
	channel: RealtimeChannel | null;
	handlers: Set<RealtimePageHandler>;
}

/**
 * Create a Supabase Realtime listener for page events
 */
export const createUnilinkRealtimeListener = () => {
	const state: RealtimeListenerState = {
		channel: null,
		handlers: new Set(),
	};

	/**
	 * Handle page insert event from Realtime
	 */
	// biome-ignore lint/suspicious/noExplicitAny: Supabase payload type
	const handlePageInsert = (payload: any): void => {
		try {
			const newRecord = payload.new;
			if (!newRecord?.title || !newRecord?.id) {
				logger.debug(
					{ payload },
					"[RealtimeListener] Invalid page insert payload",
				);
				return;
			}

			const key = normalizeTitleToKey(newRecord.title);
			const pageId = newRecord.id;

			logger.info(
				{ key, pageId, title: newRecord.title },
				"[RealtimeListener] Page created",
			);

			// Add to cache immediately for cross-page link resolution
			// This allows other pages to immediately resolve links to this new page
			addPageToCache(pageId, newRecord.title);

			// Notify all handlers (they can call refreshUnifiedLinks to update their links)
			state.handlers.forEach((handler) => {
				try {
					handler(key, pageId);
				} catch (error) {
					logger.warn(
						{ key, pageId, error },
						"[RealtimeListener] Handler error",
					);
				}
			});
		} catch (error) {
			logger.error(
				{ error, payload },
				"[RealtimeListener] Failed to handle page insert",
			);
		}
	};

	/**
	 * Setup Supabase Realtime channel
	 */
	const setupChannel = (supabaseChannel: RealtimeChannel): void => {
		state.channel = supabaseChannel;

		// Subscribe to pages table INSERT events
		state.channel
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "pages",
				},
				handlePageInsert,
			)
			.subscribe();

		logger.info("[RealtimeListener] Channel setup complete");
	};

	/**
	 * Register page creation handler
	 * @returns Unsubscribe function
	 */
	const onPageCreated = (handler: RealtimePageHandler): (() => void) => {
		state.handlers.add(handler);
		logger.debug(
			{ handlerCount: state.handlers.size },
			"[RealtimeListener] Handler registered",
		);

		return () => {
			state.handlers.delete(handler);
			logger.debug(
				{ handlerCount: state.handlers.size },
				"[RealtimeListener] Handler unregistered",
			);
		};
	};

	/**
	 * Close channel and cleanup resources
	 */
	const close = (): void => {
		if (state.channel) {
			state.channel.unsubscribe();
			state.channel = null;
			logger.info("[RealtimeListener] Channel closed");
		}
		state.handlers.clear();
	};

	return {
		setupChannel,
		onPageCreated,
		close,
	};
};

export type UnilinkRealtimeListener = ReturnType<
	typeof createUnilinkRealtimeListener
>;
