import CTASection from "./_components/cta-section";
import DetailedFeaturesListSection from "./_components/detailed-features-list-section";
import HeaderSection from "./_components/header-section";
import TabbedFeaturesSection from "./_components/tabbed-features-section";

export default function FeaturesPage() {
	return (
		<>
			<HeaderSection />
			<TabbedFeaturesSection />
			<DetailedFeaturesListSection />
			<CTASection />
		</>
	);
}
