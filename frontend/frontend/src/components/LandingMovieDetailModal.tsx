import { X, Star, Clock, Ticket } from "lucide-react";
import { getLandingMovieTitle, type MovieLandingItem } from "@/api/landingApi";

interface Props {
  movie: MovieLandingItem;
  onClose: () => void;
}

export function LandingMovieDetailModal({ movie, onClose }: Props) {
  const displayTitle = getLandingMovieTitle(movie);

  // Convert standard Youtube URL to embed URL
  const getEmbedUrl = (url: string | null) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}?autoplay=0&rel=0`;
    }
    return url;
  };

  const embedUrl = getEmbedUrl(movie.trailer);
  const canBookMovie = !(movie.status === "COMING_SOON" && movie.hasShowtimes === false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="relative w-full max-w-4xl bg-[#111827] rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-[#E63946] transition-all hover:scale-110 shadow-lg"
        >
          <X size={20} />
        </button>

        {/* Left: Trailer / Poster */}
        <div className="w-full md:w-[55%] bg-black relative flex-shrink-0 flex items-center justify-center" style={{ minHeight: "300px" }}>
          {embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full h-full min-h-[300px] md:min-h-full"
              allowFullScreen
              style={{ border: "none" }}
              title={`${displayTitle} Trailer`}
            />
          ) : movie.bg || movie.poster ? (
            <img src={movie.bg || movie.poster || ""} alt={displayTitle} className="w-full h-full object-cover opacity-80" />
          ) : (
             <div className="text-gray-500 text-sm">Không có hình ảnh/video</div>
          )}
        </div>

        {/* Right: Info */}
        <div className="flex-1 p-6 md:p-8 flex flex-col overflow-y-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
          <div className="mb-2 text-[11px] font-bold text-[#E63946] tracking-widest">{movie.genre}</div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4 leading-tight tracking-tight">{displayTitle}</h2>
          
          <div className="flex items-center gap-4 mb-6">
            {(movie.rating ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/10">
                <Star size={14} color="#F5C518" fill="#F5C518" />
                <span className="text-sm font-bold text-white">{movie.rating?.toFixed(1)}</span>
              </div>
            )}
            {movie.durationStr && (
              <div className="flex items-center gap-1.5 text-gray-400">
                <Clock size={14} />
                <span className="text-sm">{movie.durationStr}</span>
              </div>
            )}
          </div>
          
          <p className="text-gray-300 text-[15px] leading-relaxed mb-8 flex-1">
            {movie.description || "Chưa có thông tin mô tả cho bộ phim này."}
          </p>

          <div className="flex gap-3">
            {canBookMovie && (
              <button
                onClick={() => {
                  onClose();
                  window.location.href = `/movies/${movie.id}#showtimes`;
                }}
                className="flex-1 py-3.5 rounded-xl flex items-center justify-center gap-2 font-semibold text-[15px] transition-transform hover:-translate-y-[2px]"
                style={{ background: "linear-gradient(135deg,#E63946,#c1121f)", color: "#fff", boxShadow: "0 8px 24px rgba(230,57,70,0.3)", border: "none", cursor: "pointer" }}>
                <Ticket size={16} /> Đặt vé ngay
              </button>
            )}
            <a href={`/movies/${movie.id}`} className="flex-1 py-3.5 rounded-xl flex items-center justify-center gap-2 font-semibold text-[15px] transition-transform hover:-translate-y-[2px] text-white"
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer", textDecoration: "none" }}>
              Xem chi tiết
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
