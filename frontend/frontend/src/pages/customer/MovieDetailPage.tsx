import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { movieService, type MovieResponse } from "@/api/movieApi";
import { showtimeApi } from "@/api/showtimeApi";
import { Loader2, ArrowLeft, Star, Clock, Ticket, Calendar, Play, Film, ChevronRight } from "lucide-react";
import { Footer } from "@/components/Footer";
import { formatPresentationLabelFromFields } from "@/utils/presentation";

type MovieShowtime = NonNullable<MovieResponse["showtimes"]>[number];

type PresentationShowtimeGroup = {
  key: string;
  label: string;
  showtimes: MovieShowtime[];
};

const formatPresentationLabel = (showtime: MovieShowtime) =>
  formatPresentationLabelFromFields(showtime) || "Phiên bản tiêu chuẩn";

const getPresentationGroupKey = (showtime: MovieShowtime) => {
  if (showtime.presentationId != null) {
    return `presentation-${showtime.presentationId}`;
  }

  return [
    showtime.presentationFormat || "STANDARD",
    showtime.projectionType || "TWO_D",
    showtime.languageType || "ORIGINAL",
    formatPresentationLabel(showtime),
  ].join("|");
};

const INITIAL_CLOCK_TIME = Date.now();

const buildDateTime = (dateStr?: string | null, timeStr?: string | null) => {
  if (!dateStr || !timeStr) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute, second = 0] = timeStr.split(":").map(Number);
  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return new Date(year, month - 1, day, hour, minute, second);
};

const isShowtimeBookable = (showtime: MovieShowtime, currentTime: number) => {
  const status = String(showtime.status || "");
  if (status === "CANCELLED" || status === "COMPLETED") return false;
  const startsAt = buildDateTime(showtime.showDate, showtime.startTime);
  return startsAt ? startsAt.getTime() > currentTime : true;
};

