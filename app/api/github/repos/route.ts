/**
 * GitHub Repositories API Route
 *
 * Server-side proxy for fetching GitHub user repositories.
 * This avoids CORS issues when calling GitHub API from the browser.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ app/(protected)/settings/plugins/_components/custom-widgets/GitHubUserSelector.tsx
 *
 * Dependencies:
 *   └─ Next.js API Routes
 *
 * Related Documentation:
 *   └─ Issue: docs/01_issues/open/2025_11/20251106_01_github-commit-stats-plugin-enhancement.md
 */

import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const username = searchParams.get("username");
		const token = searchParams.get("token");

		if (!username) {
			return NextResponse.json(
				{ error: "Username is required" },
				{ status: 400 },
			);
		}

		if (!token) {
			return NextResponse.json(
				{ error: "GitHub token is required" },
				{ status: 400 },
			);
		}

		// Fetch user's repositories from GitHub API
		const apiUrl = `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`;

		const response = await fetch(apiUrl, {
			headers: {
				Accept: "application/vnd.github.v3+json",
				Authorization: `Bearer ${token}`,
				"User-Agent": "F.A.L-Plugin-System", // GitHub API requires User-Agent
			},
		});

		if (!response.ok) {
			const _errorText = await response.text().catch(() => "");
			let errorMessage = "";

			if (response.status === 404) {
				errorMessage = `User "${username}" not found`;
			} else if (response.status === 401) {
				errorMessage = "Invalid GitHub authentication token";
			} else if (response.status === 403) {
				errorMessage = "Access denied. Please check token permissions";
			} else if (response.status === 429) {
				errorMessage = "Rate limit exceeded. Please try again later";
			} else {
				errorMessage = `GitHub API error (${response.status}): ${response.statusText}`;
			}

			return NextResponse.json(
				{ error: errorMessage, status: response.status },
				{ status: response.status },
			);
		}

		const repos = await response.json();

		if (!Array.isArray(repos)) {
			return NextResponse.json(
				{ error: "Unexpected response format from GitHub API" },
				{ status: 500 },
			);
		}

		// Transform to simpler format
		const repoList = repos.map((repo: { full_name: string; name: string }) => ({
			full_name: repo.full_name,
			name: repo.name,
		}));

		return NextResponse.json({ repos: repoList });
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Failed to fetch repositories";
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}
