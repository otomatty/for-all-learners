import { Brain, Clock, Users } from "lucide-react";
import HeroSection from "./_components/hero-section";
import FeatureSection from "./_components/feature-section";
import TestimonialSection from "./_components/testimonial-section";
import PricingSection from "./_components/pricing-section";
import FAQSection from "./_components/faq-section";
import CTASection from "./_components/cta-section";
import ValuePropositionSection from "./_components/value-proposition-section";
export default function Home() {
	return (
		<>
			<HeroSection />
			<ValuePropositionSection />
			<FeatureSection />
			<TestimonialSection />
			<PricingSection />
			<FAQSection />
			<CTASection />
		</>
	);
}