const formatDateLabel = (dateStr: string, currentTime: number) => {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date(currentTime);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const isSameDate = (first: Date, second: Date) =>
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate();

  const weekday = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][date.getDay()];
  const fullWeekday = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"][date.getDay()];
  const shortDate = `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
  let label = fullWeekday;
  if (isSameDate(date, today)) label = "Hôm nay";
  if (isSameDate(date, tomorrow)) label = "Ngày mai";

  return { date, weekday, label, shortDate };
};

function MovieNotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-[#E4E8EE] flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Không tìm thấy phim</h1>
      <button onClick={onBack} className="text-[#E63946] flex items-center gap-2 hover:underline">
        <ArrowLeft size={16} /> Quay lại trang chủ
      </button>
    </div>
  );
}

export default function MovieDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const movieId = Number(id);

  if (!id || !Number.isInteger(movieId) || movieId <= 0) {
    return <MovieNotFound onBack={() => navigate("/")} />;
  }

  return <MovieDetailContent key={movieId} movieId={movieId} />;
}

function MovieDetailContent({ movieId }: { movieId: number }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  const [movie, setMovie] = useState<MovieResponse | null>(null);
  const [publicShowtimes, setPublicShowtimes] = useState<MovieShowtime[]>([]);
  const [loading, setLoading] = useState(true);

  const [requestedDate, setSelectedDate] = useState("");
  const [currentTime, setCurrentTime] = useState(INITIAL_CLOCK_TIME);

  useEffect(() => {
    const refreshClock = () => setCurrentTime(Date.now());
    const frameId = window.requestAnimationFrame(refreshClock);
    const intervalId = window.setInterval(refreshClock, 30_000);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearInterval(intervalId);
    };
  }, []);

  const movieShowtimes = useMemo(() => {
    const byId = new Map<number, MovieShowtime>();
    [...(movie?.showtimes || []), ...publicShowtimes].forEach((showtime) => {
      if (!showtime?.showtimeId) return;
      byId.set(showtime.showtimeId, showtime);
    });
    return Array.from(byId.values());
  }, [movie?.showtimes, publicShowtimes]);

  const showtimeDates = useMemo(() => {
    const dates = Array.from(new Set(movieShowtimes.map(st => st.showDate).filter(Boolean))) as string[];
    return dates.sort();
  }, [movieShowtimes]);

  const showtimeDateStats = useMemo(() => {
    const stats = new Map<string, { total: number; bookable: number }>();

    movieShowtimes.forEach((showtime) => {
      if (!showtime.showDate) return;
      const current = stats.get(showtime.showDate) || { total: 0, bookable: 0 };
      current.total += 1;
      if (isShowtimeBookable(showtime, currentTime)) current.bookable += 1;
      stats.set(showtime.showDate, current);
    });

    return stats;
  }, [currentTime, movieShowtimes]);

  const selectedDate = useMemo(() => {
    if (requestedDate && showtimeDates.includes(requestedDate)) {
      return requestedDate;
    }

    return showtimeDates.find((date) => (showtimeDateStats.get(date)?.bookable || 0) > 0)
      || showtimeDates[0]
      || "";
  }, [requestedDate, showtimeDates, showtimeDateStats]);

  const filteredShowtimes = useMemo(() => {
    if (!selectedDate) return [];
    return movieShowtimes
      .filter(st => st.showDate === selectedDate)
      .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  }, [movieShowtimes, selectedDate]);

  const groupedShowtimes = useMemo(() => {
    const groups = new Map<string, MovieShowtime[]>();
    filteredShowtimes.forEach((showtime) => {
      const key = getPresentationGroupKey(showtime);
      groups.set(key, [...(groups.get(key) || []), showtime]);
    });

    return Array.from(groups.entries())
      .map(([key, showtimes]): PresentationShowtimeGroup => ({
        key,
        label: formatPresentationLabel(showtimes[0]),
        showtimes,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "vi"));
  }, [filteredShowtimes]);

  useEffect(() => {
    let cancelled = false;

    const loadMovie = async () => {
      try {
        const movieData = await movieService.getById(movieId);
        if (cancelled) return;
        setMovie(movieData);

        try {
          const dates = await showtimeApi.getPublicScreeningDates();
          const schedulesByDate = await Promise.all(
            dates.map((date) => showtimeApi.getPublicShowtimesByDate(date))
          );
          if (cancelled) return;

          const showtimesForMovie = schedulesByDate
            .flat()
            .filter((movieSchedule) => movieSchedule.movieId === movieId)
            .flatMap((movieSchedule) => movieSchedule.showtimes || []);
          setPublicShowtimes(showtimesForMovie);
        } catch (error) {
          console.error("Failed to fetch public showtimes", error);
        }
      } catch (error) {
        console.error("Failed to fetch movie", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadMovie();
    return () => {
      cancelled = true;
    };
  }, [movieId]);

  useEffect(() => {
    if (!movie || location.hash !== "#showtimes") return;

    const frameId = window.requestAnimationFrame(() => {
      document.getElementById("showtimes")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [movie, location.hash]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E4E8EE] flex items-center justify-center">
        <Loader2 className="animate-spin" size={40} color="#4B5563" />
      </div>
    );
  }

  if (!movie) {
    return <MovieNotFound onBack={() => navigate("/")} />;
  }

  const getEmbedUrl = (url?: string | null) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}?autoplay=0&rel=0`;
    }
    return url;
  };

  const embedUrl = getEmbedUrl(movie.trailer);
  const genresStr = movie.genres?.map((g) => g.name).join(" · ") || "Chưa cập nhật";
  const formatsStr = movie.formats?.join(", ") || "";
  const hideBookingSchedule = movie.status === "COMING_SOON" && movieShowtimes.length === 0;

  return (
    <div className="min-h-screen bg-[#0f172a] font-sans">
      {/* Navbar (simple) */}
      <div className="fixed top-0 left-0 right-0 h-[68px] bg-[#0f172a]/80 backdrop-blur-md z-40 border-b border-white/10 flex items-center px-6">
        <button onClick={() => navigate("/")} className="text-gray-300 hover:text-white flex items-center gap-2 transition-colors">
          <ArrowLeft size={20} /> <span className="font-semibold text-sm">Trang chủ</span>
        </button>
      </div>

      <main className="pt-[68px]">
        {/* Hero Section */}
        <div className="relative w-full h-[50vh] md:h-[70vh] bg-black">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allowFullScreen
              style={{ border: "none" }}
              title={`${movie.movieNameVn} Trailer`}
            />
          ) : movie.backdropImage ? (
            <div className="relative w-full h-full">
              <img src={movie.backdropImage} alt={movie.movieNameVn} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/40 to-transparent" />
            </div>
          ) : (
            <div className="w-full h-full bg-gray-900 flex items-center justify-center">
              <Play size={48} className="text-gray-700" />
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className={`max-w-7xl mx-auto px-6 py-12 relative z-10 ${embedUrl ? 'mt-4' : '-mt-[100px]'}`}>
          <div className="flex flex-col md:flex-row gap-8 md:gap-12">
            
            {/* Left: Poster */}
            <div className="w-48 md:w-72 flex-shrink-0 mx-auto md:mx-0 relative">
              <div 
                className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-gray-800 aspect-[2/3] cursor-crosshair"
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
              >
                <img 
                  src={movie.smallImage || movie.largeImage || "https://placehold.co/400x600?text=No+Poster"} 
                  alt={movie.movieNameVn} 
                  className="w-full h-full object-cover"
                />
                
                {/* Magnifier Glass Overlay */}
                {isHovering && (
                  <div 
                    className="absolute border-2 border-white/30 rounded-full pointer-events-none shadow-lg z-20 bg-white/10"
                    style={{
                      left: `${mousePos.x}%`,
                      top: `${mousePos.y}%`,
                      width: '100px',
                      height: '100px',
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                )}
              </div>

              {/* Zoom Window (Side Window) */}
              {isHovering && (
                <div 
                  className="absolute top-0 left-[110%] w-[450px] h-[675px] hidden xl:block z-50 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.7)] border-2 border-white/20 bg-gray-900"
                >
                  <div 
                    className="w-full h-full"
                    style={{
                      backgroundImage: `url(${movie.smallImage || movie.largeImage})`,
                      backgroundPosition: `${mousePos.x}% ${mousePos.y}%`,
                      backgroundSize: '300%',
                      backgroundRepeat: 'no-repeat'
                    }}
                  />
                </div>
              )}
              {!hideBookingSchedule && (
                <button
                  onClick={() => document.getElementById('showtimes')?.scrollIntoView({ behavior: 'smooth' })}
                  className="w-full mt-6 py-4 rounded-xl flex items-center justify-center gap-2 font-semibold text-base transition-transform hover:-translate-y-1 shadow-lg"
                  style={{ background: "linear-gradient(135deg,#E63946,#c1121f)", color: "#fff" }}>
                  <Ticket size={18} /> Đặt vé ngay
                </button>
              )}
            </div>

            {/* Right: Info */}
            <div className="flex-1 pt-4 md:pt-24 text-white">
              <div className="text-xs font-bold text-[#E63946] tracking-widest mb-3">{genresStr}</div>
              <h1 className="text-3xl md:text-5xl font-extrabold mb-2 leading-tight">{movie.movieNameVn}</h1>
              <div className="flex flex-wrap items-center gap-6 mb-8 text-sm font-medium">
                {(movie.rating ?? 0) > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white">
                    <Star size={16} color="#F5C518" fill="#F5C518" />
                    <span className="text-base">{movie.rating?.toFixed(1)}</span>
                  </div>
                )}
                {movie.duration && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Clock size={16} className="text-gray-400" />
                    {movie.duration} phút
                  </div>
                )}
                {movie.fromDate && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Calendar size={16} className="text-gray-400" />
                    {new Date(movie.fromDate).toLocaleDateString("vi-VN")}
                  </div>
                )}
                {formatsStr && (
                  <div className="flex items-center gap-2 text-gray-300 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                    {formatsStr}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-200 mb-2">Nội dung phim</h3>
                  <p className="text-gray-400 leading-relaxed text-sm md:text-base">
                    {movie.content || "Chưa có thông tin cập nhật."}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-bold text-gray-500 tracking-wider mb-1">Đạo diễn</h3>
                    <p className="text-gray-200">{movie.director || "Chưa cập nhật"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-500 tracking-wider mb-1">Diễn viên</h3>
                    <p className="text-gray-200">{movie.actor || "Chưa cập nhật"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-500 tracking-wider mb-1">Nhà sản xuất</h3>
                    <p className="text-gray-200">{movie.movieProductionCompany || "Chưa cập nhật"}</p>
                  </div>
                  {movie.ageRating && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-500 tracking-wider mb-1">Độ tuổi</h3>
                      <p className="text-gray-200">{movie.ageRating}</p>
                    </div>
                  )}
                </div>

                {!hideBookingSchedule && (
                <div id="showtimes" className="mt-12 border-t border-white/10 pt-10 scroll-mt-24">
                  <div className="flex flex-col gap-2 mb-6 md:flex-row md:items-end md:justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#E63946] tracking-widest mb-2">Chọn suất chiếu</div>
                      <h3 className="text-2xl font-bold text-white">Lịch chiếu</h3>
                    </div>
                    {selectedDate && (
                      <div className="text-sm text-gray-400">
                        {showtimeDateStats.get(selectedDate)?.bookable || 0} suất còn nhận đặt
                      </div>
                    )}
                  </div>
                  {showtimeDates.length > 0 ? (
                    <div>
                      <div className="flex overflow-x-auto no-scrollbar gap-3 pb-4 mb-6">
                        {showtimeDates.map((dateStr) => {
                          const isSelected = selectedDate === dateStr;
                          const dateLabel = formatDateLabel(dateStr, currentTime);
                          const stats = showtimeDateStats.get(dateStr) || { total: 0, bookable: 0 };
                          const hasBookableShowtime = stats.bookable > 0;
                          return (
                            <button
                              key={dateStr}
                              onClick={() => setSelectedDate(dateStr)}
                              className={`flex-shrink-0 w-[104px] h-[96px] rounded-xl border transition-all text-left px-3 py-3 ${
                                isSelected 
                                  ? "bg-[#E63946] border-[#E63946] shadow-[0_0_18px_rgba(230,57,70,0.35)] text-white" 
                                  : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-bold tracking-wider">{dateLabel.weekday}</span>
                                {!hasBookableShowtime && (
                                  <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-white/70" : "bg-gray-600"}`} />
                                )}
                              </div>
                              <div className={`text-2xl font-extrabold mt-1 ${isSelected ? "text-white" : "text-gray-100"}`}>
                                {dateLabel.shortDate}
                              </div>
                              <div className={`text-[11px] mt-1 truncate ${isSelected ? "text-white/80" : "text-gray-500"}`}>
                                {hasBookableShowtime ? `${stats.bookable} suất` : "Hết suất"}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="bg-white/[0.04] rounded-2xl p-4 md:p-6 border border-white/10">
                        <div className="flex flex-col gap-1 mb-5 md:flex-row md:items-center md:justify-between">
                          <div className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                            <Calendar size={16} className="text-[#E63946]" />
                            {selectedDate
                              ? `${formatDateLabel(selectedDate, currentTime).label}, ${formatDateLabel(selectedDate, currentTime).shortDate}`
                              : "Chọn ngày"}
                          </div>
                          <div className="text-xs text-gray-500">Chọn phiên bản phim và giờ chiếu</div>
                        </div>

                        {groupedShowtimes.length > 0 ? (
                          <div className="space-y-4">
                            {groupedShowtimes.map((presentation) => (
                              <div key={presentation.key} className="overflow-hidden rounded-xl border border-white/10 bg-[#0f172a]/60">
                                <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.04] px-4 py-3">
                                  <div className="flex min-w-0 items-center gap-2.5 text-sm font-semibold text-gray-100">
                                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#E63946]/15 text-[#ff6673]">
                                      <Film size={16} />
                                    </span>
                                    <div className="min-w-0">
                                      <div className="truncate font-extrabold">{presentation.label}</div>
                                      <div className="mt-0.5 text-[11px] font-medium text-gray-500">Phiên bản phim</div>
                                    </div>
                                  </div>
                                  <span className="shrink-0 rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] font-bold text-gray-400">
                                    {presentation.showtimes.length} suất
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
                                  {presentation.showtimes.map(st => {
                                    const bookable = isShowtimeBookable(st, currentTime);
                                    const startTime = (st.startTime || "").slice(0, 5);
                                    const endTime = (st.endTime || "").slice(0, 5);

                                    return (
                                      <button
                                        key={st.showtimeId}
                                        onClick={() => bookable && navigate(`/booking/${st.showtimeId}`)}
                                        disabled={!bookable}
                                        className={`group rounded-lg border px-4 py-3 text-left transition-all ${
                                          bookable
                                            ? "bg-white/5 border-white/10 hover:bg-[#E63946] hover:border-[#E63946] hover:-translate-y-0.5 hover:shadow-[0_0_16px_rgba(230,57,70,0.25)]"
                                            : "bg-white/[0.02] border-white/5 opacity-55 cursor-not-allowed"
                                        }`}
                                      >
                                        <div className="flex items-center justify-between gap-3">
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <Clock size={15} className={bookable ? "text-[#E63946] group-hover:text-white" : "text-gray-600"} />
                                              <span className="text-lg font-extrabold text-white">{startTime}</span>
                                              {endTime && <span className="text-sm font-bold text-gray-400">~</span>}
                                              {endTime && <span className="text-lg font-extrabold text-white">{endTime}</span>}
                                            </div>
                                            {!endTime && <div className="text-xs text-gray-400 mt-1">Chưa có giờ kết thúc</div>}
                                          </div>
                                          {bookable ? (
                                            <ChevronRight size={18} className="text-gray-500 group-hover:text-white" />
                                          ) : (
                                            <span className="text-[11px] text-gray-500">Đã qua</span>
                                          )}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
                            <Clock size={36} className="text-gray-600 mx-auto mb-3" />
                            <div className="text-gray-300 font-medium">Không có suất chiếu trong ngày này</div>
                            <div className="text-gray-500 text-sm mt-1">Hãy chọn ngày khác trong danh sách phía trên.</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-8 text-center flex flex-col items-center">
                      <Calendar size={40} className="text-gray-600 mb-4" />
                      <div className="text-gray-300 font-medium text-lg">Phim chưa có lịch chiếu</div>
                      <div className="text-gray-500 text-sm mt-2">Vui lòng quay lại sau nhé!</div>
                    </div>
                  )}
                </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
