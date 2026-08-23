import { useState, useEffect } from "react";
import { Calendar, Bell, Flame, Loader2 } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { getLandingMovieTitle, landingMovieService, type MovieLandingItem } from "@/api/landingApi";
import { useNavigate } from "react-router-dom";

const EMPTY_COUNTDOWN = { d: 0, h: 0, m: 0, s: 0 };

function calculateCountdown(targetDateStr: string | null) {
  if (!targetDateStr) return EMPTY_COUNTDOWN;
  const diff = new Date(targetDateStr).getTime() - Date.now();
  if (diff <= 0) return EMPTY_COUNTDOWN;
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  };
}

// --- Countdown hook ---
function useCountdown(targetDateStr: string | null) {
  const [time, setTime] = useState(() => calculateCountdown(targetDateStr));
  useEffect(() => {
    const id = setInterval(() => setTime(calculateCountdown(targetDateStr)), 1000);
    return () => clearInterval(id);
  }, [targetDateStr]);
  return time;
}

// --- Countdown display ---
function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ textAlign: "center", minWidth: 38 }}>
      <div style={{
        fontSize: "1.15rem", fontWeight: 800, color: "#111827", lineHeight: 1,
        fontVariantNumeric: "tabular-nums", display: "inline-block",
        animation: "countdownTick 1s step-end",
      }}>
        {String(value).padStart(2, "0")}
      </div>
      <div style={{ fontSize: "0.55rem", fontWeight: 700, color: "#9CA3AF", letterSpacing: "0.1em", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function CountdownTimer({ date }: { date: string | null }) {
  const { d, h, m, s } = useCountdown(date);
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "10px 14px", borderRadius: 14, background: "#F7F8FA", border: "1px solid #E5E7EB" }}>
      <CountdownUnit value={d} label="Ngày" />
      <span style={{ fontSize: "1rem", fontWeight: 800, color: "#D1D5DB", paddingTop: 2, lineHeight: 1.2 }}>:</span>
      <CountdownUnit value={h} label="Giờ" />
      <span style={{ fontSize: "1rem", fontWeight: 800, color: "#D1D5DB", paddingTop: 2, lineHeight: 1.2 }}>:</span>
      <CountdownUnit value={m} label="Phút" />
      <span style={{ fontSize: "1rem", fontWeight: 800, color: "#D1D5DB", paddingTop: 2, lineHeight: 1.2 }}>:</span>
      <CountdownUnit value={s} label="Giây" />
    </div>
  );
}

