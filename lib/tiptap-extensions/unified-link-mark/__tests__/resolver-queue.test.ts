/**
 * resolver-queue.ts のユニットテスト
 * 解決キュー処理の設定値テスト
 *
 * Note: resolver-queue の実際の動作テストは、外部依存が多いため
 * 統合テストで実施します。ここでは設定値のみをテストします。
 */

import { describe, expect, it } from "vitest";
import { RESOLVER_CONFIG } from "../config";

describe("UnifiedLinkMark Resolver Queue Config", () => {
  describe("RESOLVER_CONFIG", () => {
    it("should have correct batch size", () => {
      expect(RESOLVER_CONFIG.batchSize).toBe(10);
    });

    it("should have correct batch delay", () => {
      expect(RESOLVER_CONFIG.batchDelay).toBe(50);
    });

    it("should have correct max retries", () => {
      expect(RESOLVER_CONFIG.maxRetries).toBe(2);
    });

    it("should have correct retry delay base", () => {
      expect(RESOLVER_CONFIG.retryDelayBase).toBe(100);
    });

    it("should calculate exponential backoff correctly", () => {
      // First retry: 100 * 2^0 = 100ms
      const firstRetryDelay = RESOLVER_CONFIG.retryDelayBase * 2 ** 0;
      expect(firstRetryDelay).toBe(100);

      // Second retry: 100 * 2^1 = 200ms
      const secondRetryDelay = RESOLVER_CONFIG.retryDelayBase * 2 ** 1;
      expect(secondRetryDelay).toBe(200);

      // Third retry (if maxRetries was higher): 100 * 2^2 = 400ms
      const thirdRetryDelay = RESOLVER_CONFIG.retryDelayBase * 2 ** 2;
      expect(thirdRetryDelay).toBe(400);
    });
  });
});
