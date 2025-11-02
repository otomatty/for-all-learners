/**
 * APIKeyStatusBadge Component Tests
 *
 * Test Coverage:
 * - TC-001: 設定済み状態の表示
 * - TC-002: 未設定状態の表示
 * - TC-003: カスタムクラス名適用
 * - TC-005: アクセシビリティ
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { APIKeyStatusBadge } from "../APIKeyStatusBadge";

describe("APIKeyStatusBadge", () => {
	describe("TC-001: 設定済み状態の表示", () => {
		test("configured=trueの場合、設定済みバッジが表示される", () => {
			render(<APIKeyStatusBadge configured={true} />);

			const badge = screen.getByText("設定済み");
			expect(badge).toBeInTheDocument();
		});

		test("チェックマークアイコンが表示される", () => {
			const { container } = render(<APIKeyStatusBadge configured={true} />);

			// lucide-react の Check アイコンは svg 要素
			const svg = container.querySelector("svg");
			expect(svg).toBeInTheDocument();
			expect(svg).toHaveAttribute("aria-hidden", "true");
		});

		test("success バリアントが適用される", () => {
			const { container } = render(<APIKeyStatusBadge configured={true} />);

			const badge = container.querySelector('[data-slot="badge"]');
			expect(badge).toHaveClass("bg-green-100");
			expect(badge).toHaveClass("text-green-800");
		});
	});

	describe("TC-002: 未設定状態の表示", () => {
		test("configured=falseの場合、未設定バッジが表示される", () => {
			render(<APIKeyStatusBadge configured={false} />);

			const badge = screen.getByText("未設定");
			expect(badge).toBeInTheDocument();
		});

		test("アイコンは表示されない", () => {
			const { container } = render(<APIKeyStatusBadge configured={false} />);

			const svg = container.querySelector("svg");
			expect(svg).not.toBeInTheDocument();
		});

		test("secondary バリアントが適用される", () => {
			const { container } = render(<APIKeyStatusBadge configured={false} />);

			const badge = container.querySelector('[data-slot="badge"]');
			expect(badge).toHaveClass("bg-secondary");
			expect(badge).toHaveClass("text-secondary-foreground");
		});
	});

	describe("TC-003: カスタムクラス名適用", () => {
		test("configured=true の場合、カスタムクラス名が適用される", () => {
			const { container } = render(
				<APIKeyStatusBadge configured={true} className="ml-2 mt-4" />,
			);

			const badge = container.querySelector('[data-slot="badge"]');
			expect(badge).toHaveClass("ml-2");
			expect(badge).toHaveClass("mt-4");
		});

		test("configured=false の場合、カスタムクラス名が適用される", () => {
			const { container } = render(
				<APIKeyStatusBadge configured={false} className="ml-auto" />,
			);

			const badge = container.querySelector('[data-slot="badge"]');
			expect(badge).toHaveClass("ml-auto");
		});

		test("デフォルトのスタイルは維持される", () => {
			const { container } = render(
				<APIKeyStatusBadge configured={true} className="custom-class" />,
			);

			const badge = container.querySelector('[data-slot="badge"]');
			// デフォルトクラス（gap-1）が維持される
			expect(badge).toHaveClass("gap-1");
			// カスタムクラスも適用される
			expect(badge).toHaveClass("custom-class");
		});
	});

	describe("TC-005: アクセシビリティ", () => {
		test("設定済みバッジのテキストが正しく読み取れる", () => {
			render(<APIKeyStatusBadge configured={true} />);

			// スクリーンリーダーが "設定済み" を読み上げる
			expect(screen.getByText("設定済み")).toBeInTheDocument();
		});

		test("未設定バッジのテキストが正しく読み取れる", () => {
			render(<APIKeyStatusBadge configured={false} />);

			// スクリーンリーダーが "未設定" を読み上げる
			expect(screen.getByText("未設定")).toBeInTheDocument();
		});

		test("アイコンは装飾として扱われる（aria-hidden）", () => {
			const { container } = render(<APIKeyStatusBadge configured={true} />);

			const svg = container.querySelector("svg");
			expect(svg).toHaveAttribute("aria-hidden", "true");
		});
	});

	describe("Integration: 様々な状態の組み合わせ", () => {
		test("設定済み + カスタムクラス", () => {
			const { container } = render(
				<APIKeyStatusBadge configured={true} className="test-class" />,
			);

			const badge = screen.getByText("設定済み");
			expect(badge).toBeInTheDocument();
			expect(container.querySelector('[data-slot="badge"]')).toHaveClass(
				"test-class",
			);
		});

		test("未設定 + カスタムクラス", () => {
			const { container } = render(
				<APIKeyStatusBadge configured={false} className="another-class" />,
			);

			const badge = screen.getByText("未設定");
			expect(badge).toBeInTheDocument();
			expect(container.querySelector('[data-slot="badge"]')).toHaveClass(
				"another-class",
			);
		});
	});
});
