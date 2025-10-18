/**
 * BroadcastChannel Management
 * Handles cross-tab communication for page creation events
 */

import {
	createUnilinkBroadcastChannel,
	type UnilinkBroadcastChannel,
} from "../broadcast-channel";

// Global BroadcastChannel instance (Singleton)
let broadcastChannel: UnilinkBroadcastChannel | null = null;

/**
 * Get BroadcastChannel instance (Singleton pattern with lazy initialization)
 * @returns UnilinkBroadcastChannel instance
 */
export function getBroadcastChannel(): UnilinkBroadcastChannel {
	if (!broadcastChannel) {
		broadcastChannel = createUnilinkBroadcastChannel();
	}
	return broadcastChannel;
}

/**
 * Notify other tabs about page creation
 * @param key Normalized page title key
 * @param pageId Created page ID
 */
export function notifyPageCreated(key: string, pageId: string): void {
	const broadcast = getBroadcastChannel();
	broadcast.emitPageCreated(key, pageId);
}

/**
 * Notify other tabs about page updates
 * Future feature - currently not implemented
 * @param key Normalized page title key
 * @param pageId Updated page ID
 */
export function notifyPageUpdated(key: string, pageId: string): void {
	// TODO: Implement page update notification
	// const broadcast = getBroadcastChannel();
	// broadcast.emitPageUpdated(key, pageId);

	// Placeholder for future implementation
	// Logger will be used once the feature is implemented
	void key;
	void pageId;
}
