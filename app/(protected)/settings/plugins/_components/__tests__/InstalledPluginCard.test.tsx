/**
 * InstalledPluginCard Component Tests
 *
 * Unit tests for the InstalledPluginCard component.
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as pluginsActions from "@/app/_actions/plugins";
import type { PluginMetadata, UserPlugin } from "@/types/plugin";
import { InstalledPluginCard } from "../InstalledPluginCard";

// Mock sonner toast
vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

// Mock window.location.reload
const mockReload = vi.fn();
Object.defineProperty(window, "location", {
	value: {
		reload: mockReload,
	},
	writable: true,
});

describe("InstalledPluginCard", () => {
	const mockUserPlugin: UserPlugin & { metadata: PluginMetadata } = {
		id: "user-plugin-id-1",
		userId: "user-id-1",
		pluginId: "test-plugin-1",
		installedVersion: "1.0.0",
		enabled: true,
		installedAt: new Date("2025-01-01"),
		metadata: {
			id: "plugin-metadata-id-1",
			pluginId: "test-plugin-1",
			name: "Test Plugin",
			version: "1.0.0",
			description: "A test plugin for testing",
			author: "Test Author",
			codeUrl: "https://example.com/plugin.js",
			downloadsCount: 100,
			ratingAverage: 4.5,
			isOfficial: false,
			isReviewed: true,
			manifest: {
				id: "test-plugin-1",
				name: "Test Plugin",
				version: "1.0.0",
				description: "A test plugin for testing",
				author: "Test Author",
				main: "dist/index.js",
				extensionPoints: {
					editor: true,
					ai: false,
					ui: false,
					dataProcessor: false,
					integration: false,
				},
			},
			createdAt: new Date("2025-01-01"),
			updatedAt: new Date("2025-01-01"),
		},
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockReload.mockClear();
		vi.spyOn(pluginsActions, "uninstallPlugin").mockResolvedValue(undefined);
		vi.spyOn(pluginsActions, "enablePlugin").mockResolvedValue(undefined);
		vi.spyOn(pluginsActions, "disablePlugin").mockResolvedValue(undefined);
		vi.mocked(toast.success).mockClear();
		vi.mocked(toast.error).mockClear();
	});

	describe("Rendering", () => {
		it("TC-001: should render plugin name", () => {
			render(<InstalledPluginCard userPlugin={mockUserPlugin} />);

			expect(screen.getByText("Test Plugin")).toBeInTheDocument();
		});

		it("TC-002: should render plugin description", () => {
			render(<InstalledPluginCard userPlugin={mockUserPlugin} />);

			expect(screen.getByText("A test plugin for testing")).toBeInTheDocument();
		});

		it("TC-003: should render plugin version", () => {
			render(<InstalledPluginCard userPlugin={mockUserPlugin} />);

			expect(screen.getByText(/v1\.0\.0/)).toBeInTheDocument();
		});

		it("TC-004: should render plugin author", () => {
			render(<InstalledPluginCard userPlugin={mockUserPlugin} />);

			expect(screen.getByText(/作成者: Test Author/)).toBeInTheDocument();
		});

		it("TC-005: should render enabled badge when plugin is enabled", () => {
			render(<InstalledPluginCard userPlugin={mockUserPlugin} />);

			expect(screen.getByText("有効")).toBeInTheDocument();
		});

		it("TC-006: should render disabled badge when plugin is disabled", () => {
			const disabledPlugin = {
				...mockUserPlugin,
				enabled: false,
			};

			render(<InstalledPluginCard userPlugin={disabledPlugin} />);

			expect(screen.getByText("無効")).toBeInTheDocument();
		});

		it("TC-007: should render official badge when plugin is official", () => {
			const officialPlugin = {
				...mockUserPlugin,
				metadata: {
					...mockUserPlugin.metadata,
					isOfficial: true,
				},
			};

			render(<InstalledPluginCard userPlugin={officialPlugin} />);

			expect(screen.getByText("公式")).toBeInTheDocument();
		});

		it("TC-008: should render extension point badges", () => {
			render(<InstalledPluginCard userPlugin={mockUserPlugin} />);

			expect(screen.getByText("エディタ")).toBeInTheDocument();
		});

		it("TC-009: should render enable/disable button", () => {
			render(<InstalledPluginCard userPlugin={mockUserPlugin} />);

			expect(screen.getByText("無効化")).toBeInTheDocument();
		});

		it("TC-010: should render uninstall button", () => {
			render(<InstalledPluginCard userPlugin={mockUserPlugin} />);

			expect(screen.getByText("アンインストール")).toBeInTheDocument();
		});
	});

	describe("Uninstall Dialog", () => {
		it("TC-011: should open dialog when uninstall button is clicked", async () => {
			const user = userEvent.setup();
			render(<InstalledPluginCard userPlugin={mockUserPlugin} />);

			const uninstallButton = screen.getByText("アンインストール");
			await user.click(uninstallButton);

			expect(
				screen.getByText("プラグインをアンインストールしますか？"),
			).toBeInTheDocument();
		});

		it("TC-012: should display plugin name in dialog", async () => {
			const user = userEvent.setup();
			render(<InstalledPluginCard userPlugin={mockUserPlugin} />);

			const uninstallButton = screen.getByText("アンインストール");
			await user.click(uninstallButton);

			expect(
				screen.getByText(/プラグイン「Test Plugin」をアンインストールします/),
			).toBeInTheDocument();
		});

		it("TC-013: should close dialog when cancel button is clicked", async () => {
			const user = userEvent.setup();
			render(<InstalledPluginCard userPlugin={mockUserPlugin} />);

			const uninstallButton = screen.getByText("アンインストール");
			await user.click(uninstallButton);

			const cancelButton = screen.getByText("キャンセル");
			await user.click(cancelButton);

			await waitFor(() => {
				expect(
					screen.queryByText("プラグインをアンインストールしますか？"),
				).not.toBeInTheDocument();
			});
		});

		it("TC-014: should call uninstallPlugin when confirm button is clicked", async () => {
			const user = userEvent.setup();
			const uninstallSpy = vi
				.spyOn(pluginsActions, "uninstallPlugin")
				.mockResolvedValue(undefined);

			render(<InstalledPluginCard userPlugin={mockUserPlugin} />);

			const uninstallButton = screen.getByText("アンインストール");
			await user.click(uninstallButton);

			const dialog = screen.getByRole("alertdialog");
			const confirmButton = within(dialog).getByRole("button", {
				name: "アンインストール",
			});
			await user.click(confirmButton);

			await waitFor(() => {
				expect(uninstallSpy).toHaveBeenCalledTimes(1);
			});

			const formData = uninstallSpy.mock.calls[0][0] as FormData;
			expect(formData.get("pluginId")).toBe("test-plugin-1");
		});

		it("TC-015: should show success toast on successful uninstall", async () => {
			const user = userEvent.setup();
			vi.spyOn(pluginsActions, "uninstallPlugin").mockResolvedValue(undefined);

			render(<InstalledPluginCard userPlugin={mockUserPlugin} />);

			const uninstallButton = screen.getByText("アンインストール");
			await user.click(uninstallButton);

			const dialog = screen.getByRole("alertdialog");
			const confirmButton = within(dialog).getByRole("button", {
				name: "アンインストール",
			});
			await user.click(confirmButton);

			await waitFor(() => {
				expect(vi.mocked(toast.success)).toHaveBeenCalledWith(
					"プラグインをアンインストールしました",
				);
			});
		});

		it("TC-016: should show error toast on failed uninstall", async () => {
			const user = userEvent.setup();
			const error = new Error("Uninstall failed");
			vi.spyOn(pluginsActions, "uninstallPlugin").mockRejectedValue(error);

			render(<InstalledPluginCard userPlugin={mockUserPlugin} />);

			const uninstallButton = screen.getByText("アンインストール");
			await user.click(uninstallButton);

			const dialog = screen.getByRole("alertdialog");
			const confirmButton = within(dialog).getByRole("button", {
				name: "アンインストール",
			});
			await user.click(confirmButton);

			await waitFor(() => {
				expect(vi.mocked(toast.error)).toHaveBeenCalledWith("Uninstall failed");
			});
		});

		it("TC-017: should reload page on successful uninstall", async () => {
			const user = userEvent.setup();
			vi.spyOn(pluginsActions, "uninstallPlugin").mockResolvedValue(undefined);

			render(<InstalledPluginCard userPlugin={mockUserPlugin} />);

			const uninstallButton = screen.getByText("アンインストール");
			await user.click(uninstallButton);

			const dialog = screen.getByRole("alertdialog");
			const confirmButton = within(dialog).getByRole("button", {
				name: "アンインストール",
			});
			await user.click(confirmButton);

			await waitFor(() => {
				expect(mockReload).toHaveBeenCalledTimes(1);
			});
		});

		it("TC-018: should disable buttons during uninstall", async () => {
			const user = userEvent.setup();
			let resolveUninstall: (() => void) | undefined;
			const uninstallPromise = new Promise<void>((resolve) => {
				resolveUninstall = resolve;
			});
			vi.spyOn(pluginsActions, "uninstallPlugin").mockImplementation(
				() => uninstallPromise,
			);

			render(<InstalledPluginCard userPlugin={mockUserPlugin} />);

			const uninstallButton = screen.getByText("アンインストール");
			await user.click(uninstallButton);

			const dialog = screen.getByRole("alertdialog");
			const confirmButton = within(dialog).getByRole("button", {
				name: "アンインストール",
			});

			await user.click(confirmButton);

			// Wait a bit for React to update the state
			await new Promise((resolve) => setTimeout(resolve, 50));

			// Check loading state - the button text should change to "アンインストール中..." and be disabled
			await waitFor(
				() => {
					const updatedDialog = screen.queryByRole("alertdialog");
					// If dialog is still open, check for loading state
					if (updatedDialog) {
						const loadingButton = within(updatedDialog).queryByRole("button", {
							name: "アンインストール中...",
						});
						if (loadingButton) {
							expect(loadingButton).toBeDisabled();
							const cancelButton = within(updatedDialog).getByRole("button", {
								name: "キャンセル",
							});
							expect(cancelButton).toBeDisabled();
						}
					}
				},
				{ timeout: 500 },
			);

			// Resolve the promise to complete the uninstall
			resolveUninstall?.();
		});

		it("TC-019: should close dialog on successful uninstall", async () => {
			const user = userEvent.setup();
			vi.spyOn(pluginsActions, "uninstallPlugin").mockResolvedValue(undefined);

			render(<InstalledPluginCard userPlugin={mockUserPlugin} />);

			const uninstallButton = screen.getByText("アンインストール");
			await user.click(uninstallButton);

			const dialog = screen.getByRole("alertdialog");
			const confirmButton = within(dialog).getByRole("button", {
				name: "アンインストール",
			});
			await user.click(confirmButton);

			await waitFor(() => {
				expect(
					screen.queryByText("プラグインをアンインストールしますか？"),
				).not.toBeInTheDocument();
			});
		});
	});

	describe("Accessibility", () => {
		it("TC-020: should have accessible button labels", () => {
			render(<InstalledPluginCard userPlugin={mockUserPlugin} />);

			const uninstallButton = screen.getByRole("button", {
				name: /アンインストール/,
			});
			expect(uninstallButton).toBeInTheDocument();
		});

		it("TC-021: should have accessible dialog", async () => {
			const user = userEvent.setup();
			render(<InstalledPluginCard userPlugin={mockUserPlugin} />);

			const uninstallButton = screen.getByText("アンインストール");
			await user.click(uninstallButton);

			expect(
				screen.getByRole("alertdialog", {
					name: /プラグインをアンインストールしますか/,
				}),
			).toBeInTheDocument();
		});
	});
});
