import { type NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/version-commit-staging - Create a new version commit staging record
 */
export async function POST(request: NextRequest) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Check admin status
		const adminCheck = await isAdmin();
		if (!adminCheck) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const body = await request.json();
		const { version, commits } = body;

		if (!version || !commits) {
			return NextResponse.json(
				{ error: "version and commits are required" },
				{ status: 400 },
			);
		}

		const { data, error } = await supabase
			.from("version_commit_staging")
			.insert({
				version,
				commits,
				status: "pending",
			})
			.select()
			.single();

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json(data);
	} catch (error) {
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Internal server error",
			},
			{ status: 500 },
		);
	}
}

/**
 * GET /api/version-commit-staging?version=xxx - Get version commit staging by version
 */
export async function GET(request: NextRequest) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Check admin status
		const adminCheck = await isAdmin();
		if (!adminCheck) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const searchParams = request.nextUrl.searchParams;
		const version = searchParams.get("version");

		if (!version) {
			return NextResponse.json(
				{ error: "version parameter is required" },
				{ status: 400 },
			);
		}

		const { data, error } = await supabase
			.from("version_commit_staging")
			.select("*")
			.eq("version", version)
			.order("created_at", { ascending: false })
			.limit(1)
			.single();

		if (error) {
			if (error.code === "PGRST116") {
				// No rows found
				return NextResponse.json(null);
			}
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json(data);
	} catch (error) {
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Internal server error",
			},
			{ status: 500 },
		);
	}
}
