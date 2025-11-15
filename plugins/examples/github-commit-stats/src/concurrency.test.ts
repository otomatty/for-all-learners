import { describe, expect, it, vi } from "vitest";

import { createConcurrencyLimiter } from "./concurrency";

describe("createConcurrencyLimiter", () => {
	it("throws when constructed with an invalid max concurrent value", () => {
		expect(() => createConcurrencyLimiter(0)).toThrow(/maxConcurrent/);
		expect(() => createConcurrencyLimiter(-1)).toThrow(/maxConcurrent/);
		expect(() => createConcurrencyLimiter(1.5)).toThrow(/maxConcurrent/);
	});

	it("caps in-flight tasks to the configured maximum", async () => {
		const limiter = createConcurrencyLimiter(3);
		let activeTasks = 0;
		let observedPeak = 0;

		const fakeCall = vi.fn(async (index: number) => {
			activeTasks += 1;
			observedPeak = Math.max(observedPeak, activeTasks);

			await new Promise((resolve) => {
				setTimeout(resolve, 5);
			});

			activeTasks -= 1;
			return index;
		});

		const limitedCall = (payload: number) =>
			limiter.run(() => fakeCall(payload));

		const results = await Promise.all(
			Array.from({ length: 10 }, (_, index) => limitedCall(index)),
		);

		expect(results).toEqual(Array.from({ length: 10 }, (_, index) => index));
		expect(fakeCall).toHaveBeenCalledTimes(10);
		expect(observedPeak).toBeLessThanOrEqual(3);
		expect(limiter.getActiveCount()).toBe(0);
	});
});
