import { useState } from "react";
import { Zap, Smile, Ghost, Heart, Sparkles, Rocket } from "lucide-react";

const CATEGORIES = [
  { label: "Hành động",    Icon: Zap,      count: 24, image: "https://images.unsplash.com/photo-1627736619924-ce9f159dedca?w=400&q=80" },
  { label: "Hài",       Icon: Smile,    count: 18, image: "https://images.unsplash.com/photo-1516900557549-41557d405adf?w=400&q=80" },
  { label: "Kinh dị",   Icon: Ghost,    count: 15, image: "https://images.unsplash.com/photo-1544259342-306eccfec481?w=400&q=80" },
  { label: "Lãng mạn",  Icon: Heart,    count: 12, image: "https://images.unsplash.com/photo-1710163956790-76c279d76386?w=400&q=80" },
  { label: "Hoạt hình",Icon: Sparkles, count: 20, image: "https://images.unsplash.com/photo-1575473129897-622d7507aff2?w=400&q=80" },
  { label: "Khoa học viễn tưởng",   Icon: Rocket,   count: 17, image: "https://images.unsplash.com/photo-1453413453658-27fec8f43f29?w=400&q=80" },
];

export function MovieCategories() {
  return (
    <section className="py-24" style={{ background: "#EEF1F4" }}>
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-end justify-between mb-12">
          <div>
            <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "#8B949E", letterSpacing: "0.18em", marginBottom: 8 }}>Duyệt theo thể loại</p>
            <h2 style={{ fontSize: "clamp(1.6rem,3.5vw,2.4rem)", fontWeight: 800, color: "#111827", letterSpacing: "-0.025em" }}>Thể loại phim</h2>
          </div>
          <button style={{ padding: "8px 20px", borderRadius: 10, border: "1px solid #D1D5DB", background: "#fff", color: "#374151", fontWeight: 500, fontSize: "0.875rem", cursor: "pointer", transition: "all 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#4B5563"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#374151"; }}>
            Xem tất cả
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {CATEGORIES.map((cat) => <CategoryCard key={cat.label} {...cat} />)}
        </div>
      </div>
    </section>
  );
}

function CategoryCard({ label, Icon, count, image }: typeof CATEGORIES[0]) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative rounded-2xl overflow-hidden cursor-pointer"
      style={{
        height: 160,
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hovered ? "0 16px 40px rgba(0,0,0,0.14)" : "0 4px 12px rgba(0,0,0,0.07)",
        transition: "all 0.3s ease",
        border: hovered ? "1px solid rgba(255,255,255,0.9)" : "1px solid rgba(255,255,255,0.6)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Background image */}
      <img src={image} alt={label} className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: hovered ? "scale(1.08)" : "scale(1)", transition: "transform 0.5s ease" }} />

      {/* Glassmorphism overlay */}
      <div className="absolute inset-0" style={{
        background: hovered
          ? "linear-gradient(135deg,rgba(255,255,255,0.55),rgba(238,241,244,0.4))"
          : "linear-gradient(135deg,rgba(255,255,255,0.7),rgba(247,248,250,0.55))",
        backdropFilter: "blur(2px)",
        transition: "background 0.3s ease",
      }} />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300"
          style={{
            background: hovered ? "rgba(75,85,99,0.9)" : "rgba(255,255,255,0.85)",
            boxShadow: hovered ? "0 4px 16px rgba(75,85,99,0.35)" : "0 2px 8px rgba(0,0,0,0.1)",
          }}>
          <Icon size={18} color={hovered ? "#fff" : "#374151"} />
        </div>
        <div style={{ fontSize: "0.875rem", fontWeight: 700, color: hovered ? "#111827" : "#374151", textAlign: "center" }}>{label}</div>
        <div style={{ fontSize: "0.68rem", fontWeight: 500, color: "#6B7280" }}>{count} Phim</div>
      </div>
    </div>
  );
}
