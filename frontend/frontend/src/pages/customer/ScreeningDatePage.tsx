import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  Film,
  Loader2,
  Search,
  SlidersHorizontal,
  Ticket,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { showtimeApi, type MovieShowtimeByDateResponse, type ShowtimeSelectionResponse } from "@/api/showtimeApi";
import { TimeRulerPicker } from "@/components/ui/TimeRulerPicker";
import { formatPresentationLabelFromFields } from "@/utils/presentation";

const TIME_WINDOW_MINUTES = 45;
const EMPTY_SCHEDULES: MovieShowtimeByDateResponse[] = [];
const TIME_PRESETS = ["09:00", "12:00", "15:00", "18:00", "21:00"];

type MatchedShowtime = ShowtimeSelectionResponse & {
  movieName: string;
  distanceMinutes: number;
};

type PresentationShowtimeGroup = {
  key: string;
  label: string;
  showtimes: MatchedShowtime[];
};

type MovieShowtimeGroup = {
  key: string;
  movieName: string;
  showtimes: MatchedShowtime[];
  presentations: PresentationShowtimeGroup[];
};

type ScreeningDatesState = {
  dates: string[];
  loaded: boolean;
  error: string | null;
};

type ScheduleState = {
  date: string;
  schedules: MovieShowtimeByDateResponse[];
  error: string | null;
};

