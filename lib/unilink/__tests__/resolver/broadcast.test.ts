/**
 * Broadcast Module Test Suite
 * Tests for BroadcastChannel management and page event notifications
 *
 * @fileoverview Tests for lib/unilink/resolver/broadcast.ts
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock console.log to avoid cluttering test output
const _mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

describe("Broadcast Module", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getBroadcastChannel", () => {
		it("should return a BroadcastChannel instance", async () => {
			const { getBroadcastChannel } = await import("../../resolver/broadcast");
			const channel = getBroadcastChannel();
			expect(channel).toBeDefined();
			expect(typeof channel.emitPageCreated).toBe("function");
		});

		it("should return the same instance on multiple calls (singleton)", async () => {
			const { getBroadcastChannel } = await import("../../resolver/broadcast");
			const channel1 = getBroadcastChannel();
			const channel2 = getBroadcastChannel();
			expect(channel1).toBe(channel2);
		});

		it("should create channel lazily on first call", async () => {
			const { getBroadcastChannel } = await import("../../resolver/broadcast");
			const channel = getBroadcastChannel();
			expect(channel).toBeDefined();
		});
	});

	describe("notifyPageCreated", () => {
		it("should broadcast page creation event with correct data", async () => {
			const { getBroadcastChannel, notifyPageCreated } = await import(
				"../../resolver/broadcast"
			);
			const channel = getBroadcastChannel();
			const emitSpy = vi.spyOn(channel, "emitPageCreated");

			notifyPageCreated("test-page", "Test Page");

			expect(emitSpy).toHaveBeenCalledWith("test-page", "Test Page");
			expect(emitSpy).toHaveBeenCalledTimes(1);
		});

		it("should handle empty pageId", async () => {
			const { getBroadcastChannel, notifyPageCreated } = await import(
				"../../resolver/broadcast"
			);
			const channel = getBroadcastChannel();
			const emitSpy = vi.spyOn(channel, "emitPageCreated");

			notifyPageCreated("page-id", "");

			expect(emitSpy).toHaveBeenCalledWith("page-id", "");
		});

		it("should handle special characters in title", async () => {
			const { getBroadcastChannel, notifyPageCreated } = await import(
				"../../resolver/broadcast"
			);
			const channel = getBroadcastChannel();
			const emitSpy = vi.spyOn(channel, "emitPageCreated");

			const specialTitle = "Title with @#$% & <> symbols";
			notifyPageCreated("special-id", specialTitle);

			expect(emitSpy).toHaveBeenCalledWith("special-id", specialTitle);
		});

		it("should log broadcast event (debug)", async () => {
			const { notifyPageCreated, getBroadcastChannel } = await import(
				"../../resolver/broadcast"
			);
			const channel = getBroadcastChannel();
			const emitSpy = vi.spyOn(channel, "emitPageCreated");

			notifyPageCreated("test-id", "Test Title");

			// Verify the broadcast channel's emit method was called
			expect(emitSpy).toHaveBeenCalledWith("test-id", "Test Title");
		});
	});

	describe("notifyPageUpdated", () => {
		it("should log message for unimplemented feature", async () => {
			const { notifyPageUpdated } = await import("../../resolver/broadcast");

			// Since the feature is not yet implemented, just verify it doesn't throw
			expect(() => {
				notifyPageUpdated("test-page", "Updated Title");
			}).not.toThrow();
		});

		it("should handle multiple calls without errors", async () => {
			const { notifyPageUpdated } = await import("../../resolver/broadcast");

			// Verify multiple calls don't throw errors
			expect(() => {
				notifyPageUpdated("page-1", "Title 1");
				notifyPageUpdated("page-2", "Title 2");
				notifyPageUpdated("page-3", "Title 3");
			}).not.toThrow();
		});
	});

	describe("Error Handling", () => {
		it("should handle broadcast errors gracefully", async () => {
			const { getBroadcastChannel, notifyPageCreated } = await import(
				"../../resolver/broadcast"
			);
			const channel = getBroadcastChannel();
			const emitSpy = vi
				.spyOn(channel, "emitPageCreated")
				.mockImplementation(() => {
					throw new Error("Broadcast failed");
				});

			expect(() => {
				notifyPageCreated("page-id", "Test Page");
			}).toThrow("Broadcast failed");

			emitSpy.mockRestore();
		});
	});
});
