import { useCallback, useEffect, useState, useMemo, useRef, type FormEvent, type ReactNode } from "react";
import {
  Ban, CalendarClock, ChevronDown, ChevronLeft, ChevronRight, Edit, Loader2, Plus, RefreshCw, X, Armchair, Clock, Film, Users, AlertTriangle, Wand2, Search
} from "lucide-react";
import { toast } from "react-toastify";
import { showtimeApi, type ShowtimeResponse, type ShowtimeAdminRequest, type ShowtimeStatusEnum, type AutoShowtimeResponse, type AutoShowtimeRequest, type AutoShowtimeConfig, type AutoShowtimeAgeRule, type AutoShowtimeMoviePolicy, type AutoShowtimePresentationPolicy } from "@/api/showtimeApi";
import { getApiErrorMessage } from "@/api/errors";
import { showtimeSeatService } from "@/api/showtimeSeatApi";
import { movieService, type GetMoviesParams, type MoviePresentationResponse, type MovieResponse, type MovieStatus } from "@/api/movieApi";
import { cinemaRoomService, type GetCinemaRoomsParams } from "@/api/cinemaRoomApi";
import type { ShowtimeSeat, ShowtimeSeatStatus, SeatType } from "@/types/seat";
import type { CinemaRoom, RoomStatus, RoomType } from "@/types/cinemaRoom";
import { TimeRulerPicker as TimePicker } from "@/components/ui/TimeRulerPicker";
import { formatPresentationLabelFromFields, getSuggestedPresentationBasePrice, isProjectionAllowedForFormat } from "@/utils/presentation";
import { ShowtimePlannerWizard } from "@/components/dashboard/ShowtimePlannerWizard";
import { ticketPricingApi, type TicketPriceConfig } from "@/api/ticketPricingApi";

const FONT = "'Inter', sans-serif";

