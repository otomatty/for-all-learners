import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BrainCircuit } from "lucide-react";
import { UnauthHeader } from "@/components/unauth-header";
import { loginWithGoogle } from "@/app/_actions/auth";
import { version } from "../../../package.json";

export default async function LoginPage() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (user) {
		redirect("/dashboard");
	}

	return (
		<div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
			<UnauthHeader version={version} />

			<div className="flex flex-1 items-center justify-center px-4">
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 w-full max-w-md">
					<div className="text-center mb-6">
						<BrainCircuit className="mx-auto w-10 h-10 text-indigo-600 dark:text-indigo-400" />
						<h1 className="text-2xl text-gray-800 dark:text-gray-200 font-semibold mt-4">
							アカウントにログイン
						</h1>
						<p className="text-sm text-muted-foreground mt-2">
							Googleアカウントでログインして学習を始めましょう
						</p>
					</div>
					<form action={loginWithGoogle} className="grid gap-6">
						<Button type="submit" variant="outline">
							<img
								src="/images/google-logo.svg"
								alt="Google Logo"
								className="w-5 h-5"
							/>
							<span>Googleでログイン</span>
						</Button>
					</form>
				</div>
			</div>
		</div>
	);
}
