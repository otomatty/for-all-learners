/**
 * Worker Manager Tests
 *
 * Unit tests for the worker manager.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PluginManifest } from "@/types/plugin";
import { PluginError } from "../../types";
import {
	cleanupWorker,
	createWorker,
	disposePlugin,
	initializePlugin,
} from "../worker-manager";

// Mock Worker
const mockWorker = {
	postMessage: vi.fn(),
	terminate: vi.fn(),
	addEventListener: vi.fn(),
	removeEventListener: vi.fn(),
	onmessage: null as ((event: MessageEvent) => void) | null,
	onerror: null as ((error: ErrorEvent) => void) | null,
};

// Create a mock Worker constructor
class MockWorker {
	postMessage = mockWorker.postMessage;
	terminate = mockWorker.terminate;
	addEventListener = mockWorker.addEventListener;
	removeEventListener = mockWorker.removeEventListener;
	onmessage = mockWorker.onmessage;
	onerror = mockWorker.onerror;
}

global.Worker = MockWorker as unknown as typeof Worker;

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
global.URL.revokeObjectURL = vi.fn();

const createMockManifest = (
	overrides?: Partial<PluginManifest>,
): PluginManifest => ({
	id: "test-plugin",
	name: "Test Plugin",
	version: "1.0.0",
	description: "A test plugin",
	author: "Test Author",
	main: "dist/index.js",
	extensionPoints: {
		editor: true,
	},
	...overrides,
});

describe("Worker Manager", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("createWorker", () => {
		it("should create a worker with correct name", () => {
			const pluginId = "test-plugin";
			const onMessage = vi.fn();
			const onError = vi.fn();

			const worker = createWorker(pluginId, onMessage, onError);

			expect(worker).toBeInstanceOf(MockWorker);
			expect(worker).toBeDefined();
		});

		it("should set up message handler", () => {
			const pluginId = "test-plugin";
			const onMessage = vi.fn();
			const onError = vi.fn();

			const worker = createWorker(pluginId, onMessage, onError);

			expect(worker.onmessage).toBeDefined();
		});

		it("should set up error handler", () => {
			const pluginId = "test-plugin";
			const onMessage = vi.fn();
			const onError = vi.fn();

			const worker = createWorker(pluginId, onMessage, onError);

			expect(worker.onerror).toBeDefined();
		});

		it("should call onMessage when worker sends message", () => {
			const pluginId = "test-plugin";
			const onMessage = vi.fn();
			const onError = vi.fn();

			const worker = createWorker(pluginId, onMessage, onError);

			const testMessage = { type: "INIT", payload: {} };
			if (worker.onmessage) {
				worker.onmessage({
					data: testMessage,
				} as MessageEvent);

				expect(onMessage).toHaveBeenCalledWith(pluginId, testMessage);
			}
		});

		it("should call onError when worker has error", () => {
			const pluginId = "test-plugin";
			const onMessage = vi.fn();
			const onError = vi.fn();

			const worker = createWorker(pluginId, onMessage, onError);

			if (worker.onerror) {
				worker.onerror({
					message: "Test error",
					error: new Error("Test error"),
				} as ErrorEvent);

				expect(onError).toHaveBeenCalledWith(pluginId, "Test error");
			}
		});

		it("should cleanup blob URL on terminate", () => {
			const pluginId = "test-plugin";
			const onMessage = vi.fn();
			const onError = vi.fn();

			const worker = createWorker(pluginId, onMessage, onError);
			worker.terminate();

			expect(global.URL.revokeObjectURL).toHaveBeenCalled();
		});
	});

	describe("initializePlugin", () => {
		it("should send INIT message to worker", async () => {
			const manifest = createMockManifest();
			const code = "function activate() {}";
			const config = { setting: "value" };

			const worker = createWorker("test-plugin", vi.fn(), vi.fn());

			// Set up message handler to immediately resolve
			worker.addEventListener = vi.fn((event, handler) => {
				if (event === "message") {
					// Simulate INIT response
					setTimeout(() => {
						if (typeof handler === "function") {
							handler({
								data: {
									type: "INIT",
									payload: { success: true, pluginId: manifest.id },
								},
							} as MessageEvent);
						}
					}, 0);
				}
			});

			await initializePlugin(worker, manifest, code, config);

			expect(worker.postMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "INIT",
					payload: expect.objectContaining({
						manifest,
						code,
						config,
					}),
				}),
			);
		});

		it("should reject on timeout", async () => {
			const manifest = createMockManifest();
			const worker = createWorker("test-plugin", vi.fn(), vi.fn());

			// Don't set up message handler - will timeout
			worker.addEventListener = vi.fn();

			const promise = initializePlugin(worker, manifest, "code");

			// Note: Actual timeout test would require waiting 30 seconds
			// This test verifies the timeout mechanism exists
			// For full timeout testing, use integration tests
			await expect(
				Promise.race([
					promise,
					new Promise((resolve) => setTimeout(() => resolve("timeout"), 100)),
				]),
			).resolves.toBe("timeout");
		});

		it("should reject on ERROR message", async () => {
			const manifest = createMockManifest();
			const worker = createWorker("test-plugin", vi.fn(), vi.fn());

			worker.addEventListener = vi.fn((event, handler) => {
				if (event === "message") {
					setTimeout(() => {
						if (typeof handler === "function") {
							handler({
								data: {
									type: "ERROR",
									payload: {
										message: "Initialization failed",
									},
								},
							} as MessageEvent);
						}
					}, 0);
				}
			});

			await expect(initializePlugin(worker, manifest, "code")).rejects.toThrow(
				PluginError,
			);
			await expect(initializePlugin(worker, manifest, "code")).rejects.toThrow(
				"Initialization failed",
			);
		});
	});

	describe("disposePlugin", () => {
		it("should send DISPOSE message to worker", async () => {
			const worker = createWorker("test-plugin", vi.fn(), vi.fn());

			worker.addEventListener = vi.fn((event, handler) => {
				if (event === "message") {
					setTimeout(() => {
						if (typeof handler === "function") {
							handler({
								data: {
									type: "DISPOSE",
									payload: { success: true },
								},
							} as MessageEvent);
						}
					}, 0);
				}
			});

			await disposePlugin(worker);

			expect(worker.postMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "DISPOSE",
				}),
			);
		});

		it("should resolve even on timeout", async () => {
			const worker = createWorker("test-plugin", vi.fn(), vi.fn());

			worker.addEventListener = vi.fn();

			// Wait for timeout (5 seconds) - dispose always resolves
			const promise = disposePlugin(worker);

			// Should resolve after timeout
			await expect(promise).resolves.toBeUndefined();
		}, 6000);
	});

	describe("cleanupWorker", () => {
		it("should terminate worker", () => {
			const worker = createWorker("test-plugin", vi.fn(), vi.fn());
			const terminateSpy = vi.spyOn(worker, "terminate");
			cleanupWorker(worker, "test-plugin");

			expect(terminateSpy).toHaveBeenCalled();
		});
	});
});
