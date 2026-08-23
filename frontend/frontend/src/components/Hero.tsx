import { useState, useEffect, useRef } from "react";
import { ChevronDown, Star, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { getLandingMovieTitle, landingMovieService, type MovieLandingItem } from "@/api/landingApi";
import { useNavigate } from "react-router-dom";
import { HeroSnowfall } from "@/components/HeroSnowfall";

// --- 3D Tilt Card & Live Preview ---
function MovieHeroCard({ movie, onClick }: { movie: MovieLandingItem; onClick?: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const displayTitle = getLandingMovieTitle(movie);


  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const { left, top, width, height } = card.getBoundingClientRect();
    const x = (e.clientX - left - width / 2) / (width / 2);
    const y = (e.clientY - top - height / 2) / (height / 2);
    card.style.transform = `perspective(900px) rotateY(${x * 9}deg) rotateX(${-y * 7}deg) scale(1.02)`;
  };

  const handleMouseLeave = () => {
    if (cardRef.current)
      cardRef.current.style.transform = "perspective(900px) rotateY(0deg) rotateX(0deg) scale(1)";
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        position: "relative", borderRadius: 28, overflow: "hidden",
        width: "100%", maxWidth: 340, transition: "transform 0.15s ease",
        transformStyle: "preserve-3d",
        boxShadow: "0 32px 80px rgba(0,0,0,0.22), 0 0 0 1px rgba(255,255,255,0.85)",
        background: "#fff", cursor: onClick ? "pointer" : "default",
      }}
    >
      {movie.poster ? (
        <>
          <img 
            src={movie.poster} 
            alt={displayTitle} 
            style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", display: "block" }} 
          />
        </>
      ) : (
        <div style={{ width: "100%", aspectRatio: "2/3", background: "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Loader2 size={32} color="#9CA3AF" className="animate-spin" />
        </div>
      )}
      {/* Shine overlay */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)", pointerEvents: "none" }} />
      {/* Bottom info */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px", background: "rgba(255,255,255,0.88)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.95)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "#8B949E", letterSpacing: "0.15em" }}>ĐỀ XUẤT TRÊN HERO</span>
          {(movie.rating ?? 0) > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto", background: "#F7F8FA", border: "1px solid #E5E7EB", borderRadius: 99, padding: "2px 8px" }}>
              <Star size={10} fill="#F5C518" color="#F5C518" />
              <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#374151" }}>{movie.rating?.toFixed(1)}</span>
            </div>
          )}
        </div>
        <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#111827", marginBottom: 4, lineHeight: 1.3 }}>{displayTitle}</div>
        <div style={{ fontSize: "0.78rem", color: "#6B7280", marginBottom: 14 }}>
          {movie.genre}{movie.durationStr ? ` · ${movie.durationStr}` : ""}
        </div>
      </div>
    </div>
  );
}

