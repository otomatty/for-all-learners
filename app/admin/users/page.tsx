import { ActiveUsersCard } from "@/app/admin/_components/ActiveUsersCard";
import { NewUsersCard } from "@/app/admin/_components/NewUsersCard";
import { SupabaseStatusCard } from "@/app/admin/_components/SupabaseStatusCard";
import { VercelStatusCard } from "@/app/admin/_components/VercelStatusCard";
import { createAdminClient } from "@/lib/supabase/adminClient";
import { createClient } from "@/lib/supabase/server";
import { UsersPageClient } from "./_components/UsersPageClient";
import type { AccountWithAuth } from "./_components/UsersTable";
import { UsersTable } from "./_components/UsersTable";

export default async function UsersPage() {
	const isStaticExport = Boolean(process.env.ENABLE_STATIC_EXPORT);

	if (isStaticExport) {
		return <UsersPageClient />;
	}

	const supabase = await createClient();

	// Fetch accounts from public.accounts
	const { data: accounts, error: acctErr } = await supabase
		.from("accounts")
		.select("id, full_name, email, gender, birthdate, avatar_url, user_slug")
		.order("id", { ascending: true });
	if (acctErr || !accounts) throw acctErr;

	// Fetch auth users metadata (registration, last login) using admin client
	const supabaseAdmin = createAdminClient();
	const { data: authData, error: authErr } =
		await supabaseAdmin.auth.admin.listUsers();
	if (authErr || !authData?.users) throw authErr;
	const authUsers = authData.users;

	// Combine account records with auth metadata
	const users: AccountWithAuth[] = accounts.map((acct) => {
		// pick only the six fields we need from the account row
		const { id, full_name, email, gender, birthdate, avatar_url, user_slug } =
			acct;
		const authUser = authUsers.find((u) => u.id === id);
		return {
			id,
			full_name,
			email,
			gender,
			birthdate,
			avatar_url,
			user_slug,
			registered_at: authUser?.created_at ?? null,
			last_sign_in_at: authUser?.last_sign_in_at ?? null,
		};
	});

	return (
		<div>
			{/* Metrics Cards */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
				<ActiveUsersCard />
				<NewUsersCard />
				<SupabaseStatusCard />
				<VercelStatusCard />
			</div>

			{/* Users Table */}
			<UsersTable users={users} />
		</div>
	);
}
