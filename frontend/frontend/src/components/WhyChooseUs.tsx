import { MousePointerClick, ShieldCheck, Star, Headphones, Users, Film, ThumbsUp, Clock } from "lucide-react";
import { useScrollAnimation, useCountUp } from "@/hooks/useScrollAnimation";

const FEATURES = [
  { Icon: MousePointerClick, title: "Đặt vé dễ dàng",           desc: "Đặt ghế chỉ trong 60 giây. Xác nhận ngay lập tức. Không xếp hàng, không phiền phức." },
  { Icon: ShieldCheck,       title: "Thanh toán bảo mật",         desc: "Mã hóa cấp độ quân sự cho mọi giao dịch. Dữ liệu và thanh toán của bạn luôn được bảo vệ." },
  { Icon: Star,              title: "Trải nghiệm rạp tốt nhất", desc: "Màn hình IMAX & 4DX cao cấp, âm thanh vòm đa chiều, ghế nằm sang trọng và đồ ăn chọn lọc." },
  { Icon: Headphones,        title: "Hỗ trợ nhanh chóng",           desc: "Đội ngũ hỗ trợ 24/7. Chat trực tuyến, điện thoại hoặc email — phản hồi trong vài phút." },
];

const STATS = [
  { Icon: Users,   value: 50000, suffix: "+",  label: "Thành viên",        display: (n: number) => n >= 1000 ? `${Math.floor(n/1000)}K+` : `${n}` },
  { Icon: Film,    value: 100,   suffix: "+",  label: "Phim mỗi tháng",    display: (n: number) => `${n}+` },
  { Icon: ThumbsUp,value: 99,    suffix: "%",  label: "Hài lòng",          display: (n: number) => `${n}%` },
  { Icon: Clock,   value: 24,    suffix: "/7", label: "Hỗ trợ",            display: (n: number) => `${n}/7` },
];

function FeatureCard({ Icon, title, desc, index }: typeof FEATURES[0] & { index: number }) {
  const { ref, isVisible } = useScrollAnimation(0.1);

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      style={{
        padding: "28px", borderRadius: 20, cursor: "default",
        background: "rgba(255,255,255,0.72)", border: "1px solid rgba(255,255,255,0.88)",
        backdropFilter: "blur(16px)",
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(40px)",
        transition: `opacity 0.6s ease ${index * 100}ms, transform 0.6s ease ${index * 100}ms, box-shadow 0.3s ease, background 0.25s ease`,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.background = "#fff";
        el.style.boxShadow = "0 20px 48px rgba(0,0,0,0.1)";
        el.style.transform = "translateY(-8px)";
        el.style.border = "1px solid #D1D5DB";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.background = "rgba(255,255,255,0.72)";
        el.style.boxShadow = "0 4px 16px rgba(0,0,0,0.05)";
        el.style.transform = isVisible ? "translateY(0)" : "translateY(40px)";
        el.style.border = "1px solid rgba(255,255,255,0.88)";
      }}
    >
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300"
        style={{ background: "rgba(75,85,99,0.09)", border: "1px solid rgba(75,85,99,0.1)" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "linear-gradient(135deg,#4B5563,#374151)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(75,85,99,0.32)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(75,85,99,0.09)"; e.currentTarget.style.boxShadow = "none"; }}>
        <Icon size={22} color="#4B5563" />
      </div>
      <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#111827", marginBottom: 8, letterSpacing: "-0.01em" }}>{title}</h3>
      <p style={{ fontSize: "0.875rem", color: "#6B7280", lineHeight: 1.65 }}>{desc}</p>
    </div>
  );
}

