/**
 * ProviderCard Component Tests
 *
 * Test Coverage:
 * - TC-001: 未設定状態の表示
 * - TC-002: 設定済み状態の表示
 * - TC-003: 設定ボタンクリック
 * - TC-004: 編集ボタンクリック
 * - TC-005: 削除ボタンクリック
 * - TC-006: ローディング状態
 * - TC-007~009: プロバイダー情報表示
 * - TC-011: ドキュメントリンククリック
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { PROVIDER_CONFIG, ProviderCard } from "../ProviderCard";

describe("ProviderCard", () => {
	describe("TC-001: 未設定状態の表示", () => {
		test("configured=falseの場合、未設定バッジが表示される", () => {
			render(
				<ProviderCard
					provider="google"
					configured={false}
					updatedAt={null}
					onConfigure={vi.fn()}
					onDelete={vi.fn()}
				/>,
			);

			expect(screen.getByText("未設定")).toBeInTheDocument();
		});

		test("[設定]ボタンが表示される", () => {
			render(
				<ProviderCard
					provider="google"
					configured={false}
					updatedAt={null}
					onConfigure={vi.fn()}
					onDelete={vi.fn()}
				/>,
			);

			expect(
				screen.getByRole("button", { name: /APIキーを設定/ }),
			).toBeInTheDocument();
		});

		test("[編集][削除]ボタンは表示されない", () => {
			render(
				<ProviderCard
					provider="google"
					configured={false}
					updatedAt={null}
					onConfigure={vi.fn()}
					onDelete={vi.fn()}
				/>,
			);

			expect(
				screen.queryByRole("button", { name: /編集/ }),
			).not.toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: /削除/ }),
			).not.toBeInTheDocument();
		});

		test("最終更新日時は表示されない", () => {
			render(
				<ProviderCard
					provider="google"
					configured={false}
					updatedAt={null}
					onConfigure={vi.fn()}
					onDelete={vi.fn()}
				/>,
			);

			expect(screen.queryByText(/最終更新/)).not.toBeInTheDocument();
		});
	});

	describe("TC-002: 設定済み状態の表示", () => {
		test("configured=trueの場合、設定済みバッジが表示される", () => {
			render(
				<ProviderCard
					provider="google"
					configured={true}
					updatedAt="2025-11-02T10:00:00Z"
					onConfigure={vi.fn()}
					onDelete={vi.fn()}
				/>,
			);

			expect(screen.getByText("設定済み")).toBeInTheDocument();
		});

		test("[編集][削除]ボタンが表示される", () => {
			render(
				<ProviderCard
					provider="google"
					configured={true}
					updatedAt="2025-11-02T10:00:00Z"
					onConfigure={vi.fn()}
					onDelete={vi.fn()}
				/>,
			);

			expect(screen.getByRole("button", { name: /編集/ })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /削除/ })).toBeInTheDocument();
		});

		test("[設定]ボタンは表示されない", () => {
			render(
				<ProviderCard
					provider="google"
					configured={true}
					updatedAt="2025-11-02T10:00:00Z"
					onConfigure={vi.fn()}
					onDelete={vi.fn()}
				/>,
			);

			expect(
				screen.queryByRole("button", { name: /設定/ }),
			).not.toBeInTheDocument();
		});

		test("最終更新日時が表示される", () => {
			render(
				<ProviderCard
					provider="google"
					configured={true}
					updatedAt="2025-11-02T15:30:45Z"
					onConfigure={vi.fn()}
					onDelete={vi.fn()}
				/>,
			);

			// 日時フォーマットは "最終更新: YYYY年MM月DD日 HH:MM" のような形式
			// タイムゾーンの違いがあるため、"最終更新:" のテキストが存在することを確認
			expect(screen.getByText(/最終更新:/)).toBeInTheDocument();
		});
	});

	describe("TC-003: 設定ボタンクリック", () => {
		test("[設定]ボタンをクリックするとonConfigureが呼ばれる", () => {
			const onConfigure = vi.fn();

			render(
				<ProviderCard
					provider="google"
					configured={false}
					updatedAt={null}
					onConfigure={onConfigure}
					onDelete={vi.fn()}
				/>,
			);

			fireEvent.click(screen.getByRole("button", { name: /APIキーを設定/ }));

			expect(onConfigure).toHaveBeenCalledTimes(1);
		});
	});

	describe("TC-004: 編集ボタンクリック", () => {
		test("[編集]ボタンをクリックするとonConfigureが呼ばれる", () => {
			const onConfigure = vi.fn();

			render(
				<ProviderCard
					provider="google"
					configured={true}
					updatedAt="2025-11-02T10:00:00Z"
					onConfigure={onConfigure}
					onDelete={vi.fn()}
				/>,
			);

			fireEvent.click(screen.getByRole("button", { name: /編集/ }));

			expect(onConfigure).toHaveBeenCalledTimes(1);
		});
	});

	describe("TC-005: 削除ボタンクリック", () => {
		test("[削除]ボタンをクリックするとonDeleteが呼ばれる", () => {
			const onDelete = vi.fn();

			render(
				<ProviderCard
					provider="google"
					configured={true}
					updatedAt="2025-11-02T10:00:00Z"
					onConfigure={vi.fn()}
					onDelete={onDelete}
				/>,
			);

			fireEvent.click(screen.getByRole("button", { name: /削除/ }));

			expect(onDelete).toHaveBeenCalledTimes(1);
		});
	});

	describe("TC-006: ローディング状態", () => {
		test("isLoading=trueの場合、ローディングオーバーレイが表示される", () => {
			const { container } = render(
				<ProviderCard
					provider="google"
					configured={false}
					updatedAt={null}
					onConfigure={vi.fn()}
					onDelete={vi.fn()}
					isLoading={true}
				/>,
			);

			// Loader2 アイコンが表示される
			const loader = container.querySelector(".animate-spin");
			expect(loader).toBeInTheDocument();
		});

		test("isLoading=trueの場合、すべてのボタンが無効化される", () => {
			render(
				<ProviderCard
					provider="google"
					configured={false}
					updatedAt={null}
					onConfigure={vi.fn()}
					onDelete={vi.fn()}
					isLoading={true}
				/>,
			);

			const button = screen.getByRole("button", { name: /APIキーを設定/ });
			expect(button).toBeDisabled();
		});
	});

	describe("TC-007: プロバイダー情報表示（Google）", () => {
		test("Googleプロバイダーの情報が正しく表示される", () => {
			render(
				<ProviderCard
					provider="google"
					configured={false}
					updatedAt={null}
					onConfigure={vi.fn()}
					onDelete={vi.fn()}
				/>,
			);

			const config = PROVIDER_CONFIG.google;

			expect(screen.getByText(config.name)).toBeInTheDocument();
			expect(screen.getByText(config.description)).toBeInTheDocument();

			const link = screen.getByRole("link", { name: /ドキュメントを見る/ });
			expect(link).toHaveAttribute("href", config.docsUrl);
		});
	});

	describe("TC-008: プロバイダー情報表示（OpenAI）", () => {
		test("OpenAIプロバイダーの情報が正しく表示される", () => {
			render(
				<ProviderCard
					provider="openai"
					configured={false}
					updatedAt={null}
					onConfigure={vi.fn()}
					onDelete={vi.fn()}
				/>,
			);

			const config = PROVIDER_CONFIG.openai;

			expect(screen.getByText(config.name)).toBeInTheDocument();
			expect(screen.getByText(config.description)).toBeInTheDocument();

			const link = screen.getByRole("link", { name: /ドキュメントを見る/ });
			expect(link).toHaveAttribute("href", config.docsUrl);
		});
	});

	describe("TC-009: プロバイダー情報表示（Anthropic）", () => {
		test("Anthropicプロバイダーの情報が正しく表示される", () => {
			render(
				<ProviderCard
					provider="anthropic"
					configured={false}
					updatedAt={null}
					onConfigure={vi.fn()}
					onDelete={vi.fn()}
				/>,
			);

			const config = PROVIDER_CONFIG.anthropic;

			expect(screen.getByText(config.name)).toBeInTheDocument();
			expect(screen.getByText(config.description)).toBeInTheDocument();

			const link = screen.getByRole("link", { name: /ドキュメントを見る/ });
			expect(link).toHaveAttribute("href", config.docsUrl);
		});
	});

	describe("TC-011: ドキュメントリンククリック", () => {
		test("ドキュメントリンクが新しいタブで開く", () => {
			render(
				<ProviderCard
					provider="google"
					configured={false}
					updatedAt={null}
					onConfigure={vi.fn()}
					onDelete={vi.fn()}
				/>,
			);

			const link = screen.getByRole("link", { name: /ドキュメントを見る/ });

			expect(link).toHaveAttribute("target", "_blank");
			expect(link).toHaveAttribute("rel", "noopener noreferrer");
		});
	});

	describe("Integration: 様々な状態の組み合わせ", () => {
		test("設定済み + ローディング", () => {
			const { container } = render(
				<ProviderCard
					provider="google"
					configured={true}
					updatedAt="2025-11-02T10:00:00Z"
					onConfigure={vi.fn()}
					onDelete={vi.fn()}
					isLoading={true}
				/>,
			);

			// ローディングオーバーレイ表示
			expect(container.querySelector(".animate-spin")).toBeInTheDocument();

			// ボタンが無効化
			expect(screen.getByRole("button", { name: /編集/ })).toBeDisabled();
			expect(screen.getByRole("button", { name: /削除/ })).toBeDisabled();
		});

		test("未設定 + ローディング", () => {
			render(
				<ProviderCard
					provider="google"
					configured={false}
					updatedAt={null}
					onConfigure={vi.fn()}
					onDelete={vi.fn()}
					isLoading={true}
				/>,
			);

			// ボタンが無効化
			expect(
				screen.getByRole("button", { name: /APIキーを設定/ }),
			).toBeDisabled();
		});
	});
});
