import { type NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth/admin";
import { createClientWithUserKey } from "@/lib/llm/factory";
import { createClient } from "@/lib/supabase/server";

/**
 * PATCH /api/version-commit-staging/[id] - Process version commit staging (generate summary)
 */
export async function PATCH(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
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

		const { id } = await params;
		const stagingId = parseInt(id, 10);

		if (Number.isNaN(stagingId)) {
			return NextResponse.json(
				{ error: "Invalid staging ID" },
				{ status: 400 },
			);
		}

		// Get staging record
		const { data: staging, error: fetchError } = await supabase
			.from("version_commit_staging")
			.select("*")
			.eq("id", stagingId)
			.single();

		if (fetchError || !staging) {
			return NextResponse.json(
				{ error: "Staging record not found" },
				{ status: 404 },
			);
		}

		// Update status to processing
		await supabase
			.from("version_commit_staging")
			.update({ status: "processing" })
			.eq("id", stagingId);

		// Generate summary using LLM
		const client = await createClientWithUserKey({ provider: "google" });
		const commits = staging.commits as Array<{
			hash: string;
			author: string;
			relDate: string;
			message: string;
		}>;

		const commitMessages = commits
			.map((c) => `- ${c.message} (${c.author})`)
			.join("\n");

		const prompt = `以下のコミット履歴から、リリースノート用のサマリーを生成してください。
バージョン: ${staging.version}

コミット履歴:
${commitMessages}

サマリーは簡潔で、ユーザーにとって分かりやすい形式で記述してください。`;

		const summary = await client.generate(prompt);

		// Update staging record with summary
		const { data: updated, error: updateError } = await supabase
			.from("version_commit_staging")
			.update({
				status: "completed",
				summary: summary.trim(),
				updated_at: new Date().toISOString(),
			})
			.eq("id", stagingId)
			.select()
			.single();

		if (updateError) {
			return NextResponse.json({ error: updateError.message }, { status: 500 });
		}

		return NextResponse.json(updated);
	} catch (error) {
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Internal server error",
			},
			{ status: 500 },
		);
	}
}
