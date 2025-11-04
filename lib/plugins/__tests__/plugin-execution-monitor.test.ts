/**
 * Plugin Execution Monitor Tests
 *
 * Unit tests for plugin execution monitoring functionality.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPluginExecutionMonitor } from "../plugin-execution-monitor";

// Mock Worker
const createMockWorker = (): Worker => {
	return {
		postMessage: vi.fn(),
		terminate: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		onmessage: null,
		onerror: null,
	} as unknown as Worker;
};

describe("PluginExecutionMonitor", () => {
	let monitor: ReturnType<typeof getPluginExecutionMonitor>;

	beforeEach(() => {
		monitor = getPluginExecutionMonitor();
		monitor.reset();
	});

	afterEach(() => {
		monitor.reset();
	});

	describe("startMonitoring", () => {
		it("should start monitoring a plugin", () => {
			const worker = createMockWorker();
			monitor.startMonitoring("test-plugin", worker);

			const stats = monitor.getExecutionStats("test-plugin");
			expect(stats).not.toBeNull();
			expect(stats?.executionTime).toBeGreaterThanOrEqual(0);
		});

		it("should replace existing monitoring when starting again", async () => {
			const worker1 = createMockWorker();
			const worker2 = createMockWorker();

			monitor.startMonitoring("test-plugin", worker1);
			const stats1 = monitor.getExecutionStats("test-plugin");

			// Wait a bit
			await new Promise((resolve) => setTimeout(resolve, 10));

			monitor.startMonitoring("test-plugin", worker2);
			const stats2 = monitor.getExecutionStats("test-plugin");

			// Stats should be reset (new start time)
			expect(stats2?.executionTime).toBeLessThan(stats1?.executionTime || 0);
		});
	});

	describe("updateActivity", () => {
		it("should update last activity time", async () => {
			const worker = createMockWorker();
			monitor.startMonitoring("test-plugin", worker);

			const stats1 = monitor.getExecutionStats("test-plugin");
			const idleTime1 = stats1?.idleTime || 0;

			// Wait a bit
			await new Promise((resolve) => setTimeout(resolve, 10));

			monitor.updateActivity("test-plugin");

			const stats2 = monitor.getExecutionStats("test-plugin");
			const idleTime2 = stats2?.idleTime || 0;

			expect(idleTime2).toBeLessThan(idleTime1);
		});

		it("should not throw if plugin is not monitored", () => {
			expect(() => {
				monitor.updateActivity("non-existent-plugin");
			}).not.toThrow();
		});
	});

	describe("stopMonitoring", () => {
		it("should stop monitoring a plugin", () => {
			const worker = createMockWorker();
			monitor.startMonitoring("test-plugin", worker);

			monitor.stopMonitoring("test-plugin");

			const stats = monitor.getExecutionStats("test-plugin");
			expect(stats).toBeNull();
		});

		it("should not throw if plugin is not monitored", () => {
			expect(() => {
				monitor.stopMonitoring("non-existent-plugin");
			}).not.toThrow();
		});
	});

	describe("getExecutionStats", () => {
		it("should return execution stats for monitored plugin", () => {
			const worker = createMockWorker();
			monitor.startMonitoring("test-plugin", worker);

			const stats = monitor.getExecutionStats("test-plugin");

			expect(stats).not.toBeNull();
			expect(stats?.executionTime).toBeGreaterThanOrEqual(0);
			expect(stats?.idleTime).toBeGreaterThanOrEqual(0);
		});

		it("should return null for non-monitored plugin", () => {
			const stats = monitor.getExecutionStats("non-existent-plugin");
			expect(stats).toBeNull();
		});
	});

	describe("reset", () => {
		it("should reset all monitoring", () => {
			const worker1 = createMockWorker();
			const worker2 = createMockWorker();

			monitor.startMonitoring("plugin-1", worker1);
			monitor.startMonitoring("plugin-2", worker2);

			monitor.reset();

			expect(monitor.getExecutionStats("plugin-1")).toBeNull();
			expect(monitor.getExecutionStats("plugin-2")).toBeNull();
		});
	});
});

