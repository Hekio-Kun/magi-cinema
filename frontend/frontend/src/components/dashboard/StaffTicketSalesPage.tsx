import { useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck, Banknote, Check, ChevronLeft, CircleAlert, Clock3, CreditCard,
  ExternalLink, Film, Loader2, Minus, Phone, Plus, Popcorn, Printer, QrCode,
  RefreshCw, Search, Ticket, Users, XCircle, Gift,
} from "lucide-react";
import { toast } from "react-toastify";
import { movieService, type MovieResponse } from "@/api/movieApi";
import { showtimeApi, type ShowtimeResponse } from "@/api/showtimeApi";
import { showtimeSeatService } from "@/api/showtimeSeatApi";
import { bookingApi, type BookingResponse } from "@/api/bookingApi";
import { userService, type UserDetailResponse } from "@/api/userApi";
import { paymentApi } from "@/api/paymentApi";
import { getPaymentLinks } from "@/utils/paymentLinks";
import { isMembershipFreeTicketApplicable, membershipApi, membershipFreeTicketLabel, type Membership, type MembershipBenefit } from "@/api/membershipApi";
import {
  comboApi,
  type ComboResponse,
  type FoodItemResponse,
  type FoodVariantResponse,
} from "@/api/comboApi";
import type { ShowtimeSeat } from "@/types/seat";
import { ticketPricingApi, type TicketPriceConfig } from "@/api/ticketPricingApi";

type Fare = "ADULT" | "U22";
type TicketOption = "STANDARD" | "U22" | "FREE_TICKET";
type PaymentMethod = "CASH" | "MOMO" | "ZALOPAY" | "BANK_TRANSFER";
type Step = 1 | 2 | 3 | 4;
type SelectedCombo = { comboId: number; quantity: number };
type SelectedFoodItem = { foodVariantId: number; quantity: number };
type FoodOption = {
  foodVariantId: number;
  foodItemName: string;
  displayName: string;
  price: number;
  stockQuantity: number;
  imageUrl: string;
};

type StaffSaleDraft = {
  version: 1;
  staffUsername: string;
  selectionToken: string;
  movieId: number;
  movieName: string;
  showtimeId: number;
  showDate: string;
  startTime: string;
  roomName: string;
  formatName: string;
  selectedSeatIds: number[];
  seatCodes: string[];
  fares: Record<number, Fare>;
  updatedAt: string;
};
type SeatStatusRealtimeMessage = {
  type?: string;
  showtimeId?: number;
  seats?: {
    showtimeSeatId?: number;
    status?: ShowtimeSeat["status"];
    selectionHoldToken?: string | null;
  }[];
};

const STAFF_SALE_DRAFT_KEY = "staff_ticket_sale_draft_v1";

function getStaffUsername() {
  return sessionStorage.getItem("username") || localStorage.getItem("username") || "";
}

function readStaffSaleDraft(): StaffSaleDraft | null {
  try {
    const raw = sessionStorage.getItem(STAFF_SALE_DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as StaffSaleDraft;
    if (
      draft.version !== 1
      || !draft.selectionToken
      || !draft.showtimeId
      || !draft.selectedSeatIds?.length
      || draft.staffUsername !== getStaffUsername()
    ) {
      sessionStorage.removeItem(STAFF_SALE_DRAFT_KEY);
      return null;
    }
    return draft;
  } catch {
    sessionStorage.removeItem(STAFF_SALE_DRAFT_KEY);
    return null;
  }
}

function writeStaffSaleDraft(draft: StaffSaleDraft) {
  sessionStorage.setItem(STAFF_SALE_DRAFT_KEY, JSON.stringify(draft));
}

function clearStaffSaleDraft() {
  sessionStorage.removeItem(STAFF_SALE_DRAFT_KEY);
}

const money = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);

const memberDate = (value?: string) => {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("vi-VN");
};

const formatLabel = (showtime: ShowtimeResponse) =>
  showtime.presentationName ||
  [
    showtime.projectionType?.replace("TWO_D", "2D").replace("THREE_D", "3D"),
    showtime.presentationFormat,
  ].filter(Boolean).join(" • ") ||
  "Tiêu chuẩn";

const seatCode = (seat: ShowtimeSeat) =>
  seat.seatCode || `${seat.seatRow || ""}${seat.seatNumber || ""}` || `#${seat.showtimeSeatId}`;

function getCouplePartnerSeat(seat: ShowtimeSeat, seats: ShowtimeSeat[]) {
  if (seat.seatType !== "COUPLE" || !seat.seatRow) return null;
  const coupleSeats = seats
    .filter((item) => item.seatType === "COUPLE" && item.seatRow === seat.seatRow)
    .sort((left, right) =>
      (left.seatNumber || 0) - (right.seatNumber || 0)
      || left.showtimeSeatId - right.showtimeSeatId
    );
  const index = coupleSeats.findIndex((item) => item.showtimeSeatId === seat.showtimeSeatId);
  if (index < 0) return null;
  return coupleSeats[index % 2 === 0 ? index + 1 : index - 1] || null;
}

const normalPrice = (seat: ShowtimeSeat, config?: TicketPriceConfig | null) =>
  seat.finalPrice ?? (seat.basePrice ?? config?.standard2dPrice ?? 75_000) + (seat.seatSurcharge ?? 0);

const farePrice = (seat: ShowtimeSeat, fare: Fare, config?: TicketPriceConfig | null) =>
  fare === "U22" ? Math.min(normalPrice(seat, config), (config?.u22BasePrice ?? 55_000) + (seat.seatSurcharge ?? 0)) : normalPrice(seat, config);

const foodVariantLabel = (food: FoodItemResponse, variant: FoodVariantResponse) =>
  variant.displayName?.trim()
  || [food.name, variant.variantName, variant.sizeLabel, variant.flavor].filter(Boolean).join(" · ");

const startsAt = (showtime: ShowtimeResponse) => new Date(`${showtime.showDate}T${showtime.startTime}`);
const localToday = () => new Date().toLocaleDateString("en-CA");
const MAX_ADVANCE_DAYS = 3;
const localDateAfter = (days: number) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString("en-CA");
};
const lastBookableDate = () => localDateAfter(MAX_ADVANCE_DAYS);
const bookableDates = () =>
  Array.from({ length: MAX_ADVANCE_DAYS + 1 }, (_, index) => localDateAfter(index));
