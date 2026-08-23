import { ComingSoon } from "@/components/ComingSoon";
import { Footer } from "@/components/Footer";
import { useEffect } from "react";

export default function ComingSoonPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#EFF2F5]" style={{ fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif" }}>
      <main className="flex-1 pt-12">
        <ComingSoon />
      </main>
      <Footer />
    </div>
  );
}
