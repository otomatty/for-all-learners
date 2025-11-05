/**
 * Parse search params for plugin signatures page
 */

export interface ParsedSignatureSearchParams {
	page: number;
	limit: number;
	sortBy: "name" | "signed_at" | "signature_algorithm";
	sortOrder: "asc" | "desc";
	searchQuery?: string;
	hasSignature?: boolean;
	algorithm?: "ed25519" | "rsa";
}

export function parseSignatureSearchParams(searchParams?: {
	[key: string]: string | string[] | undefined;
}): ParsedSignatureSearchParams {
	const page = searchParams?.page ? Number(searchParams.page) : 1;
	const limit = searchParams?.limit ? Number(searchParams.limit) : 50;
	const sortBy =
		(searchParams?.sortBy as "name" | "signed_at" | "signature_algorithm") ||
		"name";
	const sortOrder = (searchParams?.sortOrder as "asc" | "desc") || "asc";
	const searchQuery =
		typeof searchParams?.searchQuery === "string"
			? searchParams.searchQuery
			: undefined;

	let hasSignature: boolean | undefined;
	if (searchParams?.hasSignature === "true") {
		hasSignature = true;
	} else if (searchParams?.hasSignature === "false") {
		hasSignature = false;
	}

	const algorithm =
		typeof searchParams?.algorithm === "string" &&
		["ed25519", "rsa"].includes(searchParams.algorithm)
			? (searchParams.algorithm as "ed25519" | "rsa")
			: undefined;

	return {
		page: Math.max(1, page),
		limit: Math.max(1, Math.min(100, limit)),
		sortBy,
		sortOrder,
		searchQuery,
		hasSignature,
		algorithm,
	};
}
