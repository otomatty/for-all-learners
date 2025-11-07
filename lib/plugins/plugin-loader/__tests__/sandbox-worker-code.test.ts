/**
 * Sandbox Worker Code Tests
 *
 * Unit tests for the sandbox worker code generator.
 */

import { describe, expect, it } from "vitest";
import { getSandboxWorkerCode } from "../sandbox-worker-code";

describe("getSandboxWorkerCode", () => {
	it("should return a non-empty string", () => {
		const code = getSandboxWorkerCode();

		expect(code).toBeDefined();
		expect(typeof code).toBe("string");
		expect(code.length).toBeGreaterThan(0);
	});

	it("should contain MessageTypes definition", () => {
		const code = getSandboxWorkerCode();

		expect(code).toContain("MessageTypes");
		expect(code).toContain("INIT");
		expect(code).toContain("CALL_METHOD");
		expect(code).toContain("DISPOSE");
		expect(code).toContain("API_CALL");
		expect(code).toContain("API_RESPONSE");
		expect(code).toContain("EVENT");
		expect(code).toContain("ERROR");
	});

	it("should contain callHostAPI function", () => {
		const code = getSandboxWorkerCode();

		expect(code).toContain("callHostAPI");
		expect(code).toContain("postMessage");
		expect(code).toContain("timeout");
	});

	it("should contain createPluginAPIProxy function", () => {
		const code = getSandboxWorkerCode();

		expect(code).toContain("createPluginAPIProxy");
		expect(code).toContain("app");
		expect(code).toContain("storage");
		expect(code).toContain("notifications");
		expect(code).toContain("ui");
	});

	it("should contain handleInit function", () => {
		const code = getSandboxWorkerCode();

		expect(code).toContain("handleInit");
		expect(code).toContain("importScripts");
		expect(code).toContain("blobUrl");
	});

	it("should contain handleCallMethod function", () => {
		const code = getSandboxWorkerCode();

		expect(code).toContain("handleCallMethod");
		expect(code).toContain("pluginInstance");
	});

	it("should contain handleDispose function", () => {
		const code = getSandboxWorkerCode();

		expect(code).toContain("handleDispose");
	});

	it("should contain main message handler", () => {
		const code = getSandboxWorkerCode();

		expect(code).toContain("self.onmessage");
	});

	it("should contain error handlers", () => {
		const code = getSandboxWorkerCode();

		expect(code).toContain("self.onerror");
		expect(code).toContain("self.onunhandledrejection");
	});

	it("should use blob URL and importScripts (security improvement)", () => {
		const code = getSandboxWorkerCode();

		expect(code).toContain("importScripts");
		expect(code).toContain("blobUrl");
		expect(code).toContain("URL.createObjectURL");
		expect(code).toContain("URL.revokeObjectURL");
		// Should not contain eval or new Function
		expect(code).not.toContain("eval(");
		expect(code).not.toContain("new Function(");
	});

	it("should be wrapped in IIFE", () => {
		const code = getSandboxWorkerCode();

		expect(code.trim()).toMatch(/^\(function\(\)/);
		expect(code).toContain("'use strict'");
	});

	it("should return consistent code on multiple calls", () => {
		const code1 = getSandboxWorkerCode();
		const code2 = getSandboxWorkerCode();

		expect(code1).toBe(code2);
	});
});
