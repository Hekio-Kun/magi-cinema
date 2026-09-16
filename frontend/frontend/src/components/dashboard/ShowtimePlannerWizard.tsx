import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Film,
  LayoutGrid,
  List,
  Loader2,
  Lock,
  Minus,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Unlock,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "@/api/errors";
import {
  showtimeApi,
  type ShowtimePlannerMovieRequest,
  type ShowtimePlannerCapacityItem,
  type ShowtimePlannerCapacityRequest,
  type ShowtimePlannerCapacityResponse,
  type ShowtimePlannerPreviewItem,
  type ShowtimePlannerPreviewRequest,
  type ShowtimePlannerPreviewResponse,
  type ShowtimePlannerRecommendationResponse,
} from "@/api/showtimeApi";
import type { MoviePresentationResponse, MovieResponse } from "@/api/movieApi";
import type { CinemaRoom, RoomType } from "@/types/cinemaRoom";
import {
  formatPresentationLabelFromFields,
  isProjectionAllowedForFormat,
} from "@/utils/presentation";
import { PlannerScheduleBoard } from "@/components/dashboard/PlannerScheduleBoard";
import { TimeRulerPicker } from "@/components/ui/TimeRulerPicker";

const INPUT = "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100";

type UiMoviePlan = {
  movieId: number;
  requestedShowtimes: number;
  presentationMode: "AUTO" | "MANUAL";
  presentationIds: number[];
  presentationCounts: Record<number, number>;
};

type QuotaCapacityBudget = {
  scopeKey: string;
  totalMaximum: number;
  maximumByFormat: Record<string, number>;
};

type Props = {
  movies: MovieResponse[];
  rooms: CinemaRoom[];
  defaultDate: string;
  onClose: () => void;
  onSuccess: (firstDate?: string) => void;
};

const formatPresentation = (presentation: MoviePresentationResponse) =>
  formatPresentationLabelFromFields({
    ...presentation,
    presentationName: presentation.displayName?.trim() || presentation.label,
  }) || `Phiên bản #${presentation.presentationId}`;

const activePresentations = (movie: MovieResponse) =>
  (movie.presentations ?? [])
    .filter((presentation) => presentation.active !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.presentationId - b.presentationId);

const normalizeFormat = (value?: string | null) => {
  const format = String(value ?? "").toUpperCase();
  if (["STANDARD", "2D", "3D", "_2D", "_3D", "SCREENX"].includes(format)) return "STANDARD";
  if (format === "_4DX" || format === "4DX") return "4DX";
  return format;
};

const FORMAT_ORDER = ["STANDARD", "IMAX", "4DX"] as const;
const formatName = (format: string) => format === "STANDARD" ? "Standard" : format;

const roomFormats = (type?: RoomType | null) => {
  if (type === "IMAX") return ["IMAX"];
  if (type === "4DX") return ["4DX"];
  return ["STANDARD"];
};

const supports = (room: CinemaRoom, presentation: MoviePresentationResponse) =>
  isProjectionAllowedForFormat(String(presentation.format ?? ""), String(presentation.projectionType ?? ""))
  && roomFormats(room.type).includes(normalizeFormat(String(presentation.format ?? "")));

const addDays = (date: string, days: number) => {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + days);
  return value.toLocaleDateString("en-CA");
};

