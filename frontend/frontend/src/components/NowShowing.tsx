import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Star, Clock, Loader2 } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { getLandingMovieTitle, landingMovieService, type MovieLandingItem } from "@/api/landingApi";
import { useNavigate } from "react-router-dom";
import { MagicTicketButton } from "@/components/ui/MagicTicketButton";

const LOOP_COUNT = 20;
const MOVIE_CARD_STEP = 240; // 220px width + 20px gap

function MovieCard({ movie, index, onClick, isGrid }: { movie: MovieLandingItem; index: number, onClick: () => void, isGrid?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const { ref: cardRef, isVisible: observerVisible } = useScrollAnimation(0.1);
  const displayTitle = getLandingMovieTitle(movie);
  
  // Với dạng cuộn ngang (không phải grid), tắt hiệu ứng nảy lên để không bị giật khi vòng lặp nhảy tới bản sao
  const isVisible = isGrid ? observerVisible : true;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const { left, top, width, height } = card.getBoundingClientRect();
    const x = (e.clientX - left - width / 2) / (width / 2);
    const y = (e.clientY - top - height / 2) / (height / 2);
    card.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) scale(1.02)`;
  };

  const handleMouseLeave = () => {
    setHovered(false);
    if (cardRef.current) {
      cardRef.current.style.transform = isVisible ? "translateY(0) scale(1)" : "translateY(40px) scale(0.96)";
    }
  };

  return (
    <div
      ref={cardRef as React.RefObject<HTMLDivElement>}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      className={`relative flex-shrink-0 rounded-2xl overflow-hidden cursor-pointer ${isGrid ? 'w-full' : ''}`}
      style={{
        width: isGrid ? undefined : 220,
        height: isGrid ? undefined : 330,
        aspectRatio: isGrid ? "2 / 3" : undefined,
        transform: isVisible
          ? (hovered ? "translateY(0) scale(1.02)" : "translateY(0) scale(1)")
          : "translateY(40px) scale(0.96)",
        opacity: isVisible ? 1 : 0,
        transition: hovered ? "none" : `transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.55s ease ${index * 70}ms, box-shadow 0.3s ease`,
        boxShadow: hovered
          ? "0 28px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.9)"
          : "0 8px 24px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.7)",
        background: "#fff",
        transformStyle: "preserve-3d",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      {movie.poster ? (
        <img src={movie.poster} alt={displayTitle} className="w-full h-full object-cover"
          style={{ transform: hovered ? "scale(1.035)" : "scale(1)", transition: "transform 0.6s ease" }} />
      ) : (
        <div className="w-full h-full flex items-center justify-center" style={{ background: "#E5E7EB" }}>
          <span style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>{displayTitle}</span>
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(17,24,39,0.92) 0%, rgba(17,24,39,0.3) 55%, transparent 100%)" }} />

      {/* Hover overlay */}
      <div className="absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: hovered ? 1 : 0,
          background: "linear-gradient(to top, rgba(17,24,39,0.82) 0%, rgba(17,24,39,0.32) 52%, rgba(17,24,39,0.06) 100%)",
        }} />

      {/* Rating badge */}
      {(movie.rating ?? 0) > 0 && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full"
          style={{
            background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.3)",
            transform: hovered ? "scale(1.1)" : "scale(1)", transition: "transform 0.25s ease",
          }}>
          <Star size={10} fill="#F5C518" color="#F5C518" />
          <span style={{ color: "#fff", fontSize: "0.7rem", fontWeight: 700 }}>{movie.rating?.toFixed(1)}</span>
        </div>
      )}

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff", lineHeight: 1.25, marginBottom: 6 }}>{displayTitle}</div>
        {movie.durationStr && (
          <div className="flex items-center gap-1.5 mb-4">
            <Clock size={11} color="rgba(255,255,255,0.45)" />
            <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)" }}>{movie.durationStr}</span>
          </div>
        )}
        {/* Book button */}
        <div style={{
          maxHeight: hovered ? 52 : 0, opacity: hovered ? 1 : 0, overflow: "visible",
          transform: hovered ? "translateY(0)" : "translateY(10px)", transition: "all 0.3s ease",
        }}>
          <MagicTicketButton 
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              window.location.href = `/movies/${movie.id}#showtimes`;
            }}
            className="w-full text-xs">
            Đặt vé ngay
          </MagicTicketButton>
        </div>
      </div>
    </div>
  );
}

