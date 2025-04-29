import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BrainCircuit } from "lucide-react";
import { UnauthHeader } from "@/components/unauth-header";
import { loginWithGoogle } from "@/app/_actions/auth";

export default async function LoginPage() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (user) {
		redirect("/dashboard");
	}

	return (
		<div className="flex flex-col min-h-screen bg-gray-100">
			<UnauthHeader />

			<div className="flex flex-1 items-center justify-center px-4">
				<div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
					<div className="text-center mb-6">
						<BrainCircuit className="mx-auto w-10 h-10 text-indigo-600" />
						<h1 className="text-2xl text-gray-800 font-semibold mt-4">
							アカウントにログイン
						</h1>
						<p className="text-sm text-muted-foreground mt-2">
							Googleアカウントでログインして学習を始めましょう
						</p>
					</div>
					<form action={loginWithGoogle} className="grid gap-6">
						<Button
							type="submit"
							className="w-full flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50"
						>
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