const addMinutes = (time: string, minutes: number) => {
  const [hour, minute] = time.split(":").map(Number);
  const total = ((hour * 60 + minute + minutes) % 1440 + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

const timeToTotalMinutes = (time: string) => {
  const [hour, minute] = time.slice(0, 5).split(":").map(Number);
  return hour * 60 + minute;
};

const localDateTimeToEpochMinutes = (date: string, time: string) =>
  Math.floor(new Date(`${date}T${time.slice(0, 5)}:00`).getTime() / 60_000);

const epochMinutesToLocalParts = (minutes: number) => {
  const value = new Date(minutes * 60_000);
  return {
    showDate: value.toLocaleDateString("en-CA"),
    time: `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`,
  };
};

const evenCounts = (ids: number[], total: number): Record<number, number> => {
  const result: Record<number, number> = {};
  ids.forEach((id, index) => {
    result[id] = Math.floor(total / ids.length) + (index < total % ids.length ? 1 : 0);
  });
  return result;
};

export function ShowtimePlannerWizard({ movies, rooms, defaultDate, onClose, onSuccess }: Props) {
  const today = new Date().toLocaleDateString("en-CA");
  const safeDate = defaultDate >= today ? defaultDate : today;
  const [step, setStep] = useState(1);
  const [fromDate, setFromDate] = useState(safeDate);
  const [toDate, setToDate] = useState(safeDate);
  const [roomIds, setRoomIds] = useState<number[]>(rooms.map((room) => room.cinemaRoomId));
  const [openingTime, setOpeningTime] = useState("08:00");
  const [latestFinishTime, setLatestFinishTime] = useState("02:00");
  const [primeStartTime, setPrimeStartTime] = useState("18:00");
  const [primeEndTime, setPrimeEndTime] = useState("22:30");
  const [turnaroundMinutes, setTurnaroundMinutes] = useState(20);
  const [fillRemainingCapacity, setFillRemainingCapacity] = useState(false);
  const [plans, setPlans] = useState<Record<number, UiMoviePlan>>({});
  const [movieSearch, setMovieSearch] = useState("");
  const [requestErrors, setRequestErrors] = useState<{ key: string; messages: string[] }>({ key: "", messages: [] });
  const [preview, setPreview] = useState<ShowtimePlannerPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [previewView, setPreviewView] = useState<"schedule" | "table">("schedule");
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());
  const [capacity, setCapacity] = useState<ShowtimePlannerCapacityResponse | null>(null);
  const [capacityResultKey, setCapacityResultKey] = useState("");
  const [capacityLoading, setCapacityLoading] = useState(false);
  const [capacityLoadingKey, setCapacityLoadingKey] = useState("");
  const [capacityError, setCapacityError] = useState("");
  const [capacityErrorKey, setCapacityErrorKey] = useState("");
  const [recommendation, setRecommendation] = useState<ShowtimePlannerRecommendationResponse | null>(null);
  const [recommendationResultKey, setRecommendationResultKey] = useState("");
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState("");
  const [quotaPreview, setQuotaPreview] = useState<ShowtimePlannerPreviewResponse | null>(null);
  const [quotaPreviewResultKey, setQuotaPreviewResultKey] = useState("");
  const [quotaPreviewError, setQuotaPreviewError] = useState("");
  const [quotaPreviewErrorKey, setQuotaPreviewErrorKey] = useState("");
  const [quotaCapacityBudget, setQuotaCapacityBudget] = useState<QuotaCapacityBudget | null>(null);
  const quotaPreviewCache = useRef(new Map<string, ShowtimePlannerPreviewResponse>());
  const latestQuotaRequestKey = useRef("");

  const selectedMovies = useMemo(
    () => movies.filter((movie) => plans[movie.movieId]),
    [movies, plans],
  );
  const filteredMovies = useMemo(() => {
    const keyword = movieSearch.trim().toLocaleLowerCase("vi-VN");
    if (!keyword) return movies;
    return movies.filter((movie) =>
      `${movie.movieNameVn ?? ""} ${movie.movieNameEnglish ?? ""}`.toLocaleLowerCase("vi-VN").includes(keyword),
    );
  }, [movieSearch, movies]);

  const compatibleRoomIdsForSelection = useMemo(() => {
    if (selectedMovies.length === 0) return rooms.map((r) => r.cinemaRoomId);
    const selectedPresentations: MoviePresentationResponse[] = [];
    selectedMovies.forEach((movie) => {
      const plan = plans[movie.movieId];
      if (!plan) return;
      activePresentations(movie).forEach((p) => {
        if (plan.presentationIds.includes(p.presentationId)) {
          selectedPresentations.push(p);
        }
      });
    });
    if (selectedPresentations.length === 0) return rooms.map((r) => r.cinemaRoomId);
    return rooms
      .filter((room) => selectedPresentations.some((p) => supports(room, p)))
      .map((room) => room.cinemaRoomId);
  }, [selectedMovies, plans, rooms]);

  const capacityMovieSelectionKey = JSON.stringify(selectedMovies
    .map((movie) => ({ movieId: movie.movieId, presentationIds: plans[movie.movieId]?.presentationIds ?? [] }))
    .filter((selection) => selection.presentationIds.length > 0));
  const capacityRequest = useMemo<ShowtimePlannerCapacityRequest | null>(() => {
    const movieSelections = JSON.parse(capacityMovieSelectionKey) as ShowtimePlannerCapacityRequest["movies"];
    if (!fromDate || !toDate || toDate < fromDate || fromDate < today
      || roomIds.length === 0 || movieSelections.length === 0
      || !openingTime || !latestFinishTime || openingTime === latestFinishTime
      || !primeStartTime || !primeEndTime
      || turnaroundMinutes < 0 || turnaroundMinutes > 120) {
      return null;
    }
    return {
      fromDate,
      toDate,
      openingTime,
      latestFinishTime,
      turnaroundMinutes,
      slotIntervalMinutes: 15,
      primeStartTime,
      primeEndTime,
      cinemaRoomIds: roomIds,
      movies: movieSelections,
    };
  }, [capacityMovieSelectionKey, fromDate, latestFinishTime, openingTime, primeEndTime, primeStartTime, roomIds, toDate, today, turnaroundMinutes]);

  const capacityRequestKey = useMemo(
    () => capacityRequest ? JSON.stringify(capacityRequest) : "",
    [capacityRequest],
  );
  const visibleCapacity = capacityResultKey === capacityRequestKey ? capacity : null;
  const visibleCapacityLoading = capacityLoadingKey === capacityRequestKey && capacityLoading;
  const visibleCapacityError = capacityErrorKey === capacityRequestKey ? capacityError : "";
  const visibleRecommendation = recommendationResultKey === capacityRequestKey ? recommendation : null;

  useEffect(() => {
    if (!capacityRequestKey || step === 3) return;
    let active = true;
    const controller = new AbortController();
    const request = JSON.parse(capacityRequestKey) as ShowtimePlannerCapacityRequest;
    const timer = window.setTimeout(async () => {
      setCapacityResultKey(capacityRequestKey);
      setCapacity(null);
      setCapacityErrorKey(capacityRequestKey);
      setCapacityError("");
      setCapacityLoadingKey(capacityRequestKey);
      setCapacityLoading(true);
      try {
        const response = await showtimeApi.getPlannerCapacity(request, controller.signal);
        if (active) setCapacity(response);
      } catch (error) {
        if (active && !controller.signal.aborted) {
          setCapacityError(getApiErrorMessage(error, "Không thể tính số suất tối đa."));
        }
      } finally {
        if (active) setCapacityLoading(false);
      }
    }, 100);
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [capacityRequestKey, step]);

  useEffect(() => {
    if (step !== 2 || !capacityRequestKey) return;
    let active = true;
    const controller = new AbortController();
    const request = JSON.parse(capacityRequestKey) as ShowtimePlannerCapacityRequest;
    const timer = window.setTimeout(async () => {
      setRecommendationLoading(true);
      setRecommendationError("");
      try {
        const response = await showtimeApi.getPlannerRecommendations(request, controller.signal);
        if (active) {
          setRecommendationResultKey(capacityRequestKey);
          setRecommendation(response);
        }
      } catch (error) {
        if (active && !controller.signal.aborted) {
          setRecommendationResultKey(capacityRequestKey);
          setRecommendation(null);
          setRecommendationError(getApiErrorMessage(error, "Không thể tính số suất đề xuất."));
        }
      } finally {
        if (active) setRecommendationLoading(false);
      }
    }, 150);
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [capacityRequestKey, step]);

  const capacityByPresentation = useMemo(() => {
    const result = new Map<string, ShowtimePlannerCapacityItem>();
    visibleCapacity?.items.forEach((item) => result.set(`${item.movieId}-${item.presentationId}`, item));
    return result;
  }, [visibleCapacity]);

  const maximumByFormat = useMemo(() => {
    const result: Record<string, number> = {};
    Object.entries(visibleCapacity?.maximumByFormat ?? {}).forEach(([format, maximum]) => {
      result[normalizeFormat(format)] = maximum;
    });
    return result;
  }, [visibleCapacity]);

  const requestedByFormatKey = JSON.stringify((() => {
    const result: Record<string, number> = {};
    selectedMovies.forEach((movie) => {
      const plan = plans[movie.movieId];
      activePresentations(movie)
        .filter((presentation) => plan.presentationIds.includes(presentation.presentationId))
        .forEach((presentation) => {
          const format = normalizeFormat(presentation.format);
          result[format] = (result[format] ?? 0) + (plan.presentationCounts[presentation.presentationId] ?? 0);
        });
    });
    return result;
  })());
  const requestedByFormat = useMemo<Record<string, number>>(
    () => JSON.parse(requestedByFormatKey) as Record<string, number>,
    [requestedByFormatKey],
  );

  const totalRequested = selectedMovies.reduce(
    (total, movie) => total + (plans[movie.movieId]?.requestedShowtimes ?? 0),
    0,
  );

  const currentPlanRequest = useMemo<ShowtimePlannerPreviewRequest>(() => ({
    fromDate,
    toDate,
    openingTime,
    latestFinishTime,
    turnaroundMinutes,
    slotIntervalMinutes: 15,
    primeStartTime,
    primeEndTime,
    maximizeSchedule: fillRemainingCapacity,
    cinemaRoomIds: roomIds,
    movies: selectedMovies.map((movie): ShowtimePlannerMovieRequest => {
      const plan = plans[movie.movieId];
      return {
        movieId: movie.movieId,
        requestedShowtimes: plan.requestedShowtimes,
        presentationMode: plan.presentationMode,
        presentations: plan.presentationIds.map((presentationId) => ({
          presentationId,
          ...(plan.presentationMode === "MANUAL"
            ? { requestedShowtimes: plan.presentationCounts[presentationId] ?? 0 }
            : {}),
        })),
      };
    }),
    lockedItems: [],
  }), [fillRemainingCapacity, fromDate, latestFinishTime, openingTime, plans, primeEndTime, primeStartTime, roomIds, selectedMovies, toDate, turnaroundMinutes]);

  const quotaRequestValid = step === 2
    && selectedMovies.length > 0
    && roomIds.length > 0
    && currentPlanRequest.movies.every((movie) => movie.requestedShowtimes >= 1
      && movie.presentations.length > 0
      && (movie.presentationMode !== "MANUAL"
        || movie.presentations.reduce((sum, presentation) => sum + (presentation.requestedShowtimes ?? 0), 0) === movie.requestedShowtimes));
  const quotaPreviewRequestKey = quotaRequestValid
    ? JSON.stringify({ ...currentPlanRequest, maximizeSchedule: false })
    : "";
  const quotaPreviewRequest = useMemo<ShowtimePlannerPreviewRequest | null>(
    () => quotaPreviewRequestKey
      ? JSON.parse(quotaPreviewRequestKey) as ShowtimePlannerPreviewRequest
      : null,
    [quotaPreviewRequestKey],
  );
  const visibleQuotaPreview = quotaPreviewResultKey === quotaPreviewRequestKey ? quotaPreview : null;
  const visibleQuotaPreviewError = quotaPreviewErrorKey === quotaPreviewRequestKey ? quotaPreviewError : "";
  const quotaCalculationPending = quotaRequestValid && !visibleQuotaPreview && !visibleQuotaPreviewError;

  const scheduledByFormat = useMemo(() => {
    const result: Record<string, number> = {};
    visibleQuotaPreview?.allocations.forEach((allocation) => {
      const movie = selectedMovies.find((item) => item.movieId === allocation.movieId);
      const presentation = movie
        ? activePresentations(movie).find((item) => item.presentationId === allocation.presentationId)
        : undefined;
      if (!presentation) return;
      const format = normalizeFormat(presentation.format);
      result[format] = (result[format] ?? 0) + allocation.scheduled;
    });
    return result;
  }, [selectedMovies, visibleQuotaPreview]);

  const additionalByFormat = useMemo(() => {
    const result: Record<string, number> = {};
    Object.entries(visibleQuotaPreview?.additionalByFormat ?? {}).forEach(([format, additional]) => {
      result[normalizeFormat(format)] = additional;
    });
    return result;
  }, [visibleQuotaPreview]);

  const activeQuotaCapacityBudget = quotaCapacityBudget?.scopeKey === capacityRequestKey
    ? quotaCapacityBudget
    : null;
  const remainingTotalCapacity = visibleQuotaPreview && !visibleQuotaPreview.complete
    ? 0
    : Math.max(0, activeQuotaCapacityBudget
      ? activeQuotaCapacityBudget.totalMaximum - totalRequested
      : visibleQuotaPreview?.additionalPossible ?? 0);
  const remainingCapacityByFormat = useMemo(() => {
    const result: Record<string, number> = {};
    const formats = new Set([
      ...Object.keys(requestedByFormat),
      ...Object.keys(additionalByFormat),
      ...Object.keys(activeQuotaCapacityBudget?.maximumByFormat ?? {}),
    ]);
    formats.forEach((format) => {
      result[format] = visibleQuotaPreview && !visibleQuotaPreview.complete
        ? 0
        : Math.max(0, activeQuotaCapacityBudget
          ? (activeQuotaCapacityBudget.maximumByFormat[format] ?? requestedByFormat[format] ?? 0)
            - (requestedByFormat[format] ?? 0)
          : additionalByFormat[format] ?? 0);
    });
    return result;
  }, [activeQuotaCapacityBudget, additionalByFormat, requestedByFormat, visibleQuotaPreview]);

  useEffect(() => {
    if (!quotaRequestValid || !quotaPreviewRequest) return;
    let active = true;
    const controller = new AbortController();
    latestQuotaRequestKey.current = quotaPreviewRequestKey;
    const cachedResponse = quotaPreviewCache.current.get(quotaPreviewRequestKey);
    const timer = window.setTimeout(async () => {
      setQuotaPreviewErrorKey(quotaPreviewRequestKey);
      setQuotaPreviewError("");
      try {
        const response = cachedResponse ?? await showtimeApi.previewPlanner(
          quotaPreviewRequest,
          controller.signal,
        );
        if (active && latestQuotaRequestKey.current === quotaPreviewRequestKey) {
          if (!cachedResponse) {
            quotaPreviewCache.current.set(quotaPreviewRequestKey, response);
            if (quotaPreviewCache.current.size > 20) {
              const oldestKey = quotaPreviewCache.current.keys().next().value;
              if (oldestKey) quotaPreviewCache.current.delete(oldestKey);
            }
          }
          setQuotaPreviewResultKey(quotaPreviewRequestKey);
          setQuotaPreview(response);
          if (response.complete && capacityRequestKey) {
            setQuotaCapacityBudget(() => {
              const responseAdditionalByFormat: Record<string, number> = {};
              Object.entries(response.additionalByFormat ?? {}).forEach(([format, additional]) => {
                responseAdditionalByFormat[normalizeFormat(format)] = additional;
              });
              const maximumByFormatForBudget: Record<string, number> = {};
              const formats = new Set([
                ...Object.keys(requestedByFormat),
                ...Object.keys(responseAdditionalByFormat),
              ]);
              formats.forEach((format) => {
                maximumByFormatForBudget[format] = (requestedByFormat[format] ?? 0)
                  + (responseAdditionalByFormat[format] ?? 0);
              });
              return {
                scopeKey: capacityRequestKey,
                totalMaximum: totalRequested + response.additionalPossible,
                maximumByFormat: maximumByFormatForBudget,
              };
            });
          }
        }
      } catch (error) {
        if (active && !controller.signal.aborted
          && latestQuotaRequestKey.current === quotaPreviewRequestKey) {
          setQuotaPreviewError(getApiErrorMessage(error, "Không thể kiểm tra số suất vừa điều chỉnh."));
        }
      }
    }, cachedResponse ? 0 : 100);
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [capacityRequestKey, quotaPreviewRequest, quotaPreviewRequestKey, quotaRequestValid, requestedByFormat, totalRequested]);

  const quotaDisplayPreview = visibleQuotaPreview
    ?? (activeQuotaCapacityBudget ? quotaPreview : null);
  const quotaByPresentation = useMemo(() => {
    const result = new Map<string, ShowtimePlannerPreviewResponse["allocations"][number]>();
    quotaDisplayPreview?.allocations.forEach((item) => result.set(`${item.movieId}-${item.presentationId}`, item));
    return result;
  }, [quotaDisplayPreview]);

  const toggleMovie = (movie: MovieResponse) => {
    setPlans((current) => {
      if (current[movie.movieId]) {
        const next = { ...current };
        delete next[movie.movieId];
        return next;
      }
      const presentations = activePresentations(movie);
      const presentationIds = presentations.map((presentation) => presentation.presentationId);
      return {
        ...current,
        [movie.movieId]: {
          movieId: movie.movieId,
          requestedShowtimes: Math.max(1, Math.min(4, presentationIds.length * 2)),
          presentationMode: "MANUAL",
          presentationIds,
          presentationCounts: evenCounts(presentationIds, Math.max(1, Math.min(4, presentationIds.length * 2))),
        },
      };
    });
  };

  const updatePlan = (movieId: number, patch: Partial<UiMoviePlan>) => {
    setPlans((current) => ({ ...current, [movieId]: { ...current[movieId], ...patch } }));
  };

  const applyRecommendations = (movieId?: number) => {
    if (!visibleRecommendation) return;
    const applicable = visibleRecommendation.items.filter(
      (item) => (movieId === undefined || item.movieId === movieId) && item.suggestedShowtimes > 0,
    );
    if (applicable.length === 0) {
      toast.warning("Chưa có đề xuất khả thi để áp dụng.");
      return;
    }
    setPlans((current) => {
      const next = { ...current };
      applicable.forEach((item) => {
        const plan = next[item.movieId];
        if (!plan) return;
        const suggestedCounts = Object.fromEntries(plan.presentationIds.map((presentationId) => [
          presentationId,
          item.suggestedByPresentation[String(presentationId)] ?? 0,
        ]));
        const suggestedTotal = Object.values(suggestedCounts).reduce((sum, count) => sum + count, 0);
        next[item.movieId] = {
          ...plan,
          presentationMode: "MANUAL",
          requestedShowtimes: suggestedTotal || item.suggestedShowtimes,
          presentationCounts: suggestedTotal
            ? suggestedCounts
            : evenCounts(plan.presentationIds, item.suggestedShowtimes),
        };
      });
      return next;
    });
    toast.success(movieId === undefined ? "Đã áp dụng đề xuất cho các phim." : "Đã áp dụng số suất đề xuất.");
  };

  const updatePresentationQuota = (movieId: number, presentationId: number, value: number) => {
    setPlans((current) => {
      const plan = current[movieId];
      const presentationCounts = { ...plan.presentationCounts, [presentationId]: value };
      const requestedShowtimes = plan.presentationIds.reduce(
        (sum, id) => sum + (presentationCounts[id] ?? 0),
        0,
      );
      if (requestedShowtimes < 1) return current;
      return {
        ...current,
        [movieId]: { ...plan, presentationCounts, requestedShowtimes },
      };
    });
  };

  const togglePresentation = (movieId: number, presentationId: number) => {
    const plan = plans[movieId];
    const ids = plan.presentationIds.includes(presentationId)
      ? plan.presentationIds.filter((id) => id !== presentationId)
      : [...plan.presentationIds, presentationId];
    updatePlan(movieId, {
      presentationIds: ids,
      presentationCounts: evenCounts(ids, plan.requestedShowtimes),
    });
  };

  const getSelectionErrors = () => {
    const next: string[] = [];
    if (!fromDate || !toDate) next.push("Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.");
    if (fromDate < today) next.push("Ngày bắt đầu không được nằm trong quá khứ.");
    if (toDate < fromDate) next.push("Ngày kết thúc không được trước ngày bắt đầu.");
    if (fromDate && toDate) {
      const days = Math.floor((Date.parse(`${toDate}T00:00:00`) - Date.parse(`${fromDate}T00:00:00`)) / 86_400_000) + 1;
      if (days > 31) next.push("Mỗi lần chỉ được lập lịch tối đa 31 ngày.");
    }
    if (roomIds.length === 0) next.push("Vui lòng chọn ít nhất một phòng chiếu.");
    if (!openingTime || !latestFinishTime) next.push("Vui lòng nhập giờ mở cửa và giờ đóng cửa.");
    if (openingTime === latestFinishTime) next.push("Giờ mở cửa và giờ đóng cửa không được trùng nhau.");
    if (!primeStartTime || !primeEndTime) next.push("Vui lòng nhập đầy đủ khung giờ vàng.");
    if (primeStartTime === primeEndTime) next.push("Giờ bắt đầu và kết thúc khung giờ vàng không được trùng nhau.");
    if (!Number.isFinite(turnaroundMinutes) || turnaroundMinutes < 0 || turnaroundMinutes > 120) {
      next.push("Thời gian nghỉ giữa các suất phải từ 0 đến 120 phút.");
    }
    if (selectedMovies.length === 0) next.push("Vui lòng chọn ít nhất một phim.");
    selectedMovies.forEach((movie) => {
      const plan = plans[movie.movieId];
      if (!movie.duration || movie.duration <= 0) next.push(`${movie.movieNameVn}: chưa có thời lượng hợp lệ.`);
      if (plan.presentationIds.length === 0) next.push(`${movie.movieNameVn}: chưa chọn phiên bản chiếu.`);
      if (movie.fromDate && toDate < movie.fromDate) next.push(`${movie.movieNameVn}: khoảng ngày đang nằm trước ngày khởi chiếu ${movie.fromDate}.`);
      if (movie.toDate && fromDate > movie.toDate) next.push(`${movie.movieNameVn}: khoảng ngày đang nằm sau ngày kết thúc ${movie.toDate}.`);
      plan.presentationIds.forEach((id) => {
        const presentation = activePresentations(movie).find((item) => item.presentationId === id);
        if (presentation && !rooms.some((room) => roomIds.includes(room.cinemaRoomId) && supports(room, presentation))) {
          next.push(`${movie.movieNameVn} · ${formatPresentation(presentation)}: không có phòng nào được chọn hỗ trợ.`);
        }
        const calculated = capacityByPresentation.get(`${movie.movieId}-${id}`);
        if (calculated && calculated.maximumPossible === 0) {
          next.push(`${movie.movieNameVn} · ${calculated.presentationName}: hiện không tạo được suất nào với ngày, phòng và giờ đã chọn.`);
        }
      });
    });
    if (step !== 3 && selectedMovies.length > 0 && roomIds.length > 0 && !visibleCapacityLoading && capacityRequest && !visibleCapacity) {
      next.push(visibleCapacityError || "Chưa tính được số suất tối đa. Vui lòng kiểm tra lại cấu hình.");
    }
    if (step !== 3 && visibleCapacityLoading) next.push("Hệ thống đang tính số suất tối đa, vui lòng chờ trong giây lát.");
    return next;
  };

  const getQuotaErrors = () => {
    const next: string[] = [];
    if (visibleCapacity && totalRequested > visibleCapacity.totalMaximum) {
      next.push(`Toàn kế hoạch đang yêu cầu ${totalRequested} suất nhưng tối đa chỉ xếp được ${visibleCapacity.totalMaximum} suất trong khoảng ngày đã chọn.`);
    }
    FORMAT_ORDER.forEach((format) => {
      const requested = requestedByFormat[format] ?? 0;
      const maximum = maximumByFormat[format];
      if (maximum !== undefined && requested > maximum) {
        next.push(`${formatName(format)} đang được chia ${requested} suất nhưng sức xếp tối đa chỉ là ${maximum} suất.`);
      }
    });
    selectedMovies.forEach((movie) => {
      const plan = plans[movie.movieId];
      if (plan.requestedShowtimes < 1 || plan.requestedShowtimes > 100) {
        next.push(`${movie.movieNameVn}: số suất phải từ 1 đến 100.`);
      }
      if (plan.presentationMode === "MANUAL") {
        const sum = plan.presentationIds.reduce((total, id) => total + (plan.presentationCounts[id] ?? 0), 0);
        if (sum !== plan.requestedShowtimes) {
          next.push(`${movie.movieNameVn}: tổng suất phiên bản là ${sum}, phải bằng ${plan.requestedShowtimes}.`);
        }
        plan.presentationIds.forEach((presentationId) => {
          const maximum = capacityByPresentation.get(`${movie.movieId}-${presentationId}`)?.maximumPossible;
          const requested = plan.presentationCounts[presentationId] ?? 0;
          if (maximum !== undefined && requested > maximum) {
            const presentation = activePresentations(movie).find((item) => item.presentationId === presentationId);
            next.push(`${movie.movieNameVn} · ${presentation ? formatPresentation(presentation) : `#${presentationId}`}: yêu cầu ${requested} nhưng tối đa riêng lẻ chỉ ${maximum} suất.`);
          }
        });
      } else {
        const maximumSum = plan.presentationIds.reduce(
          (sum, presentationId) => sum + (capacityByPresentation.get(`${movie.movieId}-${presentationId}`)?.maximumPossible ?? 0),
          0,
        );
        if (visibleCapacity && plan.requestedShowtimes > maximumSum) {
          next.push(`${movie.movieNameVn}: yêu cầu ${plan.requestedShowtimes} nhưng tổng sức xếp riêng lẻ của các phiên bản chỉ ${maximumSum} suất.`);
        }
      }
    });
    if (quotaCalculationPending) {
      next.push("Hệ thống đang xếp thử và tính số suất còn có thể tăng. Vui lòng chờ trong giây lát.");
    } else if (quotaRequestValid && !visibleQuotaPreview) {
      next.push(visibleQuotaPreviewError || "Chưa tính được sức xếp của quota hiện tại.");
    } else if (visibleQuotaPreview && !visibleQuotaPreview.complete) {
      (visibleQuotaPreview.issues ?? [])
        .filter((issue) => issue.severity === "ERROR")
        .forEach((issue) => next.push(issue.message));
    }
    return next;
  };

  const validationKey = JSON.stringify({ step, plan: currentPlanRequest });
  const selectionErrors = step === 3 ? [] : getSelectionErrors();
  const validationErrors = selectionErrors.length ? selectionErrors : step === 2 ? getQuotaErrors() : [];
  const errors = [
    ...validationErrors,
    ...(requestErrors.key === validationKey ? requestErrors.messages : []),
  ];
  const setErrors = (messages: string[]) => setRequestErrors({ key: validationKey, messages });
  const validateSelection = () => getSelectionErrors().length === 0;
  const validateQuotas = () => getQuotaErrors().length === 0;

  const buildRequest = (lockedItems: ShowtimePlannerPreviewItem[] = []): ShowtimePlannerPreviewRequest => ({
    ...currentPlanRequest,
    lockedItems: lockedItems.map((item) => ({
      clientKey: item.clientKey,
      movieId: item.movieId,
      presentationId: item.presentationId,
      cinemaRoomId: item.cinemaRoomId,
      showDate: item.showDate,
      startTime: item.startTime,
      endTime: item.endTime,
      basePrice: item.basePrice,
    })),
  });

  const requestPreview = async (keepLocked = false, maximizeSchedule = fillRemainingCapacity) => {
    if (!validateSelection() || !validateQuotas()) return;
    setPreviewLoading(true);
    setErrors([]);
    try {
      const currentItems = preview?.items ?? [];
      const explicitlyLockedKeys = new Set(
        keepLocked ? currentItems.filter((item) => item.locked).map((item) => item.clientKey) : [],
      );
      const preservedItems = keepLocked
        ? currentItems.filter((item) => item.locked || dirtyKeys.has(item.clientKey))
        : [];
      const response = await showtimeApi.previewPlanner({ ...buildRequest(preservedItems), maximizeSchedule });
      setFillRemainingCapacity(maximizeSchedule);
      setPreview({
        ...response,
        items: response.items.map((item) => ({
          ...item,
          locked: explicitlyLockedKeys.has(item.clientKey),
        })),
      });
      setDirtyKeys(new Set());
      setPreviewView("schedule");
      setStep(3);
      if (!response.complete) toast.warning(`Còn thiếu ${response.totalMissing} suất. Xem lỗi chi tiết trong bản xem trước.`);
    } catch (error) {
      setErrors([getApiErrorMessage(error, "Không thể tạo bản xem trước.")]);
    } finally {
      setPreviewLoading(false);
    }
  };

  const updatePreviewItem = (key: string, patch: Partial<ShowtimePlannerPreviewItem>) => {
    setPreview((current) => current ? {
      ...current,
      complete: false,
      items: current.items.map((item) => item.clientKey === key ? { ...item, ...patch } : item),
    } : current);
    setDirtyKeys((current) => new Set(current).add(key));
  };

  const changeItemStart = (item: ShowtimePlannerPreviewItem, startTime: string) => {
    const duration = movies.find((movie) => movie.movieId === item.movieId)?.duration ?? 0;
    updatePreviewItem(item.clientKey, { startTime, endTime: addMinutes(startTime, duration) });
  };

  const toggleItemLock = (key: string) => {
    setPreview((current) => current ? {
      ...current,
      items: current.items.map((item) => item.clientKey === key ? { ...item, locked: !item.locked } : item),
    } : current);
  };

  const isPreviewRoomCompatible = (item: ShowtimePlannerPreviewItem, room: CinemaRoom) => {
    const movie = movies.find((candidate) => candidate.movieId === item.movieId);
    const presentation = movie?.presentations?.find(
      (candidate) => candidate.presentationId === item.presentationId,
    );
    return Boolean(presentation && supports(room, presentation));
  };

  const updatePreviewTurnaround = (value: number) => {
    const normalized = Math.max(0, Math.min(120, Number.isFinite(value) ? value : 0));
    if (!preview) return;
    if (preview.items.some((item) => item.locked)) {
      toast.warning("Hãy mở khóa các suất đã khóa trước khi thay đổi thời gian nghỉ tối thiểu.");
      return;
    }
    setTurnaroundMinutes(normalized);

    const opening = timeToTotalMinutes(openingTime);
    const finish = timeToTotalMinutes(latestFinishTime);
    const crossesMidnight = finish <= opening;
    const groups = new Map<string, ShowtimePlannerPreviewItem[]>();
    preview.items.forEach((item) => {
      const operationalDate = crossesMidnight && timeToTotalMinutes(item.startTime) < finish
        ? addDays(item.showDate, -1)
        : item.showDate;
      const key = `${operationalDate}-${item.cinemaRoomId}`;
      groups.set(key, [...(groups.get(key) ?? []), item]);
    });

    const patches = new Map<string, Partial<ShowtimePlannerPreviewItem>>();
    let overflowed = false;
    groups.forEach((groupItems, key) => {
      const operationalDate = key.slice(0, 10);
      const openingEpoch = localDateTimeToEpochMinutes(operationalDate, openingTime);
      const closingDate = crossesMidnight ? addDays(operationalDate, 1) : operationalDate;
      const closingEpoch = localDateTimeToEpochMinutes(closingDate, latestFinishTime);
      const packed = groupItems
        .map((item) => ({
          item,
          originalStart: localDateTimeToEpochMinutes(item.showDate, item.startTime),
          duration: movies.find((movie) => movie.movieId === item.movieId)?.duration ?? 0,
          start: 0,
          end: 0,
        }))
        .sort((left, right) => left.originalStart - right.originalStart);
      let previousEnd: number | null = null;
      packed.forEach((entry) => {
        entry.start = previousEnd === null
          ? entry.originalStart
          : Math.max(entry.originalStart, previousEnd + normalized);
        entry.end = entry.start + entry.duration;
        previousEnd = entry.end;
      });
      const overflow = Math.max(0, (packed[packed.length - 1]?.end ?? closingEpoch) - closingEpoch);
      if (overflow > 0 && packed.length > 0) {
        const availableBeforeFirst = Math.max(0, packed[0].start - openingEpoch);
        const shiftEarlier = Math.min(overflow, availableBeforeFirst);
        packed.forEach((entry) => {
          entry.start -= shiftEarlier;
          entry.end -= shiftEarlier;
        });
        if ((packed[packed.length - 1]?.end ?? closingEpoch) > closingEpoch) overflowed = true;
      }
      packed.forEach((entry) => {
        const start = epochMinutesToLocalParts(entry.start);
        const end = epochMinutesToLocalParts(entry.end);
        patches.set(entry.item.clientKey, {
          showDate: start.showDate,
          startTime: start.time,
          endTime: end.time,
        });
      });
    });

    setPreview({
      ...preview,
      complete: false,
      items: preview.items.map((item) => ({ ...item, ...patches.get(item.clientKey) })),
    });
    setDirtyKeys(new Set(preview.items.map((item) => item.clientKey)));
    if (overflowed) {
      toast.warning("Khoảng nghỉ mới đã dùng hết thời gian trống trước giờ đóng cửa; hãy giảm thời gian nghỉ hoặc dời bớt suất.");
    }
  };

  const confirm = async () => {
    if (!preview || !preview.complete || dirtyKeys.size > 0) return;
    setConfirming(true);
    try {
      const created = await showtimeApi.confirmPlanner({ plan: buildRequest(), items: preview.items });
      toast.success(`Đã tạo ${created.length} suất chiếu.`);
      const firstDate = created.map((item) => item.showDate).sort()[0];
      onSuccess(firstDate);
    } catch (error) {
      setErrors([getApiErrorMessage(error, "Không thể xác nhận tạo lịch chiếu.")]);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-1 backdrop-blur-sm">
      <div className="flex h-[99vh] w-[99.5vw] max-w-[1920px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-2.5">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.12em] text-red-500">
              <Film size={14} /> Lập lịch chiếu
            </div>
            <h2 className="mt-1 text-xl font-extrabold text-slate-900">Thiết lập điều kiện, quota và kiểm tra lịch trước khi tạo</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={20} /></button>
        </div>

        <div className="border-b border-slate-200 bg-slate-50 px-5 py-2">
          <div className="mx-auto flex max-w-3xl items-center">
            {["Chọn phim & phòng", "Đề xuất & quota", "Xem trước & xác nhận"].map((label, index) => {
              const number = index + 1;
              const active = step === number;
              const done = step > number;
              return (
                <div key={label} className="flex flex-1 items-center last:flex-none">
                  <div className="flex items-center gap-2">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${active ? "bg-red-500 text-white" : done ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}>
                      {done ? <Check size={14} /> : number}
                    </span>
                    <span className={`whitespace-nowrap text-xs font-bold ${active ? "text-slate-900" : "text-slate-500"}`}>{label}</span>
                  </div>
                  {number < 3 && <div className={`mx-3 h-px flex-1 ${done ? "bg-emerald-300" : "bg-slate-200"}`} />}
                </div>
              );
            })}
          </div>
        </div>

        <div className={`min-h-0 flex-1 ${step === 3 ? "flex flex-col overflow-hidden p-3" : "overflow-y-auto p-6"}`}>
          {errors.length > 0 && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <div className="mb-2 flex items-center gap-2 font-extrabold"><AlertTriangle size={16} /> Chưa thể tiếp tục</div>
              <ul className="list-disc space-y-1 pl-5">{errors.map((error) => <li key={error}>{error}</li>)}</ul>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
              <section className="space-y-5">
                <Card title="1. Ngày và cấu hình vận hành" subtitle="Mỗi thay đổi sẽ tự tính lại sức xếp tối đa của từng phiên bản.">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Từ ngày"><input className={INPUT} type="date" min={today} value={fromDate} onChange={(event) => { setFromDate(event.target.value); if (toDate < event.target.value) setToDate(event.target.value); }} /></Field>
                    <Field label="Đến ngày"><input className={INPUT} type="date" min={fromDate} value={toDate} onChange={(event) => setToDate(event.target.value)} /></Field>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Field label="Giờ mở cửa"><TimeRulerPicker value={openingTime} onChange={setOpeningTime} /></Field>
                    <Field label="Giờ đóng cửa"><TimeRulerPicker value={latestFinishTime} onChange={setLatestFinishTime} /></Field>
                    <Field label="Giờ vàng bắt đầu"><TimeRulerPicker value={primeStartTime} onChange={setPrimeStartTime} /></Field>
                    <Field label="Giờ vàng kết thúc"><TimeRulerPicker value={primeEndTime} onChange={setPrimeEndTime} /></Field>
                  </div>
                  <div className="mt-3">
                    <Field label="Nghỉ/dọn phòng giữa hai suất (phút)"><input className={INPUT} type="number" min={0} max={120} step={5} value={turnaroundMinutes} onChange={(event) => setTurnaroundMinutes(Number(event.target.value))} /></Field>
                  </div>
                  <div className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-[11px] leading-5 text-blue-800">
                    Nếu giờ đóng cửa nhỏ hơn giờ mở cửa, hệ thống hiểu rạp hoạt động qua nửa đêm. Ví dụ 08:00 → 02:00 sáng hôm sau.
                    Giờ mở/đóng cửa và thời gian nghỉ tác động đến số suất tối đa; khung giờ vàng chỉ tác động điểm ưu tiên vị trí.
                  </div>
                </Card>

                <Card title="2. Phòng được phép sử dụng" subtitle={`${roomIds.length}/${rooms.length} phòng đang được chọn`}>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <SmallButton onClick={() => setRoomIds(rooms.map((room) => room.cinemaRoomId))}>Chọn tất cả</SmallButton>
                    <SmallButton onClick={() => setRoomIds([])}>Bỏ chọn</SmallButton>
                    {selectedMovies.length > 0 && roomIds.some((id) => !compatibleRoomIdsForSelection.includes(id)) && (
                      <SmallButton onClick={() => setRoomIds((current) => current.filter((id) => compatibleRoomIdsForSelection.includes(id)))}>
                        <span className="text-amber-700 font-bold">⚠️ Lọc bỏ phòng không khớp</span>
                      </SmallButton>
                    )}
                  </div>
                  {selectedMovies.length > 0 && roomIds.some((id) => !compatibleRoomIdsForSelection.includes(id)) && (
                    <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800 flex items-center justify-between gap-2">
                      <span>Có phòng được chọn nhưng không tương thích định dạng với phim nào bạn chọn (sẽ tự động loại bỏ khi sang bước tiếp theo).</span>
                    </div>
                  )}
                  <div className="grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                    {rooms.map((room) => {
                      const selected = roomIds.includes(room.cinemaRoomId);
                      const incompatible = selectedMovies.length > 0 && !compatibleRoomIdsForSelection.includes(room.cinemaRoomId);
                      return (
                        <button key={room.cinemaRoomId} type="button" onClick={() => setRoomIds((current) => selected ? current.filter((id) => id !== room.cinemaRoomId) : [...current, room.cinemaRoomId])}
                          className={`rounded-xl border p-3 text-left transition ${selected ? (incompatible ? "border-amber-300 bg-amber-50/70" : "border-red-300 bg-red-50") : "border-slate-200 bg-white hover:border-slate-300"}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-sm font-extrabold text-slate-800">{room.cinemaRoomName}</div>
                              <div className="mt-1 text-[11px] text-slate-500">
                                Hỗ trợ {roomFormats(room.type).join("/")}
                                {incompatible && <span className="block font-bold text-amber-600">⚠ Không khớp định dạng phim</span>}
                              </div>
                            </div>
                            <span className={`flex h-5 w-5 items-center justify-center rounded border ${selected ? (incompatible ? "border-amber-500 bg-amber-500 text-white" : "border-red-500 bg-red-500 text-white") : "border-slate-300"}`}>{selected && <Check size={12} />}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </Card>
              </section>

              <Card title="3. Phim và phiên bản được phép xếp" subtitle={`${selectedMovies.length} phim đã chọn`}>
                <div className="relative mb-3"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className={`${INPUT} pl-9`} placeholder="Tìm tên phim..." value={movieSearch} onChange={(event) => setMovieSearch(event.target.value)} /></div>
                {selectedMovies.length > 0 && (
                  <div className={`mb-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-[11px] leading-5 ${visibleCapacityError ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
                    {visibleCapacityLoading ? <Loader2 size={14} className="mt-0.5 shrink-0 animate-spin" /> : visibleCapacityError ? <AlertTriangle size={14} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={14} className="mt-0.5 shrink-0" />}
                    <span>{visibleCapacityLoading ? "Đang tính lại số suất tối đa theo lịch phòng hiện có..." : visibleCapacityError || (visibleCapacity ? "Đã tính xong. Đây là mức tối đa riêng của từng phiên bản; không cộng trực tiếp các mức này vì các phiên bản có thể dùng chung phòng và giờ." : "Chọn phiên bản để hệ thống tính sức xếp.")}</span>
                  </div>
                )}
                <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
                  {filteredMovies.map((movie) => {
                    const selected = !!plans[movie.movieId];
                    const presentations = activePresentations(movie);
                    return (
                      <div key={movie.movieId} className={`rounded-xl border ${selected ? "border-red-300 bg-red-50/50" : "border-slate-200"}`}>
                        <button type="button" onClick={() => toggleMovie(movie)} className="flex w-full items-center gap-3 p-3 text-left">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"}`}><Film size={17} /></div>
                          <div className="min-w-0 flex-1"><div className="truncate text-sm font-extrabold text-slate-800">{movie.movieNameVn || movie.movieNameEnglish}</div><div className="mt-1 text-[11px] text-slate-500">{movie.duration ?? "?"} phút · {presentations.length} phiên bản · {movie.fromDate || "?"} → {movie.toDate || "?"}</div></div>
                          <span className={`flex h-5 w-5 items-center justify-center rounded border ${selected ? "border-red-500 bg-red-500 text-white" : "border-slate-300"}`}>{selected && <Check size={12} />}</span>
                        </button>
                        {selected && (
                          <div className="border-t border-red-100 px-3 py-3">
                            <div className="mb-2 text-[11px] font-bold text-slate-500">Chọn phiên bản trước khi xem đề xuất</div>
                            <div className="flex flex-wrap gap-2">
                              {presentations.map((presentation) => {
                                const checked = plans[movie.movieId].presentationIds.includes(presentation.presentationId);
                                const compatible = rooms.some((room) => roomIds.includes(room.cinemaRoomId) && supports(room, presentation));
                                const calculated = capacityByPresentation.get(`${movie.movieId}-${presentation.presentationId}`);
                                return <button key={presentation.presentationId} type="button" onClick={() => togglePresentation(movie.movieId, presentation.presentationId)} className={`rounded-lg border px-2.5 py-2 text-xs font-bold ${checked ? "border-red-300 bg-white text-red-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                                  <span>{checked ? "✓ " : ""}{formatPresentation(presentation)} {!compatible && <span className="text-amber-600">· thiếu phòng</span>}</span>
                                  {checked && <span title={calculated ? Object.entries(calculated.blockerCounts ?? {}).map(([name, count]) => `${name}: ${count}`).join("\n") : undefined} className={`ml-2 rounded-full px-2 py-0.5 text-[10px] ${calculated?.maximumPossible === 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>{visibleCapacityLoading ? "đang tính..." : calculated ? `tối đa ${calculated.maximumPossible} suất · ${calculated.compatibleRoomCount} phòng` : "chờ tính"}</span>}
                                </button>;
                              })}
                              {presentations.length === 0 && <span className="text-xs font-semibold text-red-600">Phim chưa có phiên bản hoạt động.</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Tổng quan kế hoạch</h3>
                    <p className="mt-1 text-xs text-slate-500">Các con số được kiểm tra lại mỗi khi bạn thay đổi quota.</p>
                  </div>
                  <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1" role="radiogroup" aria-label="Cách sinh lịch">
                    <button type="button" role="radio" aria-checked={!fillRemainingCapacity} onClick={() => setFillRemainingCapacity(false)} className={`rounded-lg px-3 py-2 text-xs font-extrabold transition ${!fillRemainingCapacity ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>Đúng quota</button>
                    <button type="button" role="radio" aria-checked={fillRemainingCapacity} onClick={() => setFillRemainingCapacity(true)} className={`rounded-lg px-3 py-2 text-xs font-extrabold transition ${fillRemainingCapacity ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>Tận dụng phòng trống</button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-[11px] font-bold text-slate-500">Quota đang nhập</div>
                    <div className="mt-1 text-2xl font-black text-slate-900">{totalRequested} <span className="text-sm font-bold text-slate-500">suất</span></div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-[11px] font-bold text-slate-500">Phần còn có thể xếp</div>
                    <div className="mt-1 text-2xl font-black text-emerald-700">{quotaCalculationPending && !activeQuotaCapacityBudget ? "—" : remainingTotalCapacity} <span className="text-sm font-bold text-slate-500">suất</span></div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-[11px] font-bold text-slate-500">Số hệ thống sẽ tạo</div>
                    <div className="mt-1 text-2xl font-black text-slate-900">{fillRemainingCapacity ? activeQuotaCapacityBudget?.totalMaximum ?? (visibleQuotaPreview?.complete ? totalRequested + remainingTotalCapacity : visibleQuotaPreview?.totalScheduled ?? "—") : totalRequested} <span className="text-sm font-bold text-slate-500">suất</span></div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-extrabold text-slate-800">Cách hệ thống xử lý quota</div>
                  <div className="mt-1 text-[11px] leading-5 text-slate-600">
                    {fillRemainingCapacity
                      ? `Quota là mức tối thiểu. Hệ thống có thể thêm tối đa ${remainingTotalCapacity} suất nếu còn phòng và giờ hợp lệ.`
                      : `Hệ thống tạo đúng ${totalRequested} suất. Khoảng trống còn lại được giữ để admin chủ động sử dụng.`}
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {FORMAT_ORDER.filter((format) => maximumByFormat[format] !== undefined || (requestedByFormat[format] ?? 0) > 0).map((format) => {
                    const requested = requestedByFormat[format] ?? 0;
                    const scheduled = scheduledByFormat[format] ?? 0;
                    const maximum = maximumByFormat[format] ?? 0;
                    const additional = remainingCapacityByFormat[format] ?? 0;
                    const missing = !quotaCalculationPending && scheduled < requested;
                    return (
                      <div key={format} className={`rounded-xl border px-3 py-2.5 ${missing ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-extrabold">{formatName(format)}</span>
                          <span className={`text-sm font-black ${missing ? "text-red-700" : "text-slate-900"}`}>
                            {quotaCalculationPending && !activeQuotaCapacityBudget ? "Đang tính" : missing ? `Thiếu ${requested - scheduled} suất` : `Còn tạo ${additional} suất`}
                          </span>
                        </div>
                        <div className="mt-1 text-[10px] font-semibold text-slate-500">
                          Đã nhập {requested} suất · sức chứa ước tính {maximum} suất
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                  {quotaCalculationPending ? <Loader2 size={13} className="animate-spin" /> : visibleQuotaPreview?.complete ? <CheckCircle2 size={13} className="text-emerald-400" /> : <AlertTriangle size={13} className="text-amber-300" />}
                  <span>{quotaCalculationPending ? activeQuotaCapacityBudget ? "Đã cập nhật ngay; hệ thống đang kiểm tra lại sức xếp ở nền..." : "Đang xếp thử để kiểm tra số suất đã nhập..." : visibleQuotaPreview?.complete ? fillRemainingCapacity ? `Đã xếp đủ ${totalRequested} suất; hệ thống được phép tự thêm tối đa ${remainingTotalCapacity} suất.` : `Đã kiểm tra đủ ${totalRequested} suất; bản xem trước sẽ không tự thêm suất.` : `Kế hoạch đang thiếu ${visibleQuotaPreview?.totalMissing ?? 0} suất; hãy điều chỉnh trước khi tiếp tục.`}</span>
                </div>
              </section>

              <section className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700"><Sparkles size={18} /></span>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">Số suất đề xuất</h3>
                      <p className="mt-1 max-w-3xl text-[11px] leading-5 text-slate-600">
                        Dựa trên vé đã bán trong 56 ngày gần nhất, tỷ lệ lấp đầy mục tiêu 60%, tín hiệu phim và sức xếp hiện tại. Đây là số tham khảo; admin vẫn quyết định quota cuối cùng.
                      </p>
                    </div>
                  </div>
                  <button type="button" disabled={!visibleRecommendation || recommendationLoading} onClick={() => applyRecommendations()} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                    {recommendationLoading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Áp dụng tất cả
                  </button>
                </div>

                {recommendationLoading && <div className="mt-4 flex items-center gap-2 rounded-xl border border-indigo-100 bg-white px-3 py-3 text-xs font-semibold text-slate-600"><Loader2 size={14} className="animate-spin text-indigo-600" /> Đang phân tích dữ liệu bán vé và sức xếp...</div>}
                {recommendationError && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{recommendationError}</div>}
                {visibleRecommendation && (
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {visibleRecommendation.items.map((item) => {
                      const confidenceLabel = item.confidence === "HIGH" ? "Tin cậy cao" : item.confidence === "MEDIUM" ? "Tin cậy vừa" : "Ít dữ liệu";
                      const confidenceClass = item.confidence === "HIGH" ? "bg-emerald-100 text-emerald-700" : item.confidence === "MEDIUM" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600";
                      return (
                        <div key={item.movieId} className="rounded-xl border border-indigo-100 bg-white p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-extrabold text-slate-900">{item.movieName}</div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-[10.5px] text-slate-500">
                                <span className={`rounded-full px-2 py-0.5 font-bold ${confidenceClass}`}>{confidenceLabel} · {item.confidenceScore}%</span>
                                {item.historicalShowtimeCount > 0
                                  ? <span>{item.historicalTicketsSold} vé / {item.historicalShowtimeCount} suất · lấp đầy {item.averageOccupancyRate}%</span>
                                  : <span>Chưa có lịch sử bán vé</span>}
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="text-2xl font-black text-indigo-700">{item.suggestedShowtimes}</div>
                              <div className="text-[10px] font-bold text-slate-500">suất đề xuất</div>
                            </div>
                          </div>
                          <div className="mt-3 border-t border-slate-100 pt-2 text-[10.5px] leading-5 text-slate-600">{item.reasons[0]}</div>
                          <div className="mt-2 flex items-center justify-between gap-3">
                            <span className="text-[10px] font-semibold text-slate-400">Sức xếp riêng lẻ tối đa: {item.maximumPossible} suất</span>
                            <button type="button" disabled={item.suggestedShowtimes < 1} onClick={() => applyRecommendations(item.movieId)} className="rounded-lg border border-indigo-200 px-2.5 py-1.5 text-[11px] font-extrabold text-indigo-700 hover:bg-indigo-50 disabled:opacity-40">Áp dụng</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {(visibleQuotaPreviewError || (visibleQuotaPreview && !visibleQuotaPreview.complete)) && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                  <div className="flex items-center gap-2 font-extrabold"><AlertTriangle size={14} /> Chưa xếp được {visibleQuotaPreview?.totalMissing ?? 0} suất</div>
                  {visibleQuotaPreviewError && <div className="mt-2 font-semibold">{visibleQuotaPreviewError}</div>}
                  {visibleQuotaPreview && !visibleQuotaPreview.complete && (
                    <div className="mt-2 grid gap-2 lg:grid-cols-2">
                      {(visibleQuotaPreview.issues ?? []).filter((issue) => issue.severity === "ERROR").map((issue, index) => {
                        const allocation = (visibleQuotaPreview.allocations ?? []).find((item) => item.movieId === issue.movieId && item.presentationId === issue.presentationId);
                        const capacityItem = issue.movieId && issue.presentationId
                          ? capacityByPresentation.get(`${issue.movieId}-${issue.presentationId}`)
                          : undefined;
                        const noCompatibleRoom = capacityItem?.compatibleRoomCount === 0;
                        const reason = noCompatibleRoom
                          ? "Không có phòng đã chọn hỗ trợ phiên bản này."
                          : (issue.blockerCounts?.["Phòng đã có lịch hoặc chưa dọn xong"] ?? 0) > 0 && (capacityItem?.maximumPossible ?? 0) === 0
                            ? "Lịch hiện có của rạp đã chiếm hết các mốc giờ phù hợp."
                            : "Không còn khoảng trống đủ dài trong các phòng phù hợp sau khi xếp những suất khác.";
                        return (
                          <div key={`${issue.code}-${index}`} className="rounded-lg border border-red-100 bg-white p-3">
                            <div className="font-extrabold text-slate-800">{allocation?.movieName ?? "Kế hoạch"}</div>
                            {allocation && <div className="mt-0.5 text-[11px] font-semibold text-slate-500">{allocation.presentationName}</div>}
                            <div className="mt-2 font-black text-red-700">Xếp được {issue.scheduled ?? 0}/{issue.requested ?? 0} · thiếu {issue.missing ?? 0} suất</div>
                            <div className="mt-1 leading-5 text-red-700">{reason}</div>
                            <div className="mt-1 leading-5 text-slate-600">Gợi ý: {noCompatibleRoom ? "chọn thêm phòng đúng định dạng." : `giảm ${issue.missing ?? 1} suất của phiên bản này, chọn thêm phòng hoặc nới giờ hoạt động.`}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {selectedMovies.map((movie) => {
                const plan = plans[movie.movieId];
                const presentations = activePresentations(movie).filter((item) => plan.presentationIds.includes(item.presentationId));
                const manualTotal = plan.presentationIds.reduce((sum, id) => sum + (plan.presentationCounts[id] ?? 0), 0);
                const movieRecommendation = visibleRecommendation?.items.find((item) => item.movieId === movie.movieId);
                const recommendationDifference = movieRecommendation ? manualTotal - movieRecommendation.suggestedShowtimes : 0;
                return (
                  <Card key={movie.movieId} title={movie.movieNameVn || movie.movieNameEnglish || `Phim #${movie.movieId}`} subtitle={`${movie.duration} phút · thay đổi số suất ở từng phiên bản bên dưới`}>
                    <div className="mb-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                      <div>
                        <div className="text-xs font-bold text-slate-600">Quota hiện tại: <span className="font-black text-slate-900">{manualTotal} suất</span></div>
                        {movieRecommendation && <div className={`mt-1 text-[10.5px] font-semibold ${recommendationDifference === 0 ? "text-emerald-700" : "text-slate-500"}`}>{recommendationDifference === 0 ? "Đang bằng mức đề xuất" : `${Math.abs(recommendationDifference)} suất ${recommendationDifference > 0 ? "cao hơn" : "thấp hơn"} mức đề xuất ${movieRecommendation.suggestedShowtimes}`}</div>}
                      </div>
                      {movieRecommendation && movieRecommendation.suggestedShowtimes > 0 && recommendationDifference !== 0 && <button type="button" onClick={() => applyRecommendations(movie.movieId)} className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-[11px] font-extrabold text-indigo-700 hover:bg-indigo-50">Đặt về {movieRecommendation.suggestedShowtimes}</button>}
                    </div>
                    <div className="space-y-2">
                      {presentations.map((presentation) => {
                        const currentCount = plan.presentationCounts[presentation.presentationId] ?? 0;
                        const presentationFormat = normalizeFormat(presentation.format);
                        const sharedAdditionalCapacity = Math.min(
                          remainingTotalCapacity,
                          remainingCapacityByFormat[presentationFormat] ?? 0,
                        );
                        const individualMaximum = capacityByPresentation
                          .get(`${movie.movieId}-${presentation.presentationId}`)?.maximumPossible;
                        const individualRemaining = individualMaximum === undefined
                          ? sharedAdditionalCapacity
                          : Math.max(0, individualMaximum - currentCount);
                        const currentAllocation = visibleQuotaPreview
                          ? quotaByPresentation.get(`${movie.movieId}-${presentation.presentationId}`)
                          : undefined;
                        const permittedAdditional = visibleQuotaPreview && !visibleQuotaPreview.complete
                          ? 0
                          : Math.min(
                            sharedAdditionalCapacity,
                            individualRemaining,
                          );
                        const calculatedMaximum = currentCount + permittedAdditional;
                        const otherManualTotal = manualTotal - currentCount;
                        const maxReachedHint = currentAllocation?.missing
                          ? `Phiên bản này mới xếp được ${currentAllocation.scheduled}/${currentAllocation.requested} suất. Hãy xử lý phần thiếu trước khi tăng thêm.`
                          : remainingTotalCapacity === 0
                            ? "Đã dùng hết quỹ suất của kế hoạch. Hãy giảm một suất khác nếu muốn bù sang phim này."
                            : (remainingCapacityByFormat[presentationFormat] ?? 0) === 0
                              ? `Đã dùng hết quỹ suất ${formatName(presentationFormat)}. Hãy giảm một suất cùng định dạng để bù sang phiên bản này.`
                              : currentAllocation?.additionalPossible === 0
                                ? "Phương án tối đa hiện tại không còn vị trí bảo đảm cho phiên bản này."
                              : undefined;
                        return (
                          <div key={presentation.presentationId} className="grid items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-extrabold text-slate-800">{formatPresentation(presentation)}</div>
                              <div className={`mt-1 text-[10.5px] font-semibold ${currentAllocation?.missing ? "text-red-600" : currentCount >= calculatedMaximum && maxReachedHint ? "text-amber-600 font-bold" : "text-slate-500"}`}>
                                {quotaCalculationPending && !activeQuotaCapacityBudget
                                  ? "Đang xếp thử để tính quỹ an toàn..."
                                  : currentAllocation?.missing
                                    ? `Xếp được ${currentAllocation.scheduled}/${currentAllocation.requested} · thiếu ${currentAllocation.missing} suất`
                                    : currentCount >= calculatedMaximum && maxReachedHint
                                      ? `⚠️ ${maxReachedHint}`
                                      : `Còn tăng được ${permittedAdditional} suất từ quỹ ${formatName(presentationFormat)}`}
                              </div>
                            </div>
                            <div>
                              <div className="mb-1 text-center text-[10px] font-bold text-slate-500">Số suất</div>
                              <Stepper compact value={currentCount} min={otherManualTotal === 0 ? 1 : 0} max={Math.max(currentCount, calculatedMaximum)} incrementDisabled={quotaCalculationPending && !activeQuotaCapacityBudget} maxReachedHint={maxReachedHint} onChange={(value) => updatePresentationQuota(movie.movieId, presentation.presentationId, value)} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {step === 3 && preview && (
            <div className="flex min-h-0 flex-1 flex-col gap-2.5">
              <div className={`shrink-0 rounded-xl border px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-sm ${preview.complete && dirtyKeys.size === 0 ? "border-emerald-200 bg-emerald-50/70" : "border-amber-200 bg-amber-50"}`}>
                <div className="flex items-center gap-2.5">
                  {preview.complete && dirtyKeys.size === 0 ? <CheckCircle2 size={20} className="text-emerald-600 shrink-0" /> : <AlertTriangle size={20} className="text-amber-600 shrink-0" />}
                  <div className="text-xs sm:text-sm font-extrabold text-slate-900">
                    Yêu cầu <span className="text-red-600">{preview.totalRequested}</span> · Đã xếp <span className="text-emerald-700">{preview.totalScheduled}</span> · Thiếu <span className={preview.totalMissing > 0 ? "text-red-600" : "text-emerald-700"}>{preview.totalMissing}</span>
                    <span className="ml-2 font-medium text-slate-500 text-xs hidden md:inline">({dirtyKeys.size > 0 ? `${dirtyKeys.size} suất vừa chỉnh cần kiểm tra` : preview.complete ? (fillRemainingCapacity ? "Đã tối đa hóa thời gian trống" : "Đúng số lượng nhập") : "Kiểm tra lỗi chi tiết"})</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <span>Nghỉ tối thiểu:</span>
                    <div className="inline-flex items-center h-7 overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
                      <button type="button" onClick={() => updatePreviewTurnaround(turnaroundMinutes - 1)} className="px-2 h-full text-slate-500 hover:bg-slate-100 hover:text-red-600" title="Giảm 1 phút"><Minus size={12} /></button>
                      <input className="w-10 border-x border-slate-200 bg-slate-50 py-0.5 text-center font-black text-slate-800 outline-none text-xs" type="number" min={0} max={120} step={1} value={turnaroundMinutes} onChange={(event) => updatePreviewTurnaround(Number(event.target.value))} aria-label="Số phút nghỉ tối thiểu" />
                      <button type="button" onClick={() => updatePreviewTurnaround(turnaroundMinutes + 1)} className="px-2 h-full text-slate-500 hover:bg-slate-100 hover:text-red-600" title="Tăng 1 phút"><Plus size={12} /></button>
                    </div>
                    <span>phút</span>
                  </div>

                  <button type="button" disabled={previewLoading} onClick={() => requestPreview(true)} className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-700 hover:bg-slate-50 disabled:opacity-60 shadow-sm">{previewLoading ? <Loader2 size={13} className="animate-spin text-red-600" /> : <RefreshCw size={13} className="text-red-600" />} Xếp lại</button>

                  <div className="inline-flex rounded-lg bg-slate-200/70 p-0.5 border border-slate-300/60">
                    <button type="button" onClick={() => setPreviewView("schedule")} className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-extrabold transition ${previewView === "schedule" ? "bg-white text-red-600 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}><LayoutGrid size={13} /> Lịch phòng</button>
                    <button type="button" onClick={() => setPreviewView("table")} className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-extrabold transition ${previewView === "table" ? "bg-white text-red-600 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}><List size={13} /> Danh sách</button>
                  </div>
                </div>
              </div>

              {(preview.issues ?? []).length > 0 && <div className="shrink-0 rounded-xl border border-red-200 bg-red-50 p-3"><div className="mb-2 font-extrabold text-red-800">Lỗi cần xử lý</div><div className="space-y-2">{(preview.issues ?? []).map((issue, index) => <div key={`${issue.code}-${index}`} className="rounded-lg bg-white/80 p-3 text-xs leading-5 text-red-800"><strong>{issue.message}</strong>{issue.blockerCounts && Object.keys(issue.blockerCounts).length > 0 && <div className="mt-1 text-red-700">{Object.entries(issue.blockerCounts).map(([name, count]) => `${name}: ${count}`).join(" · ")}</div>}</div>)}</div></div>}

              <div className="min-h-0 flex-1 flex flex-col rounded-2xl overflow-hidden">
                {previewView === "schedule" && (
                  <PlannerScheduleBoard
                    items={preview.items}
                    rooms={rooms.filter((room) => roomIds.includes(room.cinemaRoomId))}
                    fromDate={fromDate}
                    toDate={toDate}
                    openingTime={openingTime}
                    latestFinishTime={latestFinishTime}
                    turnaroundMinutes={turnaroundMinutes}
                    dirtyKeys={dirtyKeys}
                    isRoomCompatible={isPreviewRoomCompatible}
                    onMove={(item, patch) => updatePreviewItem(item.clientKey, patch)}
                    onInvalidRoom={(item, room) => toast.warning(`${room.cinemaRoomName} không hỗ trợ ${item.presentationName}.`)}
                    onLockedMove={(item) => toast.warning(`${item.movieName} đang bị khóa. Hãy mở khóa suất trước khi thay đổi vị trí hoặc thời gian.`)}
                    onToggleLock={toggleItemLock}
                  />
                )}

                {previewView === "table" && (
                  <Card title="Danh sách suất chiếu" subtitle="Có thể sửa chính xác ngày, phòng và giờ. Suất đã khóa phải được mở khóa trước khi chỉnh.">
                    <table className="w-full min-w-[800px] border-separate border-spacing-y-2 text-left">
                      <thead><tr className="text-[10.5px] uppercase tracking-wide text-slate-400"><th className="px-3">Phim / phiên bản</th><th className="px-3">Ngày</th><th className="px-3">Phòng</th><th className="px-3">Bắt đầu</th><th className="px-3">Kết thúc</th><th className="px-3 text-center">Khóa</th></tr></thead>
                      <tbody>{preview.items.map((item) => {
                        const movie = movies.find((candidate) => candidate.movieId === item.movieId);
                        const presentation = activePresentations(movie!).find((candidate) => candidate.presentationId === item.presentationId);
                        const compatibleRooms = rooms.filter((room) => roomIds.includes(room.cinemaRoomId) && (!presentation || supports(room, presentation)));
                        const dirty = dirtyKeys.has(item.clientKey);
                        return <tr key={item.clientKey} className={`${item.locked ? "bg-blue-50" : dirty ? "bg-amber-50" : "bg-slate-50"}`}>
                          <td className="rounded-l-xl px-3 py-3"><div className="max-w-[260px] truncate text-xs font-extrabold text-slate-800">{item.movieName}</div><div className="mt-1 max-w-[260px] truncate text-[10.5px] text-slate-500">{item.presentationName}</div></td>
                          <td className="px-3"><input disabled={item.locked} className={`${INPUT} min-w-36 bg-white py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50`} type="date" min={fromDate} max={addDays(toDate, 1)} value={item.showDate} onChange={(event) => updatePreviewItem(item.clientKey, { showDate: event.target.value })} /></td>
                          <td className="px-3"><select disabled={item.locked} className={`${INPUT} min-w-40 bg-white py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50`} value={item.cinemaRoomId} onChange={(event) => { const room = compatibleRooms.find((candidate) => candidate.cinemaRoomId === Number(event.target.value)); updatePreviewItem(item.clientKey, { cinemaRoomId: Number(event.target.value), cinemaRoomName: room?.cinemaRoomName ?? "" }); }}>{compatibleRooms.map((room) => <option key={room.cinemaRoomId} value={room.cinemaRoomId}>{room.cinemaRoomName}</option>)}</select></td>
                          <td className="px-3"><TimeRulerPicker disabled={item.locked} value={item.startTime.slice(0, 5)} onChange={(val) => changeItemStart(item, val)} /></td>
                          <td className="px-3 text-xs font-bold text-slate-600">{item.endTime.slice(0, 5)}</td>
                          <td className="rounded-r-xl px-3 text-center"><button type="button" onClick={() => toggleItemLock(item.clientKey)} className={`rounded-lg border p-2 ${item.locked ? "border-blue-300 bg-blue-100 text-blue-700" : "border-slate-200 bg-white text-slate-400"}`} title={item.locked ? "Bỏ khóa để hệ thống được phép di chuyển" : "Khóa vị trí này khi xếp lại"}>{item.locked ? <Lock size={14} /> : <Unlock size={14} />}</button></td>
                        </tr>;
                      })}</tbody>
                    </table>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
          <div className="text-xs text-slate-500">Bản xem trước chưa ghi dữ liệu cho đến khi bạn xác nhận.</div>
          <div className="flex gap-2">
            {step > 1 && <button type="button" onClick={() => { setErrors([]); setStep(step - 1); }} className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"><ArrowLeft size={15} /> Quay lại</button>}
            {step === 1 && <button type="button" disabled={validationErrors.length > 0} onClick={() => { if (validateSelection()) { setRoomIds((current) => current.filter((id) => compatibleRoomIdsForSelection.includes(id))); setStep(2); } }} className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed">Nhập số suất <ArrowRight size={15} /></button>}
            {step === 2 && <button type="button" disabled={validationErrors.length > 0 || previewLoading || quotaCalculationPending} onClick={() => requestPreview(false)} className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed">{previewLoading || quotaCalculationPending ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} {quotaCalculationPending ? "Đang tính sức xếp" : fillRemainingCapacity ? "Sinh lịch tối đa" : `Xem trước ${totalRequested} suất`}</button>}
            {step === 3 && <button type="button" disabled={!preview?.complete || dirtyKeys.size > 0 || confirming} onClick={confirm} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300">{confirming ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Xác nhận tạo {preview?.totalScheduled ?? 0} suất</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-4"><h3 className="text-sm font-extrabold text-slate-900">{title}</h3>{subtitle && <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>}</div>{children}</section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-[11px] font-bold text-slate-500">{label}</span>{children}</label>;
}

function SmallButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50">{children}</button>;
}

function Stepper({ value, min, max, onChange, compact = false, maxReachedHint, incrementDisabled = false }: { value: number; min: number; max: number; onChange: (value: number) => void; compact?: boolean; maxReachedHint?: string; incrementDisabled?: boolean }) {
  const plusDisabled = incrementDisabled || value >= max;
  const plusHint = incrementDisabled ? "Đang tính lại số suất còn có thể tạo." : value >= max ? maxReachedHint : undefined;
  return <div className={`inline-flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white ${compact ? "h-8" : "h-11"}`}><button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="flex h-full w-9 items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30"><Minus size={13} /></button><input type="number" min={min} max={max} value={value} onChange={(event) => onChange(Math.max(min, Math.min(max, Number(event.target.value) || min)))} className={`${compact ? "w-10 text-xs" : "w-16 text-sm"} h-full border-x border-slate-200 text-center font-black text-slate-800 outline-none`} /><button type="button" title={plusHint} onClick={() => onChange(Math.min(max, value + 1))} disabled={plusDisabled} className="flex h-full w-9 items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30"><Plus size={13} /></button></div>;
}
