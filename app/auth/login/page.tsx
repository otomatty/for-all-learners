import { redirect } from "next/navigation";
import { UnauthHeader } from "@/components/auth/UnauthHeader";
import { createClient } from "@/lib/supabase/server";
import pkg from "../../../package.json";
import { LoginForm } from "./_components/LoginForm";

const version = pkg.version;

// ページコンポーネントの props に searchParams を追加
export default async function LoginPage({
	searchParams,
}: {
	searchParams: Promise<{
		message?: string;
		error?: string;
		error_description?: string;
	}>;
}) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (user) {
		redirect("/dashboard");
	}

	const resolvedSearchParams = await searchParams;

	return (
		<div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
			<UnauthHeader version={version} />

			<div className="flex flex-1 items-center justify-center px-4">
				<LoginForm
					message={resolvedSearchParams.message}
					error={resolvedSearchParams.error}
					errorDescription={resolvedSearchParams.error_description}
				/>
			</div>
		</div>
	);
}
