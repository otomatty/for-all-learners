/**
 * BroadcastChannel wrapper for unilink page creation events
 */

import logger from "../logger";

const CHANNEL_NAME = "unilink-page-created";

export interface PageCreatedMessage {
	v: 1; // version
	key: string;
	pageId: string;
	timestamp?: number;
}

export type PageCreatedHandler = (message: PageCreatedMessage) => void;

interface BroadcastChannelState {
	channel: BroadcastChannel | null;
	handlers: Set<PageCreatedHandler>;
}

/**
 * Create a BroadcastChannel wrapper for page creation events
 */
export const createUnilinkBroadcastChannel = () => {
	const state: BroadcastChannelState = {
		channel: null,
		handlers: new Set(),
	};

	/**
	 * Handle incoming broadcast messages
	 */
	const handleMessage = (event: MessageEvent): void => {
		try {
			const message = event.data as PageCreatedMessage;

			// Version check
			if (message.v !== 1) {
				logger.warn(
					{ version: message.v },
					"[BroadcastChannel] Unknown message version",
				);
				return;
			}

			// Required field validation
			if (!message.key || !message.pageId) {
				logger.warn({ message }, "[BroadcastChannel] Invalid message format");
				return;
			}
			// Notify all handlers
			state.handlers.forEach((handler) => {
				try {
					handler(message);
				} catch (error) {
					logger.warn({ error }, "[BroadcastChannel] Handler error");
				}
			});
		} catch (error) {
			logger.warn({ error }, "[BroadcastChannel] Failed to parse message");
		}
	};

	// Initialize BroadcastChannel if supported
	if (typeof BroadcastChannel !== "undefined") {
		state.channel = new BroadcastChannel(CHANNEL_NAME);
		state.channel.addEventListener("message", handleMessage);
	} else {
		logger.warn("[BroadcastChannel] Not supported in this environment");
	}

	/**
	 * Emit page creation event
	 */
	const emitPageCreated = (key: string, pageId: string): void => {
		if (!state.channel) {
			return;
		}

		const message: PageCreatedMessage = {
			v: 1,
			key,
			pageId,
			timestamp: Date.now(),
		};

		try {
			state.channel.postMessage(message);
		} catch (error) {
			logger.warn(
				{ key, pageId, error },
				"[BroadcastChannel] Failed to broadcast",
			);
		}
	};

	/**
	 * Register page creation handler
	 * @returns Unsubscribe function
	 */
	const onPageCreated = (handler: PageCreatedHandler): (() => void) => {
		state.handlers.add(handler);

		return () => {
			state.handlers.delete(handler);
			logger.debug(
				{ handlerCount: state.handlers.size },
				"[BroadcastChannel] Handler unregistered",
			);
		};
	};

	/**
	 * Close channel and cleanup resources
	 */
	const close = (): void => {
		if (state.channel) {
			state.channel.close();
			state.channel = null;
			logger.debug("[BroadcastChannel] Closed");
		}
		state.handlers.clear();
	};

	/**
	 * Check if BroadcastChannel is supported
	 */
	const isSupported = (): boolean => {
		return state.channel !== null;
	};

	return {
		emitPageCreated,
		onPageCreated,
		close,
		isSupported,
	};
};

export type UnilinkBroadcastChannel = ReturnType<
	typeof createUnilinkBroadcastChannel
>;