const EDITABLE_SHOWTIME_STATUSES: ShowtimeStatusEnum[] = ["SCHEDULED"];
const SCHEDULABLE_MOVIE_STATUSES: MovieStatus[] = ["NOW_SHOWING", "COMING_SOON"];
const ACTIVE_ROOM_STATUS: RoomStatus = "ACTIVE";
const STATUS_CONFIG: Record<ShowtimeStatusEnum, { label: string; bg: string; color: string; border: string }> = {
  SCHEDULED: { label: "Đã lên lịch", bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  ONGOING:   { label: "Đang chiếu",  bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
  COMPLETED: { label: "Đã chiếu",    bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" },
  CANCELLED: { label: "Đã hủy",      bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
};
const MOVIE_STATUS_LABELS: Record<MovieStatus, string> = {
  NOW_SHOWING: "Đang chiếu",
  COMING_SOON: "Sắp chiếu",
  ENDED: "Đã kết thúc",
  INACTIVE: "Đã ẩn",
};
const ROOM_STATUS_LABELS: Record<RoomStatus, string> = {
  ACTIVE: "Đang hoạt động",
  INACTIVE: "Đã vô hiệu",
  MAINTENANCE: "Bảo trì",
};

const DEFAULT_BASE_PRICE = 75000;

let globalPricingConfig: TicketPriceConfig | null = null;
const getActivePricingConfig = () => {
  if (!globalPricingConfig) {
    void ticketPricingApi.getConfig().then((cfg) => {
      globalPricingConfig = cfg;
    }).catch(() => null);
  }
  return globalPricingConfig;
};

const calculateAutoBasePrice = (defaultPrice: number, presentation?: MoviePresentationResponse | null) => {
  const config = getActivePricingConfig();
  return getSuggestedPresentationBasePrice(config?.standard2dPrice ?? defaultPrice, presentation, config);
};
const SEAT_STATUS_CONFIG: Record<ShowtimeSeatStatus, { label: string; bg: string; color: string; border: string }> = {
  AVAILABLE: { label: "Trống",    bg: "#ecfdf5", color: "#047857", border: "#10b981" },
  HOLDING:   { label: "Đang giữ", bg: "#fffbeb", color: "#b45309", border: "#f59e0b" },
  BOOKED:    { label: "Đã đặt",   bg: "#fef2f2", color: "#b91c1c", border: "#ef4444" },
};

const SEAT_TYPE_CONFIG: Record<SeatType, { label: string; color: string }> = {
  NORMAL:   { label: "Thường",   color: "#2563eb" },
  VIP:      { label: "VIP",      color: "#7c3aed" },
  COUPLE:   { label: "Đôi",   color: "#db2777" },
  DISABLED: { label: "Hỗ trợ", color: "#0f766e" },
};

const EMPTY_FORM: ShowtimeAdminRequest = {
  movieId: 0,
  cinemaRoomId: 0,
  presentationId: null,
  showDate: "",
  startTime: "",
  endTime: "",
  basePrice: DEFAULT_BASE_PRICE,
  status: "SCHEDULED",
};

const INPUT_CLS = "w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition-colors";
const LABEL_CLS = "block text-xs font-semibold text-slate-500 mb-1 tracking-wide";

const DAY_NAMES = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const DAY_FULL_NAMES = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

// ── Week Helper ───────────────────────────────────────────────────────────────
function getWeekDays(referenceDate: Date): Date[] {
  const day = referenceDate.getDay(); // 0=Sun, 1=Mon...
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toDateStr(d: Date): string {
  return d.toLocaleDateString('en-CA'); // YYYY-MM-DD
}

function formatDateShortText(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("vi-VN");
}

function formatCurrency(value?: number | null): string {
  return (value ?? DEFAULT_BASE_PRICE).toLocaleString("vi-VN", { style: "currency", currency: "VND" });
}

function formatCompactNumber(value?: number | null): string {
  return (value ?? 0).toLocaleString("vi-VN");
}

function describeSkippedReason(reason: string): string {
  const value = reason.toLowerCase();
  if (value.includes("định dạng")) return "Phim và loại phòng không cùng định dạng chiếu.";
  if (value.includes("trước ngày")) return "Phim chưa tới ngày khởi chiếu chính thức.";
  if (value.includes("sau ngày")) return "Phim đã qua ngày kết thúc chiếu.";
  if (value.includes("giới hạn")) return "Phim đã đạt số suất tối đa trong ngày.";
  if (value.includes("độ tuổi")) return "Khung giờ không phù hợp quy tắc độ tuổi.";
  if (value.includes("cùng mốc giờ")) return "Phim thường sẽ tránh chiếu cùng mốc giờ ở nhiều phòng.";
  if (value.includes("khoảng trống")) return "Không còn đủ thời lượng trống trong phòng/ngày.";
  if (value.includes("active") || value.includes("bảo trì")) return "Không tìm thấy phòng đang hoạt động.";
  if (value.includes("thời lượng")) return "Phim thiếu thời lượng hoặc khoảng trống không đủ dài.";
  if (value.includes("kết thúc") || value.includes("bị ẩn")) return "Phim đã kết thúc hoặc đang bị ẩn.";
  return "Điều kiện xếp lịch không phù hợp.";
}

function formatTime(time: string): string {
  if (!time) return "";
  const parts = time.split(":");
  return parts.slice(0, 2).join(":");
}

const LATEST_FINISH_MINUTES = 2 * 60;

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function addMinutesToTime(time: string, minutesToAdd: number): string {
  return minutesToTime(timeToMinutes(time) + minutesToAdd);
}

function roundTimeUp(time: string, stepMinutes = 5): string {
  const total = timeToMinutes(time);
  const remainder = total % stepMinutes;
  return remainder === 0 ? time : minutesToTime(total + stepMinutes - remainder);
}

function clampStartTimeForDates(dates: string[], requestedStart: string): string {
  const now = new Date();
  const today = now.toLocaleDateString("en-CA");
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  if (!dates.includes(today) || requestedStart >= currentTime) return requestedStart;

  const roundedMinutes = Math.ceil(now.getMinutes() / 5) * 5;
  const hour = roundedMinutes >= 60 ? now.getHours() + 1 : now.getHours();
  if (hour >= 24) return requestedStart;
  const minute = roundedMinutes >= 60 ? 0 : roundedMinutes;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function finishesBeforeCutoff(start: string, end: string): boolean {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  if (start === end) return false;
  if (startMinutes < LATEST_FINISH_MINUTES) {
    return endMinutes < LATEST_FINISH_MINUTES && endMinutes > startMinutes;
  }
  if (endMinutes < startMinutes) {
    return endMinutes < LATEST_FINISH_MINUTES;
  }
  return true;
}

function normalizeFormat(format?: string | null): string {
  if (!format) return "";
  const normalized = String(format).toUpperCase();
  if (normalized === "STANDARD"
    || normalized === "_2D"
    || normalized === "_3D"
    || normalized === "2D"
    || normalized === "3D"
    || normalized === "SCREENX") return "Standard";
  if (normalized === "_4DX" || normalized === "4DX") return "4DX";
  return format;
}

function getRoomSupportedFormats(type?: RoomType | null): string[] {
  switch (type) {
    case "IMAX":
      return ["IMAX"];
    case "4DX":
      return ["4DX"];
    case "DOLBY":
      return ["DOLBY"];
    case "BED":
      return ["Standard"];
    case "STANDARD":
    case "VIP":
    default:
      return ["Standard"];
  }
}

function formatPresentationSummary(name?: string | null, format?: string | null, projectionType?: string | null, languageType?: string | null): string {
  return formatPresentationLabelFromFields({
    presentationName: name,
    presentationFormat: format,
    projectionType,
    languageType,
  });
}

function formatPresentationLabel(presentation?: MoviePresentationResponse | null): string {
  if (!presentation) return "Phiên bản chiếu";
  return formatPresentationLabelFromFields({
    ...presentation,
    presentationName: presentation.displayName?.trim() || presentation.label,
  }) || "Phiên bản chiếu";
}

function getActivePresentations(movie?: MovieResponse | null): MoviePresentationResponse[] {
  return (movie?.presentations ?? [])
    .filter((presentation) => presentation.active !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.presentationId - b.presentationId);
}

function isRoomCompatibleWithPresentation(room: CinemaRoom, presentation?: MoviePresentationResponse | null): boolean {
  if (!presentation) return true;
  const presentationFormat = normalizeFormat(String(presentation.format ?? ""));
  if (!presentationFormat) return true;
  return getRoomSupportedFormats(room.type).includes(presentationFormat);
}

function getCompatiblePresentations(movie?: MovieResponse | null, room?: CinemaRoom | null): MoviePresentationResponse[] {
  const presentations = getActivePresentations(movie);
  if (!room) return presentations;
  return presentations.filter((presentation) => isRoomCompatibleWithPresentation(room, presentation));
}

function getMovieFormats(movie?: MovieResponse | null): string[] {
  const presentationFormats = getActivePresentations(movie)
    .map((presentation) => normalizeFormat(String(presentation.format ?? "")))
    .filter(Boolean);
  if (presentationFormats.length > 0) {
    return Array.from(new Set(presentationFormats));
  }
  return Array.from(new Set((movie?.formats || []).map((format) => normalizeFormat(String(format))).filter(Boolean)));
}

function isRoomCompatibleWithMovie(room: CinemaRoom, movie?: MovieResponse | null): boolean {
  const presentations = getActivePresentations(movie);
  if (movie && presentations.length > 0) {
    return presentations.some((presentation) => isRoomCompatibleWithPresentation(room, presentation));
  }
  const movieFormats = getMovieFormats(movie);
  if (!movie || movieFormats.length === 0) return true;
  const roomFormats = getRoomSupportedFormats(room.type);
  return movieFormats.some((format) => roomFormats.includes(format));
}

function formatRoomOptionLabel(room: CinemaRoom): string {
  return `${room.cinemaRoomName} · ${getRoomSupportedFormats(room.type).join("/")}`;
}

function formatMovieOptionLabel(movie: MovieResponse): string {
  const name = movie.movieNameVn || movie.movieNameEnglish || `Phim #${movie.movieId}`;
  const duration = movie.duration ? ` (${movie.duration}')` : "";
  const status = movie.status ? ` · ${MOVIE_STATUS_LABELS[movie.status] ?? movie.status}` : "";
  return `${name}${duration}${status}`;
}

function isSchedulableMovie(movie?: MovieResponse | null): boolean {
  return !!movie?.status && SCHEDULABLE_MOVIE_STATUSES.includes(movie.status);
}

function isActiveRoom(room?: CinemaRoom | null): boolean {
  return room?.status === ACTIVE_ROOM_STATUS;
}

function includeCurrentMovieOption(options: MovieResponse[], current?: MovieResponse | null): MovieResponse[] {
  if (!current || options.some((movie) => movie.movieId === current.movieId)) return options;
  return [current, ...options];
}

function includeCurrentRoomOption(options: CinemaRoom[], current?: CinemaRoom | null): CinemaRoom[] {
  if (!current || options.some((room) => room.cinemaRoomId === current.cinemaRoomId)) return options;
  return [current, ...options];
}

function normalizeSearchText(value?: string | number | null): string {
  return String(value ?? "")
    .toLocaleLowerCase("vi-VN")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isCancellableShowtime(showtime: ShowtimeResponse): boolean {
  return showtime.status !== "CANCELLED" && showtime.status !== "COMPLETED" && showtime.status !== "ONGOING";
}

async function fetchAllMovies(params: Omit<GetMoviesParams, "page" | "size"> = {}): Promise<MovieResponse[]> {
  const pageSize = 100;
  const firstPage = await movieService.getMovies({ ...params, page: 0, size: pageSize });
  const totalPages = Math.max(firstPage.totalPages ?? 1, 1);
  if (totalPages <= 1) return firstPage.content || [];

  const restPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      movieService.getMovies({ ...params, page: index + 1, size: pageSize })
    )
  );

  return [
    ...(firstPage.content || []),
    ...restPages.flatMap((page) => page.content || []),
  ];
}

async function fetchAllCinemaRooms(params: Omit<GetCinemaRoomsParams, "page" | "size"> = {}): Promise<CinemaRoom[]> {
  const pageSize = 100;
  const firstPage = await cinemaRoomService.getCinemaRooms({ ...params, page: 0, size: pageSize });
  const totalPages = Math.max(firstPage.totalPages ?? 1, 1);
  if (totalPages <= 1) return firstPage.content || [];

  const restPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      cinemaRoomService.getCinemaRooms({ ...params, page: index + 1, size: pageSize })
    )
  );

  return [
    ...(firstPage.content || []),
    ...restPages.flatMap((page) => page.content || []),
  ];
}

// ── Main Component ────────────────────────────────────────────────────────────
export function ShowtimeManagementPage({ canManage = true }: { canManage?: boolean }) {
  const today = new Date();
  const todayStr = toDateStr(today);

  const [weekRef, setWeekRef] = useState<Date>(today);
  const weekDays = useMemo(() => getWeekDays(weekRef), [weekRef]);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [showCancelledMode, setShowCancelledMode] = useState(false);
  const [movieFilter, setMovieFilter] = useState<number | "">("");
  const [roomFilter, setRoomFilter] = useState<number | "">("");

  const [items, setItems] = useState<ShowtimeResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ShowtimeResponse | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [bulkCancelling, setBulkCancelling] = useState(false);
  const [selectedShowtimeIds, setSelectedShowtimeIds] = useState<Set<number>>(new Set());
  
  const [seatViewShowtime, setSeatViewShowtime] = useState<ShowtimeResponse | null>(null);

  const [form, setForm] = useState<ShowtimeAdminRequest>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const [movies, setMovies] = useState<MovieResponse[]>([]);
  const [rooms, setRooms] = useState<CinemaRoom[]>([]);
  const [schedulableMovies, setSchedulableMovies] = useState<MovieResponse[]>([]);
  const [activeRooms, setActiveRooms] = useState<CinemaRoom[]>([]);

  // Seat counts per showtime (lazy loaded)
  const [seatCounts, setSeatCounts] = useState<Record<number, { booked: number; total: number }>>({});

  const [confirmDialog, setConfirmDialog] = useState({ open: false, message: "", onConfirm: () => {} });
  const closeConfirm = () => setConfirmDialog(p => ({ ...p, open: false }));

  useEffect(() => {
    if (!showCreateMenu) return;

    const handleClickOutside = (event: globalThis.MouseEvent) => {
      if (!createMenuRef.current?.contains(event.target as Node)) {
        setShowCreateMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCreateMenu]);

  const fetchDependencies = async () => {
    try {
      const [allMovies, schedulableMovieOptions, allRooms, activeRoomOptions] = await Promise.all([
        fetchAllMovies(),
        fetchAllMovies({ statuses: SCHEDULABLE_MOVIE_STATUSES }),
        fetchAllCinemaRooms(),
        fetchAllCinemaRooms({ status: ACTIVE_ROOM_STATUS }),
      ]);
      setMovies(allMovies);
      setSchedulableMovies(schedulableMovieOptions);
      setRooms(allRooms);
      setActiveRooms(activeRoomOptions);
      getActivePricingConfig();
    } catch (err) {
      console.error("Failed to fetch movies/rooms", err);
    }
  };

  const fetchShowtimes = useCallback(async (quiet = false) => {
    const filteringByMovieOrRoom = movieFilter !== "" || roomFilter !== "";
    if (!selectedDate && !filteringByMovieOrRoom) return;
    if (!quiet) setLoading(true);
    try {
      const data = await showtimeApi.getAdminShowtimes({
        date: filteringByMovieOrRoom ? undefined : selectedDate,
        movieId: movieFilter === "" ? undefined : movieFilter,
        cinemaRoomId: roomFilter === "" ? undefined : roomFilter,
        status: showCancelledMode ? "CANCELLED" : undefined,
      });
      setItems(data || []);
    } catch (err) {
      console.error("Failed to fetch showtimes", err);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [selectedDate, showCancelledMode, movieFilter, roomFilter]);

  // Fetch seat counts for all showtimes in view
  const fetchSeatCounts = useCallback(async (showtimes: ShowtimeResponse[]) => {
    const counts: Record<number, { booked: number; total: number }> = {};
    try {
      await Promise.all(
        showtimes.map(async (st) => {
          try {
            const data = await showtimeSeatService.getShowtimeSeats({ showtimeId: st.showtimeId, page: 0, size: 1000 });
            const total = data.content?.length || 0;
            const booked = data.content?.filter((s: ShowtimeSeat) => s.status === "BOOKED").length || 0;
            const holding = data.content?.filter((s: ShowtimeSeat) => s.status === "HOLDING").length || 0;
            counts[st.showtimeId] = { booked: booked + holding, total };
          } catch { /* ignore individual errors */ }
        })
      );
    } catch { /* ignore */ }
    setSeatCounts(counts);
  }, []);

  useEffect(() => {
    const requestTimer = window.setTimeout(fetchDependencies, 0);
    return () => window.clearTimeout(requestTimer);
  }, []);

  useEffect(() => {
    const requestTimer = window.setTimeout(() => fetchShowtimes(), 0);
    return () => window.clearTimeout(requestTimer);
  }, [fetchShowtimes]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      fetchShowtimes(true);
    }, 30000);
    return () => window.clearInterval(intervalId);
  }, [fetchShowtimes]);

  useEffect(() => {
    const requestTimer = window.setTimeout(() => {
      if (items.length > 0) {
        fetchSeatCounts(items);
      } else {
        setSeatCounts({});
      }
    }, 0);
    return () => window.clearTimeout(requestTimer);
  }, [items, fetchSeatCounts]);

  useEffect(() => {
    const visibleIds = new Set(items.map((item) => item.showtimeId));
    const reconcileTimer = window.setTimeout(() => {
      setSelectedShowtimeIds((prev) => new Set(Array.from(prev).filter((id) => visibleIds.has(id))));
    }, 0);
    return () => window.clearTimeout(reconcileTimer);
  }, [items]);

  // Group showtimes by movie
  const showtimesByMovie = useMemo(() => {
    const grouped = new Map<number, ShowtimeResponse[]>();
    items.forEach(item => {
      if (!grouped.has(item.movieId)) grouped.set(item.movieId, []);
      grouped.get(item.movieId)!.push(item);
    });
    for (const [, arr] of grouped) {
      arr.sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
    }
    return grouped;
  }, [items]);

  const cancellableShowtimes = useMemo(
    () => items.filter(isCancellableShowtime),
    [items]
  );
  const selectedCancellableIds = useMemo(
    () => Array.from(selectedShowtimeIds).filter((id) => cancellableShowtimes.some((item) => item.showtimeId === id)),
    [selectedShowtimeIds, cancellableShowtimes]
  );
  const allCancellableSelected = cancellableShowtimes.length > 0
    && cancellableShowtimes.every((item) => selectedShowtimeIds.has(item.showtimeId));

  const toggleShowtimeSelection = (showtime: ShowtimeResponse) => {
    if (!canManage || !isCancellableShowtime(showtime) || bulkCancelling) return;
    setSelectedShowtimeIds((prev) => {
      const next = new Set(prev);
      if (next.has(showtime.showtimeId)) {
        next.delete(showtime.showtimeId);
      } else {
        next.add(showtime.showtimeId);
      }
      return next;
    });
  };

  const toggleAllCancellableShowtimes = () => {
    if (!canManage || bulkCancelling || cancellableShowtimes.length === 0) return;
    setSelectedShowtimeIds((prev) => {
      const next = new Set(prev);
      if (allCancellableSelected) {
        cancellableShowtimes.forEach((item) => next.delete(item.showtimeId));
      } else {
        cancellableShowtimes.forEach((item) => next.add(item.showtimeId));
      }
      return next;
    });
  };

  // Week navigation
  const goWeek = (direction: number) => {
    const newRef = new Date(weekRef);
    newRef.setDate(newRef.getDate() + direction * 7);
    setWeekRef(newRef);
    // Select the same day-of-week in new week, or Monday
    const newWeek = getWeekDays(newRef);
    const currentDayIdx = weekDays.findIndex(d => toDateStr(d) === selectedDate);
    const targetDay = currentDayIdx >= 0 ? newWeek[currentDayIdx] : newWeek[0];
    setSelectedDate(toDateStr(targetDay));
  };

  const goDay = (direction: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + direction);
    const nextDateStr = toDateStr(current);
    setSelectedDate(nextDateStr);
    
    // Check if the new date is within the current weekRef view
    if (!weekDays.some(d => toDateStr(d) === nextDateStr)) {
      setWeekRef(current);
    }
  };

  const goToday = () => {
    setWeekRef(new Date());
    setSelectedDate(todayStr);
  };

  const openCreate = () => setShowCreateModal(true);

  const openEdit = (item: ShowtimeResponse) => {
    setSelectedItem(item);
    setForm({
      movieId: item.movieId,
      cinemaRoomId: item.cinemaRoomId,
      presentationId: item.presentationId ?? null,
      showDate: item.showDate,
      startTime: item.startTime,
      endTime: item.endTime,
      basePrice: item.basePrice ?? DEFAULT_BASE_PRICE,
      status: item.status,
    });
    setFormError("");
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    if (!form.movieId || !form.cinemaRoomId || !form.showDate || !form.startTime || !form.endTime) {
      setFormError("Vui lòng điền đầy đủ thông tin bắt buộc.");
      return;
    }
    if (form.startTime === form.endTime) {
      setFormError("Giờ kết thúc phải khác giờ bắt đầu.");
      return;
    }
    if (!finishesBeforeCutoff(form.startTime, form.endTime)) {
      setFormError("Suất chiếu phải kết thúc trước 02:00 sáng.");
      return;
    }
    if (!form.basePrice || form.basePrice < 1000) {
      setFormError("Giá vé gốc phải lớn hơn hoặc bằng 1.000đ.");
      return;
    }
    const selectedMovie = movies.find((movie) => movie.movieId === form.movieId);
    const selectedRoom = rooms.find((room) => room.cinemaRoomId === form.cinemaRoomId);
    const activePresentations = getActivePresentations(selectedMovie);
    const selectedPresentation = activePresentations.find((presentation) => presentation.presentationId === form.presentationId);
    if (selectedMovie?.fromDate && form.showDate < selectedMovie.fromDate) {
      setFormError(`Ngày chiếu phải từ ngày khởi chiếu của phim (${formatDateShortText(selectedMovie.fromDate)}) trở đi.`);
      return;
    }
    if (selectedMovie?.toDate && form.showDate > selectedMovie.toDate) {
      setFormError(`Ngày chiếu không được sau ngày kết thúc của phim (${formatDateShortText(selectedMovie.toDate)}).`);
      return;
    }
    if (selectedMovie && selectedRoom && !isRoomCompatibleWithMovie(selectedRoom, selectedMovie)) {
      setFormError(
        `Phòng ${selectedRoom.cinemaRoomName} hỗ trợ ${getRoomSupportedFormats(selectedRoom.type).join(", ")}, không khớp định dạng phim (${getMovieFormats(selectedMovie).join(", ")}).`
      );
      return;
    }
    if (activePresentations.length > 0 && !form.presentationId) {
      setFormError("Vui lòng chọn phiên bản chiếu của phim.");
      return;
    }
    if (form.presentationId && !selectedPresentation) {
      setFormError("Phiên bản chiếu không thuộc phim đã chọn hoặc đã bị ẩn.");
      return;
    }
    if (selectedPresentation && selectedRoom && !isRoomCompatibleWithPresentation(selectedRoom, selectedPresentation)) {
      setFormError(
        `Phiên bản ${formatPresentationLabel(selectedPresentation)} không phù hợp với phòng ${selectedRoom.cinemaRoomName}.`
      );
      return;
    }

    const now = new Date();
    const nowStr = toDateStr(now);
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (form.showDate === nowStr && form.startTime < currentTimeStr) {
      setFormError("Không thể chọn giờ chiếu trong quá khứ cho ngày hôm nay.");
      return;
    }
    if (form.showDate < nowStr && selectedItem.showDate >= nowStr) {
      setFormError("Không thể dời lịch chiếu về ngày trong quá khứ.");
      return;
    }

    setFormLoading(true);
    setFormError("");
    try {
      await showtimeApi.updateShowtime(selectedItem.showtimeId, form);
      setShowEditModal(false);
      toast.success("Cập nhật suất chiếu thành công.");
      if (form.showDate && form.showDate !== selectedDate) {
        setSelectedDate(form.showDate);
      } else {
        fetchShowtimes();
      }
    } catch (err: unknown) {
      setFormError(getApiErrorMessage(err, "Cập nhật suất chiếu thất bại."));
    } finally {
      setFormLoading(false);
    }
  };

  const handleCancelShowtime = (item: ShowtimeResponse) => {
    const movie = movies.find(m => m.movieId === item.movieId);
    setConfirmDialog({
      open: true,
      message: `Hủy suất chiếu ${formatTime(item.startTime)} ~ ${formatTime(item.endTime)} của phim "${movie?.movieNameVn || '#' + item.movieId}"? Dữ liệu suất chiếu vẫn được giữ lại với trạng thái đã hủy.`,
      onConfirm: async () => {
        closeConfirm();
        setCancellingId(item.showtimeId);
        try {
          await showtimeApi.cancelShowtime(item.showtimeId);
          toast.success("Hủy suất chiếu thành công.");
          fetchShowtimes();
        } catch (err: unknown) {
          toast.error(getApiErrorMessage(err, "Hủy suất chiếu thất bại."));
        } finally {
          setCancellingId(null);
        }
      },
    });
  };

  const handleBulkCancelShowtimes = () => {
    if (selectedCancellableIds.length === 0) return;
    setConfirmDialog({
      open: true,
      message: `Hủy ${selectedCancellableIds.length} suất chiếu đã chọn? Dữ liệu suất chiếu vẫn được giữ lại với trạng thái đã hủy.`,
      onConfirm: async () => {
        closeConfirm();
        setBulkCancelling(true);
        try {
          const cancelledCount = await showtimeApi.cancelShowtimes(selectedCancellableIds);
          toast.success(`Đã hủy ${cancelledCount} suất chiếu.`);
          setSelectedShowtimeIds(new Set());
          fetchShowtimes();
        } catch (err: unknown) {
          toast.error(getApiErrorMessage(err, "Hủy nhiều suất chiếu thất bại."));
        } finally {
          setBulkCancelling(false);
        }
      },
    });
  };

  // Week label
  const weekLabel = useMemo(() => {
    const mon = weekDays[0];
    const sun = weekDays[6];
    const monthNames = ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"];
    if (mon.getMonth() === sun.getMonth()) {
      return `${mon.getDate()} – ${sun.getDate()} ${monthNames[mon.getMonth()]}, ${mon.getFullYear()}`;
    }
    return `${mon.getDate()} ${monthNames[mon.getMonth()]} – ${sun.getDate()} ${monthNames[sun.getMonth()]}, ${sun.getFullYear()}`;
  }, [weekDays]);

  return (
    <div style={{ flex: 1, overflowY: "auto", background: "#F4F5F7", fontFamily: FONT }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "28px 28px 40px" }}>
        {/* Header Section */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 28 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(230,57,70,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CalendarClock size={14} color="#E63946" />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.1em" }}>
                Weekly Schedule
              </span>
            </div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em", lineHeight: 1.25 }}>
              Lịch chiếu & ghế
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
              Quản lý suất chiếu theo phim · Xem trạng thái ghế theo từng suất
            </p>
          </div>
          {canManage && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowCancelledMode((value) => !value)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: showCancelledMode ? "1px solid #fecaca" : "1px solid #e2e8f0",
                  background: showCancelledMode ? "#fef2f2" : "#fff",
                  color: showCancelledMode ? "#dc2626" : "#475569",
                  fontFamily: FONT,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <Ban size={16} />
                {showCancelledMode ? "Xem suất còn hiệu lực" : "Xem suất đã hủy"}
              </button>
              <div
                ref={createMenuRef}
                style={createMenuWrapperStyle}
              >
                <button
                  type="button"
                  onClick={() => setShowCreateMenu((value) => !value)}
                  style={createBtnStyle}
                >
                  <Plus size={16} />
                  Tạo lịch chiếu
                  <ChevronDown size={15} style={{ transform: showCreateMenu ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
                </button>
                {showCreateMenu && (
                  <div style={createMenuStyle}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateMenu(false);
                        setShowAutoModal(true);
                      }}
                      style={createMenuItemStyle}
                    >
                      <Wand2 size={15} />
                      <span>
                        <strong style={{ display: "block", color: "#0f172a", fontSize: 13 }}>Tạo tự động</strong>
                        <span style={{ display: "block", color: "#64748b", fontSize: 11, fontWeight: 600 }}>Hệ thống tự phân bổ suất chiếu</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateMenu(false);
                        openCreate();
                      }}
                      style={createMenuItemStyle}
                    >
                      <Plus size={15} />
                      <span>
                        <strong style={{ display: "block", color: "#0f172a", fontSize: 13 }}>Tạo hàng loạt</strong>
                        <span style={{ display: "block", color: "#64748b", fontSize: 11, fontWeight: 600 }}>Chọn phim, phòng, nhiều ngày và giờ</span>
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: 14, marginBottom: 18, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
          <SearchableFilter
            label="Phim"
            value={movieFilter}
            onChange={setMovieFilter}
            allLabel="Tất cả phim"
            placeholder="Tìm phim..."
            options={movies.map((movie) => ({
              value: movie.movieId,
              label: movie.movieNameVn || movie.movieNameEnglish || `Phim #${movie.movieId}`,
              meta: movie.status,
            }))}
            style={{ minWidth: 260, flex: "1 1 260px" }}
          />
          <SearchableFilter
            label="Phòng chiếu"
            value={roomFilter}
            onChange={setRoomFilter}
            allLabel="Tất cả phòng"
            placeholder="Tìm phòng chiếu..."
            options={rooms.map((room) => ({
              value: room.cinemaRoomId,
              label: formatRoomOptionLabel(room),
              meta: room.status,
            }))}
            style={{ minWidth: 220, flex: "1 1 220px" }}
          />
          {(movieFilter !== "" || roomFilter !== "") && (
            <button
              type="button"
              onClick={() => {
                setMovieFilter("");
                setRoomFilter("");
              }}
              style={{ height: 42, borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", padding: "0 14px", color: "#475569", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              Xóa lọc
            </button>
          )}
        </div>

        {/* ── Week Date Selector ──────────────────────────────────────────── */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", padding: "16px 20px", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => goWeek(-1)} style={weekNavBtn} title="Tuần trước"><ChevronLeft size={18} /></button>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", minWidth: 220, textAlign: "center" }}>{weekLabel}</span>
              <button onClick={() => goWeek(1)} style={weekNavBtn} title="Tuần sau"><ChevronRight size={18} /></button>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={goToday} style={{ ...weekNavBtn, padding: "0 14px", width: "auto", fontSize: 12, fontWeight: 700, color: "#E63946", border: "1px solid rgba(230,57,70,0.3)" }}>
                Hôm nay
              </button>
              <button onClick={() => fetchShowtimes()} style={weekNavBtn} title="Làm mới"><RefreshCw size={15} /></button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "40px minmax(0, 1fr) 40px", gap: 10, alignItems: "stretch" }}>
            <button onClick={() => goDay(-1)} style={{ ...weekNavBtn, width: 40, height: "100%", minHeight: 78 }} title="Ngày trước">
              <ChevronLeft size={18} />
            </button>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, minWidth: 0 }}>
              {weekDays.map((day, idx) => {
                const dateStr = toDateStr(day);
                const isSelected = dateStr === selectedDate;
                const isToday = dateStr === todayStr;
                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    style={{
                      padding: "12px 8px", borderRadius: 12, border: isSelected ? "2px solid #E63946" : "1px solid #e2e8f0",
                      background: isSelected ? "rgba(230,57,70,0.06)" : isToday ? "#fafafa" : "#fff",
                      cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                      transition: "all 0.2s", position: "relative",
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, color: isSelected ? "#E63946" : "#94a3b8", letterSpacing: "0.05em" }}>{DAY_NAMES[idx]}</span>
                    <span style={{ fontSize: 20, fontWeight: 800, color: isSelected ? "#E63946" : "#0f172a" }}>{day.getDate()}</span>
                    <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500 }}>Th{day.getMonth() + 1}</span>
                    {isToday && (
                      <div style={{ position: "absolute", bottom: 4, width: 6, height: 6, borderRadius: "50%", background: "#E63946" }} />
                    )}
                  </button>
                );
              })}
            </div>
            <button onClick={() => goDay(1)} style={{ ...weekNavBtn, width: 40, height: "100%", minHeight: 78 }} title="Ngày tiếp theo">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {canManage && !showCancelledMode && items.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "12px 16px", marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: cancellableShowtimes.length === 0 || bulkCancelling ? "not-allowed" : "pointer", color: "#334155", fontSize: 13, fontWeight: 700 }}>
              <input
                type="checkbox"
                checked={allCancellableSelected}
                disabled={cancellableShowtimes.length === 0 || bulkCancelling}
                onChange={toggleAllCancellableShowtimes}
                style={{ width: 16, height: 16, accentColor: "#E63946" }}
              />
              Chọn tất cả suất có thể hủy
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>
                Đã chọn {selectedCancellableIds.length}/{cancellableShowtimes.length}
              </span>
              {selectedCancellableIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedShowtimeIds(new Set())}
                  disabled={bulkCancelling}
                  style={{ border: "1px solid #e2e8f0", background: "#fff", color: "#475569", borderRadius: 9, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: bulkCancelling ? "not-allowed" : "pointer" }}
                >
                  Bỏ chọn
                </button>
              )}
              <button
                type="button"
                onClick={handleBulkCancelShowtimes}
                disabled={selectedCancellableIds.length === 0 || bulkCancelling}
                style={{ border: "none", background: selectedCancellableIds.length === 0 || bulkCancelling ? "#fecaca" : "#dc2626", color: "#fff", borderRadius: 9, padding: "8px 14px", fontSize: 12, fontWeight: 800, cursor: selectedCancellableIds.length === 0 || bulkCancelling ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 7 }}
              >
                {bulkCancelling ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                Hủy đã chọn
              </button>
            </div>
          </div>
        )}

        {/* ── Showtimes By Movie ──────────────────────────────────────────── */}
        {loading ? (
          <LoadingState label={`Đang tải lịch chiếu...`} />
        ) : items.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "80px 0", textAlign: "center" }}>
            <CalendarClock size={48} style={{ color: "#cbd5e1", marginBottom: 16, margin: "0 auto" }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: "#64748b", marginTop: 12 }}>
              {showCancelledMode ? "Không có suất chiếu đã hủy" : "Không có suất chiếu nào"}
            </div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>
              {movieFilter !== "" || roomFilter !== ""
                ? "Theo bộ lọc phim/phòng"
                : `${DAY_FULL_NAMES[weekDays.findIndex(d => toDateStr(d) === selectedDate)] || ""} · ${selectedDate}`}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {Array.from(showtimesByMovie.entries()).map(([movieId, movieShowtimes]) => {
              const movie = movies.find(m => m.movieId === movieId);
              if (!movie) return null;

              return (
                <div key={movieId} style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
                  {/* Movie Header */}
                  <div style={{ padding: "18px 24px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 16 }}>
                    {movie.smallImage ? (
                      <img
                        src={movie.smallImage}
                        alt={movie.movieNameVn}
                        style={{ width: 52, height: 72, borderRadius: 10, objectFit: "cover", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", flexShrink: 0 }}
                      />
                    ) : (
                      <div style={{ width: 52, height: 72, borderRadius: 10, background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                        <Film size={20} color="#94a3b8" />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{movie.movieNameVn}</h3>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
                        {movie.duration && (
                          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#64748b", fontWeight: 500 }}>
                            <Clock size={13} /> {movie.duration} phút
                          </span>
                        )}
                        <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>
                          {movieShowtimes.length} suất chiếu
                        </span>
                        {movie.genres && movie.genres.length > 0 && (
                          <span style={{ fontSize: 12, color: "#94a3b8" }}>
                            {movie.genres.slice(0, 3).map(g => g.name).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Showtime Cards Row */}
                  <div style={{ padding: "20px 24px", display: "flex", gap: 14, overflowX: "auto", minHeight: 100, alignItems: "stretch" }}>
                    {movieShowtimes.map(st => {
                      const status = STATUS_CONFIG[st.status] || STATUS_CONFIG.SCHEDULED;
                      const room = rooms.find(r => r.cinemaRoomId === st.cinemaRoomId);
                      const sc = seatCounts[st.showtimeId];
                      const hasReservedSeats = (sc?.booked || 0) > 0;
                      const canEditShowtime = st.status === "SCHEDULED" && !hasReservedSeats;
                      const canCancelShowtime = isCancellableShowtime(st);
                      const selected = selectedShowtimeIds.has(st.showtimeId);
                      const presentationLabel = formatPresentationSummary(st.presentationName, st.presentationFormat, st.projectionType, st.languageType);

                      return (
                        <div key={st.showtimeId} style={{
                          minWidth: 260, maxWidth: 290, flexShrink: 0,
                          background: selected ? "#fff7f7" : "#fff", border: selected ? "2px solid #E63946" : `1.5px solid ${status.border}`, borderRadius: 14,
                          padding: 16, position: "relative", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                          transition: "transform 0.2s, box-shadow 0.2s", display: "flex", flexDirection: "column", gap: 10,
                        }}>
                          {/* Status + Room */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                              {canManage && (
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  disabled={!canCancelShowtime || bulkCancelling}
                                  onChange={() => toggleShowtimeSelection(st)}
                                  title={canCancelShowtime ? "Chọn suất chiếu" : "Suất này không thể hủy"}
                                  style={{ width: 16, height: 16, accentColor: "#E63946", cursor: canCancelShowtime && !bulkCancelling ? "pointer" : "not-allowed", flexShrink: 0 }}
                                />
                              )}
                              <Badge bg={status.bg} color={status.color}>{status.label}</Badge>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#475569", background: "#f1f5f9", padding: "3px 8px", borderRadius: 6 }}>
                              {room?.cinemaRoomName || `Phòng #${st.cinemaRoomId}`}
                            </span>
                          </div>

                          {presentationLabel && (
                            <div style={{ fontSize: 12, color: "#475569", fontWeight: 700, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {presentationLabel}
                            </div>
                          )}

                          {/* Time Block */}
                          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#475569", background: "#f8fafc", padding: "10px 12px", borderRadius: 10 }}>
                            <Clock size={16} color="#64748b" />
                            <span style={{ fontWeight: 800, color: "#0f172a", fontSize: 18 }}>{formatTime(st.startTime)}</span>
                            <span style={{ color: "#94a3b8", fontSize: 14 }}>~</span>
                            <span style={{ fontWeight: 700, color: "#475569", fontSize: 16 }}>{formatTime(st.endTime)}</span>
                          </div>

                          {(movieFilter !== "" || roomFilter !== "") && (
                            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>
                              {formatDateShortText(st.showDate)}
                            </div>
                          )}

                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 13, color: "#64748b" }}>
                            <span>Giá vé gốc</span>
                            <strong style={{ color: "#0f172a" }}>{formatCurrency(st.basePrice)}</strong>
                          </div>

                          {/* Seat Count */}
                          {sc && (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#64748b" }}>
                              <Users size={14} />
                              <span><strong style={{ color: sc.booked > 0 ? "#E63946" : "#059669" }}>{sc.booked}</strong> / {sc.total} ghế đã đặt</span>
                              {sc.total > 0 && (
                                <div style={{ flex: 1, height: 5, background: "#f1f5f9", borderRadius: 3, overflow: "hidden", marginLeft: 4 }}>
                                  <div style={{ height: "100%", width: `${Math.round((sc.booked / sc.total) * 100)}%`, background: sc.booked > 0 ? "#E63946" : "#10b981", borderRadius: 3, transition: "width 0.3s" }} />
                                </div>
                              )}
                            </div>
                          )}

                          {/* Actions */}
                          <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                            <button onClick={() => setSeatViewShowtime(st)} style={{ flex: 1, padding: "9px", borderRadius: 10, background: "#0f172a", color: "#fff", fontSize: 12, fontWeight: 700, border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, cursor: "pointer", boxShadow: "0 2px 8px rgba(15,23,42,0.2)", transition: "background 0.2s" }}>
                              <Armchair size={14} /> Sơ đồ ghế
                            </button>
                            {canManage && (
                              <>
                                <button
                                  onClick={() => canEditShowtime && openEdit(st)}
                                  disabled={!canEditShowtime}
                                  style={{
                                    ...actionBtnStyle("#eff6ff", "#2563eb", "#bfdbfe"),
                                    opacity: canEditShowtime ? 1 : 0.5,
                                    cursor: canEditShowtime ? "pointer" : "not-allowed",
                                  }}
                                  title={canEditShowtime ? "Sửa lịch" : "Không thể sửa suất đã có đơn đặt vé hoặc không còn ở trạng thái lên lịch"}
                                >
                                  <Edit size={15} />
                                </button>
                                <button onClick={() => handleCancelShowtime(st)} disabled={cancellingId === st.showtimeId || !canCancelShowtime} style={{ ...actionBtnStyle("#fef2f2", "#dc2626", "#fecaca"), opacity: cancellingId === st.showtimeId || !canCancelShowtime ? 0.5 : 1, cursor: cancellingId === st.showtimeId || !canCancelShowtime ? "not-allowed" : "pointer" }} title="Hủy suất chiếu">
                                  {cancellingId === st.showtimeId ? <Loader2 size={15} className="animate-spin" /> : <Ban size={15} />}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {canManage && showAutoModal && (
        <ShowtimePlannerWizard
          movies={schedulableMovies}
          rooms={activeRooms}
          defaultDate={selectedDate}
          onClose={() => setShowAutoModal(false)}
          onSuccess={(firstDate?: string) => {
            setShowAutoModal(false);
            if (firstDate && firstDate !== selectedDate) {
              setSelectedDate(firstDate);
            } else {
              fetchShowtimes();
            }
          }}
        />
      )}

      {canManage && showCreateModal && (
        <ShowtimeBatchFormModal
          movies={schedulableMovies}
          rooms={activeRooms}
          defaultDate={selectedDate}
          onClose={() => setShowCreateModal(false)}
          onSuccess={(firstDate?: string) => {
            setShowCreateModal(false);
            toast.success("Tạo suất chiếu thành công.");
            if (firstDate && firstDate !== selectedDate) {
              setSelectedDate(firstDate);
            } else {
              fetchShowtimes();
            }
          }}
        />
      )}

      {canManage && showEditModal && selectedItem && (
        <ShowtimeEditModal
          title={`Chỉnh sửa lịch chiếu #${selectedItem.showtimeId}`}
          form={form}
          setForm={setForm}
          movies={movies}
          rooms={rooms}
          formError={formError}
          formLoading={formLoading}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleEditSubmit}
        />
      )}

      {seatViewShowtime && (
        <ShowtimeSeatsLayoutModal
          showtime={seatViewShowtime}
          movies={movies}
          rooms={rooms}
          onClose={() => setSeatViewShowtime(null)}
        />
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onClose={closeConfirm}
      />
    </div>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

const weekNavBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff",
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569",
  transition: "all 0.2s"
};

const createBtnStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, flexShrink: 0,
  background: "linear-gradient(135deg,#E63946,#c1121f)", color: "#fff", fontFamily: FONT, fontSize: 13, fontWeight: 700,
  border: "none", cursor: "pointer", boxShadow: "0 4px 14px rgba(230,57,70,0.35)", whiteSpace: "nowrap",
  transition: "transform 0.2s, box-shadow 0.2s"
};

const createMenuWrapperStyle: React.CSSProperties = {
  position: "relative",
  display: "inline-flex",
  flexShrink: 0,
  paddingBottom: 8,
  marginBottom: -8,
  zIndex: 30,
};

const createMenuStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 6px)",
  right: 0,
  width: 236,
  padding: 6,
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "#fff",
  boxShadow: "0 18px 44px rgba(15,23,42,0.16)",
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const createMenuItemStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  background: "#fff",
  borderRadius: 9,
  padding: "10px 11px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 10,
  textAlign: "left",
  fontFamily: FONT,
};

function actionBtnStyle(bg: string, color: string, border: string): React.CSSProperties {
  return {
    padding: "9px", width: 38, borderRadius: 10, background: bg, color, border: `1px solid ${border}`,
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s"
  };
}

type SearchableFilterOption = {
  value: number;
  label: string;
  meta?: string | null;
};

function SearchableFilter({
  label,
  value,
  onChange,
  allLabel,
  placeholder,
  options,
  style,
}: {
  label: string;
  value: number | "";
  onChange: (value: number | "") => void;
  allLabel: string;
  placeholder: string;
  options: SearchableFilterOption[];
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.value === value);
  const displayValue = value === "" ? allLabel : selectedOption?.label || allLabel;
  const normalizedKeyword = normalizeSearchText(keyword.trim());
  const filteredOptions = normalizedKeyword
    ? options.filter((option) => normalizeSearchText(`${option.label} ${option.meta || ""}`).includes(normalizedKeyword))
    : options;

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: globalThis.MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setKeyword("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selectValue = (nextValue: number | "") => {
    onChange(nextValue);
    setOpen(false);
    setKeyword("");
  };

  return (
    <div ref={wrapperRef} style={{ ...searchableFilterWrapperStyle, ...style }}>
      <div style={{ marginBottom: 5, fontSize: 11, fontWeight: 800, color: "#64748b", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={searchableFilterInputWrapStyle}>
        <Search size={15} color="#94a3b8" />
        <input
          value={open ? keyword : displayValue}
          readOnly={!open}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(event) => setKeyword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              setKeyword("");
            }
          }}
          placeholder={placeholder}
          style={searchableFilterInputStyle}
        />
        {value !== "" && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              selectValue("");
            }}
            style={searchableFilterClearStyle}
            title="Xóa lọc"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {open && (
        <div style={searchableFilterMenuStyle}>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => selectValue("")}
            style={{
              ...searchableFilterOptionStyle,
              background: value === "" ? "#fef2f2" : "#fff",
              color: value === "" ? "#dc2626" : "#0f172a",
            }}
          >
            {allLabel}
          </button>
          {filteredOptions.length === 0 ? (
            <div style={{ padding: "12px 13px", color: "#94a3b8", fontSize: 13, fontWeight: 600 }}>
              Không tìm thấy kết quả.
            </div>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectValue(option.value)}
                style={{
                  ...searchableFilterOptionStyle,
                  background: option.value === value ? "#eff6ff" : "#fff",
                }}
              >
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#0f172a", fontWeight: 750 }}>
                    {option.label}
                  </span>
                  {option.meta && (
                    <span style={{ display: "block", marginTop: 2, color: "#94a3b8", fontSize: 11, fontWeight: 700 }}>
                      {option.meta}
                    </span>
                  )}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const searchableFilterWrapperStyle: React.CSSProperties = {
  position: "relative",
  minWidth: 240,
};

const searchableFilterInputWrapStyle: React.CSSProperties = {
  height: 42,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "#fff",
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "0 10px",
};

const searchableFilterInputStyle: React.CSSProperties = {
  minWidth: 0,
  flex: 1,
  height: "100%",
  border: "none",
  outline: "none",
  background: "transparent",
  color: "#334155",
  fontFamily: FONT,
  fontSize: 13,
  fontWeight: 650,
  cursor: "text",
};

const searchableFilterClearStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  border: "none",
  borderRadius: 7,
  background: "#f1f5f9",
  color: "#64748b",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const searchableFilterMenuStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 6px)",
  left: 0,
  right: 0,
  zIndex: 40,
  maxHeight: 290,
  overflowY: "auto",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "#fff",
  boxShadow: "0 18px 44px rgba(15,23,42,0.16)",
  padding: 6,
};

const searchableFilterOptionStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  borderRadius: 9,
  padding: "10px 11px",
  cursor: "pointer",
  textAlign: "left",
  fontFamily: FONT,
  fontSize: 13,
  display: "flex",
  alignItems: "center",
};

function Badge({ bg, color, children }: { bg: string; color: string; children: ReactNode }) {
  return (
    <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: bg, color, whiteSpace: "nowrap", letterSpacing: "0.05em" }}>
      {children}
    </span>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 0", color: "#94a3b8" }}>
      <Loader2 size={36} style={{ color: "#E63946", marginBottom: 16 }} className="animate-spin" />
      <span style={{ fontSize: 15, fontWeight: 500 }}>{label}</span>
    </div>
  );
}

function ModalBtn({ variant, type = "button", onClick, disabled, children }: {
  variant: "primary" | "cancel";
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  const isPrimary = variant === "primary";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px 20px", borderRadius: 10, border: "none", cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 14, fontWeight: 700, fontFamily: FONT, opacity: disabled ? 0.6 : 1,
        background: isPrimary ? "#E63946" : "#f1f5f9",
        color: isPrimary ? "#fff" : "#475569",
        display: "flex", alignItems: "center", gap: 8, transition: "background 0.2s"
      }}
    >
      {children}
    </button>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({ open, message, onConfirm, onClose }: {
  open: boolean; message: string; onConfirm: () => void; onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(15,23,42,0.4)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 400, padding: 24, boxShadow: "0 20px 40px rgba(0,0,0,0.15)", fontFamily: FONT }}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(245,158,11,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <AlertTriangle size={20} color="#d97706" />
          </div>
          <div>
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Xác nhận</h3>
            <p style={{ margin: 0, fontSize: 14, color: "#475569", lineHeight: 1.5 }}>{message}</p>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Hủy</button>
          <button onClick={onConfirm} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#E63946", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(230,57,70,0.25)" }}>Đồng ý</button>
        </div>
      </div>
    </div>
  );
}

// ── Modals ────────────────────────────────────────────────────────────────────

const createDefaultMoviePolicy = (movie: MovieResponse | undefined, maxPerMovie: number): AutoShowtimeMoviePolicy => {
  const presentations = (movie?.presentations ?? []).filter((item) => item.active !== false && item.presentationId);
  const share = presentations.length ? Number((100 / presentations.length).toFixed(2)) : 0;
  return {
    movieId: movie?.movieId ?? 0,
    minShowtimesPerDay: 0,
    targetShowtimesPerDay: Math.min(2, maxPerMovie),
    maxShowtimesPerDay: maxPerMovie,
    priorityWeight: 0,
    presentationPolicies: presentations.map((item) => ({
      presentationId: item.presentationId,
      minShowtimesPerDay: 0,
      targetShowtimesPerDay: 0,
      maxShowtimesPerDay: maxPerMovie,
      targetSharePercent: share,
      priorityWeight: 0,
    })),
  };
};

const normalizeMoviePolicyShares = (policies: AutoShowtimeMoviePolicy[]) => {
  if (!policies.length) return policies;
  const configuredTotal = policies.reduce((sum, policy) => sum + (policy.targetSharePercent ?? 0), 0);
  if (configuredTotal > 0) return policies;
  const equalShare = Number((100 / policies.length).toFixed(2));
  return policies.map((policy) => ({ ...policy, targetSharePercent: equalShare }));
};

export function LegacyAutoShowtimeModal({ movies, rooms, defaultDate, onClose, onSuccess }: {
  movies: MovieResponse[];
  rooms: CinemaRoom[];
  defaultDate: string;
  onClose: () => void;
  onSuccess: (response: AutoShowtimeResponse) => void;
}) {
  const todayStr = toDateStr(new Date());
  const startDate = defaultDate && defaultDate >= todayStr ? defaultDate : todayStr;
  const [fromDate, setFromDate] = useState(startDate);
  const [toDate, setToDate] = useState(startDate);
  const [openingTime, setOpeningTime] = useState("08:00");
  const [latestFinishTime, setLatestFinishTime] = useState("02:00");
  const [turnaroundMinutes, setTurnaroundMinutes] = useState(20);
  const [basePrice, setBasePrice] = useState(DEFAULT_BASE_PRICE);
  const [maxPerMovie, setMaxPerMovie] = useState(3);
  const [maxHotPerMovie, setMaxHotPerMovie] = useState(24);
  const [primeStartTime, setPrimeStartTime] = useState("18:00");
  const [primeEndTime, setPrimeEndTime] = useState("22:30");
  const [draftExpireMinutes, setDraftExpireMinutes] = useState(30);
  const [enableAgeRules, setEnableAgeRules] = useState(true);
  const [allowSameMovieSameStartTime, setAllowSameMovieSameStartTime] = useState(false);
  const [ageRules, setAgeRules] = useState<AutoShowtimeAgeRule[]>([]);
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [movieIds, setMovieIds] = useState<number[]>([]);
  const [roomIds, setRoomIds] = useState<number[]>([]);
  const [moviePolicies, setMoviePolicies] = useState<Record<number, AutoShowtimeMoviePolicy>>({});
  const [formError, setFormError] = useState("");
  const [preview, setPreview] = useState<AutoShowtimeResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const eligibleMovies = useMemo(
    () => movies.filter((movie) => {
      const isBasicEligible = movie.status !== "INACTIVE"
        && movie.status !== "ENDED"
        && (movie.duration ?? 0) > 0
        && getMovieFormats(movie).length > 0;
      
      if (!isBasicEligible) return false;

      const effectiveFromDate = movie.fromDate || "";

      const isWithinDateRange = (!effectiveFromDate || effectiveFromDate <= toDate)
        && (!movie.toDate || movie.toDate >= fromDate);
        
      return isWithinDateRange;
    }),
    [movies, fromDate, toDate]
  );

  const selectedMovies = useMemo(
    () => eligibleMovies.filter((m) => movieIds.includes(m.movieId)),
    [movieIds, eligibleMovies]
  );

  const activeRooms = useMemo(
    () => rooms.filter((room) => {
      if (room.status !== "ACTIVE") return false;
      if (movieIds.length === 0) return true;
      return selectedMovies.some(movie => isRoomCompatibleWithMovie(room, movie));
    }),
    [rooms, movieIds, selectedMovies]
  );

  const toggleMovie = (movieId: number) => {
    setMovieIds((prev) => {
      if (prev.includes(movieId)) return prev.filter((id) => id !== movieId);
      const movie = eligibleMovies.find((item) => item.movieId === movieId);
      setMoviePolicies((current) => current[movieId] ? current : {
        ...current,
        [movieId]: createDefaultMoviePolicy(movie, maxPerMovie),
      });
      return [...prev, movieId];
    });
  };

  const updateMoviePolicy = (movieId: number, patch: Partial<AutoShowtimeMoviePolicy>) => {
    setMoviePolicies((current) => ({
      ...current,
      [movieId]: { ...(current[movieId] ?? { movieId }), ...patch, movieId },
    }));
  };

  const updatePresentationPolicy = (movieId: number, presentationId: number, patch: Partial<AutoShowtimePresentationPolicy>) => {
    const movie = eligibleMovies.find((item) => item.movieId === movieId);
    const base = moviePolicies[movieId] ?? createDefaultMoviePolicy(movie, maxPerMovie);
    const policies = [...(base.presentationPolicies ?? [])];
    const index = policies.findIndex((item) => item.presentationId === presentationId);
    if (index >= 0) policies[index] = { ...policies[index], ...patch, presentationId };
    else policies.push({ presentationId, ...patch });
    updateMoviePolicy(movieId, { presentationPolicies: policies });
  };

  const toggleRoom = (roomId: number) => {
    setRoomIds((prev) => prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]);
  };

  useEffect(() => {
    const resetTimer = window.setTimeout(() => setPreview(null), 0);
    return () => window.clearTimeout(resetTimer);
  }, [fromDate, toDate, openingTime, latestFinishTime, turnaroundMinutes, basePrice, maxPerMovie, maxHotPerMovie, primeStartTime, primeEndTime, enableAgeRules, allowSameMovieSameStartTime, ageRules, movieIds, roomIds, moviePolicies]);

  useEffect(() => {
    let mounted = true;
    const loadConfig = async () => {
      setConfigLoading(true);
      try {
        const config = await showtimeApi.getAutoShowtimeConfig();
        if (!mounted) return;
        setOpeningTime(formatTime(config.openingTime));
        setLatestFinishTime(formatTime(config.latestFinishTime));
        setTurnaroundMinutes(config.turnaroundMinutes ?? 20);
        setBasePrice(config.basePrice ?? DEFAULT_BASE_PRICE);
        setMaxPerMovie(config.maxShowtimesPerMoviePerDay ?? 3);
        setMaxHotPerMovie(config.maxHotShowtimesPerMoviePerDay ?? 24);
        setPrimeStartTime(formatTime(config.primeStartTime ?? "18:00"));
        setPrimeEndTime(formatTime(config.primeEndTime ?? "22:30"));
        setDraftExpireMinutes(config.draftExpireMinutes ?? 30);
        setEnableAgeRules(config.enableAgeRules !== false);
        setAllowSameMovieSameStartTime(config.allowSameMovieSameStartTime === true);
        setAgeRules(config.ageRules ?? []);
      } catch (err) {
        console.error("Failed to load auto showtime config", err);
        toast.error("Không thể tải cấu hình tạo lịch tự động.");
      } finally {
        if (mounted) setConfigLoading(false);
      }
    };
    loadConfig();
    return () => {
      mounted = false;
    };
  }, []);

  const buildAutoRequest = (): AutoShowtimeRequest => ({
    fromDate,
    toDate,
    openingTime,
    latestFinishTime,
    turnaroundMinutes,
    basePrice,
    maxShowtimesPerMoviePerDay: maxPerMovie,
    maxHotShowtimesPerMoviePerDay: maxHotPerMovie,
    primeStartTime,
    primeEndTime,
    allowSameMovieSameStartTime,
    enableAgeRules,
    movieIds: movieIds.length ? movieIds : undefined,
    cinemaRoomIds: roomIds.length ? roomIds : undefined,
    moviePolicies: normalizeMoviePolicyShares(movieIds.map((id) => moviePolicies[id]).filter((policy): policy is AutoShowtimeMoviePolicy => !!policy)),
  });

  const buildConfigPayload = (): AutoShowtimeConfig => ({
    openingTime,
    latestFinishTime,
    turnaroundMinutes,
    basePrice,
    maxShowtimesPerMoviePerDay: maxPerMovie,
    maxHotShowtimesPerMoviePerDay: maxHotPerMovie,
    primeStartTime,
    primeEndTime,
    draftExpireMinutes,
    allowSameMovieSameStartTime,
    enableAgeRules,
    ageRules,
  });

  const validateAutoForm = (): string | null => {
    if (!fromDate || !toDate) {
      return "Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.";
    }
    if (fromDate < todayStr) {
      return "Không thể tạo suất chiếu tự động cho ngày trong quá khứ.";
    }
    if (toDate < fromDate) {
      return "Ngày kết thúc không được trước ngày bắt đầu.";
    }
    if (!basePrice || basePrice < 1000) {
      return "Giá vé gốc phải lớn hơn hoặc bằng 1.000đ.";
    }
    if (turnaroundMinutes < 0 || turnaroundMinutes > 120) {
      return "Thời gian nghỉ giữa suất phải từ 0 đến 120 phút.";
    }
    if (maxPerMovie < 1 || maxPerMovie > 200) {
      return "Giới hạn an toàn phim thường mỗi ngày phải từ 1 đến 200.";
    }
    if (maxHotPerMovie < 1 || maxHotPerMovie > 200) {
      return "Giới hạn an toàn phim hot mỗi ngày phải từ 1 đến 200.";
    }
    if (maxHotPerMovie < maxPerMovie) {
      return "Tối đa suất phim hot phải lớn hơn hoặc bằng phim thường.";
    }
    if (draftExpireMinutes < 5 || draftExpireMinutes > 240) {
      return "Thời gian hết hạn bản nháp phải từ 5 đến 240 phút.";
    }
    if (openingTime === latestFinishTime) {
      return "Giờ mở cửa và giờ kết thúc lịch không được trùng nhau.";
    }
    const policies = movieIds.map((id) => moviePolicies[id]).filter(Boolean);
    const totalMovieShare = policies.reduce((sum, policy) => sum + (policy.targetSharePercent ?? 0), 0);
    if (totalMovieShare > 100.001) return "Tổng tỷ lệ mục tiêu của các phim không được vượt quá 100%.";
    for (const policy of policies) {
      const min = policy.minShowtimesPerDay ?? 0;
      const target = policy.targetShowtimesPerDay ?? min;
      const max = policy.maxShowtimesPerDay ?? maxPerMovie;
      if (min > target || target > max) return "Quota phim phải thỏa min ≤ target ≤ max.";
      const presentationShare = (policy.presentationPolicies ?? []).reduce((sum, item) => sum + (item.targetSharePercent ?? 0), 0);
      if (presentationShare > 100.001) return "Tổng tỷ lệ phiên bản của mỗi phim không được vượt quá 100%.";
    }
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const error = validateAutoForm();
    if (error) {
      setFormError(error);
      return;
    }

    setPreviewLoading(true);
    setFormError("");
    try {
      const response = await showtimeApi.previewAutoGenerateShowtimes(buildAutoRequest());
      setPreview(response);
    } catch (err: unknown) {
      setFormError(getApiErrorMessage(err, "Xem trước suất chiếu tự động thất bại."));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    const error = validateAutoForm();
    if (error) {
      setFormError(error);
      return;
    }
    setConfigSaving(true);
    setFormError("");
    try {
      const saved = await showtimeApi.updateAutoShowtimeConfig(buildConfigPayload());
      setAgeRules(saved.ageRules ?? []);
      toast.success("Đã lưu cấu hình tạo lịch tự động.");
    } catch (err: unknown) {
      setFormError(getApiErrorMessage(err, "Lưu cấu hình tạo lịch tự động thất bại."));
    } finally {
      setConfigSaving(false);
    }
  };

  const handleCreateFromPreview = async () => {
    const error = validateAutoForm();
    if (error) {
      setFormError(error);
      return;
    }
    if (!preview || (preview.plannedCount ?? 0) === 0) {
      setFormError("Chưa có suất chiếu nào trong bản xem trước để tạo.");
      return;
    }
    if (!preview.draftId) {
      setFormError("Bản xem trước chưa có mã draft, vui lòng xem trước lại.");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      const response = await showtimeApi.confirmAutoShowtimeDraft(preview.draftId);
      onSuccess(response);
    } catch (err: unknown) {
      setFormError(getApiErrorMessage(err, "Tạo suất chiếu tự động thất bại."));
    } finally {
      setSaving(false);
    }
  };

  const previewItems = preview?.plannedShowtimes ?? [];
  const visiblePreviewItems = previewItems.slice(0, 80);
  const previewStats = preview?.statistics ?? null;
  const skippedReasonEntries = Object.entries(previewStats?.skippedReasons ?? {}).sort((a, b) => b[1] - a[1]);
  const skippedImpactTotal = skippedReasonEntries.reduce((total, [, count]) => total + count, 0);
  const enabledAgeRuleCount = ageRules.filter((rule) => rule.enabled !== false).length;
  const ageRuleSummary = ageRules.length
    ? `${enabledAgeRuleCount}/${ageRules.length} quy tắc đang bật`
    : "Hệ thống sẽ tự tạo quy tắc mặc định";

  return (
    <div 
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div 
        style={{ position: "relative", background: "#fff", borderRadius: 16, width: "100%", maxWidth: 860, maxHeight: "92vh", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.18)", fontFamily: FONT, display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <Wand2 size={16} color="#E63946" />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.12em" }}>Lập lịch tự động</span>
            </div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Tạo suất chiếu tự động</h3>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            style={{ 
              width: 30, height: 30, borderRadius: "50%", 
              background: "rgba(0,0,0,0.05)", border: "none", cursor: "pointer", 
              color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#E63946";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "rgba(0,0,0,0.05)";
              e.currentTarget.style.color = "#94a3b8";
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24, overflow: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16 }}>
            <div>
              <label className={LABEL_CLS}>Từ ngày *</label>
              <input type="date" className={INPUT_CLS} min={todayStr} value={fromDate} onChange={(e) => { setFromDate(e.target.value); if (toDate < e.target.value) setToDate(e.target.value); }} />
            </div>
            <div>
              <label className={LABEL_CLS}>Đến ngày *</label>
              <input type="date" className={INPUT_CLS} min={fromDate || todayStr} value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <div>
              <label className={LABEL_CLS}>Giờ mở cửa</label>
              <TimePicker value={formatTime(openingTime)} onChange={setOpeningTime} />
            </div>
            <div>
              <label className={LABEL_CLS}>Kết thúc trước</label>
              <TimePicker value={formatTime(latestFinishTime)} onChange={setLatestFinishTime} />
            </div>
            <div>
              <label className={LABEL_CLS}>Nghỉ giữa suất</label>
              <input type="number" min={0} max={120} className={INPUT_CLS} value={turnaroundMinutes} onChange={(e) => setTurnaroundMinutes(Number(e.target.value) || 0)} />
            </div>
            <div>
              <label className={LABEL_CLS}>Giá vé gốc</label>
              <input type="number" min={1000} step={1000} className={INPUT_CLS} value={basePrice} onChange={(e) => setBasePrice(Number(e.target.value) || 0)} />
            </div>
            <div>
              <label className={LABEL_CLS}>Giới hạn an toàn phim thường/ngày</label>
              <input type="number" min={1} max={200} className={INPUT_CLS} value={maxPerMovie} onChange={(e) => setMaxPerMovie(Number(e.target.value) || 1)} />
            </div>
            <div>
              <label className={LABEL_CLS}>Giới hạn an toàn phim hot/ngày</label>
              <input type="number" min={1} max={200} className={INPUT_CLS} value={maxHotPerMovie} onChange={(e) => setMaxHotPerMovie(Number(e.target.value) || 1)} />
            </div>
            <div>
              <label className={LABEL_CLS}>Bắt đầu giờ vàng</label>
              <TimePicker value={formatTime(primeStartTime)} onChange={setPrimeStartTime} />
            </div>
            <div>
              <label className={LABEL_CLS}>Kết thúc giờ vàng</label>
              <TimePicker value={formatTime(primeEndTime)} onChange={setPrimeEndTime} />
            </div>
            <div style={{ gridColumn: "span 2", display: "flex", alignItems: "flex-end", gap: 8, flexWrap: "wrap" }}>
              <Badge bg="#eff6ff" color="#2563eb">{activeRooms.length} phòng hoạt động</Badge>
              <Badge bg="#ecfdf5" color="#059669">{eligibleMovies.length} phim hợp lệ</Badge>
              {configLoading && <Badge bg="#f8fafc" color="#64748b">Đang tải config</Badge>}
            </div>
          </div>

          <div style={{ marginTop: 18, border: "1px solid #e2e8f0", borderRadius: 12, overflow: "visible", background: "#fff" }}>
            <div style={{ padding: "12px 14px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>Quy tắc tự động đang áp dụng</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Hệ thống tự áp dụng độ tuổi, phim hot, giờ vàng và tránh trùng mốc giờ cho phim thường.</div>
              </div>
              <button type="button" onClick={handleSaveConfig} disabled={configSaving || previewLoading || saving} style={{ border: "1px solid #fecaca", background: "#fff5f5", color: "#E63946", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 800, cursor: configSaving ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 7 }}>
                {configSaving && <Loader2 size={14} className="animate-spin" />}
                Lưu cấu hình
              </button>
            </div>
            <div style={{ padding: 14, display: "grid", gap: 12 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <Badge bg="#fef2f2" color="#dc2626">Phim hot ưu tiên giờ vàng</Badge>
                <Badge bg="#fff7ed" color="#c2410c">Phim hot được trùng mốc giờ</Badge>
                <Badge bg="#eff6ff" color="#2563eb">Phim thường tránh trùng giờ</Badge>
                <Badge bg="#f8fafc" color="#475569">{ageRuleSummary}</Badge>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 700, color: "#475569" }}>
                  <input type="checkbox" checked={allowSameMovieSameStartTime} onChange={(event) => setAllowSameMovieSameStartTime(event.target.checked)} />
                  Cho cùng phim bắt đầu đồng thời ở nhiều phòng
                </label>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 18, marginTop: 22 }}>
            <SelectionPanel
              title="Phòng chiếu"
              subtitle={roomIds.length ? `Đã chọn ${roomIds.length} phòng` : "Không chọn = tất cả phòng ACTIVE"}
              onClear={() => setRoomIds([])}
            >
              {activeRooms.length === 0 ? (
                <div style={{ padding: 16, color: "#94a3b8", fontSize: 13 }}>Không có phòng ACTIVE.</div>
              ) : activeRooms.map((room) => (
                <label key={room.cinemaRoomId} style={selectionRowStyle}>
                  <input type="checkbox" checked={roomIds.includes(room.cinemaRoomId)} onChange={() => toggleRoom(room.cinemaRoomId)} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{room.cinemaRoomName}</span>
                    <span style={{ display: "block", fontSize: 12, color: "#64748b" }}>{getRoomSupportedFormats(room.type).join(", ")}</span>
                  </span>
                </label>
              ))}
            </SelectionPanel>

            <SelectionPanel
              title="Phim"
              subtitle={movieIds.length ? `Đã chọn ${movieIds.length} phim` : "Không chọn = tất cả phim hợp lệ"}
              onClear={() => setMovieIds([])}
            >
              {eligibleMovies.length === 0 ? (
                <div style={{ padding: 16, color: "#94a3b8", fontSize: 13 }}>Không có phim hợp lệ.</div>
              ) : eligibleMovies.map((movie) => (
                <label key={movie.movieId} style={selectionRowStyle}>
                  <input type="checkbox" checked={movieIds.includes(movie.movieId)} onChange={() => toggleMovie(movie.movieId)} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{movie.movieNameVn}</span>
                      {movie.isHot && <Badge bg="#fff7ed" color="#c2410c">Hot</Badge>}
                    </span>
                    <span style={{ display: "block", fontSize: 12, color: "#64748b" }}>{movie.duration ?? 0} phút · {getMovieFormats(movie).join(", ")}</span>
                  </span>
                </label>
              ))}
            </SelectionPanel>
          </div>

          {selectedMovies.length > 0 && (
            <div style={{ marginTop: 18, border: "1px solid #dbeafe", borderRadius: 12, background: "#f8fbff", padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: "#0f172a" }}>Phân bổ phim và phiên bản chiếu</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 3, marginBottom: 12 }}>
                Tỷ lệ là mục tiêu mềm; mức tối thiểu, mục tiêu, tối đa và độ ưu tiên giúp hệ thống cân bằng nhu cầu thực tế.
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                {selectedMovies.map((movie) => {
                  const policy = moviePolicies[movie.movieId] ?? createDefaultMoviePolicy(movie, maxPerMovie);
                  const presentations = (movie.presentations ?? []).filter((item) => item.active !== false);
                  return (
                    <div key={movie.movieId} style={{ border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff", padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 10 }}>
                        <strong style={{ color: "#0f172a", fontSize: 13 }}>{movie.movieNameVn}</strong>
                        <span style={{ color: "#64748b", fontSize: 11 }}>{movie.isHot ? "Hot thủ công" : "Demand tự động"}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 8 }}>
                        <PolicyNumber label="Min" value={policy.minShowtimesPerDay ?? 0} min={0} max={40} onChange={(value) => updateMoviePolicy(movie.movieId, { minShowtimesPerDay: value })} />
                        <PolicyNumber label="Target" value={policy.targetShowtimesPerDay ?? 0} min={0} max={40} onChange={(value) => updateMoviePolicy(movie.movieId, { targetShowtimesPerDay: value })} />
                        <PolicyNumber label="Max" value={policy.maxShowtimesPerDay ?? maxPerMovie} min={1} max={200} onChange={(value) => updateMoviePolicy(movie.movieId, { maxShowtimesPerDay: value })} />
                        <PolicyNumber label="Tỷ lệ %" value={policy.targetSharePercent ?? 0} min={0} max={100} onChange={(value) => updateMoviePolicy(movie.movieId, { targetSharePercent: value })} />
                        <PolicyNumber label="Ưu tiên" value={policy.priorityWeight ?? 0} min={-100} max={100} onChange={(value) => updateMoviePolicy(movie.movieId, { priorityWeight: value })} />
                      </div>
                      {presentations.length > 0 && (
                        <div style={{ marginTop: 10, display: "grid", gap: 7 }}>
                          {presentations.map((presentation) => {
                            const presentationPolicy = policy.presentationPolicies?.find((item) => item.presentationId === presentation.presentationId)
                              ?? { presentationId: presentation.presentationId, targetSharePercent: 0, priorityWeight: 0, maxShowtimesPerDay: policy.maxShowtimesPerDay };
                            return (
                              <div key={presentation.presentationId} style={{ display: "grid", gridTemplateColumns: "minmax(160px, 1fr) repeat(3, 90px)", gap: 8, alignItems: "end", background: "#f8fafc", borderRadius: 8, padding: 8 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: "#334155", alignSelf: "center" }}>{presentation.displayName || presentation.label || `Phiên bản #${presentation.presentationId}`}</div>
                                <PolicyNumber label="Tỷ lệ %" value={presentationPolicy.targetSharePercent ?? 0} min={0} max={100} onChange={(value) => updatePresentationPolicy(movie.movieId, presentation.presentationId, { targetSharePercent: value })} />
                                <PolicyNumber label="Ưu tiên" value={presentationPolicy.priorityWeight ?? 0} min={-100} max={100} onChange={(value) => updatePresentationPolicy(movie.movieId, presentation.presentationId, { priorityWeight: value })} />
                                <PolicyNumber label="Max/ngày" value={presentationPolicy.maxShowtimesPerDay ?? (policy.maxShowtimesPerDay || maxPerMovie)} min={1} max={200} onChange={(value) => updatePresentationPolicy(movie.movieId, presentation.presentationId, { maxShowtimesPerDay: value })} />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {formError && (
            <div style={{ marginTop: 16, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "10px 14px", color: "#dc2626", fontSize: 13 }}>
              {formError}
            </div>
          )}

          {preview && (
            <div style={{ marginTop: 18, border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
              <div style={{ padding: "12px 14px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>Bản xem trước</div>
                  <div style={{ marginTop: 2, fontSize: 12, color: "#64748b" }}>
                    Dự kiến tạo {preview.plannedCount ?? previewItems.length} suất · Bỏ qua {preview.skippedRoomDays ?? 0} lượt phòng/ngày không có lịch phù hợp
                    {preview.draftId ? ` · Draft #${preview.draftId}` : ""}
                  </div>
                </div>
                <Badge bg={previewItems.length ? "#ecfdf5" : "#fef2f2"} color={previewItems.length ? "#059669" : "#dc2626"}>
                  {previewItems.length ? "Có thể tạo" : "Không có lịch"}
                </Badge>
              </div>

              {previewStats && (
                <div style={{ padding: 14, borderBottom: "1px solid #f1f5f9", display: "grid", gap: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 10 }}>
                    <PreviewMetric label="Phim hợp lệ" value={`${previewStats.eligibleMovieCount}/${previewStats.selectedMovieCount}`} />
                    <PreviewMetric label="Phòng hoạt động" value={`${previewStats.activeRoomCount}/${previewStats.selectedRoomCount}`} />
                    <PreviewMetric label="Suất đã có" value={previewStats.existingShowtimeCount} />
                    <PreviewMetric label="Dự kiến" value={previewStats.plannedCount} tone="#059669" />
                    <PreviewMetric label="Bỏ qua" value={previewStats.skippedRoomDays} tone="#d97706" />
                    <PreviewMetric label="Điểm lịch" value={Math.round(previewStats.scheduleScore ?? 0)} tone="#7c3aed" />
                  </div>

                  {(previewStats.movieAllocations?.length ?? 0) > 0 && (
                    <div style={{ border: "1px solid #dbeafe", borderRadius: 10, overflow: "hidden" }}>
                      <div style={{ padding: "8px 10px", background: "#eff6ff", fontSize: 12, fontWeight: 900, color: "#1e40af" }}>Mục tiêu và phân bổ thực tế</div>
                      {(previewStats.movieAllocations ?? []).map((allocation) => (
                        <div key={allocation.key} style={{ display: "grid", gridTemplateColumns: "minmax(160px, 1fr) 80px 90px 90px 90px", gap: 8, padding: "8px 10px", borderTop: "1px solid #e2e8f0", fontSize: 12, alignItems: "center" }}>
                          <strong style={{ color: "#334155" }}>{allocation.label}</strong>
                          <span>{allocation.actualCount} suất</span>
                          <span>MT {allocation.targetSharePercent}%</span>
                          <span>TT {allocation.actualSharePercent}%</span>
                          <span style={{ color: Math.abs(allocation.deviationPercent) <= 5 ? "#059669" : "#d97706", fontWeight: 800 }}>{allocation.deviationPercent > 0 ? "+" : ""}{allocation.deviationPercent}%</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                    <PreviewStatList title="Theo phim" items={previewStats.byMovie} />
                    <PreviewStatList title="Theo phòng" items={previewStats.byRoom} />
                    <PreviewStatList title="Theo ngày" items={previewStats.byDate} />
                  </div>

                  {(skippedReasonEntries.length > 0 || previewStats.appliedRules?.length > 0) && (
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12 }}>
                      <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 800, color: "#92400e" }}>Mục không xếp được</div>
                            <div style={{ marginTop: 2, fontSize: 11, color: "#b45309", lineHeight: 1.45 }}>
                              Các số này là số phim/ngày, phim/phòng/ngày hoặc phòng/ngày bị ảnh hưởng, không phải số lần thử kỹ thuật.
                            </div>
                          </div>
                          {skippedImpactTotal > 0 && (
                            <strong style={{ flexShrink: 0, fontSize: 12, color: "#92400e" }}>{formatCompactNumber(skippedImpactTotal)}</strong>
                          )}
                        </div>
                        {skippedReasonEntries.slice(0, 6).map(([label, count]) => {
                          const percent = skippedImpactTotal > 0 ? Math.round((count / skippedImpactTotal) * 100) : 0;
                          return (
                          <div key={label} style={{ padding: "7px 0", borderTop: "1px solid rgba(217,119,6,0.16)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, color: "#92400e" }}>
                              <span style={{ fontWeight: 700 }}>{label}</span>
                              <strong>{formatCompactNumber(count)} mục</strong>
                            </div>
                            <div style={{ marginTop: 3, display: "flex", justifyContent: "space-between", gap: 10, fontSize: 11, color: "#b45309", lineHeight: 1.45 }}>
                              <span>{describeSkippedReason(label)}</span>
                              <span style={{ flexShrink: 0 }}>{percent}%</span>
                            </div>
                          </div>
                          );
                        })}
                        {skippedReasonEntries.length === 0 && <div style={{ fontSize: 12, color: "#b45309" }}>Không có lý do bỏ qua đáng kể.</div>}
                      </div>
                      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "#334155", marginBottom: 7 }}>Quy tắc đang áp dụng</div>
                        {(previewStats.appliedRules ?? []).slice(0, 8).map((rule) => (
                          <div key={rule} style={{ fontSize: 12, color: "#64748b", padding: "3px 0" }}>{rule}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {preview.warnings?.length > 0 && (
                <div style={{ padding: "10px 14px", borderBottom: "1px solid #f1f5f9", display: "grid", gap: 6 }}>
                  {preview.warnings.map((warning, index) => (
                    <div key={`${warning}-${index}`} style={{ fontSize: 12, color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "7px 9px" }}>
                      {warning}
                    </div>
                  ))}
                </div>
              )}

              {previewItems.length > 0 && (
                <div style={{ maxHeight: 300, overflow: "auto" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "92px 92px minmax(150px, 1.2fr) minmax(130px, 1fr) minmax(120px, 0.9fr) 110px", gap: 10, padding: "9px 14px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: 11, fontWeight: 800, color: "#64748b", letterSpacing: "0.04em" }}>
                    <span>Ngày</span>
                    <span>Giờ</span>
                    <span>Phim</span>
                    <span>Phòng</span>
                    <span>Phiên bản</span>
                    <span>Giá vé</span>
                  </div>
                  {visiblePreviewItems.map((item, index) => (
                    <div key={`${item.showDate}-${item.startTime}-${item.cinemaRoomId}-${item.movieId}-${index}`} style={{ display: "grid", gridTemplateColumns: "92px 92px minmax(150px, 1.2fr) minmax(130px, 1fr) minmax(120px, 0.9fr) 110px", gap: 10, padding: "10px 14px", borderBottom: "1px solid #f1f5f9", alignItems: "center", fontSize: 13, color: "#334155" }}>
                      <span style={{ fontWeight: 700, color: "#0f172a" }}>{formatDateShortText(item.showDate)}</span>
                      <span style={{ fontWeight: 800, color: "#E63946" }}>{formatTime(item.startTime)} ~ {formatTime(item.endTime)}</span>
                      <span style={{ minWidth: 0, overflow: "hidden" }}>
                        <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.movieName || `#${item.movieId}`}</span>
                        <span style={{ display: "block", marginTop: 2, fontSize: 11, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.ageRating || "Chưa phân loại"}{item.ruleNote ? ` · ${item.ruleNote}` : ""}
                        </span>
                      </span>
                      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.cinemaRoomName || `#${item.cinemaRoomId}`}</span>
                      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 700, color: "#475569" }}>
                        {formatPresentationSummary(item.presentationName, item.presentationFormat, item.projectionType, item.languageType) || "-"}
                      </span>
                      <span>{formatCurrency(item.basePrice)}</span>
                    </div>
                  ))}
                  {previewItems.length > visiblePreviewItems.length && (
                    <div style={{ padding: "10px 14px", fontSize: 12, color: "#64748b", textAlign: "center", background: "#f8fafc" }}>
                      Còn {previewItems.length - visiblePreviewItems.length} suất khác, hệ thống chỉ hiển thị 80 suất đầu để dễ xem.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
            <ModalBtn variant="cancel" type="button" onClick={onClose}>Hủy</ModalBtn>
            <ModalBtn variant="cancel" type="submit" disabled={previewLoading || saving}>
              {previewLoading && <Loader2 size={16} className="animate-spin" />}
              {previewLoading ? "Đang xem..." : preview ? "Xem lại" : "Xem trước"}
            </ModalBtn>
            {preview && (
              <ModalBtn variant="primary" type="button" onClick={handleCreateFromPreview} disabled={saving || previewLoading || previewItems.length === 0}>
                {saving && <Loader2 size={16} className="animate-spin" />}
                {saving ? "Đang tạo..." : `Xác nhận tạo ${preview.plannedCount ?? previewItems.length} suất`}
              </ModalBtn>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function PolicyNumber({ label, value, min, max, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label style={{ display: "grid", gap: 4, fontSize: 10, fontWeight: 800, color: "#64748b" }}>
      {label}
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Math.max(min, Math.min(max, Number(event.target.value) || 0)))}
        style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: 7, padding: "6px 7px", fontSize: 12, color: "#0f172a", background: "#fff" }}
      />
    </label>
  );
}

function SelectionPanel({ title, subtitle, onClear, children }: {
  title: string;
  subtitle: string;
  onClear: () => void;
  children: ReactNode;
}) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
      <div style={{ padding: "12px 14px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>{title}</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{subtitle}</div>
        </div>
        <button type="button" onClick={onClear} style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 700, color: "#475569", cursor: "pointer", whiteSpace: "nowrap" }}>
          Bỏ chọn
        </button>
      </div>
      <div style={{ maxHeight: 260, overflow: "auto", display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );
}

function PreviewMetric({ label, value, tone = "#0f172a" }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", background: "#fff" }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 18, fontWeight: 900, color: tone }}>{value}</div>
    </div>
  );
}

function PreviewStatList({ title, items }: { title: string; items?: { key: string; label: string; count: number }[] }) {
  const visibleItems = (items ?? []).slice(0, 5);
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, background: "#fff" }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: "#334155", marginBottom: 7 }}>{title}</div>
      {visibleItems.length === 0 ? (
        <div style={{ fontSize: 12, color: "#94a3b8" }}>Chưa có dữ liệu.</div>
      ) : visibleItems.map((item) => (
        <div key={item.key} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, color: "#475569", padding: "3px 0" }}>
          <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
          <strong style={{ color: "#0f172a" }}>{item.count}</strong>
        </div>
      ))}
    </div>
  );
}

const selectionRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "18px minmax(0, 1fr)",
  gap: 10,
  alignItems: "center",
  padding: "10px 14px",
  borderBottom: "1px solid #f1f5f9",
  cursor: "pointer",
};

function ShowtimeEditModal({ title, form, setForm, movies, rooms, formError, formLoading, onClose, onSubmit }: {
  title: string;
  form: ShowtimeAdminRequest;
  setForm: React.Dispatch<React.SetStateAction<ShowtimeAdminRequest>>;
  movies: MovieResponse[];
  rooms: CinemaRoom[];
  formError: string;
  formLoading: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
}) {
  const selectedMovie = useMemo(
    () => movies.find((movie) => movie.movieId === form.movieId),
    [form.movieId, movies]
  );
  const selectedRoom = useMemo(
    () => rooms.find((room) => room.cinemaRoomId === form.cinemaRoomId),
    [form.cinemaRoomId, rooms]
  );
  const movieOptions = useMemo(
    () => includeCurrentMovieOption(movies.filter(isSchedulableMovie), selectedMovie),
    [movies, selectedMovie]
  );
  const roomOptions = useMemo(
    () => includeCurrentRoomOption(
      rooms.filter((room) => isActiveRoom(room) && isRoomCompatibleWithMovie(room, selectedMovie)),
      selectedRoom
    ),
    [rooms, selectedMovie, selectedRoom]
  );
  const activePresentations = useMemo(
    () => getActivePresentations(selectedMovie),
    [selectedMovie]
  );
  const presentationOptions = useMemo(
    () => getCompatiblePresentations(selectedMovie, selectedRoom),
    [selectedMovie, selectedRoom]
  );
  const selectedPresentation = useMemo(
    () => activePresentations.find((presentation) => presentation.presentationId === form.presentationId),
    [activePresentations, form.presentationId]
  );
  const todayStr = useMemo(() => new Date().toLocaleDateString("en-CA"), []);
  const minShowDate = useMemo(() => {
    const movieStartDate = selectedMovie?.fromDate || "";
    if (!movieStartDate) return todayStr;
    return movieStartDate > todayStr ? movieStartDate : todayStr;
  }, [selectedMovie?.fromDate, todayStr]);
  const maxShowDate = selectedMovie?.toDate || undefined;
  const incompatibleSelectedRoom = !!selectedMovie && !!selectedRoom && !isRoomCompatibleWithMovie(selectedRoom, selectedMovie);
  const selectedMovieNotSchedulable = !!selectedMovie && !isSchedulableMovie(selectedMovie);
  const selectedRoomNotActive = !!selectedRoom && !isActiveRoom(selectedRoom);
  const selectedMovieStatusLabel = selectedMovie?.status ? MOVIE_STATUS_LABELS[selectedMovie.status] : "không xác định";
  const selectedRoomStatusLabel = selectedRoom?.status ? ROOM_STATUS_LABELS[selectedRoom.status] : "không xác định";

  useEffect(() => {
    if (!selectedMovie || activePresentations.length === 0) {
      if (form.presentationId) {
        setForm((prev) => ({ ...prev, presentationId: null }));
      }
      return;
    }
    if (form.presentationId && presentationOptions.some((presentation) => presentation.presentationId === form.presentationId)) {
      return;
    }
    const firstId = presentationOptions[0]?.presentationId ?? null;
    const firstPresentation = activePresentations.find((p) => p.presentationId === firstId);
    setForm((prev) => ({ 
      ...prev, 
      presentationId: firstId,
      ...(firstId ? { basePrice: calculateAutoBasePrice(DEFAULT_BASE_PRICE, firstPresentation) } : {})
    }));
  }, [activePresentations, form.presentationId, presentationOptions, selectedMovie, setForm]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 500, boxShadow: "0 24px 64px rgba(0,0,0,0.18)", fontFamily: FONT }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>{title}</h3>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={18} /></button>
        </div>
        <form onSubmit={onSubmit} style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className={LABEL_CLS}>Phim *</label>
              <select className={INPUT_CLS} value={form.movieId || ""} onChange={(e) => setForm({ ...form, movieId: Number(e.target.value), presentationId: null })}>
                <option value="">-- Chọn phim --</option>
                {movieOptions.map(m => <option key={m.movieId} value={m.movieId}>{formatMovieOptionLabel(m)}</option>)}
              </select>
              {selectedMovieNotSchedulable && (
                <div style={{ marginTop: 6, fontSize: 12, color: "#d97706" }}>
                  Phim hiện tại đang ở trạng thái {selectedMovieStatusLabel}; chỉ nên đổi sang phim đang chiếu hoặc sắp chiếu.
                </div>
              )}
            </div>
            <div>
              <label className={LABEL_CLS}>Phòng chiếu *</label>
              <select className={INPUT_CLS} value={form.cinemaRoomId || ""} onChange={(e) => setForm({ ...form, cinemaRoomId: Number(e.target.value), presentationId: null })}>
                <option value="">-- Chọn phòng --</option>
                {roomOptions.map(r => (
                  <option key={r.cinemaRoomId} value={r.cinemaRoomId}>
                    {formatRoomOptionLabel(r)}
                  </option>
                ))}
              </select>
              {selectedRoomNotActive && (
                <div style={{ marginTop: 6, fontSize: 12, color: "#d97706" }}>
                  Phòng hiện tại đang ở trạng thái {selectedRoomStatusLabel}; chỉ nên đổi sang phòng đang hoạt động.
                </div>
              )}
              {selectedMovie && (
                <div style={{ marginTop: 6, fontSize: 12, color: incompatibleSelectedRoom ? "#dc2626" : "#64748b" }}>
                  Phim hỗ trợ: {getMovieFormats(selectedMovie).join(", ") || "Chưa có định dạng"}.
                </div>
              )}
            </div>
            {selectedMovie && activePresentations.length > 0 && (
              <div>
                <label className={LABEL_CLS}>Phiên bản chiếu *</label>
                <select
                  className={INPUT_CLS}
                  value={form.presentationId ?? ""}
                  onChange={(e) => {
                    const newPresentationId = e.target.value ? Number(e.target.value) : null;
                    const newPresentation = activePresentations.find(p => p.presentationId === newPresentationId);
                    setForm({ 
                      ...form, 
                      presentationId: newPresentationId,
                      ...(newPresentation ? { basePrice: calculateAutoBasePrice(DEFAULT_BASE_PRICE, newPresentation) } : {})
                    });
                  }}
                  disabled={presentationOptions.length === 0}
                >
                  <option value="">-- Chọn phiên bản --</option>
                  {presentationOptions.map((presentation) => (
                    <option key={presentation.presentationId} value={presentation.presentationId}>
                      {formatPresentationLabel(presentation)}
                    </option>
                  ))}
                </select>
                <div style={{ marginTop: 6, fontSize: 12, color: presentationOptions.length === 0 ? "#dc2626" : "#64748b", lineHeight: 1.45 }}>
                  {presentationOptions.length === 0
                    ? "Không có phiên bản chiếu nào phù hợp với phòng đã chọn."
                    : selectedPresentation
                      ? `Đang chọn: ${formatPresentationLabel(selectedPresentation)}.`
                      : "Chọn đúng bản phụ đề/lồng tiếng cho suất chiếu này."}
                </div>
              </div>
            )}
            <div>
              <label className={LABEL_CLS}>Ngày chiếu *</label>
              <input
                type="date"
                className={INPUT_CLS}
                min={minShowDate}
                max={maxShowDate}
                value={form.showDate || ""}
                onChange={(e) => setForm({ ...form, showDate: e.target.value })}
              />
              {selectedMovie?.fromDate && (
                <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
                  Ngày chiếu phải từ {formatDateShortText(selectedMovie.fromDate)}
                  {selectedMovie.toDate ? ` đến ${formatDateShortText(selectedMovie.toDate)}` : ""}.
                </div>
              )}
            </div>
            <div>
              <label className={LABEL_CLS}>Giá vé gốc *</label>
              <input
                type="number"
                min={1000}
                step={1000}
                className={INPUT_CLS}
                value={form.basePrice ?? DEFAULT_BASE_PRICE}
                onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) || 0 })}
              />
              <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
                Giá ghế cuối = giá vé gốc + phụ thu loại ghế.
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <label className={LABEL_CLS}>Giờ bắt đầu *</label>
                <TimePicker 
                  value={form.startTime || "00:00"} 
                  onChange={(val) => setForm({ ...form, startTime: val })} 
                  minTime={form.showDate === new Date().toLocaleDateString('en-CA') ? `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}` : undefined}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Giờ kết thúc *</label>
                <TimePicker value={form.endTime || "00:00"} onChange={(val) => setForm({ ...form, endTime: val })} />
              </div>
            </div>
            <div>
              <label className={LABEL_CLS}>Trạng thái</label>
              <select className={INPUT_CLS} value={form.status ?? "SCHEDULED"} onChange={(e) => setForm({ ...form, status: e.target.value as ShowtimeStatusEnum })}>
                {EDITABLE_SHOWTIME_STATUSES.map((status) => <option key={status} value={status}>{STATUS_CONFIG[status].label}</option>)}
              </select>
            </div>
          </div>
          {formError && (
            <div style={{ marginTop: 16, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "10px 14px", color: "#dc2626", fontSize: 13 }}>
              {formError}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
            <ModalBtn variant="cancel" type="button" onClick={onClose}>Hủy</ModalBtn>
            <ModalBtn variant="primary" type="submit" disabled={formLoading}>
              {formLoading && <Loader2 size={16} className="animate-spin" />}
              {formLoading ? "Đang xử lý..." : "Lưu thay đổi"}
            </ModalBtn>
          </div>
        </form>
      </div>
    </div>
  );
}

function ShowtimeBatchFormModal({ movies, rooms, defaultDate, onClose, onSuccess }: {
  movies: MovieResponse[];
  rooms: CinemaRoom[];
  defaultDate: string;
  onClose: () => void;
  onSuccess: (firstDate?: string) => void;
}) {
  const [movieId, setMovieId] = useState<number>(0);
  const [movieSearch, setMovieSearch] = useState("");
  const [cinemaRoomId, setCinemaRoomId] = useState<number>(0);
  const [presentationId, setPresentationId] = useState<number | null>(null);
  const [status, setStatus] = useState<ShowtimeStatusEnum>("SCHEDULED");
  const [basePrice, setBasePrice] = useState<number>(DEFAULT_BASE_PRICE);
  const [cleanupMinutes, setCleanupMinutes] = useState<number>(20);
  
  const [dates, setDates] = useState<string[]>([defaultDate]);
  const [tempDate, setTempDate] = useState("");
  
  const [timeSlots, setTimeSlots] = useState<{ start: string; end: string }[]>([]);
  const [tempStart, setTempStart] = useState(() => clampStartTimeForDates([defaultDate], "08:00"));

  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const cleanupOptions = useMemo(
    () => Array.from(new Set([0, 5, 10, 15, 20, 30, cleanupMinutes])).sort((a, b) => a - b),
    [cleanupMinutes]
  );
  const selectedMovie = useMemo(
    () => movies.find((movie) => movie.movieId === movieId),
    [movieId, movies]
  );
  const tempEnd = selectedMovie && tempStart
    ? roundTimeUp(addMinutesToTime(tempStart, Number(selectedMovie.duration) || 120))
    : "";
  const selectedRoom = useMemo(
    () => rooms.find((room) => room.cinemaRoomId === cinemaRoomId),
    [cinemaRoomId, rooms]
  );
  const compatibleRooms = useMemo(
    () => rooms.filter((room) => isActiveRoom(room) && isRoomCompatibleWithMovie(room, selectedMovie)),
    [rooms, selectedMovie]
  );
  const activePresentations = useMemo(
    () => getActivePresentations(selectedMovie),
    [selectedMovie]
  );
  const presentationOptions = useMemo(
    () => getCompatiblePresentations(selectedMovie, selectedRoom),
    [selectedMovie, selectedRoom]
  );
  const selectedPresentation = useMemo(
    () => activePresentations.find((presentation) => presentation.presentationId === presentationId),
    [activePresentations, presentationId]
  );
  const availableMovies = useMemo(
    () => movies.filter(isSchedulableMovie),
    [movies]
  );
  const filteredMovies = useMemo(() => {
    const keyword = normalizeSearchText(movieSearch.trim());
    if (!keyword) return availableMovies;

    const result = availableMovies.filter((movie) => {
      const haystack = [
        movie.movieId,
        movie.movieNameVn,
        movie.movieNameEnglish,
        movie.title,
        movie.director,
        movie.actor,
      ].map(normalizeSearchText).join(" ");
      return haystack.includes(keyword);
    });

    if (selectedMovie && !result.some((movie) => movie.movieId === selectedMovie.movieId)) {
      return [selectedMovie, ...result];
    }
    return result;
  }, [availableMovies, movieSearch, selectedMovie]);
  const todayStr = new Date().toLocaleDateString("en-CA");
  const movieStartDate = selectedMovie?.fromDate || "";
  const defaultShowDateForMovie = useMemo(() => {
    if (selectedMovie?.status === "COMING_SOON" && movieStartDate) {
      return movieStartDate;
    }
    return "";
  }, [movieStartDate, selectedMovie?.status]);
  const minShowDate = useMemo(() => {
    if (!movieStartDate) return todayStr;
    return movieStartDate > todayStr ? movieStartDate : todayStr;
  }, [movieStartDate, todayStr]);

  useEffect(() => {
    let mounted = true;
    showtimeApi.getAutoShowtimeConfig()
      .then((config) => {
        if (!mounted) return;
        setCleanupMinutes(config.turnaroundMinutes ?? 20);
      })
      .catch((error) => {
        console.error("Failed to load auto showtime turnaround config", error);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const selectDefaultPresentation = (
    movie: MovieResponse | undefined,
    room: CinemaRoom | undefined
  ) => {
    const firstPresentation = getCompatiblePresentations(movie, room)[0];
    setPresentationId(firstPresentation?.presentationId ?? null);
    if (firstPresentation) {
      setBasePrice(calculateAutoBasePrice(DEFAULT_BASE_PRICE, firstPresentation));
    }
  };

  const handleMovieChange = (nextMovieId: number) => {
    const nextMovie = movies.find((movie) => movie.movieId === nextMovieId);
    const nextRoom = selectedRoom && isActiveRoom(selectedRoom) && isRoomCompatibleWithMovie(selectedRoom, nextMovie)
      ? selectedRoom
      : undefined;

    setMovieId(nextMovieId);
    if (selectedRoom && !nextRoom) setCinemaRoomId(0);
    selectDefaultPresentation(nextMovie, nextRoom);

    if (!nextMovie) return;
    const nextMovieStartDate = nextMovie.fromDate || "";
    const nextMinimumDate = nextMovieStartDate > todayStr ? nextMovieStartDate : todayStr;
    const nextDefaultDate = nextMovie.status === "COMING_SOON" && nextMovieStartDate
      ? nextMovieStartDate
      : "";
    const nextDates = nextDefaultDate
      ? [nextDefaultDate]
      : (() => {
          const validDates = dates.filter((date) => date >= nextMinimumDate);
          return validDates.length > 0 ? validDates : [nextMinimumDate];
        })();

    setDates(nextDates);
    setTempDate((current) => nextDefaultDate || (current && current < nextMinimumDate ? nextMinimumDate : current));
    setTempStart((current) => clampStartTimeForDates(nextDates, current));
    setFormError("");
  };

  const handleRoomChange = (nextRoomId: number) => {
    const nextRoom = rooms.find((room) => room.cinemaRoomId === nextRoomId);
    setCinemaRoomId(nextRoomId);
    selectDefaultPresentation(selectedMovie, nextRoom);
  };

  const handleTempStartChange = (value: string) => {
    setTempStart(clampStartTimeForDates(dates, value));
  };

  const addDate = () => {
    if (!tempDate) return;
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-CA');
    const currentTimeStr = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

    if (tempDate < todayStr) {
      setFormError("Không thể chọn ngày trong quá khứ.");
      return;
    }
    if (tempDate < minShowDate) {
      setFormError(
        movieStartDate
          ? `Ngày chiếu phải từ ngày khởi chiếu của phim (${formatDateShortText(movieStartDate)}) trở đi.`
          : "Ngày chiếu không hợp lệ."
      );
      return;
    }
    if (tempDate === todayStr) {
      const invalidSlot = timeSlots.find(slot => slot.start < currentTimeStr);
      if (invalidSlot) {
        setFormError(`Không thể thêm ngày hôm nay vì có khung giờ trong quá khứ (${invalidSlot.start}).`);
        return;
      }
    }
    setFormError("");
    if (!dates.includes(tempDate)) {
      const nextDates = [...dates, tempDate].sort();
      setDates(nextDates);
      setTempStart((current) => clampStartTimeForDates(nextDates, current));
    }
    setTempDate("");
  };

  const removeDate = (dateToRemove: string) => {
    const nextDates = dates.filter((date) => date !== dateToRemove);
    setDates(nextDates);
    setTempStart((current) => clampStartTimeForDates(nextDates, current));
  };

  const addTimeSlot = () => {
    if (!tempStart || !tempEnd) return;
    if (tempStart === tempEnd) { setFormError("Giờ kết thúc phải sau giờ bắt đầu."); return; }
    if (!finishesBeforeCutoff(tempStart, tempEnd)) {
      setFormError("Suất chiếu phải kết thúc trước 02:00 sáng.");
      return;
    }
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-CA');
    const currentTimeStr = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

    if (dates.includes(todayStr) && tempStart < currentTimeStr) {
      setFormError("Không thể thêm giờ chiếu trong quá khứ cho ngày hôm nay.");
      return;
    }
    setFormError("");
    const slotStr = `${tempStart}-${tempEnd}`;
    const exists = timeSlots.some(s => `${s.start}-${s.end}` === slotStr);
    if (!exists) {
      const newSlots = [...timeSlots, { start: tempStart, end: tempEnd }];
      newSlots.sort((a, b) => a.start.localeCompare(b.start));
      setTimeSlots(newSlots);
    }
    setTempStart(addMinutesToTime(tempEnd, cleanupMinutes));
  };

  const removeTimeSlot = (idx: number) => setTimeSlots(timeSlots.filter((_, i) => i !== idx));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!movieId) { setFormError("Vui lòng chọn phim."); return; }
    if (!cinemaRoomId) { setFormError("Vui lòng chọn phòng chiếu."); return; }
    if (!basePrice || basePrice < 1000) { setFormError("Giá vé gốc phải lớn hơn hoặc bằng 1.000đ."); return; }
    if (dates.length === 0) { setFormError("Vui lòng thêm ít nhất 1 ngày chiếu."); return; }
    if (timeSlots.length === 0) { setFormError("Vui lòng thêm ít nhất 1 khung giờ."); return; }
    if (selectedRoom && !isActiveRoom(selectedRoom)) {
      setFormError("Chỉ có thể tạo suất chiếu cho phòng đang hoạt động.");
      return;
    }
    if (selectedMovie && selectedRoom && !isRoomCompatibleWithMovie(selectedRoom, selectedMovie)) {
      setFormError(
        `Phòng ${selectedRoom.cinemaRoomName} hỗ trợ ${getRoomSupportedFormats(selectedRoom.type).join(", ")}, không khớp định dạng phim (${getMovieFormats(selectedMovie).join(", ")}).`
      );
      return;
    }
    if (activePresentations.length > 0 && !presentationId) {
      setFormError("Vui lòng chọn phiên bản chiếu của phim.");
      return;
    }
    if (presentationId && !selectedPresentation) {
      setFormError("Phiên bản chiếu không thuộc phim đã chọn hoặc đã bị ẩn.");
      return;
    }
    if (selectedPresentation && selectedRoom && !isRoomCompatibleWithPresentation(selectedRoom, selectedPresentation)) {
      setFormError(`Phiên bản ${formatPresentationLabel(selectedPresentation)} không phù hợp với phòng ${selectedRoom.cinemaRoomName}.`);
      return;
    }

    const today = new Date();
    const todayStr = today.toLocaleDateString('en-CA');
    const currentTimeStr = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

    for (const d of dates) {
      if (d < minShowDate) {
        setFormError(
          movieStartDate
            ? `Ngày chiếu phải từ ngày khởi chiếu của phim (${formatDateShortText(movieStartDate)}) trở đi.`
            : "Ngày chiếu không hợp lệ."
        );
        return;
      }
      if (d === todayStr) {
        for (const slot of timeSlots) {
          if (slot.start < currentTimeStr) {
            setFormError(`Khung giờ ${slot.start} không hợp lệ cho ngày hôm nay.`);
            return;
          }
          if (!finishesBeforeCutoff(slot.start, slot.end)) {
            setFormError(`Khung giờ ${slot.start} ~ ${slot.end} phải kết thúc trước 02:00 sáng.`);
            return;
          }
        }
      }
    }

    setFormError("");
    setFormLoading(true);

    try {
      const payloads: ShowtimeAdminRequest[] = [];
      for (const d of dates) {
        for (const slot of timeSlots) {
          payloads.push({ movieId, cinemaRoomId, presentationId, showDate: d, startTime: slot.start, endTime: slot.end, basePrice, status });
        }
      }
      await showtimeApi.createShowtimes(payloads);
      onSuccess(dates.length > 0 ? dates[0] : undefined);
    } catch (err: unknown) {
      setFormError(getApiErrorMessage(err, "Tạo suất chiếu thất bại. Có thể trùng lịch trong phòng."));
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div 
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div 
        style={{ position: "relative", background: "#fff", borderRadius: 16, width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.18)", fontFamily: FONT }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "#fff", zIndex: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Tạo lịch chiếu hàng loạt</h3>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Tiết kiệm thời gian bằng cách chọn nhiều ngày và khung giờ.</p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            style={{ 
              width: 30, height: 30, borderRadius: "50%", 
              background: "rgba(0,0,0,0.05)", border: "none", cursor: "pointer", 
              color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#E63946";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "rgba(0,0,0,0.05)";
              e.currentTarget.style.color = "#94a3b8";
            }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <label className={LABEL_CLS}>Phim *</label>
              <div style={{ position: "relative", marginBottom: 8 }}>
                <Search
                  size={15}
                  style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }}
                />
                <input
                  type="search"
                  className={INPUT_CLS}
                  value={movieSearch}
                  onChange={(e) => setMovieSearch(e.target.value)}
                  placeholder="Tìm phim theo tên, đạo diễn, mã phim..."
                  style={{ paddingLeft: 34 }}
                />
              </div>
              <select
                className={INPUT_CLS}
                value={movieId || ""}
                onChange={(e) => handleMovieChange(Number(e.target.value))}
              >
                <option value="">-- Chọn phim --</option>
                {filteredMovies.map(m => (
                  <option key={m.movieId} value={m.movieId}>
                    {m.movieNameVn} {m.duration ? `(${m.duration}')` : ""}{m.fromDate ? ` · từ ${formatDateShortText(m.fromDate)}` : ""}
                  </option>
                ))}
              </select>
              <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
                Hiển thị {filteredMovies.length}/{availableMovies.length} phim có thể xếp lịch.
              </div>
            </div>
            <div>
              <label className={LABEL_CLS}>Phòng chiếu *</label>
              <select
                className={INPUT_CLS}
                value={cinemaRoomId || ""}
                onChange={(e) => handleRoomChange(Number(e.target.value))}
              >
                <option value="">-- Chọn phòng --</option>
                {compatibleRooms.map(r => (
                  <option key={r.cinemaRoomId} value={r.cinemaRoomId}>
                    {formatRoomOptionLabel(r)}
                  </option>
                ))}
              </select>
              {selectedMovie && (
                <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
                  Phim hỗ trợ: {getMovieFormats(selectedMovie).join(", ") || "Chưa có định dạng"}. Có {compatibleRooms.length} phòng đang hoạt động phù hợp.
                </div>
              )}
            </div>
          </div>

          {selectedMovie && activePresentations.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <label className={LABEL_CLS}>Phiên bản chiếu *</label>
              <select
                className={INPUT_CLS}
                value={presentationId ?? ""}
                onChange={(e) => {
                  const newPresentationId = e.target.value ? Number(e.target.value) : null;
                  const newPresentation = activePresentations.find(p => p.presentationId === newPresentationId);
                  setPresentationId(newPresentationId);
                  if (newPresentation) {
                    setBasePrice(calculateAutoBasePrice(DEFAULT_BASE_PRICE, newPresentation));
                  }
                }}
                disabled={presentationOptions.length === 0}
              >
                <option value="">-- Chọn phiên bản --</option>
                {presentationOptions.map((presentation) => (
                  <option key={presentation.presentationId} value={presentation.presentationId}>
                    {formatPresentationLabel(presentation)}
                  </option>
                ))}
              </select>
              <div style={{ marginTop: 6, fontSize: 12, color: presentationOptions.length === 0 ? "#dc2626" : "#64748b", lineHeight: 1.45 }}>
                {presentationOptions.length === 0
                  ? "Không có phiên bản chiếu nào phù hợp với phòng đã chọn."
                  : selectedPresentation
                    ? `Tất cả suất trong lượt tạo này sẽ dùng: ${formatPresentationLabel(selectedPresentation)}.`
                    : "Chọn đúng bản phụ đề/lồng tiếng cho lượt tạo hàng loạt."}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <label className={LABEL_CLS}>Giá vé gốc *</label>
            <input
              type="number"
              min={1000}
              step={1000}
              className={INPUT_CLS}
              value={basePrice}
              onChange={(e) => setBasePrice(Number(e.target.value) || 0)}
            />
            <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
              Giá ghế cuối = giá vé gốc + phụ thu loại ghế. Ví dụ VIP +15.000đ, ghế đôi +75.000đ.
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label className={LABEL_CLS}>Chọn ngày chiếu *</label>
            {defaultShowDateForMovie && (
              <div style={{ margin: "-2px 0 10px", fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                Phim sắp chiếu nên ngày mặc định được lấy theo ngày khởi chiếu: <strong style={{ color: "#0f172a" }}>{formatDateShortText(defaultShowDateForMovie)}</strong>.
              </div>
            )}
            {selectedMovie && (
              <div style={{ margin: "-2px 0 10px", fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                Khách hàng chỉ thấy và đặt vé trong vòng 7 ngày trước giờ chiếu; ngày chiếu vẫn phải nằm trong lịch phát hành chính thức của phim.
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input type="date" min={minShowDate} className={INPUT_CLS} style={{ maxWidth: 200 }} value={tempDate} onChange={e => setTempDate(e.target.value)} />
              <button type="button" onClick={addDate} style={{ padding: "0 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#0f172a", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Thêm ngày</button>
            </div>
            {dates.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {dates.map(d => (
                  <span key={d} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "rgba(59,130,246,0.1)", color: "#1d4ed8", borderRadius: 6, fontSize: 13, fontWeight: 700 }}>
                    {d} <X size={14} style={{ cursor: "pointer", opacity: 0.7 }} onClick={() => removeDate(d)} />
                  </span>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <label className={LABEL_CLS} style={{ margin: 0 }}>Chọn khung giờ *</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "#64748b" }}>Dọn rạp:</span>
                <select
                  value={cleanupMinutes}
                  onChange={e => setCleanupMinutes(Number(e.target.value))}
                  style={{ padding: "3px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12, fontWeight: 700, color: "#0f172a", background: "#fff", cursor: "pointer" }}
                >
                  {cleanupOptions.map(m => (
                    <option key={m} value={m}>{m === 0 ? "Không" : `${m} phút`}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-end", marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: 11, color: "#94a3b8", display: "block", marginBottom: 6 }}>Bắt đầu</span>
                <TimePicker 
                  value={tempStart} 
                  onChange={handleTempStartChange}
                  minTime={dates.includes(new Date().toLocaleDateString('en-CA')) ? `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}` : undefined}
                />
              </div>
              <span style={{ color: "#cbd5e1", paddingBottom: 10, fontWeight: 700 }}>~</span>
              <div>
                <span style={{ fontSize: 11, color: "#94a3b8", display: "block", marginBottom: 6 }}>Kết thúc</span>
                <TimePicker value={tempEnd} onChange={() => undefined} disabled={true} />
              </div>
              <button type="button" onClick={addTimeSlot} style={{ padding: "0 20px", height: 40, borderRadius: 10, border: "none", background: "#0f172a", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "background 0.2s" }}>Thêm giờ</button>
            </div>
            {timeSlots.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {timeSlots.map((slot, idx) => (
                  <span key={idx} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "rgba(16,185,129,0.1)", color: "#047857", borderRadius: 6, fontSize: 13, fontWeight: 700 }}>
                    {slot.start} ~ {slot.end} <X size={14} style={{ cursor: "pointer", opacity: 0.7 }} onClick={() => removeTimeSlot(idx)} />
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className={LABEL_CLS}>Trạng thái</label>
            <select className={INPUT_CLS} value={status} onChange={(e) => setStatus(e.target.value as ShowtimeStatusEnum)}>
              {EDITABLE_SHOWTIME_STATUSES.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
            </select>
          </div>

          {formError && (
            <div style={{ marginTop: 20, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "12px 16px", color: "#dc2626", fontSize: 13 }}>
              {formError}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
            <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>
              Sẽ tạo ra <strong style={{ color: "#0f172a" }}>{dates.length * timeSlots.length}</strong> suất chiếu
            </span>
            <div style={{ display: "flex", gap: 12 }}>
              <ModalBtn variant="cancel" type="button" onClick={onClose}>Hủy</ModalBtn>
              <ModalBtn variant="primary" type="submit" disabled={formLoading || (dates.length * timeSlots.length === 0)}>
                {formLoading && <Loader2 size={16} className="animate-spin" />}
                {formLoading ? "Đang xử lý..." : "Tạo hàng loạt"}
              </ModalBtn>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Showtime Seats Layout Modal ───────────────────────────────────────────────

function compareSeats(a: ShowtimeSeat, b: ShowtimeSeat) {
  const rowA = a.seatRow ?? "";
  const rowB = b.seatRow ?? "";
  const r = rowA.localeCompare(rowB, undefined, { numeric: true });
  if (r !== 0) return r;
  return (a.seatNumber ?? 0) - (b.seatNumber ?? 0);
}

function ShowtimeSeatsLayoutModal({ showtime, movies, rooms, onClose }: {
  showtime: ShowtimeResponse;
  movies: MovieResponse[];
  rooms: CinemaRoom[];
  onClose: () => void;
}) {
  const [seats, setSeats] = useState<ShowtimeSeat[]>([]);
  const [loading, setLoading] = useState(true);

  const mName = movies.find(m => m.movieId === showtime.movieId)?.movieNameVn || `#${showtime.movieId}`;
  const room = rooms.find(r => r.cinemaRoomId === showtime.cinemaRoomId);
  const rName = room?.cinemaRoomName || `#${showtime.cinemaRoomId}`;
  const presentationName = formatPresentationSummary(showtime.presentationName, showtime.presentationFormat, showtime.projectionType, showtime.languageType);

  const fetchSeats = useCallback(async () => {
    setLoading(true);
    try {
      const stData = await showtimeSeatService.getShowtimeSeats({
        showtimeId: showtime.showtimeId,
        page: 0,
        size: 1000,
      });
      const sorted = (stData.content || []).sort(compareSeats);
      setSeats(sorted);
    } catch (err) {
      console.error("Failed to fetch showtime seats", err);
    } finally {
      setLoading(false);
    }
  }, [showtime.showtimeId]);

  useEffect(() => {
    const requestTimer = window.setTimeout(fetchSeats, 0);
    return () => window.clearTimeout(requestTimer);
  }, [fetchSeats]);

  const rows = useMemo(() => {
    const grouped = new Map<string, ShowtimeSeat[]>();
    seats.forEach(s => {
      const row = s.seatRow || "A";
      if (!grouped.has(row)) grouped.set(row, []);
      grouped.get(row)!.push(s);
    });
    return Array.from(grouped.entries()).sort((a,b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
  }, [seats]);

  // Seat stats
  const bookedSeats = seats.filter(s => s.status === "BOOKED").length;
  const holdingSeats = seats.filter(s => s.status === "HOLDING").length;
  const availableSeats = seats.filter(s => s.status === "AVAILABLE").length;

  const getSeatStyle = (seat: ShowtimeSeat, isSelected: boolean) => {
    if (isSelected) return { bg: "rgba(244,63,94,0.15)", border: "#f43f5e", color: "#f43f5e", shadow: "0 0 15px rgba(244,63,94,0.4)" };
    if (seat.status === "BOOKED") return { bg: "rgba(239,68,68,0.12)", border: "#ef4444", color: "#dc2626", shadow: "0 0 10px rgba(239,68,68,0.2)" };
    if (seat.status === "HOLDING") return { bg: "rgba(245,158,11,0.12)", border: "#f59e0b", color: "#d97706", shadow: "0 0 10px rgba(245,158,11,0.2)" };
    
    const seatType = seat.seatType;
    switch (seatType) {
      case "VIP": return { bg: "rgba(139,92,246,0.15)", border: "#8b5cf6", color: "#ddd6fe", shadow: "0 0 12px rgba(139,92,246,0.3)" };
      case "COUPLE": return { bg: "rgba(236,72,153,0.15)", border: "#ec4899", color: "#fbcfe8", shadow: "0 0 12px rgba(236,72,153,0.3)" };
      case "DISABLED": return { bg: "rgba(14,116,144,0.15)", border: "#06b6d4", color: "#67e8f9", shadow: "0 0 12px rgba(14,116,144,0.3)" };
      default: return { bg: "rgba(59,130,246,0.1)", border: "#3b82f6", color: "#bfdbfe", shadow: "0 0 10px rgba(59,130,246,0.2)" };
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 110, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
      <div style={{ background: "#0f172a", borderRadius: 20, width: "100%", maxWidth: 1280, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,0.4)", fontFamily: FONT, overflow: "hidden", border: "1px solid #1e293b" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(56,189,248,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Armchair size={15} color="#38bdf8" />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.15em" }}>Sơ đồ ghế suất chiếu</span>
            </div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#f8fafc" }}>{mName}</h3>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>
              {rName}{presentationName ? ` · ${presentationName}` : ""} · {showtime.showDate} · {formatTime(showtime.startTime)} ~ {formatTime(showtime.endTime)} ·{" "}
              <span style={{ color: "#10b981" }}>{availableSeats} trống</span> ·{" "}
              <span style={{ color: "#f59e0b" }}>{holdingSeats} giữ</span> ·{" "}
              <span style={{ color: "#ef4444" }}>{bookedSeats} đã đặt</span>
            </p>
          </div>
          <button onClick={onClose} style={{ background: "#1e293b", border: "none", cursor: "pointer", color: "#94a3b8", width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1, userSelect: "none" }}>
          <div style={{ padding: "32px 12px", overflow: "auto", background: "#0b0f19", display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
            {/* Glowing Screen */}
            <div style={{
              height: 48, width: "100%", maxWidth: 640, margin: "0 auto 64px",
              background: "linear-gradient(to bottom, rgba(56,189,248,0.2), transparent)",
              boxShadow: "0 10px 40px rgba(56,189,248,0.1)",
              borderRadius: "50% 50% 0 0 / 100% 100% 0 0",
              borderTop: "3px solid rgba(56,189,248,0.6)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <span style={{ color: "rgba(56,189,248,0.5)", fontSize: 12, letterSpacing: "0.5em", fontWeight: 800 }}>Màn hình</span>
            </div>

            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, color: "#64748b" }}>
                <Loader2 size={32} style={{ color: "#38bdf8", marginBottom: 16 }} className="animate-spin" />
                <span style={{ fontSize: 14, letterSpacing: "0.05em" }}>Đang khởi tạo sơ đồ ghế...</span>
              </div>
            ) : seats.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0", color: "#64748b", fontSize: 14 }}>Chưa có ghế nào cho suất chiếu này.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center", width: "100%", maxWidth: 1000 }}>
                {rows.map(([rowLabel, rowSeats]) => {
                  return (
                    <div key={rowLabel} style={{ display: "flex", alignItems: "center", position: "relative", paddingLeft: 46, minHeight: 42, width: "100%" }}>
                      <div 
                        style={{ 
                          position: "absolute", left: 0,
                          width: 38, height: 42, flexShrink: 0, fontWeight: 900, fontSize: 15, 
                          color: "#475569", background: "transparent", border: "none",
                          display: "flex", alignItems: "center", justifyContent: "center"
                        }}
                      >
                        {rowLabel}
                      </div>
                      <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", flex: 1 }}>
                        {rowSeats.sort((a, b) => (a.seatNumber ?? 0) - (b.seatNumber ?? 0)).map(seat => {
                          const sStyle = getSeatStyle(seat, false);
                          const seatStatus = seat.status as ShowtimeSeatStatus;
                          
                          return (
                            <div
                              key={seat.showtimeSeatId}
                              title={`${seat.seatCode} · ${SEAT_TYPE_CONFIG[seat.seatType as SeatType]?.label || 'Normal'} · ${SEAT_STATUS_CONFIG[seatStatus]?.label || seat.status}`}
                              style={{
                                width: 38, height: 38,
                                borderRadius: "8px 8px 4px 4px",
                                border: `1px solid ${sStyle.border}`,
                                borderBottom: `4px solid ${sStyle.border}`,
                                background: sStyle.bg,
                                color: sStyle.color,
                                cursor: "default",
                                fontSize: 11, fontWeight: 800,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                                boxShadow: sStyle.shadow,
                                outline: "none", position: "relative",
                                opacity: 1
                              }}
                            >
                              {seat.seatCode}
                              {seat.seatType === "VIP" && seat.status !== "BOOKED" && (
                                <div style={{ position: "absolute", top: -5, right: -5, width: 12, height: 12, borderRadius: "50%", background: "#8b5cf6", border: "2px solid #0f172a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  <span style={{ fontSize: 7, color: "#fff" }}>★</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Legend */}
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center", marginTop: 60, padding: "16px 28px", background: "rgba(30,41,59,0.7)", borderRadius: 16, border: "1px solid #1e293b", backdropFilter: "blur(4px)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>
                <span style={{ width: 14, height: 14, borderRadius: 4, background: "rgba(16,185,129,0.12)", border: "1px solid #10b981", borderBottom: "3px solid #10b981" }} />
                Trống
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>
                <span style={{ width: 14, height: 14, borderRadius: 4, background: "rgba(245,158,11,0.12)", border: "1px solid #f59e0b", borderBottom: "3px solid #f59e0b" }} />
                Đang giữ
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>
                <span style={{ width: 14, height: 14, borderRadius: 4, background: "rgba(239,68,68,0.12)", border: "1px solid #ef4444", borderBottom: "3px solid #ef4444" }} />
                Đã đặt
              </div>
              <div style={{ width: 1, height: 18, background: "#334155", margin: "0 4px" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>
                <span style={{ width: 14, height: 14, borderRadius: 4, background: "rgba(139,92,246,0.12)", border: "1px solid #8b5cf6", borderBottom: "3px solid #8b5cf6" }} />
                VIP
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