function ComingSoonCard({ movie, index, onClick }: { movie: MovieLandingItem; index: number, onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [notified, setNotified] = useState(false);
  const { ref, isVisible } = useScrollAnimation(0.1);
  const displayTitle = getLandingMovieTitle(movie);

  const dateLabel = movie.releaseDate
    ? new Date(movie.releaseDate).toLocaleDateString("vi-VN", { month: "short", day: "numeric", year: "numeric" })
    : "Chưa xác định";

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      onClick={onClick}
      className="rounded-2xl overflow-hidden cursor-pointer"
      style={{
        background: "#fff", border: "1px solid #E5E7EB",
        boxShadow: hovered ? "0 20px 56px rgba(0,0,0,0.13)" : "0 4px 16px rgba(0,0,0,0.06)",
        transform: isVisible
          ? (hovered ? "translateY(-8px)" : "translateY(0)")
          : "translateY(50px)",
        opacity: isVisible ? 1 : 0,
        transition: `transform 0.35s ease, box-shadow 0.3s ease, opacity 0.6s ease ${index * 100}ms`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <div className="relative overflow-hidden" style={{ height: 190 }}>
        {movie.poster ? (
          <img src={movie.poster} alt={displayTitle} className="w-full h-full object-cover"
            style={{ transform: hovered ? "scale(1.07)" : "scale(1)", transition: "transform 0.55s ease" }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: "#E5E7EB" }}>
            <span style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>{displayTitle}</span>
          </div>
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom,transparent 40%,rgba(255,255,255,0.18) 100%)" }} />

        {/* Date badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ background: "rgba(255,255,255,0.93)", backdropFilter: "blur(14px)", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
          <Calendar size={11} color="#4B5563" />
          <span style={{ fontSize: "0.67rem", fontWeight: 700, color: "#374151" }}>{dateLabel}</span>
        </div>

        {/* Hot badge */}
        {movie.hot && (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full"
            style={{ background: "linear-gradient(135deg,#EF4444,#F97316)", boxShadow: "0 4px 12px rgba(239,68,68,0.4)" }}>
            <Flame size={10} color="#fff" />
            <span style={{ fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.1em", color: "#fff" }}>Hot</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5">
        <div style={{ fontSize: "0.67rem", fontWeight: 600, color: "#9CA3AF", letterSpacing: "0.12em", marginBottom: 4 }}>{movie.genre}</div>
        <div style={{ fontSize: "1rem", fontWeight: 700, color: "#111827", marginBottom: 10, lineHeight: 1.3 }}>{displayTitle}</div>

        {/* Live countdown */}
        <div style={{ marginBottom: 14 }}>
          <CountdownTimer date={movie.releaseDate} />
        </div>

        {/* Notify button */}
        <button onClick={() => setNotified(!notified)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all duration-250"
          style={{
            background: notified ? "linear-gradient(135deg,#4B5563,#374151)" : "rgba(75,85,99,0.06)",
            border: notified ? "1px solid transparent" : "1px solid #E5E7EB",
            color: notified ? "#fff" : "#374151", cursor: "pointer",
            boxShadow: notified ? "0 4px 14px rgba(75,85,99,0.28)" : "none",
            transform: notified ? "scale(1.02)" : "scale(1)",
          }}>
          <Bell size={13} fill={notified ? "#fff" : "none"} />
          {notified ? "✓ Bạn sẽ được thông báo" : "Thông báo cho tôi"}
        </button>
      </div>
    </div>
  );
}

export function ComingSoon() {
  const [movies, setMovies] = useState<MovieLandingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { ref, isVisible } = useScrollAnimation(0.15);

  // Fetch coming-soon movies from API
  useEffect(() => {
    landingMovieService.getComingSoon()
      .then((data) => setMovies(data))
      .catch((err) => console.error("Failed to fetch coming-soon movies", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="py-24" style={{ background: "#EFF2F5" }}>
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className="text-center mb-14"
          style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? "translateY(0)" : "translateY(28px)", transition: "all 0.6s ease" }}
        >
          <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "#8B949E", letterSpacing: "0.18em", marginBottom: 8 }}>Sắp tới</p>
          <h2 style={{ fontSize: "clamp(1.6rem,3.5vw,2.4rem)", fontWeight: 800, color: "#111827", letterSpacing: "-0.025em" }}>Phim sắp chiếu</h2>
          <p style={{ color: "#6B7280", fontSize: "1rem", marginTop: 10, maxWidth: 440, margin: "10px auto 0" }}>
            Đặt chỗ cho những bộ phim được mong chờ nhất mùa này. Đếm ngược tới ngày công chiếu.
          </p>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 size={28} color="#4B5563" className="animate-spin" />
            <span style={{ marginLeft: 12, color: "#6B7280", fontSize: "0.9rem" }}>Đang tải phim sắp chiếu...</span>
          </div>
        ) : movies.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <p style={{ color: "#9CA3AF", fontSize: "0.95rem" }}>Chưa có phim sắp chiếu.</p>
          </div>
        ) : (
          /* Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {movies.map((movie, i) => <ComingSoonCard key={movie.id} movie={movie} index={i} onClick={() => navigate(`/movies/${movie.id}`)} />)}
          </div>
        )}
      </div>
    </section>
  );
}