function StatCard({ Icon, value, label, display, index }: typeof STATS[0] & { index: number }) {
  const { ref, isVisible } = useScrollAnimation(0.15);
  const count = useCountUp(value, isVisible, 1800 + index * 200);

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "32px 20px", borderRadius: 20, textAlign: "center",
        background: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.9)", backdropFilter: "blur(16px)",
        opacity: isVisible ? 1 : 0, transform: isVisible ? "translateY(0) scale(1)" : "translateY(32px) scale(0.95)",
        transition: `opacity 0.65s ease ${index * 120}ms, transform 0.65s ease ${index * 120}ms`,
        cursor: "default",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 16px 40px rgba(0,0,0,0.09)"; e.currentTarget.style.transform = "translateY(-6px) scale(1)"; e.currentTarget.style.background = "#fff"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = isVisible ? "translateY(0) scale(1)" : "translateY(32px) scale(0.95)"; e.currentTarget.style.background = "rgba(255,255,255,0.75)"; }}
    >
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "linear-gradient(135deg,#4B5563,#374151)", boxShadow: "0 6px 18px rgba(75,85,99,0.28)" }}>
        <Icon size={20} color="#fff" />
      </div>
      <div style={{ fontSize: "2rem", fontWeight: 900, color: "#111827", lineHeight: 1, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em" }}>
        {display(count)}
      </div>
      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#9CA3AF", letterSpacing: "0.1em", marginTop: 6 }}>{label}</div>
    </div>
  );
}

export function WhyChooseUs() {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation(0.2);

  return (
    <section className="py-24" style={{ background: "#E4E8EE" }}>
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <div
          ref={headerRef as React.RefObject<HTMLDivElement>}
          className="text-center mb-16"
          style={{ opacity: headerVisible ? 1 : 0, transform: headerVisible ? "translateY(0)" : "translateY(28px)", transition: "all 0.6s ease" }}
        >
          <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "#8B949E", letterSpacing: "0.18em", marginBottom: 8 }}>Tại sao chọn MagiCinema</p>
          <h2 style={{ fontSize: "clamp(1.6rem,3.5vw,2.4rem)", fontWeight: 800, color: "#111827", letterSpacing: "-0.025em" }}>Tại sao chọn chúng tôi</h2>
          <p style={{ color: "#6B7280", fontSize: "1rem", marginTop: 10, maxWidth: 460, margin: "10px auto 0" }}>
            Được thiết kế dành riêng cho bạn — mọi chi tiết được chăm chút để chuyến đi xem phim trở nên dễ dàng và khó quên.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          {FEATURES.map((f, i) => <FeatureCard key={i} {...f} index={i} />)}
        </div>

        {/* Stats counters */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
          {STATS.map((s, i) => <StatCard key={i} {...s} index={i} />)}
        </div>

        {/* Glassmorphism CTA */}
        <div className="relative rounded-3xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(255,255,255,0.92)", backdropFilter: "blur(28px)", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 70% 50%,rgba(139,148,158,0.09) 0%,transparent 65%)" }} />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 p-10 md:p-12">
            <div className="text-center md:text-left">
              <h3 style={{ fontSize: "clamp(1.3rem,2.8vw,1.9rem)", fontWeight: 800, color: "#111827", letterSpacing: "-0.025em", lineHeight: 1.2, marginBottom: 10 }}>
                Ready for the ultimate<br />trải nghiệm điện ảnh?
              </h3>
              <p style={{ color: "#6B7280", fontSize: "0.95rem", maxWidth: 400 }}>
                Tham gia cùng hơn 50.000 người yêu phim chọn MagiCinema cho mọi suất chiếu.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 flex-shrink-0">
              <button className="px-8 py-4 rounded-2xl font-semibold text-sm transition-all duration-300"
                style={{ background: "linear-gradient(135deg,#4B5563,#374151)", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.95rem", boxShadow: "0 8px 24px rgba(75,85,99,0.3)", animation: "pulseGlow 2.8s ease-in-out infinite" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.animation = "none"; e.currentTarget.style.boxShadow = "0 14px 36px rgba(75,85,99,0.48)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.animation = "pulseGlow 2.8s ease-in-out infinite"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(75,85,99,0.3)"; }}>
                Xem phim
              </button>
              <button className="px-8 py-4 rounded-2xl font-semibold text-sm transition-all duration-300"
                style={{ background: "rgba(255,255,255,0.88)", border: "1px solid #D1D5DB", color: "#374151", cursor: "pointer", fontSize: "0.95rem", boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.88)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)"; e.currentTarget.style.transform = "translateY(0)"; }}>
                Tạo tài khoản
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