export function NowShowing({ isGrid = false }: { isGrid?: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [allMovies, setAllMovies] = useState<MovieLandingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollPos, setScrollPos] = useState(0);
  const navigate = useNavigate();
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation(0.2);

  // Fetch now-showing movies from API
  useEffect(() => {
    landingMovieService.getNowShowing()
      .then((data) => setAllMovies(data))
      .catch((err) => console.error("Failed to fetch now-showing movies", err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = allMovies;
  const displayMovies = isGrid ? filtered : Array(LOOP_COUNT).fill(filtered).flat();
  const setWidth = filtered.length * MOVIE_CARD_STEP;

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el || filtered.length === 0) return;
    el.scrollBy({ left: dir === "right" ? 500 : -500, behavior: "smooth" });
  };

  useEffect(() => {
    if (isGrid || filtered.length === 0) return;
    const el = scrollRef.current;
    if (!el) return;
    
    el.scrollLeft = Math.floor(LOOP_COUNT / 2) * setWidth;

    let timeoutId: ReturnType<typeof setTimeout>;
    const handler = () => {
      setScrollPos(el.scrollLeft);
      
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const currentBehavior = el.style.scrollBehavior;
        el.style.scrollBehavior = "auto";
        // Nhảy ngầm khi đã cuộn xong để không bị khựng
        if (el.scrollLeft < setWidth) {
          el.scrollLeft += Math.floor(LOOP_COUNT / 2) * setWidth;
        } else if (el.scrollLeft > setWidth * (LOOP_COUNT - 2)) {
          el.scrollLeft -= Math.floor(LOOP_COUNT / 2) * setWidth;
        }
        el.style.scrollBehavior = currentBehavior;
      }, 200);
    };
    
    el.addEventListener("scroll", handler);
    return () => {
      el.removeEventListener("scroll", handler);
      clearTimeout(timeoutId);
    };
  }, [isGrid, filtered.length, setWidth]);

  return (
    <section id="movies" className="py-24" style={{ background: "#E4E8EE" }}>
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div
          ref={headerRef as React.RefObject<HTMLDivElement>}
          className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6"
          style={{ opacity: headerVisible ? 1 : 0, transform: headerVisible ? "translateY(0)" : "translateY(28px)", transition: "all 0.6s ease" }}
        >
          <div>
            <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "#8B949E", letterSpacing: "0.18em", marginBottom: 8 }}>Đang chiếu</p>
            <h2 style={{ fontSize: "clamp(1.6rem,3.5vw,2.4rem)", fontWeight: 800, color: "#111827", letterSpacing: "-0.025em", lineHeight: 1.1 }}>Phim đang chiếu</h2>
          </div>
          {!isGrid && (
            <div className="flex gap-2">
              {(["left", "right"] as const).map(d => (
                <button key={d} onClick={() => scroll(d)}
                  style={{ width: 40, height: 40, borderRadius: 12, border: "1px solid #D1D5DB", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s", boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#4B5563"; e.currentTarget.style.borderColor = "#4B5563"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#D1D5DB"; }}>
                  {d === "left" ? <ChevronLeft size={17} color="#374151" /> : <ChevronRight size={17} color="#374151" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 size={28} color="#4B5563" className="animate-spin" />
            <span style={{ marginLeft: 12, color: "#6B7280", fontSize: "0.9rem" }}>Đang tải phim...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex justify-center items-center py-20">
            <p style={{ color: "#9CA3AF", fontSize: "0.95rem" }}>Không có phim đang chiếu.</p>
          </div>
        ) : isGrid ? (
          /* Grid Layout */
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6 pt-2">
            {filtered.map((m, i) => <MovieCard key={m.id} movie={m} index={i} onClick={() => navigate(`/movies/${m.id}`)} isGrid={true} />)}
          </div>
        ) : (
          /* Carousel Layout */
          <>
            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none"
                style={{ background: "linear-gradient(to right,#E4E8EE,transparent)", opacity: scrollPos > 20 ? 1 : 0, transition: "opacity 0.3s" }} />
              <div className="absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none"
                style={{ background: "linear-gradient(to left,#E4E8EE,transparent)" }} />
              <div ref={scrollRef} className="flex gap-5 overflow-x-auto pt-3 pb-5 no-scrollbar">
                {displayMovies.map((m, i) => <MovieCard key={`${m.id}-${i}`} movie={m} index={i % filtered.length} onClick={() => navigate(`/movies/${m.id}`)} isGrid={isGrid} />)}
              </div>
            </div>

            {/* Dot indicators */}
            <div className="flex justify-center gap-1.5 mt-6">
              {filtered.map((m, i) => {
                const activeDot = Math.floor(scrollPos / MOVIE_CARD_STEP) % filtered.length;
                // Xử lý activeDot khi âm
                const normalizedDot = activeDot < 0 ? filtered.length + activeDot : activeDot;
                
                return (
                  <div key={m.id}
                    style={{
                      width: i === normalizedDot ? 20 : 6, height: 6, borderRadius: 3,
                      background: i === normalizedDot ? "#4B5563" : "#C9CDD2",
                      transition: "all 0.3s ease", cursor: "pointer",
                    }}
                    onClick={() => {
                      if (scrollRef.current) {
                        const currentSetOffset = Math.floor(scrollRef.current.scrollLeft / setWidth) * setWidth;
                        scrollRef.current.scrollTo({ left: currentSetOffset + i * MOVIE_CARD_STEP, behavior: "smooth" });
                      }
                    }}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
