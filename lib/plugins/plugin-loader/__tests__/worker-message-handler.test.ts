/**
 * Worker Message Handler Tests
 *
 * Unit tests for the worker message handler.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as pluginAPI from "../../plugin-api";
import * as pluginRegistry from "../../plugin-registry";
import { handleWorkerMessage } from "../worker-message-handler";

const mockWorker = {
	postMessage: vi.fn(),
	terminate: vi.fn(),
	addEventListener: vi.fn(),
	removeEventListener: vi.fn(),
};

describe("handleWorkerMessage", () => {
	let workers: Map<string, Worker>;
	let createPluginAPISpy: any;
	let getPluginRegistrySpy: any;

	beforeEach(() => {
		workers = new Map();
		workers.set("test-plugin", mockWorker as unknown as Worker);
		vi.clearAllMocks();

		// Create spies
		createPluginAPISpy = vi.spyOn(pluginAPI, "createPluginAPI");
		getPluginRegistrySpy = vi.spyOn(pluginRegistry, "getPluginRegistry");
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("API_CALL message", () => {
		it("should handle API_CALL message with valid namespace and method", async () => {
			const mockAPI = {
				storage: {
					get: vi.fn().mockResolvedValue("test-value"),
				},
			};

			createPluginAPISpy.mockReturnValue(mockAPI as any);
			getPluginRegistrySpy.mockReturnValue({} as any);

			const message = {
				type: "API_CALL" as const,
				requestId: "req-1",
				payload: {
					namespace: "storage",
					method: "get",
					args: ["test-key"],
				},
			};

			handleWorkerMessage("test-plugin", message, workers);

			// Wait for async operation
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(createPluginAPISpy).toHaveBeenCalledWith("test-plugin");
			expect(mockAPI.storage.get).toHaveBeenCalledWith("test-key");
			expect(mockWorker.postMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "API_RESPONSE",
					requestId: "req-1",
					payload: expect.objectContaining({
						success: true,
						result: "test-value",
					}),
				}),
			);
		});

		it("should handle API_CALL message error", async () => {
			const mockAPI = {
				storage: {
					get: vi.fn().mockRejectedValue(new Error("Storage error")),
				},
			};

			createPluginAPISpy.mockReturnValue(mockAPI as any);
			getPluginRegistrySpy.mockReturnValue({} as any);

			const message = {
				type: "API_CALL" as const,
				requestId: "req-1",
				payload: {
					namespace: "storage",
					method: "get",
					args: ["test-key"],
				},
			};

			handleWorkerMessage("test-plugin", message, workers);

			// Wait for async operation
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(mockWorker.postMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "API_RESPONSE",
					requestId: "req-1",
					payload: expect.objectContaining({
						success: false,
						error: "Storage error",
					}),
				}),
			);
		});

		it("should log error when requestId is missing", () => {
			const message = {
				type: "API_CALL" as const,
				payload: {
					namespace: "storage",
					method: "get",
					args: ["test-key"],
				},
			};

			handleWorkerMessage("test-plugin", message, workers);

			// Should not call postMessage without requestId
			expect(mockWorker.postMessage).not.toHaveBeenCalled();
		});

		it("should handle invalid namespace", async () => {
			const mockAPI = {
				storage: {},
			};

			createPluginAPISpy.mockReturnValue(mockAPI as any);
			getPluginRegistrySpy.mockReturnValue({} as any);

			const message = {
				type: "API_CALL" as const,
				requestId: "req-1",
				payload: {
					namespace: "invalid",
					method: "get",
					args: [],
				},
			};

			handleWorkerMessage("test-plugin", message, workers);

			// Wait for async operation
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(mockWorker.postMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "API_RESPONSE",
					payload: expect.objectContaining({
						success: false,
						error: expect.stringContaining("Invalid API namespace"),
					}),
				}),
			);
		});

		it("should handle invalid method", async () => {
			const mockAPI = {
				storage: {
					// No get method
				},
			};

			createPluginAPISpy.mockReturnValue(mockAPI as any);
			getPluginRegistrySpy.mockReturnValue({} as any);

			const message = {
				type: "API_CALL" as const,
				requestId: "req-1",
				payload: {
					namespace: "storage",
					method: "invalid",
					args: [],
				},
			};

			handleWorkerMessage("test-plugin", message, workers);

			// Wait for async operation
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(mockWorker.postMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "API_RESPONSE",
					payload: expect.objectContaining({
						success: false,
						error: expect.stringContaining("Invalid API method"),
					}),
				}),
			);
		});

		it("should not send response if worker not found", async () => {
			const mockAPI = {
				storage: {
					get: vi.fn().mockResolvedValue("test-value"),
				},
			};

			createPluginAPISpy.mockReturnValue(mockAPI as any);
			getPluginRegistrySpy.mockReturnValue({} as any);

			const emptyWorkers = new Map<string, Worker>();
			const message = {
				type: "API_CALL" as const,
				requestId: "req-1",
				payload: {
					namespace: "storage",
					method: "get",
					args: ["test-key"],
				},
			};

			handleWorkerMessage("test-plugin", message, emptyWorkers);

			// Wait for async operation
			await new Promise((resolve) => setTimeout(resolve, 0));

			// Should not crash, but also shouldn't send response
			expect(mockWorker.postMessage).not.toHaveBeenCalled();
		});
	});

	describe("EVENT message", () => {
		it("should handle EVENT message", () => {
			const message = {
				type: "EVENT" as const,
				payload: {
					eventName: "test-event",
					data: { foo: "bar" },
				},
			};

			handleWorkerMessage("test-plugin", message, workers);

			// Should not throw or send response
			expect(mockWorker.postMessage).not.toHaveBeenCalled();
		});
	});

	describe("ERROR message", () => {
		it("should handle ERROR message and set error in registry", () => {
			const mockRegistry = {
				setError: vi.fn(),
			};

			getPluginRegistrySpy.mockReturnValue(mockRegistry as any);

			const message = {
				type: "ERROR" as const,
				payload: {
					message: "Plugin error",
					stack: "Error stack",
				},
			};

			handleWorkerMessage("test-plugin", message, workers);

			expect(getPluginRegistrySpy).toHaveBeenCalled();
			expect(mockRegistry.setError).toHaveBeenCalledWith(
				"test-plugin",
				"Plugin error",
			);
		});

		it("should handle ERROR message without stack", () => {
			const mockRegistry = {
				setError: vi.fn(),
			};

			getPluginRegistrySpy.mockReturnValue(mockRegistry as any);

			const message = {
				type: "ERROR" as const,
				payload: {
					message: "Plugin error",
				},
			};

			handleWorkerMessage("test-plugin", message, workers);

			expect(mockRegistry.setError).toHaveBeenCalledWith(
				"test-plugin",
				"Plugin error",
			);
		});

		it("should handle ERROR message without message", () => {
			const mockRegistry = {
				setError: vi.fn(),
			};

			getPluginRegistrySpy.mockReturnValue(mockRegistry as any);

			const message = {
				type: "ERROR" as const,
				payload: {},
			};

			handleWorkerMessage("test-plugin", message, workers);

			expect(mockRegistry.setError).toHaveBeenCalledWith(
				"test-plugin",
				"Unknown error",
			);
		});
	});

	describe("Unknown message types", () => {
		it("should handle unknown message type", () => {
			const message = {
				type: "UNKNOWN" as any,
				payload: {},
			};

			// Should not throw
			expect(() => {
				handleWorkerMessage("test-plugin", message, workers);
			}).not.toThrow();
		});
	});
});
