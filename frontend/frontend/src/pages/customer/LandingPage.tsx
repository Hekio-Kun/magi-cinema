import { Hero } from "@/components/Hero";
import { CloudinaryMusicSection } from "@/components/CloudinaryMusicSection";
import { NowShowing } from "@/components/NowShowing";
import { Promotions } from "@/components/Promotions";
import { WhyChooseUs } from "@/components/WhyChooseUs";
import { Footer } from "@/components/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: "#E4E8EE", fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif" }}>
      <main>
        <Hero />
        <CloudinaryMusicSection />
        <NowShowing />
        <Promotions />
        <WhyChooseUs />
      </main>
      <Footer />
    </div>
  );
}