// --- Main Hero ---
export function Hero() {
  const [movies, setMovies] = useState<MovieLandingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const INTERVAL = 4500;

  // Fetch movies selected by the admin for the Hero.
  useEffect(() => {
    landingMovieService.getHeroMovies()
      .then((data) => {
        setMovies(data);
        setActiveIndex(0);
      })
      .catch((err) => console.error("Failed to fetch Hero movies", err))
      .finally(() => setLoading(false));
  }, []);

  // Auto-rotate
  useEffect(() => {
    if (movies.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((i) => (i + 1) % movies.length);
    }, INTERVAL);
    return () => clearInterval(timer);
  }, [movies.length]);

  const movie = movies[activeIndex] ?? null;
  const displayTitle = movie ? getLandingMovieTitle(movie) : loading ? "Đang tải phim trên Hero" : "Chưa chọn phim cho Hero";
  const description = movie?.description || (loading ? "Đang tải dữ liệu từ hệ thống." : "Admin chưa bật phim nào để hiển thị tại khu vực Hero.");
  const hasMultipleMovies = movies.length > 1;

  const goTo = (idx: number) => setActiveIndex(idx);

  return (
    <section className="relative w-full overflow-hidden" style={{ minHeight: "100vh", paddingTop: 68, background: movie?.bg ? "transparent" : "#E4E8EE" }}>

      {/* Background - Dynamic Ambient Glow & Cinematic Mode */}
      {movies.map((m, i) => (
        <div key={m.id} className="absolute inset-0 transition-all duration-1000 ease-out"
          style={{ 
            opacity: i === activeIndex ? 1 : 0, 
            zIndex: 0,
            transform: i === activeIndex ? "scale(1.05)" : "scale(1)",
          }}>
          {/* Ambient Glow */}
          {m.bg ? (
            <>
              {/* Blur Ambient Layer */}
              <div className="absolute inset-0" style={{
                backgroundImage: `url(${m.bg})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "blur(34px) brightness(0.9)",
                transform: "scale(1.06)",
                opacity: 0.48
              }} />
              {/* Main Image Layer (Right side mostly) */}
              <img src={m.bg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
            </>
          ) : null}
          
          {m.bg && (
            <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.08) 38%, transparent 100%)" }} />
          )}
        </div>
      ))}
      <HeroSnowfall />

      {/* Main content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 flex items-center min-h-screen" style={{ paddingTop: 40, paddingBottom: 100 }}>
        <div className="flex flex-col lg:flex-row items-center gap-14 w-full">

          {/* Left */}
          <div className="flex-1 max-w-xl">
            {/* Badge */}
            <div className="anim-fade-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6"
              style={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(209,213,219,0.85)", backdropFilter: "blur(14px)", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
              {loading ? (
                <Loader2 size={10} color="#4B5563" className="animate-spin" />
              ) : (
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4B5563", display: "inline-block", animation: "tickerPulse 2s ease-in-out infinite" }} />
              )}
              <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#4B5563", letterSpacing: "0.16em" }}>
                {loading ? "Đang tải..." : "PHIM TRÊN HERO"}
              </span>
            </div>

            {/* Headline */}
            <h1 key={`title-${activeIndex}`} className="anim-fade-up delay-100 mb-5" style={{ fontSize: "clamp(2.4rem,5.5vw,4rem)", fontWeight: 800, color: "#111827", lineHeight: 1.08, letterSpacing: "-0.03em", textShadow: "0 10px 30px rgba(255,255,255,0.3)" }}>
              <span className="anim-scale-in" style={{ background: "linear-gradient(135deg,#111827,#4B5563)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", display: "inline-block" }}>
                {displayTitle}
              </span>
            </h1>

            {/* Description */}
            <p key={`desc-${activeIndex}`} className="anim-fade-up mb-8"
              style={{ fontSize: "1rem", color: "#4B5563", lineHeight: 1.72, maxWidth: 440, fontWeight: 500 }}>
              {description}
            </p>

            {/* Slide indicators */}
            {hasMultipleMovies && (
              <div className="anim-fade-up delay-400 flex items-center gap-3">
                <button onClick={() => goTo((activeIndex - 1 + movies.length) % movies.length)}
                  style={{ width: 32, height: 32, borderRadius: 10, border: "1px solid #D1D5DB", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
                  <ChevronLeft size={16} color="#374151" />
                </button>
                {movies.map((_, i) => (
                  <button key={i} onClick={() => goTo(i)}
                    style={{
                      width: i === activeIndex ? 24 : 8, height: 8, borderRadius: 4, border: "none", cursor: "pointer",
                      background: i === activeIndex ? "#4B5563" : "#D1D5DB", transition: "all 0.3s ease", padding: 0,
                    }} />
                ))}
                <button onClick={() => goTo((activeIndex + 1) % movies.length)}
                  style={{ width: 32, height: 32, borderRadius: 10, border: "1px solid #D1D5DB", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
                  <ChevronRight size={16} color="#374151" />
                </button>
              </div>
            )}
          </div>

          {/* Right — 3D Tilt card */}
          <div className="anim-fade-right delay-300 flex-shrink-0 w-full max-w-xs lg:max-w-sm flex justify-center">
            {movie ? (
              <MovieHeroCard key={movie.id} movie={movie} onClick={() => navigate(`/movies/${movie.id}`)} />
            ) : (
              <div className="flex h-[420px] w-full max-w-[340px] items-center justify-center rounded-[28px] border border-white/70 bg-white/50">
                <Loader2 size={32} color="#4B5563" className={loading ? "animate-spin" : ""} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <div className="absolute flex flex-col items-center gap-1 animate-bounce"
        style={{ bottom: 68, left: "50%", transform: "translateX(-50%)", opacity: 0.45, zIndex: 10 }}>
        <ChevronDown size={20} color="#6B7280" />
      </div>
    </section>
  );
}
