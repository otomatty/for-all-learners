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
			// Wait a bit so executionTime increases
			await new Promise((resolve) => setTimeout(resolve, 10));
			const stats1 = monitor.getExecutionStats("test-plugin");
			const executionTime1 = stats1?.executionTime || 0;

			// Start monitoring again - should reset execution time
			monitor.startMonitoring("test-plugin", worker2);
			const stats2 = monitor.getExecutionStats("test-plugin");
			const executionTime2 = stats2?.executionTime || 0;

			// Stats should be reset (new start time), so executionTime2 should be less than executionTime1
			expect(executionTime2).toBeLessThan(executionTime1);
			expect(executionTime1).toBeGreaterThan(0); // Make sure first execution time was actually greater than 0
		});
	});

	describe("updateActivity", () => {
		it("should update last activity time", async () => {
			const worker = createMockWorker();
			monitor.startMonitoring("test-plugin", worker);

			// Wait a bit so idleTime increases
			await new Promise((resolve) => setTimeout(resolve, 10));
			const stats1 = monitor.getExecutionStats("test-plugin");
			const idleTime1 = stats1?.idleTime || 0;

			// Update activity should reset idleTime
			monitor.updateActivity("test-plugin");

			// Wait a bit more
			await new Promise((resolve) => setTimeout(resolve, 5));
			const stats2 = monitor.getExecutionStats("test-plugin");
			const idleTime2 = stats2?.idleTime || 0;

			// idleTime2 should be less than idleTime1 (or at least not greater)
			// After updateActivity, idleTime resets, so even after waiting, it should be less
			expect(idleTime2).toBeLessThan(idleTime1);
			expect(idleTime1).toBeGreaterThan(0); // Make sure first idle time was actually greater than 0
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

