import { NowShowing } from "@/components/NowShowing";
import { Footer } from "@/components/Footer";
import { useEffect } from "react";

export default function NowShowingPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#E4E8EE]" style={{ fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif" }}>
      <main className="flex-1 pt-12">
        <NowShowing isGrid={true} />
      </main>
      <Footer />
    </div>
  );
}
