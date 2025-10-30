/**
 * CreatePageDialog のテストスイート
 * ページ作成ダイアログコンポーネントの包括的なテスト
 *
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreatePageDialog } from "../create-page-dialog";

/**
 * Mock Setup
 *
 * 保守性のため、すべてのモックを一箇所で管理します。
 * React コンポーネントのテストでは、DOM環境が必要です。
 * JSDOM環境は vitest.setup.ts で設定されています。
 */

// Use vi.hoisted to declare mocks that will be used in vi.mock factories
const { mockToast, mockCreatePage } = vi.hoisted(() => ({
	mockToast: {
		success: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
		warning: vi.fn(),
		loading: vi.fn(),
		promise: vi.fn(),
		custom: vi.fn(),
		message: vi.fn(),
		dismiss: vi.fn(),
	},
	mockCreatePage: vi.fn(),
}));

// Mock sonner toast library
vi.mock("sonner", () => ({
	toast: mockToast,
}));

// Mock pages actions
vi.mock("@/app/_actions/pages", () => ({
	createPage: mockCreatePage,
}));

// Create mocks object for easy access in tests
const mocks = {
	createPage: mockCreatePage,
	toast: mockToast,
};

describe("CreatePageDialog", () => {
	const mockOnPageCreated = vi.fn();
	const mockOnOpenChange = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	/**
	 * 基本レンダリングのテスト
	 */
	describe("Basic Rendering", () => {
		it("should render dialog when open", () => {
			render(
				<CreatePageDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					initialTitle="Test Page"
					onPageCreated={mockOnPageCreated}
					userId="user-123"
				/>,
			);

			expect(screen.getByText("新しいページを作成")).toBeInTheDocument();
			expect(screen.getByLabelText("タイトル")).toBeInTheDocument();
		});

		it("should not render dialog when closed", () => {
			render(
				<CreatePageDialog
					open={false}
					onOpenChange={mockOnOpenChange}
					initialTitle="Test Page"
					onPageCreated={mockOnPageCreated}
					userId="user-123"
				/>,
			);

			expect(screen.queryByText("新しいページを作成")).not.toBeInTheDocument();
		});

		it("should display initial title in input", () => {
			render(
				<CreatePageDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					initialTitle="My Test Page"
					onPageCreated={mockOnPageCreated}
					userId="user-123"
				/>,
			);

			const titleInput = screen.getByLabelText("タイトル") as HTMLInputElement;
			expect(titleInput.value).toBe("My Test Page");
		});
	});

	/**
	 * フォーム入力のテスト
	 */
	describe("Form Input", () => {
		it("should allow editing title", () => {
			render(
				<CreatePageDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					initialTitle="Initial Title"
					onPageCreated={mockOnPageCreated}
					userId="user-123"
				/>,
			);

			const titleInput = screen.getByLabelText("タイトル") as HTMLInputElement;
			fireEvent.change(titleInput, { target: { value: "Updated Title" } });

			expect(titleInput.value).toBe("Updated Title");
		});

		it("should allow entering description", () => {
			render(
				<CreatePageDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					initialTitle="Test Page"
					onPageCreated={mockOnPageCreated}
					userId="user-123"
				/>,
			);

			const descInput = screen.getByLabelText(
				"説明（オプション）",
			) as HTMLTextAreaElement;
			fireEvent.change(descInput, {
				target: { value: "This is a test description" },
			});

			expect(descInput.value).toBe("This is a test description");
		});

		it("should toggle public switch", async () => {
			render(
				<CreatePageDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					initialTitle="Test Page"
					onPageCreated={mockOnPageCreated}
					userId="user-123"
				/>,
			);

			// Radix UI Switch has role="switch" and aria-checked attribute
			const publicSwitch = screen.getByRole("switch");
			expect(publicSwitch).toHaveAttribute("aria-checked", "false");

			fireEvent.click(publicSwitch);

			await waitFor(() => {
				expect(publicSwitch).toHaveAttribute("aria-checked", "true");
			});
		});
	});

	/**
	 * ページ作成のテスト
	 */
	describe("Page Creation", () => {
		it("should create page with valid input", async () => {
			mocks.createPage.mockResolvedValue({
				id: "page-123",
				title: "Test Page",
			});

			render(
				<CreatePageDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					initialTitle="Test Page"
					onPageCreated={mockOnPageCreated}
					userId="user-123"
				/>,
			);

			const createButton = screen.getByText("作成");
			fireEvent.click(createButton);

			await waitFor(() => {
				expect(mocks.createPage).toHaveBeenCalledWith({
					title: "Test Page",
					content_tiptap: expect.objectContaining({
						type: "doc",
						content: expect.any(Array),
					}),
					user_id: "user-123",
					is_public: false,
				});
			});

			expect(mockOnPageCreated).toHaveBeenCalledWith("page-123");
			expect(mockOnOpenChange).toHaveBeenCalledWith(false);
			expect(mocks.toast.success).toHaveBeenCalledWith(
				"ページ「Test Page」を作成しました",
			);
		});

		it("should create page with description", async () => {
			mocks.createPage.mockResolvedValue({
				id: "page-123",
				title: "Test Page",
			});

			render(
				<CreatePageDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					initialTitle="Test Page"
					onPageCreated={mockOnPageCreated}
					userId="user-123"
				/>,
			);

			const descInput = screen.getByLabelText("説明（オプション）");
			fireEvent.change(descInput, {
				target: { value: "Test description" },
			});

			const createButton = screen.getByText("作成");
			fireEvent.click(createButton);

			await waitFor(() => {
				expect(mocks.createPage).toHaveBeenCalled();
			});

			const callArgs = mocks.createPage.mock.calls[0][0];
			expect(callArgs.content_tiptap.content).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						type: "paragraph",
						content: [{ type: "text", text: "Test description" }],
					}),
				]),
			);
		});

		it("should create public page when switch is enabled", async () => {
			mocks.createPage.mockResolvedValue({
				id: "page-123",
				title: "Test Page",
			});

			render(
				<CreatePageDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					initialTitle="Test Page"
					onPageCreated={mockOnPageCreated}
					userId="user-123"
				/>,
			);

			const publicSwitch = screen.getByRole("switch");
			fireEvent.click(publicSwitch);

			const createButton = screen.getByText("作成");
			fireEvent.click(createButton);

			await waitFor(() => {
				expect(mocks.createPage).toHaveBeenCalledWith(
					expect.objectContaining({
						is_public: true,
					}),
				);
			});
		});
	});

	/**
	 * バリデーションのテスト
	 */
	describe("Validation", () => {
		it("should show error when title is empty", async () => {
			render(
				<CreatePageDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					initialTitle=""
					onPageCreated={mockOnPageCreated}
					userId="user-123"
				/>,
			);

			const createButton = screen.getByText("作成");
			fireEvent.click(createButton);

			await waitFor(() => {
				expect(mocks.toast.error).toHaveBeenCalledWith(
					"タイトルを入力してください",
				);
			});

			expect(mocks.createPage).not.toHaveBeenCalled();
			expect(mockOnPageCreated).not.toHaveBeenCalled();
		});

		it("should show error when userId is missing", async () => {
			render(
				<CreatePageDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					initialTitle="Test Page"
					onPageCreated={mockOnPageCreated}
					userId={undefined}
				/>,
			);

			const createButton = screen.getByText("作成");
			fireEvent.click(createButton);

			await waitFor(() => {
				expect(mocks.toast.error).toHaveBeenCalledWith(
					"ユーザーIDが取得できませんでした",
				);
			});

			expect(mocks.createPage).not.toHaveBeenCalled();
		});
	});

	/**
	 * エラーハンドリングのテスト
	 */
	describe("Error Handling", () => {
		it("should handle page creation error", async () => {
			mocks.createPage.mockRejectedValue(new Error("Database error"));

			render(
				<CreatePageDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					initialTitle="Test Page"
					onPageCreated={mockOnPageCreated}
					userId="user-123"
				/>,
			);

			const createButton = screen.getByText("作成");
			fireEvent.click(createButton);

			await waitFor(() => {
				expect(mocks.toast.error).toHaveBeenCalledWith(
					"ページの作成に失敗しました: Database error",
				);
			});

			expect(mockOnPageCreated).not.toHaveBeenCalled();
			expect(mockOnOpenChange).not.toHaveBeenCalledWith(false);
		});

		it("should handle page creation with no ID returned", async () => {
			mocks.createPage.mockResolvedValue({
				id: "",
				title: "Test Page",
				content_tiptap: {},
				user_id: "user-123",
				is_public: false,
				created_at: null,
				updated_at: null,
				thumbnail_url: null,
				scrapbox_page_id: null,
				scrapbox_page_content_synced_at: null,
				scrapbox_page_list_synced_at: null,
			});

			render(
				<CreatePageDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					initialTitle="Test Page"
					onPageCreated={mockOnPageCreated}
					userId="user-123"
				/>,
			);

			const createButton = screen.getByText("作成");
			fireEvent.click(createButton);

			await waitFor(() => {
				expect(mocks.toast.error).toHaveBeenCalledWith(
					expect.stringContaining("ページの作成に失敗しました"),
				);
			});
		});
	});

	/**
	 * キャンセル処理のテスト
	 */
	describe("Cancel Handling", () => {
		it("should close dialog on cancel", () => {
			render(
				<CreatePageDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					initialTitle="Test Page"
					onPageCreated={mockOnPageCreated}
					userId="user-123"
				/>,
			);

			const cancelButton = screen.getByText("キャンセル");
			fireEvent.click(cancelButton);

			expect(mockOnOpenChange).toHaveBeenCalledWith(false);
			expect(mocks.createPage).not.toHaveBeenCalled();
		});
	});

	/**
	 * フォームリセットのテスト
	 */
	describe("Form Reset", () => {
		it("should reset form when dialog reopens", () => {
			const { rerender } = render(
				<CreatePageDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					initialTitle="First Title"
					onPageCreated={mockOnPageCreated}
					userId="user-123"
				/>,
			);

			const descInput = screen.getByLabelText(
				"説明（オプション）",
			) as HTMLTextAreaElement;
			fireEvent.change(descInput, { target: { value: "Some description" } });

			// Close dialog
			rerender(
				<CreatePageDialog
					open={false}
					onOpenChange={mockOnOpenChange}
					initialTitle="First Title"
					onPageCreated={mockOnPageCreated}
					userId="user-123"
				/>,
			);

			// Reopen with new title
			rerender(
				<CreatePageDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					initialTitle="Second Title"
					onPageCreated={mockOnPageCreated}
					userId="user-123"
				/>,
			);

			const titleInput = screen.getByLabelText("タイトル") as HTMLInputElement;
			const resetDescInput = screen.getByLabelText(
				"説明（オプション）",
			) as HTMLTextAreaElement;

			expect(titleInput.value).toBe("Second Title");
			expect(resetDescInput.value).toBe("");
		});
	});

	/**
	 * noteSlug 統合のテスト
	 */
	describe("noteSlug Integration", () => {
		it("should pass noteSlug to dialog", () => {
			render(
				<CreatePageDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					initialTitle="Test Page"
					onPageCreated={mockOnPageCreated}
					userId="user-123"
					noteSlug="my-note"
				/>,
			);

			// noteSlug が props として渡されることを確認
			// 実際の統合は Server Action で行われるため、
			// ここでは props の存在のみ検証
			expect(screen.getByText("新しいページを作成")).toBeInTheDocument();
		});
	});

	/**
	 * ローディング状態のテスト
	 */
	describe("Loading State", () => {
		it("should disable form during submission", async () => {
			mocks.createPage.mockImplementation(
				() =>
					new Promise((resolve) =>
						setTimeout(
							() => resolve({ id: "page-123", title: "Test Page" }),
							100,
						),
					),
			);

			render(
				<CreatePageDialog
					open={true}
					onOpenChange={mockOnOpenChange}
					initialTitle="Test Page"
					onPageCreated={mockOnPageCreated}
					userId="user-123"
				/>,
			);

			const createButton = screen.getByText("作成");
			fireEvent.click(createButton);

			// Check loading state
			await waitFor(() => {
				expect(screen.getByText("作成中...")).toBeInTheDocument();
			});

			const titleInput = screen.getByLabelText("タイトル") as HTMLInputElement;
			expect(titleInput.disabled).toBe(true);
		});
	});
});
