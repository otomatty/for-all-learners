/**
 * ReconcileQueue - 同一キーの連続イベントを100msデバウンスして1回処理
 */

import logger from "../logger";

interface QueuedEvent {
	key: string;
	pageId?: string;
	timestamp: number;
}

type ReconcileHandler = (key: string, pageId?: string) => Promise<void>;

interface ReconcileQueueState {
	queue: Map<string, QueuedEvent>;
	timeouts: Map<string, NodeJS.Timeout>;
	handler: ReconcileHandler;
	debounceMs: number;
}

/**
 * Create a reconcile queue with debouncing
 */
export const createReconcileQueue = (
	handler: ReconcileHandler,
	debounceMs = 100,
) => {
	const state: ReconcileQueueState = {
		queue: new Map(),
		timeouts: new Map(),
		handler,
		debounceMs,
	};

	/**
	 * Process a single key from the queue
	 */
	const processKey = async (key: string): Promise<void> => {
		const event = state.queue.get(key);
		if (!event) return;

		// Remove from queue and timeouts
		state.queue.delete(key);
		state.timeouts.delete(key);

		// Execute handler
		try {
			await state.handler(event.key, event.pageId);
			logger.debug(
				{ key, pageId: event.pageId },
				"[ReconcileQueue] Processed key",
			);
		} catch (error) {
			logger.warn(
				{ key, error },
				`[ReconcileQueue] Handler failed for key "${key}"`,
			);
		}
	};

	/**
	 * Add key to queue (debounced)
	 */
	const enqueue = (key: string, pageId?: string): void => {
		// Clear existing timeout
		const existingTimeout = state.timeouts.get(key);
		if (existingTimeout) {
			clearTimeout(existingTimeout);
		}

		// Update queue with new event (overwrites existing)
		state.queue.set(key, {
			key,
			pageId,
			timestamp: Date.now(),
		});

		// Set new debounce timer
		const timeout = setTimeout(() => {
			processKey(key);
		}, state.debounceMs);

		state.timeouts.set(key, timeout);

		logger.debug(
			{ key, pageId, queueSize: state.queue.size },
			"[ReconcileQueue] Enqueued",
		);
	};

	/**
	 * Clear all pending operations
	 */
	const clear = (): void => {
		const queueSize = state.queue.size;

		state.timeouts.forEach((timeout) => {
			clearTimeout(timeout);
		});
		state.queue.clear();
		state.timeouts.clear();

		logger.debug({ clearedItems: queueSize }, "[ReconcileQueue] Cleared");
	};

	/**
	 * Get current queue size for debugging
	 */
	const getQueueSize = (): number => {
		return state.queue.size;
	};

	return {
		enqueue,
		clear,
		getQueueSize,
	};
};

export type ReconcileQueue = ReturnType<typeof createReconcileQueue>;

/**
 * Track in-flight requests to prevent duplicates
 */
const inflightKeys = new Set<string>();

export const isKeyInflight = (key: string): boolean => {
	return inflightKeys.has(key);
};

export const setKeyInflight = (key: string): void => {
	inflightKeys.add(key);
	logger.debug({ key }, "[ReconcileQueue] Key set as in-flight");
};

export const clearKeyInflight = (key: string): void => {
	inflightKeys.delete(key);
	logger.debug({ key }, "[ReconcileQueue] Key cleared from in-flight");
};
