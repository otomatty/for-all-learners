import CTASection from "./_components/cta-section";
import HeaderSection from "./_components/header-section";
import HelpSupportSection from "./_components/help-support-section";
import StepGuideSection from "./_components/step-guide-section";
import VideoTutorialSection from "./_components/video-tutorial-section";

export default function GuidePage() {
	return (
		<>
			<HeaderSection />
			<StepGuideSection />
			<VideoTutorialSection />
			<HelpSupportSection />
			<CTASection />
		</>
	);
}
