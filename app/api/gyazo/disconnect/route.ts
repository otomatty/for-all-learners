import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
	const supabase = await createClient();
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();
	if (userError || !user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { error } = await supabase
		.from("user_gyazo_tokens")
		.delete()
		.eq("user_id", user.id);
	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	return NextResponse.json({ success: true });
}