const buildSeatWebSocketUrl = (showtimeId: number) => {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080";
  const url = new URL(apiUrl, window.location.origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws/seat-updates";
  url.search = "";
  url.searchParams.set("showtimeId", String(showtimeId));
  return url.toString();
};

function getSeatGapError(selectedIds: number[], seats: ShowtimeSeat[]) {
  const selected = new Set(selectedIds);
  const selectedRows = new Set(
    seats.filter((seat) => selected.has(seat.showtimeSeatId)).map((seat) => seat.seatRow || "?"),
  );
  const grouped = seats.reduce<Map<string, ShowtimeSeat[]>>((result, seat) => {
    const row = seat.seatRow || "?";
    result.set(row, [...(result.get(row) || []), seat]);
    return result;
  }, new Map());

  for (const [row, rowSeats] of grouped) {
    if (!selectedRows.has(row)) continue;
    const sorted = [...rowSeats].sort(
      (left, right) => (left.seatNumber || 0) - (right.seatNumber || 0)
        || left.showtimeSeatId - right.showtimeSeatId,
    );
    for (let index = 0; index < sorted.length; index += 1) {
      const current = sorted[index];
      if (current.status !== "AVAILABLE" || selected.has(current.showtimeSeatId)) continue;
      const left = index > 0 ? sorted[index - 1] : null;
      const right = index < sorted.length - 1 ? sorted[index + 1] : null;
      const hasSelectedNeighbor =
        (left && selected.has(left.showtimeSeatId)) ||
        (right && selected.has(right.showtimeSeatId));
      if (!hasSelectedNeighbor) continue;
      const isBlocked = (seat: ShowtimeSeat | null) =>
        !seat || selected.has(seat.showtimeSeatId) || seat.status === "BOOKED" || seat.status === "HOLDING";
      if (isBlocked(left) && isBlocked(right)) {
        return `Không được để trống lẻ ghế ${seatCode(current)}. Vui lòng chọn thêm ghế đó hoặc chọn nhóm ghế khác.`;
      }
    }
  }
  return "";
}

function getApiMessage(error: unknown, fallback: string) {
  const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return message || fallback;
}

export function StaffTicketSalesPage() {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(true);
  const [pricingConfig, setPricingConfig] = useState<TicketPriceConfig | null>(null);
  const [movies, setMovies] = useState<MovieResponse[]>([]);
  const [movie, setMovie] = useState<MovieResponse | null>(null);
  const [showtimes, setShowtimes] = useState<ShowtimeResponse[]>([]);
  const [salesDate, setSalesDate] = useState(localToday);
  const [availability, setAvailability] = useState<Record<number, number>>({});
  const [selectedFormat, setSelectedFormat] = useState("");
  const [showtime, setShowtime] = useState<ShowtimeResponse | null>(null);
  const [seats, setSeats] = useState<ShowtimeSeat[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [fares, setFares] = useState<Record<number, Fare>>({});
  const [combos, setCombos] = useState<ComboResponse[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItemResponse[]>([]);
  const [selectedCombos, setSelectedCombos] = useState<SelectedCombo[]>([]);
  const [selectedFoodItems, setSelectedFoodItems] = useState<SelectedFoodItem[]>([]);
  const [loadingConcessions, setLoadingConcessions] = useState(true);
  const [query, setQuery] = useState("");
  const [isMember, setIsMember] = useState(false);
  const [customerConfirmed, setCustomerConfirmed] = useState(false);
  const [phone, setPhone] = useState("");
  const [member, setMember] = useState<UserDetailResponse | null>(null);
  const [memberMembership, setMemberMembership] = useState<Membership | null>(null);
  const [memberBenefits, setMemberBenefits] = useState<MembershipBenefit[]>([]);
  const [selectedBenefitIds, setSelectedBenefitIds] = useState<number[]>([]);
  const [memberMessage, setMemberMessage] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [submitting, setSubmitting] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [completedBooking, setCompletedBooking] = useState<BookingResponse | null>(null);
  const [qrCheckout, setQrCheckout] = useState<{
    booking: BookingResponse;
    payUrl: string;
    qrUrl: string;
    method: "MOMO" | "ZALOPAY";
  } | null>(null);
  const storedDraft = useRef(readStaffSaleDraft());
  const [recoverableDraft, setRecoverableDraft] = useState<StaffSaleDraft | null>(null);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [recoveringDraft, setRecoveringDraft] = useState(false);
  const selectionToken = useRef(storedDraft.current?.selectionToken || crypto.randomUUID());

  useEffect(() => {
    const loadBookableMovies = async () => {
      try {
        const [movieResponse, ...dailyShowtimes] = await Promise.all([
          movieService.getMovies({ status: "NOW_SHOWING", size: 100 }),
          ...bookableDates().map((date) =>
            showtimeApi.getAdminShowtimes({ date, status: "SCHEDULED" })
          ),
        ]);
        const now = Date.now();
        const movieIdsWithShowtimes = new Set(
          dailyShowtimes
            .flat()
            .filter((item) =>
              item.status === "SCHEDULED"
              && item.showDate >= localToday()
              && item.showDate <= lastBookableDate()
              && startsAt(item).getTime() > now
            )
            .map((item) => item.movieId),
        );
        setMovies((movieResponse.content || []).filter((item) => movieIdsWithShowtimes.has(item.movieId)));
      } catch {
        toast.error("Không thể tải danh sách phim có suất chiếu khả dụng.");
      } finally {
        setLoading(false);
      }
    };
    void loadBookableMovies();
  }, []);

  useEffect(() => {
    void loadConcessions();
    void ticketPricingApi.getConfig().then(setPricingConfig).catch(() => null);
  }, []);

  useEffect(() => {
    const draft = storedDraft.current;
    if (!draft) return;
    let stopped = false;
    showtimeSeatService.getCurrentSelection(draft.showtimeId, draft.selectionToken)
      .then((hold) => {
        if (stopped) return;
        const activeIds = hold.showtimeSeatIds || [];
        if (!activeIds.length) {
          clearStaffSaleDraft();
          storedDraft.current = null;
          selectionToken.current = crypto.randomUUID();
          return;
        }
        const activeIdSet = new Set(activeIds);
        const nextDraft: StaffSaleDraft = {
          ...draft,
          selectedSeatIds: activeIds,
          seatCodes: draft.selectedSeatIds
            .map((id, index) => activeIdSet.has(id) ? draft.seatCodes[index] : null)
            .filter((code): code is string => !!code),
          fares: Object.fromEntries(activeIds.map((id) => [id, draft.fares[id] || "ADULT"])),
        };
        writeStaffSaleDraft(nextDraft);
        storedDraft.current = nextDraft;
        setRecoverableDraft(nextDraft);
      })
      .catch(() => {
        clearStaffSaleDraft();
        storedDraft.current = null;
        selectionToken.current = crypto.randomUUID();
      });
    return () => {
      stopped = true;
    };
  }, []);

  useEffect(() => {
    const showtimeId = showtime?.showtimeId;
    if (!showtimeId) return;
    let closedByComponent = false;
    let reconnectTimer: number | undefined;
    let socket: WebSocket | null = null;

    const connect = () => {
      socket = new WebSocket(buildSeatWebSocketUrl(showtimeId));
      socket.onmessage = (event) => {
        let message: SeatStatusRealtimeMessage;
        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }
        if (message.type !== "SEAT_STATUS_CHANGED"
            || message.showtimeId !== showtimeId
            || !message.seats?.length) return;

        const updates = new Map(
          message.seats
            .filter((seat) => typeof seat.showtimeSeatId === "number" && seat.status)
            .map((seat) => [seat.showtimeSeatId as number, seat.status as ShowtimeSeat["status"]]),
        );
        setSeats((current) => current.map((seat) => {
          const status = updates.get(seat.showtimeSeatId);
          return status ? { ...seat, status } : seat;
        }));
        setSelectedIds((current) => {
          const next = new Set(current);
          message.seats?.forEach((seat) => {
            if (typeof seat.showtimeSeatId !== "number" || !seat.status) return;
            const isOwnHold =
              seat.status === "HOLDING"
              && !!seat.selectionHoldToken
              && seat.selectionHoldToken === selectionToken.current;
            if (isOwnHold) next.add(seat.showtimeSeatId);
            else next.delete(seat.showtimeSeatId);
          });
          return [...next];
        });
      };
      socket.onclose = () => {
        if (!closedByComponent) reconnectTimer = window.setTimeout(connect, 2500);
      };
      socket.onerror = () => socket?.close();
    };

    connect();
    return () => {
      closedByComponent = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [showtime?.showtimeId]);

  useEffect(() => {
    if (!qrCheckout) return;
    let stopped = false;
    let inFlight = false;
    const checkStatus = async () => {
      if (stopped || inFlight) return;
      inFlight = true;
      try {
        const booking = await bookingApi.getCounterBookingStatus(qrCheckout.booking.bookingId);
        if (stopped) return;
        if (booking.status === "SUCCESS") {
          setCompletedBooking(booking);
          setQrCheckout(null);
          toast.success(`${qrCheckout.method === "MOMO" ? "MoMo" : "ZaloPay"} đã thanh toán thành công. Vé đã sẵn sàng để in.`);
        } else if (booking.status === "CANCELLED") {
          setQrCheckout(null);
          setStep(1);
          setMovie(null);
          setShowtime(null);
          setSeats([]);
          setSelectedIds([]);
          setFares({});
          setSelectedCombos([]);
          setSelectedFoodItems([]);
          toast.error(`Giao dịch ${qrCheckout.method === "MOMO" ? "MoMo" : "ZaloPay"} đã bị hủy hoặc hết hạn.`);
        }
      } catch {
        // A transient polling error must not interrupt the payment screen.
      } finally {
        inFlight = false;
      }
    };
    void checkStatus();
    const intervalId = window.setInterval(checkStatus, 2500);
    return () => {
      stopped = true;
      window.clearInterval(intervalId);
      URL.revokeObjectURL(qrCheckout.qrUrl);
    };
  }, [qrCheckout]);

  const formats = useMemo(() => [...new Set(showtimes.map(formatLabel))], [showtimes]);
  const visibleShowtimes = useMemo(
    () => showtimes.filter((item) => !selectedFormat || formatLabel(item) === selectedFormat),
    [selectedFormat, showtimes],
  );
  const selectedSeats = useMemo(
    () => seats.filter((seat) => selectedIds.includes(seat.showtimeSeatId)),
    [seats, selectedIds],
  );
  const rows = useMemo(() => {
    const grouped = seats.reduce<Record<string, ShowtimeSeat[]>>((result, seat) => {
      const row = seat.seatRow || seatCode(seat).replace(/\d/g, "") || "?";
      (result[row] ||= []).push(seat);
      return result;
    }, {});
    return Object.entries(grouped).map(([row, items]) => [
      row,
      items.sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0)),
    ] as const);
  }, [seats]);

  const foodOptions = useMemo<FoodOption[]>(() =>
    foodItems.flatMap((food) => {
      if (!food.isActive) return [];
      return (food.variants || [])
        .filter((variant) => variant.isActive && typeof variant.foodVariantId === "number")
        .map((variant) => ({
          foodVariantId: variant.foodVariantId as number,
          foodItemName: food.name,
          displayName: foodVariantLabel(food, variant),
          price: Number(variant.price || 0),
          stockQuantity: Math.max(0, Number(variant.stockQuantity || 0)),
          imageUrl: food.imageUrl,
        }));
    }), [foodItems]);

  const selectedComboDetails = useMemo(() =>
    selectedCombos.flatMap((selected) => {
      const combo = combos.find((item) => item.comboId === selected.comboId);
      return combo ? [{ ...combo, quantity: selected.quantity }] : [];
    }), [combos, selectedCombos]);

  const selectedFoodDetails = useMemo(() =>
    selectedFoodItems.flatMap((selected) => {
      const option = foodOptions.find((item) => item.foodVariantId === selected.foodVariantId);
      return option ? [{ ...option, quantity: selected.quantity }] : [];
    }), [foodOptions, selectedFoodItems]);

  const ticketSubtotal = selectedSeats.reduce(
    (sum, seat) => sum + farePrice(seat, fares[seat.showtimeSeatId] || "ADULT", pricingConfig),
    0,
  );
  const comboSubtotal = selectedComboDetails.reduce(
    (sum, combo) => sum + Number(combo.price || 0) * combo.quantity,
    0,
  );
  const foodSubtotal = selectedFoodDetails.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const concessionSubtotal = comboSubtotal + foodSubtotal;
  const orderSubtotal = ticketSubtotal + concessionSubtotal;
  const availableMemberBenefits = memberBenefits.filter(
    (benefit) => benefit.status === "AVAILABLE" && benefit.type === "FREE_2D_TICKET",
  );
  const applicableMemberBenefits = availableMemberBenefits.filter(benefit =>
    isMembershipFreeTicketApplicable(benefit.freeTicketType, showtime?.presentationFormat, showtime?.projectionType));
  const adultSeats = selectedSeats.filter((seat) => (fares[seat.showtimeSeatId] || "ADULT") !== "U22");
  const freeTicketEligibleSeats = adultSeats.filter((seat) => seat.seatType !== "COUPLE");
  const u22SeatCount = selectedSeats.length - adultSeats.length;
  const allSeatsAreU22 = selectedSeats.length > 0 && u22SeatCount === selectedSeats.length;
  const customerReady = customerConfirmed && (!isMember || member !== null);
  const selectedFreeTicketBenefits = availableMemberBenefits.filter(
    (benefit) => benefit.type === "FREE_2D_TICKET" && selectedBenefitIds.includes(benefit.benefitId),
  );
  const selectedTicketOption: TicketOption = selectedFreeTicketBenefits.length > 0
    ? "FREE_TICKET"
    : allSeatsAreU22 ? "U22" : "STANDARD";
  const appliedFreeBenefits = selectedFreeTicketBenefits
    .filter(benefit => applicableMemberBenefits.some(item => item.benefitId === benefit.benefitId))
    .slice(0, freeTicketEligibleSeats.length);
  const appliedBenefitIds = appliedFreeBenefits.map((benefit) => benefit.benefitId);
  const freeTicketMaxQuantity = Math.min(applicableMemberBenefits.length, freeTicketEligibleSeats.length);
  const canUseFreeTickets = Boolean(memberMembership) && freeTicketMaxQuantity > 0;
  const configuredFreeTicketLabel = membershipFreeTicketLabel(
    (applicableMemberBenefits[0] || availableMemberBenefits[0])?.freeTicketType);
  const waivedBasePrice = Number(showtime?.basePrice || 75_000);
  const memberTicketDiscount = freeTicketEligibleSeats.slice(0, appliedFreeBenefits.length).reduce(
    (sum, seat) => sum + Math.min(farePrice(seat, "ADULT", pricingConfig), waivedBasePrice), 0,
  );
  const memberConcessionDiscount = 0;
  const afterMembership = Math.max(0, orderSubtotal - memberTicketDiscount - memberConcessionDiscount);
  const total = Math.max(0, afterMembership);
  const totalSavings = memberTicketDiscount + memberConcessionDiscount;
  const ticketAfterBenefits = Math.max(0, ticketSubtotal - memberTicketDiscount);
  const concessionAfterBenefits = Math.max(0, concessionSubtotal - memberConcessionDiscount);
  const freeTicketGross = freeTicketEligibleSeats.slice(0, appliedFreeBenefits.length).reduce(
    (sum, seat) => sum + farePrice(seat, "ADULT", pricingConfig), 0,
  );
  const pointEligibleTicketGross = Math.max(0, ticketSubtotal - freeTicketGross);
  const paidGrossBeforeVoucher = ticketAfterBenefits + concessionAfterBenefits;
  const pointEligibleGross = pointEligibleTicketGross + concessionAfterBenefits;
  const pointEligiblePaid = paidGrossBeforeVoucher > 0
    ? Math.floor(total * pointEligibleGross / paidGrossBeforeVoucher)
    : 0;
  const ticketPaid = pointEligibleGross > 0
    ? Math.floor(pointEligiblePaid * pointEligibleTicketGross / pointEligibleGross)
    : 0;
  const concessionPaid = pointEligiblePaid - ticketPaid;
  const expectedPoints = memberMembership ? Math.floor(
    ticketPaid * memberMembership.ticketEarnPercent / 100
      + concessionPaid * memberMembership.concessionEarnPercent / 100,
  ) : (member ? Math.floor(total / 10_000) : 0);

  async function loadConcessions() {
    setLoadingConcessions(true);
    try {
      const [comboResult, foodResult] = await Promise.all([
        comboApi.getCombos(),
        comboApi.getFoodItems(),
      ]);
      setCombos((comboResult || []).filter((combo) => combo.status === "ACTIVE"));
      setFoodItems((foodResult || []).filter((food) => food.isActive));
    } catch (error) {
      toast.error(getApiMessage(error, "Không thể tải danh sách bắp nước."));
    } finally {
      setLoadingConcessions(false);
    }
  }

  function concessionSelectionWithinStock(
    comboSelections: SelectedCombo[],
    foodSelections: SelectedFoodItem[],
  ) {
    const requiredByVariant = new Map<number, number>();
    const addRequirement = (foodVariantId: number, quantity: number) =>
      requiredByVariant.set(foodVariantId, (requiredByVariant.get(foodVariantId) || 0) + quantity);

    for (const selected of comboSelections) {
      const combo = combos.find((item) => item.comboId === selected.comboId);
      if (!combo || selected.quantity < 1) return false;
      const available = Math.max(0, Number(combo.availableQuantity ?? 99));
      if (selected.quantity > available) return false;
      combo.items.forEach((item) => {
        if (typeof item.foodVariantId === "number") {
          addRequirement(item.foodVariantId, Math.max(1, Number(item.quantity || 1)) * selected.quantity);
        }
      });
    }

    for (const selected of foodSelections) {
      if (selected.quantity < 1) return false;
      addRequirement(selected.foodVariantId, selected.quantity);
    }

    for (const [foodVariantId, requiredQuantity] of requiredByVariant) {
      const option = foodOptions.find((item) => item.foodVariantId === foodVariantId);
      if (!option || requiredQuantity > option.stockQuantity) return false;
    }
    return true;
  }

  function canIncreaseCombo(comboId: number) {
    const current = selectedCombos.find((item) => item.comboId === comboId)?.quantity || 0;
    const next = [
      ...selectedCombos.filter((item) => item.comboId !== comboId),
      { comboId, quantity: current + 1 },
    ];
    return concessionSelectionWithinStock(next, selectedFoodItems);
  }

  function canIncreaseFood(foodVariantId: number) {
    const current = selectedFoodItems.find((item) => item.foodVariantId === foodVariantId)?.quantity || 0;
    const next = [
      ...selectedFoodItems.filter((item) => item.foodVariantId !== foodVariantId),
      { foodVariantId, quantity: current + 1 },
    ];
    return concessionSelectionWithinStock(selectedCombos, next);
  }

  function updateComboQuantity(comboId: number, delta: number) {
    const combo = combos.find((item) => item.comboId === comboId);
    if (!combo) return;
    const current = selectedCombos.find((item) => item.comboId === comboId)?.quantity || 0;
    const maxQuantity = Math.max(0, Number(combo.availableQuantity ?? 99));
    const nextQuantity = Math.max(0, Math.min(maxQuantity, current + delta));
    const next = nextQuantity === 0
      ? selectedCombos.filter((item) => item.comboId !== comboId)
      : [...selectedCombos.filter((item) => item.comboId !== comboId), { comboId, quantity: nextQuantity }];
    if (delta > 0 && (nextQuantity === current || !concessionSelectionWithinStock(next, selectedFoodItems))) {
      toast.info("Combo này hiện không còn đủ nguyên liệu.");
      return;
    }
    setSelectedCombos(next);
  }

  function updateFoodQuantity(foodVariantId: number, delta: number) {
    const option = foodOptions.find((item) => item.foodVariantId === foodVariantId);
    if (!option) return;
    const current = selectedFoodItems.find((item) => item.foodVariantId === foodVariantId)?.quantity || 0;
    const nextQuantity = Math.max(0, Math.min(option.stockQuantity, current + delta));
    const next = nextQuantity === 0
      ? selectedFoodItems.filter((item) => item.foodVariantId !== foodVariantId)
      : [...selectedFoodItems.filter((item) => item.foodVariantId !== foodVariantId), { foodVariantId, quantity: nextQuantity }];
    if (delta > 0 && (nextQuantity === current || !concessionSelectionWithinStock(selectedCombos, next))) {
      toast.info("Món này hiện đã hết hàng.");
      return;
    }
    setSelectedFoodItems(next);
  }

  async function loadShowtimes(nextMovie: MovieResponse, date: string) {
    if (date < localToday() || date > lastBookableDate()) {
      toast.error(`Chỉ được bán vé từ hôm nay đến ${lastBookableDate()}.`);
      return;
    }
    setLoading(true);
    setSelectedIds([]);
    setShowtime(null);
    try {
      const result = (await showtimeApi.getAdminShowtimes({
        movieId: nextMovie.movieId,
        date,
        status: "SCHEDULED",
      })).filter((item) =>
        item.showDate === date &&
        item.status === "SCHEDULED" &&
        startsAt(item).getTime() > Date.now()
      );
      setShowtimes(result);
      const labels = [...new Set(result.map(formatLabel))];
      setSelectedFormat(labels.length === 1 ? labels[0] : "");
      setStep(2);

      const counts = await Promise.all(result.map(async (item) => {
        try {
          const response = await showtimeSeatService.getShowtimeSeats({ showtimeId: item.showtimeId, size: 500 });
          return [item.showtimeId, (response.content || []).filter((seat) => seat.status === "AVAILABLE").length] as const;
        } catch {
          return [item.showtimeId, 0] as const;
        }
      }));
      setAvailability(Object.fromEntries(counts));
    } catch (error) {
      toast.error(getApiMessage(error, "Không thể tải suất chiếu."));
    } finally {
      setLoading(false);
    }
  }

  async function chooseMovie(nextMovie: MovieResponse) {
    setMovie(nextMovie);
    setSalesDate(localToday());
    await loadShowtimes(nextMovie, localToday());
  }

  async function changeSalesDate(date: string) {
    if (!movie || !date) return;
    setSalesDate(date);
    await loadShowtimes(movie, date);
  }

  function persistSelectionDraft(nextIds: number[], nextFares: Record<number, Fare>) {
    if (!movie || !showtime || !nextIds.length) {
      clearStaffSaleDraft();
      storedDraft.current = null;
      return;
    }
    const draft: StaffSaleDraft = {
      version: 1,
      staffUsername: getStaffUsername(),
      selectionToken: selectionToken.current,
      movieId: movie.movieId,
      movieName: movie.movieNameVn,
      showtimeId: showtime.showtimeId,
      showDate: showtime.showDate,
      startTime: showtime.startTime,
      roomName: showtime.cinemaRoomName || "—",
      formatName: formatLabel(showtime),
      selectedSeatIds: nextIds,
      seatCodes: nextIds.map((id) => {
        const selectedSeat = seats.find((seat) => seat.showtimeSeatId === id);
        return selectedSeat ? seatCode(selectedSeat) : `#${id}`;
      }),
      fares: nextFares,
      updatedAt: new Date().toISOString(),
    };
    writeStaffSaleDraft(draft);
    storedDraft.current = draft;
  }

  async function continueRecoverableDraft() {
    const draft = recoverableDraft;
    if (!draft) return;
    setRecoveringDraft(true);
    try {
      const [hold, nextMovie, nextShowtime, seatResponse] = await Promise.all([
        showtimeSeatService.getCurrentSelection(draft.showtimeId, draft.selectionToken),
        movieService.getById(draft.movieId),
        showtimeApi.getAdminShowtimeById(draft.showtimeId),
        showtimeSeatService.getShowtimeSeats({ showtimeId: draft.showtimeId, size: 500 }),
      ]);
      const activeIds = hold.showtimeSeatIds || [];
      if (!activeIds.length) {
        clearStaffSaleDraft();
        storedDraft.current = null;
        setRecoverableDraft(null);
        setShowDraftPrompt(false);
        selectionToken.current = crypto.randomUUID();
        toast.info("Phiên giữ ghế đã hết hạn, các ghế đã được trả về trạng thái trống.");
        return;
      }
      const renewedHold = await showtimeSeatService.updateSelection(
        draft.showtimeId,
        activeIds,
        draft.selectionToken,
      );
      const restoredIds = renewedHold.showtimeSeatIds || [];

      const restoredFares = Object.fromEntries(
        restoredIds.map((id) => [id, draft.fares[id] || "ADULT"]),
      ) as Record<number, Fare>;
      selectionToken.current = draft.selectionToken;
      setMovie(nextMovie);
      setShowtimes([nextShowtime]);
      setSalesDate(nextShowtime.showDate);
      setAvailability({
        [nextShowtime.showtimeId]:
          (seatResponse.content || []).filter((seat) => seat.status === "AVAILABLE").length + restoredIds.length,
      });
      setSelectedFormat(formatLabel(nextShowtime));
      setShowtime(nextShowtime);
      setSeats(seatResponse.content || []);
      setSelectedIds(restoredIds);
      setFares(restoredFares);
      setStep(3);
      setRecoverableDraft(null);
      setShowDraftPrompt(false);
      const restoredDraft: StaffSaleDraft = {
        ...draft,
        selectedSeatIds: restoredIds,
        fares: restoredFares,
        updatedAt: new Date().toISOString(),
      };
      writeStaffSaleDraft(restoredDraft);
      storedDraft.current = restoredDraft;
      toast.info(`Đã khôi phục ${restoredIds.length} ghế đang xử lý.`);
    } catch (error) {
      toast.error(getApiMessage(error, "Không thể khôi phục giao dịch đang giữ ghế."));
    } finally {
      setRecoveringDraft(false);
    }
  }

  async function cancelRecoverableDraft() {
    const draft = recoverableDraft;
    if (!draft) return;
    setRecoveringDraft(true);
    try {
      await showtimeSeatService.updateSelection(draft.showtimeId, [], draft.selectionToken);
      clearStaffSaleDraft();
      storedDraft.current = null;
      setRecoverableDraft(null);
      setShowDraftPrompt(false);
      selectionToken.current = crypto.randomUUID();
      toast.info("Đã hủy giao dịch bán dở và nhả toàn bộ ghế.");
    } catch (error) {
      toast.error(getApiMessage(error, "Không thể hủy giao dịch và nhả ghế. Vui lòng thử lại."));
    } finally {
      setRecoveringDraft(false);
    }
  }

  async function chooseShowtime(nextShowtime: ShowtimeResponse) {
    const unfinishedDraft = recoverableDraft || storedDraft.current;
    if (unfinishedDraft?.showtimeId === nextShowtime.showtimeId) {
      setRecoverableDraft(unfinishedDraft);
      setShowDraftPrompt(true);
      return;
    }
    if ((availability[nextShowtime.showtimeId] ?? 0) < 1) {
      toast.info("Suất chiếu này hiện không còn ghế trống.");
      return;
    }
    setShowtime(nextShowtime);
    setLoading(true);
    setSelectedIds([]);
    setFares({});
    selectionToken.current = crypto.randomUUID();
    try {
      const [response, pendingBooking] = await Promise.all([
        showtimeSeatService.getShowtimeSeats({ showtimeId: nextShowtime.showtimeId, size: 500 }),
        bookingApi.getPendingBookingByShowtime(nextShowtime.showtimeId),
      ]);
      setSeats(response.content || []);
      if (pendingBooking) {
        const pendingSeatIds = pendingBooking.showtimeSeatIds || [];
        setSelectedIds(pendingSeatIds);
        setFares(Object.fromEntries(pendingSeatIds.map((id) => [id, "ADULT"])));
        setCompletedBooking(pendingBooking);
        toast.info(`Đơn #${pendingBooking.bookingId} vẫn đang chờ thanh toán. Hãy tiếp tục hoặc hủy đơn để nhả ghế.`);
        return;
      }
      setStep(3);
    } catch (error) {
      toast.error(getApiMessage(error, "Không thể tải sơ đồ ghế."));
    } finally {
      setLoading(false);
    }
  }

  async function toggleSeat(seat: ShowtimeSeat) {
    if (!showtime) return;
    const isSelected = selectedIds.includes(seat.showtimeSeatId);
    if (!isSelected && seat.status !== "AVAILABLE") return;
    const partner = getCouplePartnerSeat(seat, seats);
    const affectedIds = partner
      ? [seat.showtimeSeatId, partner.showtimeSeatId]
      : [seat.showtimeSeatId];
    if (!isSelected && partner && partner.status !== "AVAILABLE"
        && !selectedIds.includes(partner.showtimeSeatId)) {
      toast.info(`Ghế đôi ${seatCode(seat)} phải chọn cùng ${seatCode(partner)}, nhưng ghế còn lại hiện không khả dụng.`);
      return;
    }
    const affectedIdSet = new Set(affectedIds);
    const nextIds = isSelected
      ? selectedIds.filter((id) => !affectedIdSet.has(id))
      : [...new Set([...selectedIds, ...affectedIds])];

    try {
      const hold = await showtimeSeatService.updateSelection(showtime.showtimeId, nextIds, selectionToken.current);
      const confirmedIds = hold.showtimeSeatIds || [];
      setSelectedIds(confirmedIds);
      if (hold.clientToken) selectionToken.current = hold.clientToken;
      const confirmedFares = Object.fromEntries(
        confirmedIds.map((id) => [id, fares[id] || "ADULT"]),
      ) as Record<number, Fare>;
      setFares(confirmedFares);
      persistSelectionDraft(confirmedIds, confirmedFares);
      setSeats((current) => current.map((item) => {
        if (confirmedIds.includes(item.showtimeSeatId)) return { ...item, status: "HOLDING" };
        if (selectedIds.includes(item.showtimeSeatId) && item.status === "HOLDING") return { ...item, status: "AVAILABLE" };
        return item;
      }));
    } catch (error) {
      toast.error(getApiMessage(error, "Ghế vừa được giao dịch khác giữ. Vui lòng chọn ghế khác."));
      const response = await showtimeSeatService.getShowtimeSeats({ showtimeId: showtime.showtimeId, size: 500 });
      setSeats(response.content || []);
    }
  }

  function applyFareToAll(fare: Fare) {
    const nextFares = Object.fromEntries(
      selectedIds.map((id) => [id, fare]),
    ) as Record<number, Fare>;
    setFares(nextFares);
    persistSelectionDraft(selectedIds, nextFares);

    if (fare === "U22" && selectedBenefitIds.length > 0) {
      setSelectedBenefitIds([]);
      toast.info("Đã chuyển toàn bộ ghế sang U22 và bỏ các quyền lợi vé Người lớn đã chọn.");
    }
  }

  function selectTicketOption(option: TicketOption) {
    if (option === "STANDARD") {
      applyFareToAll("ADULT");
      setSelectedBenefitIds([]);
      return;
    }
    if (option === "U22") {
      applyFareToAll("U22");
      return;
    }
    setFreeTicketQuantity(1);
  }

  function setFreeTicketQuantity(requestedQuantity: number) {
    if (!member || !memberMembership) {
      toast.info("Khách hàng chưa có Membership đang hoạt động.");
      return;
    }
    if (availableMemberBenefits.length === 0) {
      toast.info("Khách hàng không còn quyền lợi vé miễn phí khả dụng.");
      return;
    }
    if (applicableMemberBenefits.length === 0) {
      toast.info(`Quyền lợi vé ${configuredFreeTicketLabel} không áp dụng cho suất chiếu này.`);
      return;
    }
    if (freeTicketEligibleSeats.length === 0) {
      toast.info("Vé hội viên miễn phí không áp dụng cho ghế Couple.");
      return;
    }

    const maxQuantity = Math.min(applicableMemberBenefits.length, freeTicketEligibleSeats.length);
    const quantity = Math.max(0, Math.min(requestedQuantity, maxQuantity));
    applyFareToAll("ADULT");
    setSelectedBenefitIds(applicableMemberBenefits
      .slice(0, quantity)
      .map((benefit) => benefit.benefitId));
  }

  function continueToPayment() {
    const gapError = getSeatGapError(selectedIds, seats);
    if (gapError) {
      toast.error(gapError);
      return;
    }
    setStep(4);
  }

  async function lookupMember() {
    setMember(null);
    setMemberMembership(null);
    setMemberBenefits([]);
    setSelectedBenefitIds([]);
    setMemberMessage("");
    if (!/^0\d{9}$/.test(phone)) {
      setMemberMessage("Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.");
      return;
    }
    try {
      const found = await userService.findMemberByPhone(phone);
      setMember(found);
      const activeMembership = await membershipApi.getActiveForUser(found.userId);
      setMemberMembership(activeMembership);
      setMemberBenefits(activeMembership
        ? await membershipApi.getBenefitsForUser(found.userId).catch(() => [])
        : []);
    } catch {
      setMemberMessage("Tài khoản thành viên không tồn tại hoặc không hoạt động.");
    }
  }

  function clearMemberLookup() {
    setMember(null);
    setMemberMembership(null);
    setMemberBenefits([]);
    setSelectedBenefitIds([]);
    setMemberMessage("");
    setPhone("");
  }



  async function checkout() {
    if (!showtime || !selectedIds.length) return;
    const gapError = getSeatGapError(selectedIds, seats);
    if (gapError) {
      toast.error(gapError);
      setStep(3);
      return;
    }
    if (!customerConfirmed) {
      toast.error("Vui lòng xác định khách vãng lai hoặc tra cứu tài khoản khách hàng trước.");
      return;
    }
    if (isMember && !member) {
      toast.error("Vui lòng tra cứu và xác nhận thành viên, hoặc chọn khách vãng lai.");
      return;
    }
    if (!concessionSelectionWithinStock(selectedCombos, selectedFoodItems)) {
      toast.error("Một món bắp nước vừa hết hàng. Vui lòng điều chỉnh số lượng trước khi thanh toán.");
      void loadConcessions();
      return;
    }
    setSubmitting(true);
    try {
      const pendingBooking = await bookingApi.createBooking({
        showtimeId: showtime.showtimeId,
        showtimeSeatIds: selectedIds,
        u22SeatIds: selectedIds.filter((id) => fares[id] === "U22"),
        u22DocumentVerified: selectedIds.some((id) => fares[id] === "U22"),

        paymentMethod,
        memberUserId: member?.userId,
        membershipBenefitIds: appliedBenefitIds.length ? appliedBenefitIds : undefined,
        combos: selectedCombos.length ? selectedCombos : undefined,
        foodItems: selectedFoodItems.length ? selectedFoodItems : undefined,
      });
      clearStaffSaleDraft();
      storedDraft.current = null;
      if (pendingBooking.status === "SUCCESS") {
        setCompletedBooking(pendingBooking);
        toast.success("Đã dùng quyền lợi và phát hành vé thành công.");
        return;
      }
      if (paymentMethod === "MOMO" || paymentMethod === "ZALOPAY") {
        try {
          const paymentResult = paymentMethod === "MOMO"
            ? await paymentApi.createMomoOrder(pendingBooking.bookingId)
            : await paymentApi.createZaloPayOrder(pendingBooking.bookingId);
            
          const { payUrl, qrContent } = getPaymentLinks(paymentResult);
          const qrUrl = await paymentApi.createQrCodeUrl(qrContent);
          
          setQrCheckout({ booking: pendingBooking, payUrl, qrUrl, method: paymentMethod });
          toast.info(`Đã tạo mã QR. Hệ thống đang chờ kết quả thanh toán từ ${paymentMethod === "MOMO" ? "MoMo" : "ZaloPay"}.`);
        } catch (error) {
          setCompletedBooking(pendingBooking);
          toast.error(getApiMessage(error, `Đơn đã được tạo nhưng không thể tạo QR ${paymentMethod === "MOMO" ? "MoMo" : "ZaloPay"}. Vui lòng thử lại hoặc hủy đơn.`));
        }
        return;
      }
      if (paymentMethod === "BANK_TRANSFER") {
        setCompletedBooking(pendingBooking);
        toast.info("Đã tạo đơn. Staff xác nhận sau khi kiểm tra tiền đã vào tài khoản ngân hàng.");
        return;
      }
      try {
        const paidBooking = await bookingApi.confirmCounterCashPayment(
          pendingBooking.bookingId,
          "CASH",
        );
        setCompletedBooking(paidBooking);
        toast.success("Thanh toán thành công. Vé đã sẵn sàng để in.");
      } catch (error) {
        setCompletedBooking(pendingBooking);
        toast.error(getApiMessage(error, "Đơn đã được tạo nhưng chưa xác nhận được tiền mặt. Vui lòng thử lại hoặc hủy đơn."));
      }
    } catch (error) {
      toast.error(getApiMessage(error, "Không thể tạo đơn. Ghế có thể vừa được giao dịch khác giữ."));
      void loadConcessions();
    } finally {
      setSubmitting(false);
    }
  }

  async function releaseSelectedSeats() {
    if (!showtime || !selectedIds.length) return true;
    setReleasing(true);
    try {
      await showtimeSeatService.updateSelection(showtime.showtimeId, [], selectionToken.current);
      const releasedIds = new Set(selectedIds);
      setSeats((current) => current.map((seat) =>
        releasedIds.has(seat.showtimeSeatId) && seat.status === "HOLDING"
          ? { ...seat, status: "AVAILABLE" }
          : seat
      ));
      setSelectedIds([]);
      setFares({});
      clearStaffSaleDraft();
      storedDraft.current = null;
      return true;
    } catch (error) {
      toast.error(getApiMessage(error, "Không thể nhả ghế đang giữ. Vui lòng thử lại."));
      return false;
    } finally {
      setReleasing(false);
    }
  }

  async function cancelTransaction() {
    const released = await releaseSelectedSeats();
    if (!released) return;
    await reset(false);
    toast.info("Đã hủy giao dịch. Các ghế đã chọn được chuyển về trạng thái trống.");
  }

  async function cancelPendingTransaction() {
    if (!completedBooking || completedBooking.status !== "PENDING") return;
    setReleasing(true);
    try {
      await bookingApi.cancelPendingBooking(completedBooking.bookingId);
      await reset(false);
      toast.info("Đã hủy đơn chờ thanh toán. Các ghế được chuyển về trạng thái trống.");
    } catch (error) {
      toast.error(getApiMessage(error, "Không thể hủy đơn và nhả ghế. Vui lòng thử lại."));
    } finally {
      setReleasing(false);
    }
  }

  async function cancelQrTransaction() {
    if (!qrCheckout) return;
    setReleasing(true);
    try {
      await bookingApi.cancelPendingBooking(qrCheckout.booking.bookingId);
      setQrCheckout(null);
      await reset(false);
      toast.info(`Đã hủy giao dịch ${qrCheckout.method === "MOMO" ? "MoMo" : "ZaloPay"} và nhả toàn bộ ghế.`);
    } catch (error) {
      toast.error(getApiMessage(error, `Không thể hủy giao dịch ${qrCheckout.method === "MOMO" ? "MoMo" : "ZaloPay"}. Vui lòng thử lại.`));
    } finally {
      setReleasing(false);
    }
  }

  async function checkQrPaymentNow() {
    if (!qrCheckout) return;
    setSubmitting(true);
    try {
      const booking = await bookingApi.getCounterBookingStatus(qrCheckout.booking.bookingId);
      if (booking.status === "SUCCESS") {
        setCompletedBooking(booking);
        setQrCheckout(null);
        toast.success(`${qrCheckout.method === "MOMO" ? "MoMo" : "ZaloPay"} đã thanh toán thành công. Vé đã sẵn sàng để in.`);
      } else {
        toast.info(`Chưa nhận được thanh toán từ ${qrCheckout.method === "MOMO" ? "MoMo" : "ZaloPay"}.`);
      }
    } catch (error) {
      toast.error(getApiMessage(error, `Không thể kiểm tra trạng thái ${qrCheckout.method === "MOMO" ? "MoMo" : "ZaloPay"}.`));
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmPendingCashPayment() {
    if (!completedBooking || completedBooking.status !== "PENDING") return;
    setSubmitting(true);
    try {
      const paidBooking = await bookingApi.confirmCounterCashPayment(
        completedBooking.bookingId,
        paymentMethod === "BANK_TRANSFER" ? "BANK_TRANSFER" : "CASH",
      );
      setCompletedBooking(paidBooking);
      toast.success("Thanh toán thành công. Vé đã sẵn sàng để in.");
    } catch (error) {
      toast.error(getApiMessage(error, "Không thể xác nhận thanh toán. Vui lòng thử lại hoặc hủy đơn."));
    } finally {
      setSubmitting(false);
    }
  }

  async function retryPendingQrPayment() {
    if (!completedBooking || completedBooking.status !== "PENDING") return;
    setSubmitting(true);
    try {
      const paymentResult = paymentMethod === "MOMO"
        ? await paymentApi.createMomoOrder(completedBooking.bookingId)
        : await paymentApi.createZaloPayOrder(completedBooking.bookingId);
        
      const { payUrl, qrContent } = getPaymentLinks(paymentResult);
      const qrUrl = await paymentApi.createQrCodeUrl(qrContent);
      
      setQrCheckout({ booking: completedBooking, payUrl, qrUrl, method: paymentMethod as "MOMO" | "ZALOPAY" });
      setCompletedBooking(null);
      toast.info(`Đã tạo lại mã QR ${paymentMethod === "MOMO" ? "MoMo" : "ZaloPay"}.`);
    } catch (error) {
      toast.error(getApiMessage(error, `Không thể tạo lại QR ${paymentMethod === "MOMO" ? "MoMo" : "ZaloPay"}. Vui lòng thử lại hoặc hủy đơn.`));
    } finally {
      setSubmitting(false);
    }
  }

  async function returnToShowtimes() {
    const released = await releaseSelectedSeats();
    if (released) setStep(2);
  }

  async function reset(releaseSeats = true) {
    if (releaseSeats) {
      const released = await releaseSelectedSeats();
      if (!released) return;
    }
    clearStaffSaleDraft();
    storedDraft.current = null;
    setStep(1);
    setMovie(null);
    setShowtimes([]);
    setSalesDate(localToday());
    setAvailability({});
    setSelectedFormat("");
    setShowtime(null);
    setSeats([]);
    setSelectedIds([]);
    setFares({});
    setSelectedCombos([]);
    setSelectedFoodItems([]);
    setIsMember(false);
    setCustomerConfirmed(false);
    setPhone("");
    setMember(null);
    setMemberMembership(null);
    setMemberBenefits([]);
    setSelectedBenefitIds([]);
    setMemberMessage("");

    setPaymentMethod("CASH");
    setCompletedBooking(null);
    setQrCheckout(null);
  }

  function changePaymentMethod(method: PaymentMethod) {
    setPaymentMethod(method);

  }

  if (qrCheckout) {
    const isMomo = qrCheckout.method === "MOMO";
    const brandName = isMomo ? "MoMo" : "ZaloPay";
    const brandColor = isMomo ? "text-pink-600" : "text-blue-600";
    const brandBg = isMomo ? "bg-pink-600" : "bg-blue-600";
    
    return (
      <div className="flex-1 overflow-auto bg-slate-100 p-8 text-slate-900">
        <div className="mx-auto grid max-w-4xl gap-6 rounded-3xl bg-white p-7 shadow-sm md:grid-cols-[1fr_360px]">
          <div className="flex flex-col justify-center">
            <p className={`text-xs font-black uppercase tracking-[.2em] ${brandColor}`}>Thanh toán {brandName}</p>
            <h2 className="mt-2 text-3xl font-black">Quét mã để thanh toán</h2>
            <p className="mt-2 text-sm text-slate-500">Đơn #{qrCheckout.booking.bookingId} đang được giữ ghế. Hệ thống tự kiểm tra trạng thái mỗi vài giây.</p>
            <div className="mt-6 space-y-3 rounded-2xl bg-slate-50 p-5 text-sm">
              <Summary label="Phim" value={qrCheckout.booking.movieTitle || "—"} />
              <div className="grid grid-cols-2 gap-4"><Summary label="Suất chiếu" value={`${qrCheckout.booking.showDate} · ${qrCheckout.booking.startTime.slice(0, 5)}`} /><Summary label="Ghế" value={(qrCheckout.booking.seatCodes || []).join(", ") || "—"} /></div>
              {[...(qrCheckout.booking.combos || []), ...(qrCheckout.booking.foodItems || [])].length > 0 && (
                <div className="border-t pt-3">
                  <p className="mb-1 text-xs font-bold uppercase text-slate-400">Bắp nước</p>
                  {[...(qrCheckout.booking.combos || []), ...(qrCheckout.booking.foodItems || [])].map((item, index) => (
                    <p key={`${item}-${index}`} className="font-semibold text-slate-700">{item}</p>
                  ))}
                </div>
              )}
              <div className={`flex justify-between border-t pt-4 text-xl font-black`}><span>Số tiền</span><span className={brandColor}>{money(qrCheckout.booking.totalAmount)}</span></div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button disabled={submitting} onClick={checkQrPaymentNow} className="flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 font-bold text-white disabled:opacity-50">{submitting ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />} Kiểm tra thanh toán</button>
              <button onClick={() => window.open(qrCheckout.payUrl, "_blank", "noopener,noreferrer")} className="flex items-center gap-2 rounded-xl border px-5 py-3 font-bold"><ExternalLink size={18} /> Mở trang {brandName}</button>
              <button disabled={releasing} onClick={cancelQrTransaction} className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-5 py-3 font-bold text-rose-600 disabled:opacity-50"><XCircle size={18} /> Hủy giao dịch</button>
            </div>
          </div>
          <div className={`rounded-3xl ${brandBg} p-6 text-center text-white`}>
            <QrCode className="mx-auto" size={28} />
            <p className="mt-2 font-black">MỞ APP {brandName.toUpperCase()} ĐỂ QUÉT</p>
            <div className="mt-5 rounded-2xl bg-white p-4"><img src={qrCheckout.qrUrl} alt={`Mã QR thanh toán ${brandName}`} className="mx-auto aspect-square w-full" /></div>
            <div className="mt-5 flex items-center justify-center gap-2 text-sm"><Loader2 className="animate-spin" size={17} /> Đang chờ thanh toán...</div>
          </div>
        </div>
      </div>
    );
  }

  if (completedBooking) {
    const isPaid = completedBooking.status === "SUCCESS";
    const concessionLines = completedBooking.productDetails?.length
      ? completedBooking.productDetails.map((item, index) => ({
          key: `${item.type}-${index}`,
          name: item.name,
          quantity: item.quantity,
          totalPrice: item.totalPrice,
        }))
      : [...(completedBooking.combos || []), ...(completedBooking.foodItems || [])]
          .map((name, index) => ({ key: `fallback-${index}`, name, quantity: 1, totalPrice: null }));
    const ticketAmount = completedBooking.ticketSubtotal
      ?? (completedBooking.ticketDetails || []).reduce((sum, ticket) => sum + ticket.price, 0);
    const concessionAmount = completedBooking.concessionSubtotal
      ?? concessionLines.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    const presentationLabel = completedBooking.presentationName
      || [completedBooking.projectionType, completedBooking.languageType].filter(Boolean).join(" · ")
      || (showtime ? formatLabel(showtime) : "—");
    return (
      <div className="flex-1 overflow-auto bg-slate-100 p-8 text-slate-900">
        <div className="staff-ticket-print mx-auto max-w-5xl">
          <div className={`ticket-print-hide mb-6 flex items-center justify-center gap-3 rounded-2xl p-4 font-black ${isPaid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
            {isPaid ? <BadgeCheck size={26} /> : <CircleAlert size={26} />}
            {isPaid ? "Thanh toán thành công — vé đã sẵn sàng để in" : "Đơn đang chờ xác nhận thanh toán"}
          </div>

          <div className={`ticket-preview-grid grid gap-6 ${concessionLines.length > 0 ? "lg:grid-cols-2" : "mx-auto max-w-lg"}`}>
            <article className="cinema-print-ticket overflow-hidden rounded-2xl bg-white text-left shadow-xl">
              <div className="ticket-brand flex items-center justify-between bg-gradient-to-r from-red-700 to-red-500 px-6 py-4 text-white">
                <div>
                  <p className="text-2xl font-black tracking-tight">MAGICINEMA</p>
                  <p className="text-[10px] font-bold uppercase tracking-[.24em] text-red-100">Vé xem phim</p>
                </div>
                <Film size={34} />
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="ticket-label">Mã đặt vé</p>
                    <b className="text-lg">#{completedBooking.bookingId}</b>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${isPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {isPaid ? "ĐÃ THANH TOÁN" : "CHỜ THANH TOÁN"}
                  </span>
                </div>

                <div className="ticket-tear-line my-5" />
                <p className="ticket-label">Phim</p>
                <h2 className="mt-1 text-xl font-black leading-tight">{completedBooking.movieTitle}</h2>
                <p className="mt-2 text-sm font-bold text-red-600">{presentationLabel}</p>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <TicketInfo label="Ngày chiếu" value={completedBooking.showDate || "—"} />
                  <TicketInfo label="Giờ chiếu" value={completedBooking.startTime?.slice(0, 5) || "—"} />
                  <TicketInfo label="Phòng" value={completedBooking.cinemaRoomName || "—"} />
                </div>

                <div className="mt-5 rounded-xl bg-slate-950 p-4 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ghế</p>
                  <p className="mt-1 text-2xl font-black tracking-wider">{(completedBooking.seatCodes || []).join(" · ") || "—"}</p>
                  <p className="mt-1 text-xs text-slate-300">{completedBooking.seatCodes?.length || 0} vé</p>
                </div>

                <div className="mt-5 space-y-2 text-sm">
                  {(completedBooking.ticketDetails || []).map((ticket) => (
                    <div key={ticket.ticketId} className="flex justify-between">
                      <span>Ghế {ticket.seatCode}{ticket.seatType ? ` · ${ticket.seatType}` : ""}</span>
                      <b>{money(ticket.price)}</b>
                    </div>
                  ))}
                  {(completedBooking.membershipTicketDiscount || 0) > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Quyền lợi vé miễn phí</span>
                      <b>-{money(completedBooking.membershipTicketDiscount || 0)}</b>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-3 text-base font-black">
                    <span>Tiền vé</span>
                    <span>{money(ticketAmount)}</span>
                  </div>
                </div>

                {isPaid && completedBooking.ticketQrToken ? (
                  <div className="mt-6 text-center">
                    <img
                      src={bookingApi.getTicketQrImageUrl(completedBooking.ticketQrToken)}
                      alt={`QR vé #${completedBooking.bookingId}`}
                      className="mx-auto h-32 w-32 bg-white p-1"
                    />
                    <p className="mt-1 text-[10px] font-bold text-slate-500">Quét để xác thực vé</p>
                  </div>
                ) : (
                  <div className="ticket-barcode mt-6" aria-hidden="true" />
                )}
                <p className="mt-1 text-center font-mono text-xs tracking-[.18em]">MC-{completedBooking.bookingId}</p>
                <p className="mt-4 text-center text-[11px] text-slate-500">Vui lòng có mặt trước giờ chiếu 15 phút.</p>
              </div>
            </article>

            {concessionLines.length > 0 && (
              <article className="cinema-print-ticket concession-print-ticket overflow-hidden rounded-2xl bg-white text-left shadow-xl">
                <div className="ticket-brand flex items-center justify-between bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 text-white">
                  <div>
                    <p className="text-2xl font-black tracking-tight">MAGICINEMA</p>
                    <p className="text-[10px] font-bold uppercase tracking-[.24em] text-amber-50">Phiếu nhận bắp nước</p>
                  </div>
                  <Popcorn size={34} />
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="ticket-label">Mã đơn hàng</p>
                      <b className="text-lg">F&amp;B-{completedBooking.bookingId}</b>
                    </div>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">CHỜ NHẬN MÓN</span>
                  </div>

                  <div className="ticket-tear-line my-5" />
                  <p className="ticket-label">Danh sách món</p>
                  <div className="mt-3 space-y-3">
                    {concessionLines.map((item) => (
                      <div key={item.key} className="flex justify-between gap-4 border-b border-dashed pb-3 text-sm">
                        <span className="min-w-0"><b>{item.quantity}×</b> {item.name}</span>
                        {item.totalPrice != null && <b className="shrink-0">{money(item.totalPrice)}</b>}
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex justify-between text-lg font-black">
                    <span>Tiền bắp nước</span>
                    <span>{money(concessionAmount)}</span>
                  </div>
                  <div className="mt-5 rounded-xl bg-amber-50 p-4 text-xs text-amber-900">
                    Đưa phiếu này cho quầy bắp nước để nhận món. Nhân viên đối chiếu mã trước khi giao.
                  </div>
                  <div className="ticket-barcode mt-6" aria-hidden="true" />
                  <p className="mt-1 text-center font-mono text-xs tracking-[.18em]">FB-{completedBooking.bookingId}</p>
                </div>
              </article>
            )}
          </div>

          {isPaid && (completedBooking.loyaltyPointsEarned || 0) > 0 && (
            <div className="ticket-print-hide mx-auto mt-5 flex max-w-lg justify-between rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              <span>Điểm thành viên đã cộng</span>
              <span>+{completedBooking.loyaltyPointsEarned}</span>
            </div>
          )}
          {isPaid ? <div className="ticket-print-hide mx-auto mt-5 flex max-w-lg gap-3">
            <button onClick={() => window.print()} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3 font-bold text-slate-900"><Printer size={18} /> In các phiếu</button>
            <button onClick={() => reset()} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 font-bold text-white"><RefreshCw size={18} /> Giao dịch mới</button>
          </div> : <div className="ticket-print-hide flex gap-3">
            {paymentMethod === "MOMO" || paymentMethod === "ZALOPAY"
              ? <button disabled={submitting || releasing} onClick={retryPendingQrPayment} className={`flex flex-1 items-center justify-center gap-2 rounded-xl ${paymentMethod === "MOMO" ? "bg-pink-600" : "bg-blue-600"} py-3 font-bold text-white disabled:opacity-50`}>{submitting ? <Loader2 className="animate-spin" size={18} /> : <QrCode size={18} />} Tạo lại mã QR</button>
              : <button disabled={submitting || releasing} onClick={confirmPendingCashPayment} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 font-bold text-white disabled:opacity-50">{submitting && <Loader2 className="animate-spin" size={18} />} {paymentMethod === "BANK_TRANSFER" ? "Xác nhận đã nhận chuyển khoản" : "Xác nhận đã thu tiền"}</button>}
            <button disabled={releasing || submitting} onClick={cancelPendingTransaction} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 font-bold text-white disabled:opacity-50">{releasing ? <Loader2 className="animate-spin" size={18} /> : <XCircle size={18} />} Hủy đơn & nhả ghế</button>
          </div>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden bg-slate-100 text-slate-900">
      {showDraftPrompt && recoverableDraft && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-5 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-600">
                  <CircleAlert size={26} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[.16em] text-amber-600">Giao dịch chưa hoàn tất</p>
                  <h2 className="mt-1 text-2xl font-black">
                    Có {recoverableDraft.selectedSeatIds.length} ghế chưa xử lý
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Các ghế này vẫn đang được giữ cho phiên bán của bạn. Hãy tiếp tục xử lý hoặc hủy để trả ghế về trạng thái trống.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3 rounded-2xl bg-slate-50 p-4 text-sm">
                <Summary label="Phim" value={recoverableDraft.movieName} />
                <div className="grid grid-cols-2 gap-4">
                  <Summary label="Suất chiếu" value={`${recoverableDraft.showDate} · ${recoverableDraft.startTime.slice(0, 5)}`} />
                  <Summary label="Phòng" value={recoverableDraft.roomName} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Summary label="Định dạng" value={recoverableDraft.formatName} />
                  <Summary label="Ghế đang giữ" value={recoverableDraft.seatCodes.join(", ")} />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button disabled={recoveringDraft} onClick={continueRecoverableDraft} className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 font-black text-white disabled:opacity-50">
                  {recoveringDraft && <Loader2 className="animate-spin" size={18} />}
                  Tiếp tục xử lý
                </button>
                <button disabled={recoveringDraft} onClick={cancelRecoverableDraft} className="flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 font-black text-rose-600 disabled:opacity-50">
                  <XCircle size={18} />
                  Hủy & nhả ghế
                </button>
              </div>
          </div>
        </div>
      )}
      <main className="min-w-0 flex-1 overflow-auto p-6">
        <header className="mb-5 flex items-center justify-between">
          <div><h1 className="text-2xl font-black">Bán vé tại quầy</h1><p className="text-sm text-slate-500">Chọn suất, giữ ghế và thanh toán trực tiếp</p></div>
          <div className="flex gap-2">
            {showtime && selectedIds.length > 0 && <button disabled={releasing || submitting} onClick={cancelTransaction} className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 font-bold text-rose-600 disabled:opacity-50">{releasing ? <Loader2 className="animate-spin" size={16} /> : <XCircle size={16} />} Hủy giao dịch</button>}
            <button disabled={releasing || submitting} onClick={() => reset()} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 font-bold disabled:opacity-50"><RefreshCw size={16} /> Làm mới</button>
          </div>
        </header>

        <div className="mb-6 grid grid-cols-4 gap-2">
          {["Chọn phim", "Chọn suất", "Chọn ghế", "Thanh toán"].map((label, index) => (
            <div key={label} className={`rounded-xl px-4 py-3 text-sm font-bold ${step === index + 1 ? "bg-amber-500 text-white" : step > index + 1 ? "bg-emerald-100 text-emerald-700" : "bg-white text-slate-400"}`}>
              {step > index + 1 ? <Check className="mr-1 inline" size={15} /> : `${index + 1}.`} {label}
            </div>
          ))}
        </div>

        {loading && <div className="grid h-72 place-items-center"><Loader2 className="animate-spin text-amber-500" size={36} /></div>}

        {!loading && step === 1 && (
          <>
            <div className="relative mb-4"><Search className="absolute left-4 top-3.5 text-slate-400" size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên phim..." className="w-full rounded-xl border bg-white py-3 pl-12 outline-none focus:border-amber-400" /></div>
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
              {movies.filter((item) => item.movieNameVn.toLowerCase().includes(query.toLowerCase())).length === 0 && (
                <div className="col-span-full">
                  <Empty text="Không có phim phù hợp đang có suất chiếu trong 3 ngày tới." />
                </div>
              )}
              {movies.filter((item) => item.movieNameVn.toLowerCase().includes(query.toLowerCase())).map((item) => (
                <button key={item.movieId} onClick={() => chooseMovie(item)} className="flex overflow-hidden rounded-2xl border bg-white text-left transition hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-md">
                  <img src={item.smallImage || item.largeImage || "/favicon.svg"} alt="" className="h-40 w-28 bg-slate-100 object-cover" />
                  <div className="flex flex-1 flex-col p-4"><b className="line-clamp-2">{item.movieNameVn}</b><span className="mt-3 flex items-center gap-2 text-xs text-slate-500"><Clock3 size={14} />{item.duration || "—"} phút</span><span className="mt-2 w-fit rounded-md bg-rose-50 px-2 py-1 text-xs font-black text-rose-600">{item.ageRating || "P"}</span><span className="mt-auto text-xs text-slate-500">{item.presentations?.length || item.formats?.length || 1} định dạng</span></div>
                </button>
              ))}
            </div>
          </>
        )}

        {!loading && step === 2 && (
          <>
            <Back onClick={() => setStep(1)}>Chọn phim khác</Back>
            <div className="mb-5 flex items-center gap-3 rounded-2xl bg-slate-950 p-5 text-white"><Film className="text-amber-400" /><div><b>{movie?.movieNameVn}</b><p className="text-xs text-slate-400">{movie?.duration} phút · {movie?.ageRating}</p></div></div>
            <div className="mb-5 flex items-center justify-between rounded-2xl border bg-white p-4">
              <div><p className="text-xs font-black uppercase text-slate-500">Ngày bán vé</p><p className="mt-1 text-sm text-slate-600">Dữ liệu đồng bộ với lịch chiếu theo ngày.</p></div>
              <input type="date" min={localToday()} max={lastBookableDate()} value={salesDate} onChange={(event) => changeSalesDate(event.target.value)} className="rounded-xl border px-4 py-2 font-bold outline-none focus:border-amber-400" />
            </div>
            {formats.length > 1 && <div className="mb-5"><p className="mb-2 text-xs font-black uppercase text-slate-500">Chọn định dạng</p><div className="flex flex-wrap gap-2">{formats.map((label) => <button key={label} onClick={() => setSelectedFormat(label)} className={`rounded-xl border px-5 py-2 font-bold ${selectedFormat === label ? "border-amber-500 bg-amber-500 text-white" : "bg-white"}`}>{label}</button>)}</div></div>}
            {!selectedFormat && formats.length > 1 ? <Empty text="Hãy chọn định dạng khách muốn xem." /> : visibleShowtimes.length === 0 ? <Empty text="Không còn suất chiếu khả dụng." /> : (
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">{visibleShowtimes.map((item) => {
                const unfinishedDraft = recoverableDraft || storedDraft.current;
                const heldByCurrentDraft = unfinishedDraft?.showtimeId === item.showtimeId
                  ? unfinishedDraft.selectedSeatIds.length
                  : 0;
                const free = (availability[item.showtimeId] ?? 0) + heldByCurrentDraft;
                return <button key={item.showtimeId} disabled={free === 0} onClick={() => chooseShowtime(item)} className="rounded-2xl border bg-white p-4 text-left hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-50"><div className="flex items-start justify-between"><div><b className="text-2xl">{item.startTime.slice(0, 5)}</b><p className="text-xs text-slate-500">{item.showDate}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{formatLabel(item)}</span></div><p className="mt-3 text-sm font-semibold">{item.cinemaRoomName}</p><div className="mt-3 flex justify-between border-t pt-3 text-sm"><span className={free ? "font-bold text-emerald-600" : "text-rose-500"}>{free} ghế trống</span><b className="text-amber-600">Từ {money(item.basePrice)}</b></div></button>;
              })}</div>
            )}
          </>
        )}

        {!loading && step === 3 && (
          <>
            <Back onClick={returnToShowtimes}>Chọn suất khác</Back>
            <div className="mb-7 rounded-t-[50%] border-t-4 border-amber-400 bg-white py-4 text-center text-xs font-bold tracking-[.45em] text-slate-400">MÀN HÌNH</div>
            <div className="space-y-2 overflow-auto pb-2">{rows.map(([row, items]) => <div key={row} className="flex min-w-max justify-center gap-2"><span className="grid w-7 place-items-center text-xs font-bold text-slate-400">{row}</span>{items.map((seat) => {
              const picked = selectedIds.includes(seat.showtimeSeatId);
              const unavailable = !picked && seat.status !== "AVAILABLE";
              const stateClass = picked ? "border-amber-500 bg-amber-500 text-white" : seat.status === "BOOKED" ? "border-rose-100 bg-rose-100 text-rose-400" : seat.status === "HOLDING" ? "border-slate-300 bg-slate-300 text-slate-500" : seat.seatType === "COUPLE" ? "border-pink-300 bg-pink-50 text-pink-700" : seat.seatType === "VIP" ? "border-violet-300 bg-violet-50 text-violet-700" : seat.seatType === "DISABLED" ? "border-slate-200 bg-slate-100 text-slate-300" : "bg-white";
              return <button key={seat.showtimeSeatId} disabled={unavailable} onClick={() => toggleSeat(seat)} title={`${seatCode(seat)} · ${seat.seatType || "NORMAL"}`} className={`h-10 w-11 rounded-lg border text-xs font-bold ${stateClass}`}>{seatCode(seat)}</button>;
            })}</div>)}</div>
            <div className="mt-5 flex flex-wrap justify-center gap-4 text-xs text-slate-500"><Legend color="bg-white border" label="Ghế trống" /><Legend color="bg-amber-500" label="Đang chọn" /><Legend color="bg-rose-100" label="Đã bán" /><Legend color="bg-slate-300" label="Đang giữ" /><Legend color="bg-violet-100" label="VIP" /><Legend color="bg-pink-100" label="Ghế đôi" /></div>
            {selectedSeats.length > 0 && (
              <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-black">Đã chọn {selectedSeats.length} ghế</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedSeats.map(seatCode).join(", ")}
                    </p>
                  </div>
                  <b className="text-amber-600">Tạm tính {money(ticketSubtotal)}</b>
                </div>
                <button onClick={continueToPayment} className="mt-4 w-full rounded-xl bg-amber-500 py-3 font-black text-white">
                  Tiếp tục xác định khách hàng
                </button>
              </div>
            )}
          </>
        )}

        {!loading && step === 4 && (
          <div className="flex flex-col gap-4">
            <Back onClick={() => setStep(3)}>Chỉnh sửa ghế</Back>
            <div className="order-3">
              <Card title="3. Bắp nước" icon={<Popcorn size={19} />}>
              {loadingConcessions ? (
                <div className="grid min-h-28 place-items-center">
                  <Loader2 className="animate-spin text-amber-500" size={28} />
                </div>
              ) : combos.length === 0 && foodOptions.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  Hiện chưa có combo hoặc món lẻ đang bán.
                </p>
              ) : (
                <div className="space-y-5">
                  {combos.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="font-black text-slate-800">Combo</h4>
                        <span className="text-xs text-slate-400">Không bắt buộc</span>
                      </div>
                      <div className="grid gap-3 lg:grid-cols-2">
                        {combos.map((combo) => {
                          const quantity = selectedCombos.find((item) => item.comboId === combo.comboId)?.quantity || 0;
                          const available = Math.max(0, Number(combo.availableQuantity ?? 99));
                          return (
                            <div key={combo.comboId} className={`flex gap-3 rounded-2xl border p-3 ${quantity ? "border-amber-400 bg-amber-50/60" : "bg-white"}`}>
                              <img src={combo.imageUrl || "/favicon.svg"} alt="" className="h-20 w-20 shrink-0 rounded-xl bg-slate-100 object-cover" />
                              <div className="min-w-0 flex-1">
                                <b className="line-clamp-1">{combo.name}</b>
                                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{combo.description || combo.items.map((item) => `${item.quantity} ${item.displayName || item.foodItemName}`).join(", ")}</p>
                                <div className="mt-2 flex items-end justify-between gap-2">
                                  <div><b className="text-amber-600">{money(combo.price)}</b><p className="text-[11px] text-slate-400">{available > 0 ? `Còn tối đa ${available}` : "Hết hàng"}</p></div>
                                  <QuantityControl
                                    quantity={quantity}
                                    disabledIncrement={available === 0 || !canIncreaseCombo(combo.comboId)}
                                    onDecrease={() => updateComboQuantity(combo.comboId, -1)}
                                    onIncrease={() => updateComboQuantity(combo.comboId, 1)}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {foodOptions.length > 0 && (
                    <div className={combos.length ? "border-t pt-5" : ""}>
                      <h4 className="mb-3 font-black text-slate-800">Món lẻ</h4>
                      <div className="grid gap-3 lg:grid-cols-2">
                        {foodOptions.map((option) => {
                          const quantity = selectedFoodItems.find((item) => item.foodVariantId === option.foodVariantId)?.quantity || 0;
                          return (
                            <div key={option.foodVariantId} className={`flex items-center gap-3 rounded-2xl border p-3 ${quantity ? "border-amber-400 bg-amber-50/60" : "bg-white"}`}>
                              <img src={option.imageUrl || "/favicon.svg"} alt="" className="h-16 w-16 shrink-0 rounded-xl bg-slate-100 object-cover" />
                              <div className="min-w-0 flex-1">
                                <b className="line-clamp-2 text-sm">{option.displayName}</b>
                                <p className="mt-1 text-xs text-slate-400">{option.stockQuantity > 0 ? `Còn ${option.stockQuantity}` : "Hết hàng"}</p>
                                <b className="text-sm text-amber-600">{money(option.price)}</b>
                              </div>
                              <QuantityControl
                                quantity={quantity}
                                disabledIncrement={option.stockQuantity === 0 || !canIncreaseFood(option.foodVariantId)}
                                onDecrease={() => updateFoodQuantity(option.foodVariantId, -1)}
                                onIncrease={() => updateFoodQuantity(option.foodVariantId, 1)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              </Card>
            </div>
            <div className="order-2">
              <Card title="2. Lựa chọn giá vé hoặc quyền lợi" icon={<Ticket size={19} />}>
                {!customerReady ? (
                  <div className="rounded-xl border border-dashed bg-slate-50 p-5 text-center text-sm text-slate-500">
                    Hãy xác định khách vãng lai hoặc tra cứu tài khoản ở bước 1 để mở lựa chọn giá vé và quyền lợi.
                  </div>
                ) : (
                  <>
                    {!isMember ? (
                      <>
                        <p className="mb-3 text-sm text-slate-500">
                          Khách vãng lai có thể chọn giá Người lớn hoặc tích U22 một lần cho toàn bộ đơn.
                        </p>
                        <label className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 transition ${selectedTicketOption === "U22" ? "border-amber-500 bg-amber-50 text-amber-800" : "bg-white"}`}>
                          <span>
                            <b>Áp dụng U22 cho toàn bộ {selectedSeats.length} vé</b>
                            <p className="mt-1 text-xs opacity-70">Bỏ tích để trở về giá Người lớn.</p>
                          </span>
                          <input
                            type="checkbox"
                            className="h-5 w-5 accent-amber-500"
                            checked={selectedTicketOption === "U22"}
                            onChange={(event) => selectTicketOption(event.target.checked ? "U22" : "STANDARD")}
                          />
                        </label>
                      </>
                    ) : (
                      <>
                        <p className="mb-3 text-sm text-slate-500">
                          Chọn U22 hoặc quyền lợi vé miễn phí; hai quyền lợi không dùng cùng lúc. Không chọn thì tính giá Người lớn.
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => selectTicketOption(selectedTicketOption === "U22" ? "STANDARD" : "U22")}
                            className={`rounded-xl border p-4 text-left transition ${selectedTicketOption === "U22" ? "border-amber-500 bg-amber-50 text-amber-800" : "bg-white"}`}
                          >
                            <b>Áp dụng U22 cho toàn bộ vé</b>
                            <p className="mt-1 text-xs opacity-70">Kiểm tra giấy tờ một lần và vẫn tích điểm theo hạng.</p>
                          </button>
                          <div className={`flex items-center justify-between gap-3 rounded-xl border p-4 transition ${!canUseFreeTickets ? "cursor-not-allowed opacity-45" : selectedTicketOption === "FREE_TICKET" ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "bg-white"}`}>
                            <div className="min-w-0">
                              <b className="flex items-center gap-2"><Gift size={16} /> Dùng vé {configuredFreeTicketLabel} miễn phí</b>
                              <p className="mt-1 text-xs opacity-70">
                                {!memberMembership
                                  ? "Tài khoản chưa có Membership."
                                  : applicableMemberBenefits.length === 0
                                    ? `Không có vé ${configuredFreeTicketLabel} phù hợp suất chiếu này.`
                                    : freeTicketEligibleSeats.length === 0
                                      ? "Không áp dụng cho ghế Couple."
                                    : `Còn ${applicableMemberBenefits.length} vé phù hợp · chọn số lượng muốn dùng.`}
                              </p>
                            </div>
                            <input
                              type="number"
                              min={0}
                              max={freeTicketMaxQuantity}
                              disabled={!canUseFreeTickets}
                              value={appliedFreeBenefits.length}
                              onChange={(event) => setFreeTicketQuantity(Number(event.target.value || 0))}
                              aria-label="Số lượng vé miễn phí muốn sử dụng"
                              className="h-10 w-20 shrink-0 rounded-lg border bg-white px-3 text-center font-black text-emerald-700 outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                            />
                          </div>
                        </div>
                      </>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl bg-slate-50 p-3 text-sm">
                      <span><b>{adultSeats.length}</b> Người lớn</span>
                      <span><b>{u22SeatCount}</b> U22</span>
                      {selectedTicketOption === "FREE_TICKET" && (
                        <span className="font-bold text-emerald-700">
                          Dùng {appliedFreeBenefits.length} vé miễn phí
                        </span>
                      )}
                      <b className="ml-auto text-amber-600">{money(ticketSubtotal)}</b>
                    </div>
                    {selectedTicketOption === "FREE_TICKET" && (
                      <div className="mt-3 flex flex-wrap justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                        <span>Đã trừ quyền lợi vé miễn phí</span>
                        <b>-{money(memberTicketDiscount)} · Điểm vé miễn phí: +0</b>
                      </div>
                    )}
                  </>
                )}
              </Card>
            </div>
            <div className="order-1">
              <Card title="1. Xác định khách hàng" icon={<Users size={19} />}>
              <div className="flex gap-2">
                <Choice
                  active={customerConfirmed && !isMember}
                  onClick={() => {
                    setIsMember(false);
                    setCustomerConfirmed(true);
                    clearMemberLookup();
                    applyFareToAll("ADULT");
                  }}
                >
                  Khách vãng lai
                </Choice>
                <Choice
                  active={customerConfirmed && isMember}
                  onClick={() => {
                    setIsMember(true);
                    setCustomerConfirmed(true);
                    clearMemberLookup();
                    applyFareToAll("ADULT");
                  }}
                >
                  Có tài khoản
                </Choice>
              </div>

              {isMember && (
                <div className="mt-3 flex gap-2">
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-3 text-slate-400" size={17} />
                    <input
                      value={phone}
                      onChange={(event) => {
                        setPhone(event.target.value.replace(/\D/g, "").slice(0, 10));
                        setMember(null);
                        setMemberMembership(null);
                        setMemberBenefits([]);
                        setSelectedBenefitIds([]);
                        setMemberMessage("");
                      }}
                      className="w-full rounded-xl border py-2.5 pl-10"
                      placeholder="Số điện thoại thành viên"
                    />
                  </div>
                  <button onClick={lookupMember} className="rounded-xl bg-slate-950 px-4 font-bold text-white">
                    Tra cứu
                  </button>
                </div>
              )}

              {memberMessage && <p className="mt-2 text-sm text-rose-600">{memberMessage}</p>}

              {member && (
                <div className="mt-4 overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-sky-50 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-emerald-100 p-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-lg font-black text-white">
                        {(member.fullName || member.username || "?").trim().charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="truncate font-black text-slate-950">{member.fullName || member.username}</h4>
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                            <BadgeCheck size={13} /> Đang hoạt động
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">@{member.username}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="text-right">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${
                          memberMembership ? "bg-slate-950 text-white" : "bg-slate-200 text-slate-700"
                        }`}>
                          {memberMembership?.planName || "Thành viên thường"}
                        </span>
                        {memberMembership?.endAt && (
                          <p className="mt-1.5 text-[11px] text-slate-500">Hết hạn {memberDate(memberMembership.endAt)}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={clearMemberLookup}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-rose-600"
                        title="Đổi khách hàng"
                        aria-label="Đổi khách hàng"
                      >
                        <XCircle size={19} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-3">
                    <div className="rounded-xl bg-white/80 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Điểm hiện có</p>
                      <p className="mt-1 text-lg font-black text-slate-950">{member.loyaltyPoints || 0}</p>
                    </div>
                    <div className="rounded-xl bg-white/80 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Điểm dự kiến</p>
                      <p className="mt-1 text-lg font-black text-emerald-600">+{expectedPoints}</p>
                    </div>
                    <div className="rounded-xl bg-white/80 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Tiết kiệm đơn này</p>
                      <p className="mt-1 text-lg font-black text-amber-600">{money(memberTicketDiscount)}</p>
                    </div>
                  </div>

                  <div className="border-t border-emerald-100 px-4 py-3 text-xs">
                    {memberMembership ? (
                      <div className="flex flex-wrap gap-x-5 gap-y-2 text-slate-600">
                        <span className="font-semibold text-emerald-700">✓ Vé tích {memberMembership.ticketEarnPercent}%</span>
                        <span className="font-semibold text-emerald-700">✓ Bắp nước tích {memberMembership.concessionEarnPercent}%</span>
                        <span className="font-semibold text-emerald-700">✓ Chi tiêu chu kỳ {money(memberMembership.annualSpend)}</span>
                      </div>
                    ) : (
                      <p className="text-slate-500">Tài khoản chưa đăng ký Membership — giao dịch này không tích điểm và không cộng chi tiêu hạng.</p>
                    )}
                  </div>
                </div>
              )}
              </Card>
            </div>
            <div className="order-4">
              <Card title="4. Phương thức thanh toán" icon={<CreditCard size={19} />}><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><PaymentChoice active={paymentMethod === "CASH"} onClick={() => changePaymentMethod("CASH")} icon={<Banknote />} label="Tiền mặt" /><PaymentChoice active={paymentMethod === "MOMO"} onClick={() => changePaymentMethod("MOMO")} icon={<QrCode />} label="MoMo QR" /><PaymentChoice active={paymentMethod === "ZALOPAY"} onClick={() => changePaymentMethod("ZALOPAY")} icon={<QrCode />} label="ZaloPay QR" /><PaymentChoice active={paymentMethod === "BANK_TRANSFER"} onClick={() => changePaymentMethod("BANK_TRANSFER")} icon={<CreditCard />} label="Chuyển khoản" /></div>{paymentMethod === "BANK_TRANSFER" && <p className="mt-3 rounded-xl bg-sky-50 p-3 text-sm text-sky-700">Staff kiểm tra giao dịch trong ứng dụng ngân hàng trước khi xác nhận đã nhận tiền.</p>}</Card>
            </div>
          </div>
        )}
      </main>

      <aside className="w-[390px] shrink-0 overflow-auto border-l bg-slate-50 p-5">
        <div className="rounded-2xl border bg-white shadow-sm">
          <div className="border-b p-5">
            <h2 className="flex items-center gap-2 text-xl font-black">
              <Ticket className="text-amber-500" /> Tóm tắt đơn hàng
            </h2>
            <p className="mt-1 text-xs text-slate-500">Kiểm tra chi tiết trước khi xác nhận thanh toán</p>
          </div>
        {!movie ? (
          <div className="p-5"><Empty text="Chưa chọn phim" compact /></div>
        ) : (
          <div className="text-sm">
            <div className="m-4 rounded-xl bg-slate-950 p-4 text-white">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Phim</p>
              <b className="mt-1 block text-base">{movie.movieNameVn}</b>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-300">
                <span>{showtime ? formatLabel(showtime) : selectedFormat || "Chưa chọn định dạng"}</span>
                <span>{showtime?.cinemaRoomName || "Chưa chọn phòng"}</span>
                <span className="col-span-2">
                  {showtime ? `${showtime.showDate} · ${showtime.startTime.slice(0, 5)}` : "Chưa chọn suất chiếu"}
                </span>
              </div>
            </div>

            {selectedSeats.length > 0 && (
              <section className="border-t px-5 py-4">
                <div className="mb-2 flex items-center justify-between">
                  <b>Vé xem phim ({selectedSeats.length})</b>
                  <b>{money(ticketSubtotal)}</b>
                </div>
                {selectedSeats.map((seat) => (
                  <div key={seat.showtimeSeatId} className="flex justify-between gap-3 py-1.5 pl-3 text-xs text-slate-500">
                    <span>Ghế <b className="text-slate-700">{seatCode(seat)}</b> · {(fares[seat.showtimeSeatId] || "ADULT") === "U22" ? "U22" : "Người lớn"}</span>
                    <span className="shrink-0">{money(farePrice(seat, fares[seat.showtimeSeatId] || "ADULT", pricingConfig))}</span>
                  </div>
                ))}
              </section>
            )}

            <section className="border-t px-5 py-4">
              <div className="mb-2 flex items-center justify-between">
                <b>Bắp nước</b>
                <b>{money(concessionSubtotal)}</b>
              </div>
              {selectedComboDetails.length === 0 && selectedFoodDetails.length === 0 ? (
                <p className="pl-3 text-xs text-slate-400">Không chọn bắp nước</p>
              ) : (
                <>
                {selectedComboDetails.map((combo) => (
                  <div key={`combo-${combo.comboId}`} className="flex justify-between gap-3 py-1.5 pl-3 text-xs text-slate-500">
                    <span className="min-w-0"><b>{combo.quantity}×</b> {combo.name}</span>
                    <span className="shrink-0">{money(combo.price * combo.quantity)}</span>
                  </div>
                ))}
                {selectedFoodDetails.map((item) => (
                  <div key={`food-${item.foodVariantId}`} className="flex justify-between gap-3 py-1.5 pl-3 text-xs text-slate-500">
                    <span className="min-w-0"><b>{item.quantity}×</b> {item.displayName}</span>
                    <span className="shrink-0">{money(item.price * item.quantity)}</span>
                  </div>
                ))}
                </>
              )}
            </section>

            <section className="space-y-2 border-t px-5 py-4">
              <h3 className="mb-3 font-black">Chi tiết thanh toán</h3>
              <PriceLine label="Tiền vé" value={money(ticketSubtotal)} />
              <PriceLine label="Bắp nước" value={money(concessionSubtotal)} />
              <PriceLine label="Tổng tiền hàng" value={money(orderSubtotal)} />
              {memberTicketDiscount > 0 && (
                <PriceLine
                  label="Quyền lợi vé miễn phí"
                  value={`-${money(memberTicketDiscount)}`}
                  green
                />
              )}

              <PriceLine label="Điểm dự kiến" value={`+${expectedPoints}`} muted />
              <PriceLine label="Tạm tính" value={money(total)} />
              {totalSavings > 0 && (
                <div className="flex justify-between rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">
                  <span>Khách tiết kiệm</span>
                  <b>{money(totalSavings)}</b>
                </div>
              )}
              <div className="mt-3 flex items-end justify-between border-t pt-4">
                <div>
                  <span className="block text-lg font-black">Tổng thanh toán</span>
                  <span className="text-xs text-slate-400">{selectedSeats.length} vé</span>
                </div>
                <span className="text-2xl font-black text-rose-600">{money(total)}</span>
              </div>
            </section>

            <div className="border-t p-5">
              <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
                <span>Phương thức thanh toán</span>
                <b className="text-slate-800">{paymentMethod === "CASH" ? "Tiền mặt" : paymentMethod === "MOMO" ? "MoMo QR" : paymentMethod === "ZALOPAY" ? "ZaloPay QR" : "Chuyển khoản"}</b>
              </div>
              {step === 4 && (
                <button disabled={submitting || !selectedIds.length || !customerReady} onClick={checkout} className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-3.5 font-black text-white transition hover:bg-rose-700 disabled:opacity-50">
                {submitting && <Loader2 className="animate-spin" size={18} />}
                {paymentMethod === "CASH" ? "Xác nhận thu tiền" : paymentMethod === "MOMO" ? "Tạo mã QR MoMo" : paymentMethod === "ZALOPAY" ? "Tạo mã QR ZaloPay" : "Tạo đơn chuyển khoản"}
                </button>
              )}
              <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                <CircleAlert className="mr-1 inline" size={14} /> Chỉ phát hành vé và cộng điểm sau khi thanh toán thành công.
              </div>
            </div>
          </div>
        )}
        </div>
      </aside>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <section className="rounded-2xl bg-white p-5 shadow-sm"><h3 className="mb-4 flex items-center gap-2 font-black">{icon}{title}</h3>{children}</section>;
}
function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-xl border px-4 py-2 font-bold ${active ? "border-slate-950 bg-slate-950 text-white" : ""}`}>{children}</button>;
}
function PaymentChoice({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return <button onClick={onClick} className={`flex items-center justify-center gap-2 rounded-xl border p-4 font-bold ${active ? "border-amber-500 bg-amber-50 text-amber-700" : ""}`}>{icon}{label}</button>;
}
function QuantityControl({
  quantity,
  disabledIncrement,
  onDecrease,
  onIncrease,
}: {
  quantity: number;
  disabledIncrement: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center overflow-hidden rounded-lg border bg-white">
      <button type="button" disabled={quantity === 0} onClick={onDecrease} aria-label="Giảm số lượng" className="grid h-8 w-8 place-items-center text-slate-500 disabled:opacity-30">
        <Minus size={14} />
      </button>
      <b className="min-w-7 text-center text-sm">{quantity}</b>
      <button type="button" disabled={disabledIncrement} onClick={onIncrease} aria-label="Tăng số lượng" className="grid h-8 w-8 place-items-center text-amber-600 disabled:opacity-30">
        <Plus size={14} />
      </button>
    </div>
  );
}
function Summary({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-bold uppercase text-slate-400">{label}</p><b className="text-slate-900">{value}</b></div>;
}
function TicketInfo({ label, value }: { label: string; value: string }) {
  return <div><p className="ticket-label">{label}</p><b className="mt-1 block text-sm text-slate-950">{value}</b></div>;
}
function Back({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className="mb-4 flex items-center gap-1 font-bold text-amber-600"><ChevronLeft size={18} />{children}</button>;
}
function Legend({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1.5"><i className={`h-3 w-3 rounded ${color}`} />{label}</span>;
}
function Empty({ text, compact = false }: { text: string; compact?: boolean }) {
  return <div className={`grid place-items-center rounded-2xl border border-dashed text-center text-slate-400 ${compact ? "mt-16 py-10" : "min-h-40 bg-white"}`}>{text}</div>;
}
function PriceLine({ label, value, green, muted }: { label: string; value: string; green?: boolean; muted?: boolean }) {
  return <div className={`flex justify-between ${green ? "text-emerald-600" : muted ? "text-slate-500" : ""}`}><span>{label}</span><b>{value}</b></div>;
}
