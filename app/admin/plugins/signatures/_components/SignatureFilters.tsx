"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface SignatureFiltersProps {
	initialFilters: {
		searchQuery?: string;
		hasSignature?: boolean;
		algorithm?: "ed25519" | "rsa";
	};
}

export function SignatureFilters({ initialFilters }: SignatureFiltersProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const [searchQuery, setSearchQuery] = useState(
		initialFilters.searchQuery || "",
	);
	const [hasSignature, setHasSignature] = useState<boolean | undefined>(
		initialFilters.hasSignature,
	);
	const [algorithm, setAlgorithm] = useState<"ed25519" | "rsa" | undefined>(
		initialFilters.algorithm,
	);

	const applyFilters = () => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("page", "1");

		if (searchQuery.trim()) {
			params.set("searchQuery", searchQuery.trim());
		} else {
			params.delete("searchQuery");
		}

		if (hasSignature !== undefined) {
			params.set("hasSignature", hasSignature.toString());
		} else {
			params.delete("hasSignature");
		}

		if (algorithm) {
			params.set("algorithm", algorithm);
		} else {
			params.delete("algorithm");
		}

		startTransition(() => {
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	const clearFilters = () => {
		setSearchQuery("");
		setHasSignature(undefined);
		setAlgorithm(undefined);
		const params = new URLSearchParams();
		params.set("page", "1");
		startTransition(() => {
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	const hasActiveFilters =
		searchQuery.trim() || hasSignature !== undefined || algorithm !== undefined;

	return (
		<div className="p-4 border rounded-lg bg-card">
			<div className="grid gap-4 grid-cols-1 md:grid-cols-4">
				<div className="space-y-2">
					<Label htmlFor="search">検索</Label>
					<div className="relative">
						<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
						<Input
							id="search"
							placeholder="プラグイン名、ID、作者..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									applyFilters();
								}
							}}
							className="pl-8"
						/>
					</div>
				</div>

				<div className="space-y-2">
					<Label htmlFor="hasSignature">署名状態</Label>
					<Select
						value={
							hasSignature === undefined
								? "all"
								: hasSignature
									? "signed"
									: "unsigned"
						}
						onValueChange={(value) => {
							if (value === "all") {
								setHasSignature(undefined);
							} else {
								setHasSignature(value === "signed");
							}
						}}
					>
						<SelectTrigger id="hasSignature">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">すべて</SelectItem>
							<SelectItem value="signed">署名済み</SelectItem>
							<SelectItem value="unsigned">未署名</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-2">
					<Label htmlFor="algorithm">署名アルゴリズム</Label>
					<Select
						value={algorithm || "all"}
						onValueChange={(value) => {
							if (value === "all") {
								setAlgorithm(undefined);
							} else {
								setAlgorithm(value as "ed25519" | "rsa");
							}
						}}
					>
						<SelectTrigger id="algorithm">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">すべて</SelectItem>
							<SelectItem value="ed25519">Ed25519</SelectItem>
							<SelectItem value="rsa">RSA</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className="flex items-end gap-2">
					<Button
						onClick={applyFilters}
						disabled={isPending}
						className="flex-1"
					>
						適用
					</Button>
					{hasActiveFilters && (
						<Button
							variant="outline"
							onClick={clearFilters}
							disabled={isPending}
							size="icon"
						>
							<X className="h-4 w-4" />
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}

