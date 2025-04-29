import { createClient } from "@/lib/supabase/server";
import { getAccountById } from "@/app/_actions/accounts";
import { redirect } from "next/navigation";
import { DashboardSummary } from "./_components/dashboard-summary";
import { ReviewCards } from "./_components/review-cards";
import { RecentActivity } from "./_components/recent-activity";
import {
	getReviewCardsByUser,
	getRecentActivityByUser,
	getLearningLogsByUser,
} from "@/app/_actions/learning_logs";
import { getCardsByUser } from "@/app/_actions/cards";
import { getPagesByUser } from "@/app/_actions/pages";

export default async function DashboardPage() {
	const supabase = await createClient();
	// Securely fetch authenticated user
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();
	if (userError || !user) {
		redirect("/auth/login");
	}

	// Fetch user and dashboard data
	await getAccountById(user.id);
	const [pages, cards, logs, reviewCards, recentActivity] = await Promise.all([
		getPagesByUser(user.id),
		getCardsByUser(user.id),
		getLearningLogsByUser(user.id),
		getReviewCardsByUser(user.id),
		getRecentActivityByUser(user.id),
	]);

	const stats = {
		totalPages: pages.length,
		totalCards: cards.length,
		cardsToReview: reviewCards.length,
		totalPractices: logs.length,
	};

	return (
		<div className="space-y-4">
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<DashboardSummary stats={stats} />
			</div>
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
				<ReviewCards className="col-span-4" reviewCards={reviewCards || []} />
				<RecentActivity
					className="col-span-3"
					recentActivity={recentActivity || []}
				/>
			</div>
		</div>
	);
}