function formatDateLabel(date: string) {
  if (!date) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function formatTime(time?: string | null) {
  if (!time) return "--:--";
  return time.slice(0, 5);
}

function parseTimeToMinutes(time?: string | null) {
  if (!time) return null;
  const [hour, minute] = time.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatPresentationLabel(showtime: ShowtimeSelectionResponse) {
  return formatPresentationLabelFromFields(showtime) || "Phiên bản tiêu chuẩn";
}

function getPresentationGroupKey(showtime: ShowtimeSelectionResponse) {
  if (showtime.presentationId != null) {
    return `presentation-${showtime.presentationId}`;
  }

  return [
    showtime.presentationFormat || "STANDARD",
    showtime.projectionType || "TWO_D",
    showtime.languageType || "ORIGINAL",
    formatPresentationLabel(showtime),
  ].join("|");
}

function flattenShowtimes(
  schedules: MovieShowtimeByDateResponse[],
  selectedTime: string
): MatchedShowtime[] {
  const selectedMinutes = parseTimeToMinutes(selectedTime);
  if (selectedMinutes === null) return [];

  return schedules
    .flatMap((movie) => {
      const movieName = movie.movieNameVn || movie.displayName || movie.movieNameEnglish || "Phim chưa cập nhật";

      return (movie.showtimes || []).map((showtime) => {
        const startMinutes = parseTimeToMinutes(showtime.startTime);
        const distanceMinutes = startMinutes === null ? Number.MAX_SAFE_INTEGER : Math.abs(startMinutes - selectedMinutes);

        return {
          ...showtime,
          movieName,
          distanceMinutes,
        };
      });
    })
    .filter((showtime) => showtime.distanceMinutes <= TIME_WINDOW_MINUTES)
    .sort((a, b) => a.distanceMinutes - b.distanceMinutes || formatTime(a.startTime).localeCompare(formatTime(b.startTime)));
}

function groupByMovie(showtimes: MatchedShowtime[]): MovieShowtimeGroup[] {
  const grouped = new Map<string, MatchedShowtime[]>();
  showtimes.forEach((showtime) => {
    const key = `${showtime.movieId}-${showtime.movieName}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(showtime);
  });

  return Array.from(grouped.entries()).map(([key, items]) => ({
    key,
    movieName: items[0]?.movieName || "Phim chưa cập nhật",
    showtimes: items,
    presentations: Array.from(
      items.reduce((presentationGroups, showtime) => {
        const presentationKey = getPresentationGroupKey(showtime);
        const current = presentationGroups.get(presentationKey) || [];
        presentationGroups.set(presentationKey, [...current, showtime]);
        return presentationGroups;
      }, new Map<string, MatchedShowtime[]>())
    )
      .map(([presentationKey, presentationShowtimes]) => ({
        key: presentationKey,
        label: formatPresentationLabel(presentationShowtimes[0]),
        showtimes: presentationShowtimes,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "vi")),
  }));
}

export default function ScreeningDatePage() {
  const navigate = useNavigate();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedTime, setSelectedTime] = useState("19:00");
  const [datesState, setDatesState] = useState<ScreeningDatesState>({
    dates: [],
    loaded: false,
    error: null,
  });
  const [scheduleState, setScheduleState] = useState<ScheduleState>({
    date: "",
    schedules: [],
    error: null,
  });

  const showtimesLoading = !!selectedDate && scheduleState.date !== selectedDate;
  const schedules = scheduleState.date === selectedDate ? scheduleState.schedules : EMPTY_SCHEDULES;
  const error = datesState.error || scheduleState.error;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let cancelled = false;

    showtimeApi.getPublicScreeningDates()
      .then((dates) => {
        if (cancelled) return;
        const normalizedDates = dates || [];
        setDatesState({
          dates: normalizedDates,
          loaded: true,
          error: null,
        });
        if (normalizedDates.length > 0 && !normalizedDates.includes(today)) {
          setSelectedDate(normalizedDates[0]);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch screening dates", err);
        if (!cancelled) {
          setDatesState({
            dates: [],
            loaded: true,
            error: "Không thể tải danh sách ngày chiếu.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [today]);

  useEffect(() => {
    if (!selectedDate) return;

    let cancelled = false;

    showtimeApi.getPublicShowtimesByDate(selectedDate)
      .then((data) => {
        if (!cancelled) {
          setScheduleState({
            date: selectedDate,
            schedules: data || [],
            error: null,
          });
        }
      })
      .catch((err) => {
        console.error("Failed to fetch showtimes by date", err);
        if (!cancelled) {
          setScheduleState({
            date: selectedDate,
            schedules: [],
            error: "Không thể tải suất chiếu của ngày đã chọn.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  const matchedShowtimes = useMemo(
    () => flattenShowtimes(schedules, selectedTime),
    [schedules, selectedTime]
  );

  const groupedShowtimes = useMemo(() => groupByMovie(matchedShowtimes), [matchedShowtimes]);
  const matchedPresentationCount = useMemo(
    () => groupedShowtimes.reduce((total, movie) => total + movie.presentations.length, 0),
    [groupedShowtimes]
  );

  const totalShowtimes = useMemo(
    () => schedules.reduce((total, movie) => total + (movie.showtimes?.length || 0), 0),
    [schedules]
  );

  return (
    <div className="min-h-screen bg-[#E4E8EE] text-slate-950">
      <main className="px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-7xl">
          <div className="mb-6">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-3 py-1.5 text-xs font-extrabold tracking-[0.18em] text-slate-500 shadow-sm">
                <CalendarDays size={14} />
                Ngày chiếu
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
                Tìm suất chiếu theo ngày và giờ
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-600 md:text-base">
                Chọn thời điểm bạn muốn xem, hệ thống sẽ lọc các suất bắt đầu trong khoảng trước hoặc sau {TIME_WINDOW_MINUTES} phút.
              </p>
            </div>
          </div>

          <div className="mb-6 grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="space-y-4">
              <div className="rounded-2xl border border-white/80 bg-white/80 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
                    <SlidersHorizontal size={17} />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-950">Bộ lọc suất chiếu</h2>
                    <p className="text-xs font-medium text-slate-500">Chọn ngày và giờ muốn xem</p>
                  </div>
                </div>

                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                    <CalendarDays size={16} />
                    Ngày muốn xem
                  </span>
                  <input
                    type="date"
                    value={selectedDate}
                    min={today}
                    onChange={(event) => setSelectedDate(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-slate-400"
                  />
                </label>

                <div className="mt-4">
                <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                  <Clock3 size={16} />
                  Giờ muốn xem
                </span>
                  <TimeRulerPicker value={selectedTime} onChange={setSelectedTime} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {TIME_PRESETS.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setSelectedTime(time)}
                      className={`rounded-full px-3 py-1.5 text-xs font-extrabold transition ${
                        selectedTime === time
                          ? "bg-slate-950 text-white"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700">
                  <div className="flex items-center gap-2">
                    <Search size={16} />
                    Phạm vi tìm kiếm: ± {TIME_WINDOW_MINUTES} phút
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/80 bg-white/75 p-4 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <SummaryCell label="Tổng suất" value={totalShowtimes.toString()} />
                  <SummaryCell label="Phù hợp" value={matchedShowtimes.length.toString()} />
                  <SummaryCell label="Phiên bản" value={matchedPresentationCount.toString()} />
                </div>
              </div>
            </aside>

            <section className="min-w-0">
              <div className="mb-4 flex flex-col justify-between gap-2 rounded-2xl border border-white/80 bg-white/75 px-4 py-4 shadow-[0_10px_34px_rgba(15,23,42,0.05)] md:flex-row md:items-center">
                <div>
                  <h2 className="text-xl font-black text-slate-950">Suất chiếu gần {selectedTime}</h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {formatDateLabel(selectedDate)} · tìm thấy {matchedShowtimes.length}/{totalShowtimes} suất phù hợp
                  </p>
                </div>
              </div>

              {error && (
                <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  {error}
                </div>
              )}

              {showtimesLoading ? (
                <div className="flex min-h-[260px] items-center justify-center gap-3 rounded-2xl border border-white/80 bg-white/70 text-slate-500">
                  <Loader2 size={24} className="animate-spin" />
                  <span className="text-sm font-bold">Đang tải suất chiếu...</span>
                </div>
              ) : groupedShowtimes.length === 0 ? (
                <div className="rounded-2xl border border-white/80 bg-white/75 p-10 text-center shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
                  <Film size={38} className="mx-auto mb-3 text-slate-400" />
                  <div className="text-lg font-black text-slate-800">Không có suất chiếu phù hợp</div>
                  <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">
                    Hãy thử kéo giờ sang mốc khác hoặc chọn ngày chiếu còn nhiều suất hơn.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedShowtimes.map((group) => (
                    <article
                      key={group.key}
                      className="rounded-2xl border border-white/80 bg-white/82 p-4 shadow-[0_12px_38px_rgba(15,23,42,0.06)] backdrop-blur-xl"
                    >
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="line-clamp-2 text-lg font-black text-slate-950">{group.movieName}</h3>
                          <p className="mt-1 text-xs font-bold text-slate-500">{group.showtimes.length} suất gần giờ đã chọn</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                          ± {TIME_WINDOW_MINUTES}'
                        </span>
                      </div>

                      <div className="space-y-3">
                        {group.presentations.map((presentation) => (
                          <section
                            key={presentation.key}
                            className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80"
                          >
                            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
                              <div className="flex min-w-0 items-center gap-2.5">
                                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600">
                                  <Film size={16} />
                                </span>
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-black text-slate-900">
                                    {presentation.label}
                                  </div>
                                  <div className="text-[11px] font-bold text-slate-500">Phiên bản phim</div>
                                </div>
                              </div>
                              <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">
                                {presentation.showtimes.length} suất
                              </span>
                            </div>

                            <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">
                              {presentation.showtimes.map((showtime) => (
                                <ShowtimeCard
                                  key={showtime.showtimeId}
                                  showtime={showtime}
                                  onSelect={() => navigate(`/booking/${showtime.showtimeId}`)}
                                />
                              ))}
                            </div>
                          </section>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-2 py-3">
      <div className="text-lg font-black text-slate-950">{value}</div>
      <div className="mt-0.5 text-[11px] font-bold tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

function ShowtimeCard({ showtime, onSelect }: { showtime: MatchedShowtime; onSelect: () => void }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-2xl font-black text-slate-950">{formatTime(showtime.startTime)}</div>
          <div className="text-xs font-bold text-slate-500">Bắt đầu</div>
        </div>
        <div className="text-sm font-black text-slate-300">~</div>
        <div className="text-right">
          <div className="text-xl font-black text-slate-700">{formatTime(showtime.endTime)}</div>
          <div className="text-xs font-bold text-slate-500">Kết thúc</div>
        </div>
      </div>

      <div className="mt-3 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">
        Cách giờ chọn {showtime.distanceMinutes} phút
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-sm font-black text-slate-900">{formatCurrency(showtime.basePrice)}</span>
        <button
          type="button"
          onClick={onSelect}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border-0 bg-slate-950 px-3 text-xs font-black text-white transition hover:bg-slate-800"
        >
          <Ticket size={14} />
          Chọn ghế
        </button>
      </div>
    </div>
  );
}
