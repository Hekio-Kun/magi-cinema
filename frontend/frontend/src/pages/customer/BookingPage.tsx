import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Check,
  Clock,
  CreditCard,
  Film,
  Gift,
  Loader2,
  RefreshCw,
  ShoppingBag,
  Ticket,
  XCircle,
} from 'lucide-react';
import { showtimeApi, ShowtimeResponse } from '@/api/showtimeApi';
import { showtimeSeatService } from '@/api/showtimeSeatApi';
import { bookingApi, type BookingResponse } from '@/api/bookingApi';
import { paymentApi } from '@/api/paymentApi';
import { promotionApi, type PromotionEvaluation } from '@/api/promotionApi';
import { comboApi, ComboResponse, FoodItemResponse, FoodVariantResponse } from '@/api/comboApi';
import { movieService } from '@/api/movieApi';
import { isMembershipFreeTicketApplicable, membershipApi, membershipFreeTicketLabel, type Membership, type MembershipBenefit } from '@/api/membershipApi';
import { ShowtimeSeat } from '@/types/seat';
import { SeatMap } from '@/components/booking/SeatMap';
import { ComboSelector } from '@/components/booking/ComboSelector';
import { Header } from '@/components/Header';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { formatPresentationLabelFromFields } from '@/utils/presentation';
import { ticketPricingApi, type TicketPriceConfig } from '@/api/ticketPricingApi';

type BookingStep = 1 | 2;
type PaymentMethod = 'ZALOPAY' | 'MOMO';
type SelectedCombo = { comboId: number; quantity: number };
type SelectedFoodItem = { foodVariantId: number; quantity: number };
type ApiError = {
  message?: string;
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
};
type SeatStatusRealtimeMessage = {
  type?: string;
  showtimeId?: number;
  seats?: {
    showtimeSeatId?: number;
    status?: ShowtimeSeat['status'];
    selectionHoldToken?: string | null;
  }[];
};

const DEFAULT_BASE_PRICE = 75000;
const SEAT_SURCHARGES: Record<string, number> = {
  NORMAL: 0,
  VIP: 15000,
  COUPLE: 75000,
  DISABLED: 0,
};
const EARLY_BOOKING_WINDOW_DAYS = 7;

const seatTypeLabel: Record<string, string> = {
  NORMAL: 'Thường',
  VIP: 'VIP',
  COUPLE: 'Đôi',
  DISABLED: 'Ghế',
};

const formatCurrency = (value: number) =>
  value.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

const getApiError = (error: unknown) => error as ApiError;

const getApiErrorMessage = (error: unknown, fallback: string) => {
  const apiError = getApiError(error);
  return apiError.response?.data?.message || apiError.message || fallback;
};

const updateItemQuantity = <T extends { quantity: number }>(
  items: T[],
  isTarget: (item: T) => boolean,
  createItem: () => T,
  delta: number
): T[] => {
  const existing = items.find(isTarget);
  if (!existing) return delta > 0 ? [...items, createItem()] : items;

  const quantity = existing.quantity + delta;
  if (quantity <= 0) return items.filter((item) => !isTarget(item));
  return items.map((item) => (isTarget(item) ? { ...item, quantity } : item));
};

const getFoodVariantDisplayName = (food: FoodItemResponse, variant: FoodVariantResponse) => {
  if (variant.displayName) return variant.displayName;
  const parts = [food.name];
  if (variant.variantName && variant.variantName.trim().toLowerCase() !== 'mặc định') parts.push(variant.variantName.trim());
  if (variant.sizeLabel?.trim()) parts.push(`Size ${variant.sizeLabel.trim()}`);
  if (variant.flavor?.trim()) parts.push(variant.flavor.trim());
  return parts.join(' - ');
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Chưa cập nhật';
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatTime = (value?: string | null) => (value ? value.slice(0, 5) : '--:--');

const formatPresentationLabel = (showtime?: ShowtimeResponse | null) =>
  formatPresentationLabelFromFields(showtime);

const formatDateTime = (value?: string | Date | null) => {
  if (!value) return 'chưa rõ';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
};

const getCurrentTimestamp = () => Date.now();

const useCurrentTimestamp = () => {
  const [currentTimestamp, setCurrentTimestamp] = useState(getCurrentTimestamp);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTimestamp(getCurrentTimestamp());
    }, 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  return currentTimestamp;
};

const buildDateTime = (date?: string | null, time?: string | null) => {
  if (!date || !time) return null;
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute, second = 0] = time.split(':').map(Number);
  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return new Date(year, month - 1, day, hour, minute, second);
};

const buildSeatWebSocketUrl = (showtimeId: number) => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  const url = new URL(apiUrl, window.location.origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/ws/seat-updates';
  url.search = '';
  url.searchParams.set('showtimeId', String(showtimeId));
  return url.toString();
};

const getOrCreateSeatSelectionToken = (showtimeId: number) => {
  const storageKey = `seat-selection-token:${showtimeId}`;
  const storedToken = sessionStorage.getItem(storageKey);
  const token = storedToken || window.crypto.randomUUID();
  sessionStorage.setItem(storageKey, token);
  return token;
};

const getSeatPrice = (seat?: ShowtimeSeat, config?: TicketPriceConfig | null) => {
  if (!seat) return 0;
  if (typeof seat.finalPrice === 'number') return seat.finalPrice;
  const basePrice = typeof seat.basePrice === 'number' ? seat.basePrice : (config?.standard2dPrice ?? DEFAULT_BASE_PRICE);
  const surcharge = typeof seat.seatSurcharge === 'number'
    ? seat.seatSurcharge
    : (seat.seatType === 'VIP'
      ? (config?.vipSeatSurcharge ?? SEAT_SURCHARGES['VIP'])
      : seat.seatType === 'COUPLE'
      ? (config?.coupleSeatSurcharge ?? SEAT_SURCHARGES['COUPLE'])
      : (SEAT_SURCHARGES[seat.seatType || 'NORMAL'] ?? 0));
  return basePrice + surcharge;
};

const getSeatDisplayCode = (seat: ShowtimeSeat) =>
  seat.seatCode || `${seat.seatRow || ''}${seat.seatNumber ?? ''}`.trim() || 'ghế đôi';

const sortSeatsByNumber = (left: ShowtimeSeat, right: ShowtimeSeat) => {
  const numberDiff = (left.seatNumber ?? 0) - (right.seatNumber ?? 0);
  return numberDiff || left.showtimeSeatId - right.showtimeSeatId;
};

const getCouplePartnerSeat = (seat: ShowtimeSeat, seats: ShowtimeSeat[]) => {
  if (seat.seatType !== 'COUPLE' || !seat.seatRow) return null;

  const rowCoupleSeats = seats
    .filter((item) => item.seatType === 'COUPLE' && item.seatRow === seat.seatRow)
    .sort(sortSeatsByNumber);
  const seatIndex = rowCoupleSeats.findIndex((item) => item.showtimeSeatId === seat.showtimeSeatId);
  if (seatIndex < 0) return null;

  const partnerIndex = seatIndex % 2 === 0 ? seatIndex + 1 : seatIndex - 1;
  return rowCoupleSeats[partnerIndex] || null;
};

const getCoupleSeatSelectionError = (selectedSeats: ShowtimeSeat[], seats: ShowtimeSeat[]) => {
  const selectedSeatIds = new Set(selectedSeats.map((seat) => seat.showtimeSeatId));

  for (const seat of selectedSeats) {
    if (seat.seatType !== 'COUPLE') continue;

    const partnerSeat = getCouplePartnerSeat(seat, seats);
    if (!partnerSeat || !selectedSeatIds.has(partnerSeat.showtimeSeatId)) {
      const partnerLabel = partnerSeat ? getSeatDisplayCode(partnerSeat) : 'ghế liền kề';
      return `Ghế đôi ${getSeatDisplayCode(seat)} phải chọn cùng ${partnerLabel}.`;
    }
  }

  return '';
};

const isSeatBlockedAfterSelection = (seat: ShowtimeSeat, selectedSeatIds: Set<number>) =>
  selectedSeatIds.has(seat.showtimeSeatId) || seat.status === 'BOOKED' || seat.status === 'HOLDING';

const isEmptyAfterSelection = (seat: ShowtimeSeat, selectedSeatIds: Set<number>) =>
  seat.status === 'AVAILABLE' && !selectedSeatIds.has(seat.showtimeSeatId);

const getSeatGapSelectionError = (selectedSeats: ShowtimeSeat[], seats: ShowtimeSeat[]) => {
  const selectedSeatIds = new Set(selectedSeats.map((seat) => seat.showtimeSeatId));
  const selectedRows = new Set(selectedSeats.map((seat) => seat.seatRow || 'Khác'));
  const seatsByRow = seats.reduce((rows, seat) => {
    const rowName = seat.seatRow || 'Khác';
    const rowSeats = rows.get(rowName) || [];
    rowSeats.push(seat);
    rows.set(rowName, rowSeats);
    return rows;
  }, new Map<string, ShowtimeSeat[]>());

  for (const [rowName, rowSeats] of seatsByRow) {
    if (!selectedRows.has(rowName)) continue;

    const sortedSeats = [...rowSeats].sort(sortSeatsByNumber);
    for (let index = 0; index < sortedSeats.length; index += 1) {
      const seat = sortedSeats[index];
      if (!isEmptyAfterSelection(seat, selectedSeatIds)) continue;

      const leftSeat = index > 0 ? sortedSeats[index - 1] : null;
      const rightSeat = index < sortedSeats.length - 1 ? sortedSeats[index + 1] : null;
      const hasSelectedNeighbor =
        (leftSeat != null && selectedSeatIds.has(leftSeat.showtimeSeatId)) ||
        (rightSeat != null && selectedSeatIds.has(rightSeat.showtimeSeatId));

      if (!hasSelectedNeighbor) continue;

      const leftBlocked = leftSeat == null || isSeatBlockedAfterSelection(leftSeat, selectedSeatIds);
      const rightBlocked = rightSeat == null || isSeatBlockedAfterSelection(rightSeat, selectedSeatIds);
      if (leftBlocked && rightBlocked) {
        return `Không được để trống lẻ ghế ${getSeatDisplayCode(seat)}. Vui lòng chọn thêm ghế đó hoặc chọn nhóm ghế khác.`;
      }
    }
  }

  return '';
};

export default function BookingPage() {
  const { showtimeId } = useParams();
  const navigate = useNavigate();
  const parsedShowtimeId = Number(showtimeId);
  const currentTimestamp = useCurrentTimestamp();

  const [showtime, setShowtime] = useState<ShowtimeResponse | null>(null);
  const [pricingConfig, setPricingConfig] = useState<TicketPriceConfig | null>(null);
  const [seats, setSeats] = useState<ShowtimeSeat[]>([]);
  const [combos, setCombos] = useState<ComboResponse[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItemResponse[]>([]);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [membershipBenefits, setMembershipBenefits] = useState<MembershipBenefit[]>([]);
  const [selectedBenefitIds, setSelectedBenefitIds] = useState<number[]>([]);
  const [pendingBooking, setPendingBooking] = useState<BookingResponse | null>(null);
  const [movieName, setMovieName] = useState('');
  const [step, setStep] = useState<BookingStep>(1);
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  const [selectionHoldExpiresAt, setSelectionHoldExpiresAt] = useState<string | null>(null);
  const [selectedCombos, setSelectedCombos] = useState<SelectedCombo[]>([]);
  const [selectedFoodItems, setSelectedFoodItems] = useState<SelectedFoodItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingSeats, setIsRefreshingSeats] = useState(false);
  const [isUpdatingSeatSelection, setIsUpdatingSeatSelection] = useState(false);
  const [isRefreshingProducts, setIsRefreshingProducts] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [isPayingPending, setIsPayingPending] = useState(false);
  const [isCancellingHold, setIsCancellingHold] = useState(false);
  const [cancelPendingOpen, setCancelPendingOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ZALOPAY');
  const [voucherInput, setVoucherInput] = useState('');
  const [appliedPromotion, setAppliedPromotion] = useState<PromotionEvaluation | null>(null);
  const [isValidatingPromotion, setIsValidatingPromotion] = useState(false);
  const seatSelectionTokenRef = useRef('');

  const loadSeats = useCallback(async (id: number, quiet = false) => {
    if (!quiet) setIsRefreshingSeats(true);
    try {
      const clientToken = getOrCreateSeatSelectionToken(id);
      seatSelectionTokenRef.current = clientToken;
      const [seatsData, selection] = await Promise.all([
        showtimeSeatService.getShowtimeSeats({ showtimeId: id, size: 500 }),
        showtimeSeatService.getCurrentSelection(id, clientToken),
      ]);
      setSeats(seatsData.content || []);
      setSelectedSeatIds(selection.showtimeSeatIds || []);
      setSelectionHoldExpiresAt(selection.expiresAt || null);
      if (selection.clientToken) {
        seatSelectionTokenRef.current = selection.clientToken;
        sessionStorage.setItem(`seat-selection-token:${id}`, selection.clientToken);
      }
    } finally {
      if (!quiet) setIsRefreshingSeats(false);
    }
  }, []);

  const loadPendingBooking = useCallback(async (id: number) => {
    try {
      const pending = await bookingApi.getPendingBookingByShowtime(id);
      setPendingBooking(pending);
    } catch (error: unknown) {
      const status = getApiError(error).response?.status;
      if (status !== 401 && status !== 403) {
        console.error(error);
      }
      setPendingBooking(null);
    }
  }, []);

  const loadConcessionProducts = useCallback(async (quiet = false) => {
    if (!quiet) setIsRefreshingProducts(true);
    try {
      const [combosData, foodItemsData] = await Promise.all([
        comboApi.getCombos(),
        comboApi.getFoodItems(),
      ]);
      setCombos(combosData || []);
      setFoodItems(foodItemsData || []);
    } catch (error) {
      toast.error('Không thể tải danh sách bắp nước');
      console.error(error);
    } finally {
      if (!quiet) setIsRefreshingProducts(false);
    }
  }, []);

  const loadData = useCallback(async (id: number) => {
    try {
      setIsLoading(true);
      const clientToken = getOrCreateSeatSelectionToken(id);
      seatSelectionTokenRef.current = clientToken;
      const showtimeData = await showtimeApi.getShowtimeById(id);
      const [seatsData, combosData, foodItemsData, movieData, selection, pricingConfigData] = await Promise.all([
        showtimeSeatService.getShowtimeSeats({ showtimeId: id, size: 500 }),
        comboApi.getCombos(),
        comboApi.getFoodItems(),
        movieService.getById(showtimeData.movieId),
        showtimeSeatService.getCurrentSelection(id, clientToken),
        ticketPricingApi.getConfig().catch(() => null),
      ]);

      setShowtime(showtimeData);
      setPricingConfig(pricingConfigData);
      setSeats(seatsData.content || []);
      setCombos(combosData || []);
      setFoodItems(foodItemsData || []);
      setMovieName(movieData.movieNameVn || movieData.title || 'Phim đang chọn');
      setSelectedSeatIds(selection.showtimeSeatIds || []);
      setSelectionHoldExpiresAt(selection.expiresAt || null);
      if (selection.clientToken) {
        seatSelectionTokenRef.current = selection.clientToken;
        sessionStorage.setItem(`seat-selection-token:${id}`, selection.clientToken);
      } else {
        seatSelectionTokenRef.current = sessionStorage.getItem(`seat-selection-token:${id}`) || '';
      }
    } catch (error) {
      toast.error('Lỗi khi tải dữ liệu suất chiếu');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (Number.isFinite(parsedShowtimeId) && parsedShowtimeId > 0) {
      // Loading route data is the external synchronization owned by this effect.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadData(parsedShowtimeId);
      loadPendingBooking(parsedShowtimeId);
    } else {
      setIsLoading(false);
    }
  }, [loadData, loadPendingBooking, parsedShowtimeId]);

  useEffect(() => {
    Promise.all([
      membershipApi.getMine(),
      membershipApi.getBenefits().catch(() => []),
    ])
      .then(([activeMembership, benefits]) => {
        setMembership(activeMembership);
        setMembershipBenefits(benefits || []);
      })
      .catch(() => {
        setMembership(null);
        setMembershipBenefits([]);
      });
  }, []);

  useEffect(() => {
    if (!Number.isFinite(parsedShowtimeId) || parsedShowtimeId <= 0) return;

    let isClosedByComponent = false;
    let reconnectTimer: number | undefined;
    let socket: WebSocket | null = null;

    const connect = () => {
      socket = new WebSocket(buildSeatWebSocketUrl(parsedShowtimeId));

      socket.onmessage = (event) => {
        let message: SeatStatusRealtimeMessage;
        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }

        if (message.type !== 'SEAT_STATUS_CHANGED' || message.showtimeId !== parsedShowtimeId || !message.seats?.length) {
          return;
        }

        const statusBySeatId = new Map(
          message.seats
            .filter((seat) => typeof seat.showtimeSeatId === 'number' && seat.status)
            .map((seat) => [seat.showtimeSeatId as number, seat.status as ShowtimeSeat['status']])
        );
        if (statusBySeatId.size === 0) return;

        setSeats((currentSeats) =>
          currentSeats.map((seat) => {
            const nextStatus = statusBySeatId.get(seat.showtimeSeatId);
            return nextStatus ? { ...seat, status: nextStatus } : seat;
          })
        );

        setSelectedSeatIds((current) => {
          const next = new Set(current);
          message.seats?.forEach((seat) => {
            if (typeof seat.showtimeSeatId !== 'number' || !seat.status) return;
            const isOwnSelectionHold =
              seat.status === 'HOLDING'
              && !!seat.selectionHoldToken
              && seat.selectionHoldToken === seatSelectionTokenRef.current;
            if (isOwnSelectionHold) {
              next.add(seat.showtimeSeatId);
            } else {
              next.delete(seat.showtimeSeatId);
            }
          });
          return Array.from(next);
        });

        setPendingBooking((current) => {
          if (!current?.showtimeSeatIds?.length) return current;

          const hasOwnSeatChanged = current.showtimeSeatIds.some((id) => statusBySeatId.has(id));
          if (!hasOwnSeatChanged) return current;

          const ownSeatsStillHolding = current.showtimeSeatIds.every((id) => {
            const nextStatus = statusBySeatId.get(id);
            return !nextStatus || nextStatus === 'HOLDING';
          });
          return ownSeatsStillHolding ? current : null;
        });
      };

      socket.onclose = () => {
        if (isClosedByComponent) return;
        reconnectTimer = window.setTimeout(connect, 2500);
      };

      socket.onerror = () => {
        socket?.close();
      };
    };

    connect();

    return () => {
      isClosedByComponent = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [parsedShowtimeId]);

  const selectedSeats = useMemo(
    () =>
      selectedSeatIds
        .map((id) => seats.find((seat) => seat.showtimeSeatId === id))
        .filter(Boolean) as ShowtimeSeat[],
    [seats, selectedSeatIds]
  );

  const coupleSeatSelectionError = useMemo(
    () => getCoupleSeatSelectionError(selectedSeats, seats),
    [seats, selectedSeats]
  );

  const seatGapSelectionError = useMemo(
    () => getSeatGapSelectionError(selectedSeats, seats),
    [seats, selectedSeats]
  );

  const seatSelectionError = coupleSeatSelectionError || seatGapSelectionError;

  const selectedComboDetails = useMemo(
    () =>
      selectedCombos
        .map((selectedCombo) => {
          const combo = combos.find((item) => item.comboId === selectedCombo.comboId);
          return combo ? { ...combo, quantity: selectedCombo.quantity } : null;
        })
        .filter(Boolean) as (ComboResponse & { quantity: number })[],
    [combos, selectedCombos]
  );

  const foodVariantById = useMemo(() => {
    const variants = new Map<number, { food: FoodItemResponse; variant: FoodVariantResponse }>();
    foodItems.forEach((food) => {
      (food.variants || []).forEach((variant) => {
        if (variant.foodVariantId) {
          variants.set(Number(variant.foodVariantId), { food, variant });
        }
      });
    });
    return variants;
  }, [foodItems]);

  const selectedFoodItemDetails = useMemo(
    () =>
      selectedFoodItems
        .map((selectedItem) => {
          const entry = foodVariantById.get(selectedItem.foodVariantId);
          return entry
            ? {
                foodVariantId: selectedItem.foodVariantId,
                quantity: selectedItem.quantity,
                name: getFoodVariantDisplayName(entry.food, entry.variant),
                price: Number(entry.variant.price || 0),
            }
            : null;
        })
        .filter(Boolean) as { foodVariantId: number; quantity: number; name: string; price: number }[],
    [foodVariantById, selectedFoodItems]
  );

  const pendingConcessionItems = useMemo(
    () => [...(pendingBooking?.combos || []), ...(pendingBooking?.foodItems || [])],
    [pendingBooking]
  );

  const comboById = useMemo(
    () => new Map(combos.map((combo) => [combo.comboId, combo])),
    [combos]
  );

  const foodVariantStockMap = useMemo(() => {
    const stockMap = new Map<number, number>();
    foodVariantById.forEach(({ food, variant }, foodVariantId) => {
      if (!food.isActive) return;
      if (!variant.isActive) return;
      stockMap.set(foodVariantId, Number(variant.stockQuantity || 0));
    });
    return stockMap;
  }, [foodVariantById]);

  const buildConcessionRequirements = useCallback((
    comboSelections: SelectedCombo[],
    foodSelections: SelectedFoodItem[]
  ) => {
    const requirements = new Map<number, number>();
    let valid = true;
    const addRequirement = (foodVariantId: number, quantity: number) => {
      if (!foodVariantId || quantity <= 0) return;
      requirements.set(foodVariantId, (requirements.get(foodVariantId) || 0) + quantity);
    };

    comboSelections.forEach((selectedCombo) => {
      const combo = comboById.get(selectedCombo.comboId);
      if (!combo || combo.status !== 'ACTIVE' || !combo.items?.length || selectedCombo.quantity < 1) {
        valid = false;
        return;
      }
      combo.items.forEach((item) => {
        if (!item.foodVariantId) {
          valid = false;
          return;
        }
        addRequirement(Number(item.foodVariantId), Math.max(1, Number(item.quantity || 1)) * selectedCombo.quantity);
      });
    });

    foodSelections.forEach((selectedFood) => {
      if (!foodVariantStockMap.has(selectedFood.foodVariantId) || selectedFood.quantity < 1) {
        valid = false;
        return;
      }
      addRequirement(selectedFood.foodVariantId, selectedFood.quantity);
    });

    return { valid, requirements };
  }, [comboById, foodVariantStockMap]);

  const isConcessionSelectionWithinStock = useCallback((
    comboSelections: SelectedCombo[],
    foodSelections: SelectedFoodItem[]
  ) => {
    const { valid, requirements } = buildConcessionRequirements(comboSelections, foodSelections);
    if (!valid) return false;

    for (const [foodVariantId, requiredQuantity] of requirements) {
      if (requiredQuantity > (foodVariantStockMap.get(foodVariantId) || 0)) {
        return false;
      }
    }

    return true;
  }, [buildConcessionRequirements, foodVariantStockMap]);

  const calculateMaxSelectableComboQuantity = useCallback((
    comboId: number,
    comboSelections: SelectedCombo[],
    foodSelections: SelectedFoodItem[]
  ) => {
    const combo = comboById.get(comboId);
    if (!combo || combo.status !== 'ACTIVE' || !combo.items?.length) return 0;

    const otherCombos = comboSelections.filter((selectedCombo) => selectedCombo.comboId !== comboId);
    const baseRequirements = buildConcessionRequirements(otherCombos, foodSelections);
    if (!baseRequirements.valid) return 0;

    let maxQuantity = Number.POSITIVE_INFINITY;
    for (const item of combo.items) {
      if (!item.foodVariantId) return 0;
      const componentQuantity = Math.max(1, Number(item.quantity || 1));
      const stock = foodVariantStockMap.get(Number(item.foodVariantId)) || 0;
      const usedByOthers = baseRequirements.requirements.get(Number(item.foodVariantId)) || 0;
      maxQuantity = Math.min(maxQuantity, Math.floor(Math.max(0, stock - usedByOthers) / componentQuantity));
    }

    return Number.isFinite(maxQuantity) ? Math.max(0, maxQuantity) : 0;
  }, [buildConcessionRequirements, comboById, foodVariantStockMap]);

  const calculateMaxSelectableFoodQuantity = useCallback((
    foodVariantId: number,
    comboSelections: SelectedCombo[],
    foodSelections: SelectedFoodItem[]
  ) => {
    if (!foodVariantStockMap.has(foodVariantId)) return 0;
    const otherFoodItems = foodSelections.filter((selectedFood) => selectedFood.foodVariantId !== foodVariantId);
    const baseRequirements = buildConcessionRequirements(comboSelections, otherFoodItems);
    if (!baseRequirements.valid) return 0;
    const stock = foodVariantStockMap.get(foodVariantId) || 0;
    const usedByOthers = baseRequirements.requirements.get(foodVariantId) || 0;
    return Math.max(0, stock - usedByOthers);
  }, [buildConcessionRequirements, foodVariantStockMap]);

  const getComboMaxQuantity = useCallback(
    (comboId: number) => calculateMaxSelectableComboQuantity(comboId, selectedCombos, selectedFoodItems),
    [calculateMaxSelectableComboQuantity, selectedCombos, selectedFoodItems]
  );

  const getFoodItemMaxQuantity = useCallback(
    (foodVariantId: number) => calculateMaxSelectableFoodQuantity(foodVariantId, selectedCombos, selectedFoodItems),
    [calculateMaxSelectableFoodQuantity, selectedCombos, selectedFoodItems]
  );

  useEffect(() => {
    // Reconcile the controlled selection whenever combo ingredients or food stock changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedCombos((current) => {
      let changed = false;
      const next = current
        .map((selectedCombo) => {
          const maxQuantity = calculateMaxSelectableComboQuantity(selectedCombo.comboId, current, selectedFoodItems);
          const quantity = Math.min(selectedCombo.quantity, maxQuantity);
          if (quantity !== selectedCombo.quantity) changed = true;
          return { ...selectedCombo, quantity };
        })
        .filter((selectedCombo) => {
          const keep = selectedCombo.quantity > 0;
          if (!keep) changed = true;
          return keep;
        });
      return changed ? next : current;
    });
  }, [calculateMaxSelectableComboQuantity, selectedFoodItems]);

  useEffect(() => {
    // Reconcile the controlled selection whenever food availability changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedFoodItems((current) => {
      let changed = false;
      const next = current
        .map((selectedFood) => {
          const maxQuantity = calculateMaxSelectableFoodQuantity(selectedFood.foodVariantId, selectedCombos, current);
          const quantity = Math.min(selectedFood.quantity, maxQuantity);
          if (quantity !== selectedFood.quantity) changed = true;
          return { ...selectedFood, quantity };
        })
        .filter((selectedFood) => {
          const keep = selectedFood.quantity > 0;
          if (!keep) changed = true;
          return keep;
        });
      return changed ? next : current;
    });
  }, [calculateMaxSelectableFoodQuantity, selectedCombos]);

  const seatTotal = useMemo(
    () => selectedSeats.reduce((sum, seat) => sum + getSeatPrice(seat, pricingConfig), 0),
    [selectedSeats, pricingConfig]
  );

  const comboTotal = useMemo(
    () => selectedComboDetails.reduce((sum, combo) => sum + combo.price * combo.quantity, 0),
    [selectedComboDetails]
  );

  const foodTotal = useMemo(
    () => selectedFoodItemDetails.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [selectedFoodItemDetails]
  );

  const availableMembershipBenefits = useMemo(
    () => membershipBenefits.filter((benefit) => benefit.status === 'AVAILABLE' && benefit.type === 'FREE_2D_TICKET'),
    [membershipBenefits],
  );
  const applicableMembershipBenefits = availableMembershipBenefits.filter(benefit =>
    isMembershipFreeTicketApplicable(benefit.freeTicketType, showtime?.presentationFormat, showtime?.projectionType));
  const freeTicketEligibleSeats = selectedSeats.filter(seat => seat.seatType !== 'COUPLE');
  const selectedFreeTicketBenefits = availableMembershipBenefits.filter(
    (benefit) => benefit.type === 'FREE_2D_TICKET' && selectedBenefitIds.includes(benefit.benefitId),
  );
  const appliedFreeTicketBenefits = selectedFreeTicketBenefits
    .filter(benefit => applicableMembershipBenefits.some(item => item.benefitId === benefit.benefitId))
    .slice(0, freeTicketEligibleSeats.length);
  const appliedBenefitIds = appliedFreeTicketBenefits.map((benefit) => benefit.benefitId);
  const waivedBasePrice = Number(showtime?.basePrice || 75_000);
  const membershipTicketDiscount = freeTicketEligibleSeats.slice(0, appliedFreeTicketBenefits.length)
    .reduce((sum, seat) => sum + Math.min(getSeatPrice(seat, pricingConfig), waivedBasePrice), 0);
  const membershipConcessionDiscount = 0;
  const ticketAfterBenefits = Math.max(0, seatTotal - membershipTicketDiscount);
  const concessionAfterBenefits = Math.max(0, comboTotal + foodTotal - membershipConcessionDiscount);
  const afterBenefits = ticketAfterBenefits + concessionAfterBenefits;
  const promotionDiscount = appliedPromotion?.originalAmount === afterBenefits
    ? appliedPromotion.discountAmount
    : 0;
  const membershipRewardDiscount = 0;
  const availableMembershipVouchers: any[] = [];
  const selectedMembershipRewardCode = "";
  const setSelectedMembershipRewardCode = (code: string) => {};
  const selectedMembershipReward: any = null;
  const membershipRewardApplicable = false;
  const totalAmount = Math.max(0, afterBenefits - membershipRewardDiscount);
  const finalAmount = Math.max(0, totalAmount - (promotionDiscount || 0));
  const ticketPaid = afterBenefits > 0 ? Math.floor(finalAmount * ticketAfterBenefits / afterBenefits) : 0;
  const concessionPaid = finalAmount - ticketPaid;
  const expectedPoints = membership ? Math.floor(
    ticketPaid * membership.ticketEarnPercent / 100
    + concessionPaid * membership.concessionEarnPercent / 100,
  ) : 0;
  const selectedConcessionCount = selectedCombos.length + selectedFoodItems.length;

  const ownHoldingSeatIds = useMemo(
    () => pendingBooking?.showtimeSeatIds || [],
    [pendingBooking?.showtimeSeatIds]
  );

  const startsAt = useMemo(
    () => buildDateTime(showtime?.showDate, showtime?.startTime),
    [showtime?.showDate, showtime?.startTime]
  );

  const isShowtimeClosed = useMemo(() => {
    const status = String(showtime?.status || '');
    if (status === 'CANCELLED' || status === 'COMPLETED') return true;
    return startsAt ? startsAt.getTime() <= currentTimestamp : false;
  }, [currentTimestamp, showtime?.status, startsAt]);

  const bookingOpensAt = useMemo(() => {
    if (!startsAt) return null;
    return new Date(startsAt.getTime() - EARLY_BOOKING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  }, [startsAt]);

  const isBookingNotOpenYet = useMemo(
    () => (bookingOpensAt ? currentTimestamp < bookingOpensAt.getTime() : false),
    [bookingOpensAt, currentTimestamp]
  );

  const isBookingBlocked = isShowtimeClosed || isBookingNotOpenYet;

  const showtimePresentationLabel = useMemo(
    () => formatPresentationLabel(showtime),
    [showtime]
  );

  const bookingNotOpenMessage = bookingOpensAt
    ? `Suất chiếu này sẽ mở đặt vé từ ${formatDateTime(bookingOpensAt)}.`
    : 'Suất chiếu này chưa mở đặt vé.';

  const seatStats = useMemo(() => {
    const total = seats.length;
    const available = seats.filter((seat) => seat.status === 'AVAILABLE').length;
    const locked = seats.filter((seat) => seat.status === 'BOOKED' || seat.status === 'HOLDING').length;
    return { total, available, locked };
  }, [seats]);

  const getSeatSelectionToken = () => {
    if (seatSelectionTokenRef.current) return seatSelectionTokenRef.current;

    const token = getOrCreateSeatSelectionToken(parsedShowtimeId);
    seatSelectionTokenRef.current = token;
    return token;
  };

  const persistSeatSelection = async (nextSeatIds: number[], previousSeatIds: number[]) => {
    setSelectedSeatIds(nextSeatIds);
    setIsUpdatingSeatSelection(true);
    try {
      const selection = await showtimeSeatService.updateSelection(
        parsedShowtimeId,
        nextSeatIds,
        getSeatSelectionToken()
      );
      const confirmedIds = selection.showtimeSeatIds || [];
      const confirmedIdSet = new Set(confirmedIds);
      const previousIdSet = new Set(previousSeatIds);

      setSelectedSeatIds(confirmedIds);
      setSelectionHoldExpiresAt(selection.expiresAt || null);
      if (selection.clientToken) {
        seatSelectionTokenRef.current = selection.clientToken;
      }
      setSeats((current) =>
        current.map((seat) => {
          if (confirmedIdSet.has(seat.showtimeSeatId)) {
            return { ...seat, status: 'HOLDING' };
          }
          if (previousIdSet.has(seat.showtimeSeatId) && seat.status === 'HOLDING') {
            return { ...seat, status: 'AVAILABLE' };
          }
          return seat;
        })
      );
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } }; message?: string };
      const message = apiError.response?.data?.message || apiError.message || 'Không thể giữ ghế đang chọn';
      toast.error(message);
      setSelectedSeatIds(previousSeatIds);
      await loadSeats(parsedShowtimeId, true);
    } finally {
      setIsUpdatingSeatSelection(false);
    }
  };

  const handleSeatClick = async (seat: ShowtimeSeat) => {
    if (pendingBooking) {
      toast.info('Bạn đã đặt ghế cho suất chiếu này. Hãy thanh toán tiếp hoặc hủy đặt trước khi chọn ghế khác.');
      return;
    }
    if (isBookingNotOpenYet) {
      toast.info(bookingNotOpenMessage);
      return;
    }
    if (isUpdatingSeatSelection || isShowtimeClosed) return;

    const isSelected = selectedSeatIds.includes(seat.showtimeSeatId);
    if (!isSelected && seat.status !== 'AVAILABLE') return;

    const partnerSeat = seat.seatType === 'COUPLE' ? getCouplePartnerSeat(seat, seats) : null;
    const partnerIsSelected = partnerSeat
      ? selectedSeatIds.includes(partnerSeat.showtimeSeatId)
      : false;
    if (
      seat.seatType === 'COUPLE'
      && (!partnerSeat || (!partnerIsSelected && partnerSeat.status !== 'AVAILABLE'))
    ) {
      toast.warning('Ghế đôi này không đủ cặp trống để đặt.');
      return;
    }

    let nextSeatIds: number[];
    if (seat.seatType === 'COUPLE' && partnerSeat) {
      const pairIds = [seat.showtimeSeatId, partnerSeat.showtimeSeatId];
      const missingPairIds = pairIds.filter((id) => !selectedSeatIds.includes(id));

      if (missingPairIds.length === 0) {
        nextSeatIds = selectedSeatIds.filter((id) => !pairIds.includes(id));
      } else {
        if (selectedSeatIds.length + missingPairIds.length > 8) {
          toast.warning('Bạn chỉ được đặt tối đa 8 ghế cho mỗi đơn hàng.');
          return;
        }
        nextSeatIds = [...selectedSeatIds, ...missingPairIds];
      }
    } else {
      if (!isSelected && selectedSeatIds.length >= 8) {
        toast.warning('Bạn chỉ được đặt tối đa 8 ghế cho mỗi đơn hàng.');
        return;
      }
      nextSeatIds = isSelected
        ? selectedSeatIds.filter((id) => id !== seat.showtimeSeatId)
        : [...selectedSeatIds, seat.showtimeSeatId];
    }

    await persistSeatSelection(nextSeatIds, selectedSeatIds);
  };

  const handleClearSeatSelection = async () => {
    if (selectedSeatIds.length === 0 || isUpdatingSeatSelection) return;
    await persistSeatSelection([], selectedSeatIds);
  };

  const handleUpdateCombo = (comboId: number, delta: number) => {
    setSelectedCombos((current) => {
      const next = updateItemQuantity(
        current,
        (combo) => combo.comboId === comboId,
        () => ({ comboId, quantity: 1 }),
        delta
      );

      if (delta > 0 && !isConcessionSelectionWithinStock(next, selectedFoodItems)) {
        toast.warning('Sản phẩm trong combo không đủ tồn kho.');
        return current;
      }
      return next;
    });
  };

  const handleUpdateFoodItem = (foodVariantId: number, delta: number) => {
    setSelectedFoodItems((current) => {
      const next = updateItemQuantity(
        current,
        (item) => item.foodVariantId === foodVariantId,
        () => ({ foodVariantId, quantity: 1 }),
        delta
      );

      if (delta > 0 && !isConcessionSelectionWithinStock(selectedCombos, next)) {
        toast.warning('Món này không đủ tồn kho.');
        return current;
      }
      return next;
    });
  };

  const goToCombos = () => {
    if (pendingBooking) {
      toast.info('Bạn đã đặt ghế cho suất chiếu này. Hãy thanh toán tiếp hoặc hủy đặt trước.');
      return;
    }
    if (isBookingNotOpenYet) {
      toast.info(bookingNotOpenMessage);
      return;
    }
    if (isShowtimeClosed) {
      toast.error('Suất chiếu đã bắt đầu hoặc không còn nhận đặt vé');
      return;
    }
    if (selectedSeatIds.length === 0) {
      toast.warning('Vui lòng chọn ít nhất 1 ghế');
      return;
    }
    if (seatSelectionError) {
      toast.warning(seatSelectionError);
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const redirectToPayment = async (booking: BookingResponse) => {
    if (booking.status === 'SUCCESS') {
      toast.success('Đã áp dụng quyền lợi và phát hành vé thành công.');
      navigate('/profile?tab=tickets');
      return;
    }
    if (paymentMethod === 'MOMO') {
      const momoPayment = await paymentApi.createMomoOrder(booking.bookingId);
      const momoPaymentUrl = momoPayment.payUrl || momoPayment.shortLink;
      if (momoPaymentUrl) {
        window.location.assign(momoPaymentUrl);
        return;
      }
      throw new Error('Không nhận được đường dẫn thanh toán MoMo.');
    }

    if (booking.payUrl) {
      window.location.assign(booking.payUrl);
      return;
    }

    throw new Error('Không nhận được đường dẫn thanh toán ZaloPay.');
  };

  const handleBookTickets = async () => {
    if (!showtime || !Number.isFinite(parsedShowtimeId)) return;
    if (pendingBooking) {
      toast.info('Bạn đã có đơn đặt ghế cho suất chiếu này. Vui lòng thanh toán tiếp hoặc hủy đặt.');
      return;
    }
    if (isShowtimeClosed) {
      toast.error('Suất chiếu đã bắt đầu hoặc không còn nhận đặt vé');
      return;
    }
    if (isBookingNotOpenYet) {
      toast.info(bookingNotOpenMessage);
      return;
    }
    if (selectedSeatIds.length === 0) {
      toast.warning('Vui lòng chọn ít nhất 1 ghế');
      return;
    }
    if (seatSelectionError) {
      toast.warning(seatSelectionError);
      return;
    }
    if (!isConcessionSelectionWithinStock(selectedCombos, selectedFoodItems)) {
      toast.warning('Một số bắp nước vừa hết hàng hoặc không đủ số lượng. Mình đã làm mới danh sách để bạn chọn lại.');
      await loadConcessionProducts(true);
      return;
    }

    try {
      setIsBooking(true);
      const response = await bookingApi.createBooking({
        showtimeId: parsedShowtimeId,
        showtimeSeatIds: selectedSeatIds,
        voucherCode: appliedPromotion?.code,
        paymentMethod,
        combos: selectedCombos,
        foodItems: selectedFoodItems,
        membershipBenefitIds: appliedBenefitIds.length ? appliedBenefitIds : undefined,
      });

      await redirectToPayment(response);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Lỗi khi đặt vé'));
      console.error(error);
      await loadSeats(parsedShowtimeId, true);
      await loadPendingBooking(parsedShowtimeId);
      await loadConcessionProducts(true);
    } finally {
      setIsBooking(false);
    }
  };

  const handlePayPendingBooking = async () => {
    if (!pendingBooking) return;
    try {
      setIsPayingPending(true);
      const response = await bookingApi.createPaymentForPendingBooking(pendingBooking.bookingId, paymentMethod);
      await redirectToPayment(response);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Không thể thanh toán đơn đặt vé.'));
      await loadSeats(parsedShowtimeId, true);
      await loadPendingBooking(parsedShowtimeId);
      console.error(error);
    } finally {
      setIsPayingPending(false);
    }
  };

  const validatePromotion = async () => {
    const code = voucherInput.trim().toUpperCase();
    setAppliedPromotion(null);
    if (!code) {
      toast.warning('Vui lòng nhập mã promotion.');
      return;
    }
    try {
      setIsValidatingPromotion(true);
      const evaluation = await promotionApi.validate({
        code,
        orderAmount: afterBenefits,
        paymentMethod,
      });
      setVoucherInput(evaluation.code);
      setAppliedPromotion(evaluation);
      toast.success(`Đã áp dụng ${evaluation.code}.`);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Promotion không hợp lệ.'));
    } finally {
      setIsValidatingPromotion(false);
    }
  };

  const handleCancelPendingBooking = async () => {
    if (!pendingBooking) return;

    try {
      setIsCancellingHold(true);
      await bookingApi.cancelPendingBooking(pendingBooking.bookingId);
      toast.success('Đã hủy đơn đặt ghế.');
      setPendingBooking(null);
      setSelectedSeatIds([]);
      setSelectedCombos([]);
      setSelectedFoodItems([]);
      setSelectedBenefitIds([]);
      setMembershipBenefits(await membershipApi.getBenefits().catch(() => []));
      setStep(1);
      await loadSeats(parsedShowtimeId, true);
      await loadConcessionProducts(true);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Không thể hủy đơn đặt ghế.'));
      console.error(error);
    } finally {
      setIsCancellingHold(false);
      setCancelPendingOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-slate-500" />
      </div>
    );
  }

  if (!showtime) {
    return (
      <div className="min-h-screen bg-[#f4f6f8] flex items-center justify-center px-4 text-center">
        <div>
          <div className="text-xl font-bold text-slate-900">Không tìm thấy suất chiếu</div>
          <button
            onClick={() => navigate('/')}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            <ArrowLeft size={16} /> Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8] font-sans text-slate-900">
      <Header />

      <main className="mx-auto max-w-7xl px-4 pb-10 pt-24 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft size={16} /> Quay lại
        </button>

        <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-md bg-rose-50 px-2.5 py-1 text-xs font-bold tracking-wide text-rose-700">
                <Ticket size={14} /> Đặt vé xem phim
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 md:text-3xl">{movieName}</h1>
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                {showtimePresentationLabel && (
                  <span className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-bold text-slate-700">
                    <Film size={16} className="text-slate-400" />
                    {showtimePresentationLabel}
                  </span>
                )}
                <span className="inline-flex items-center gap-2">
                  <CalendarDays size={16} className="text-slate-400" /> {formatDate(showtime.showDate)}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Clock size={16} className="text-slate-400" />
                  {formatTime(showtime.startTime)} ~ {formatTime(showtime.endTime)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-center">
              <Stat label="Tổng ghế" value={seatStats.total} />
              <Stat label="Còn trống" value={seatStats.available} />
              <Stat label="Đã đặt/bán" value={seatStats.locked} />
            </div>
          </div>

          {isShowtimeClosed && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              Suất chiếu này đã bắt đầu hoặc không còn nhận đặt vé. Bạn có thể quay lại chọn suất khác.
            </div>
          )}

          {isBookingNotOpenYet && (
            <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-800">
              {bookingNotOpenMessage} Bạn có thể quay lại chọn suất khác hoặc quay lại sau khi mở đặt vé.
            </div>
          )}

          {pendingBooking && (
            <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-900">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle size={17} className="shrink-0" />
                    Bạn đã đặt ghế cho suất chiếu này
                  </div>
                  <div className="mt-1 leading-relaxed text-sky-800">
                    Ghế {pendingBooking.seatCodes?.join(', ') || 'đã chọn'} · Tổng tiền{' '}
                    {formatCurrency(pendingBooking.totalAmount)} · Thanh toán trước {formatDateTime(pendingBooking.holdExpiresAt)}
                  </div>
                  {pendingConcessionItems.length > 0 && (
                    <div className="mt-1 text-sky-800">
                      Bắp nước: {pendingConcessionItems.join(', ')}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                  <button
                    onClick={handlePayPendingBooking}
                    disabled={isPayingPending || isCancellingHold}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-sky-700 px-4 text-sm font-bold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {isPayingPending ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                    Thanh toán {paymentMethod === 'MOMO' ? 'MoMo' : 'ZaloPay'}
                  </button>
                  <button
                    onClick={() => setCancelPendingOpen(true)}
                    disabled={isPayingPending || isCancellingHold}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-sky-200 bg-white px-4 text-sm font-bold text-sky-800 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isCancellingHold ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                    Hủy đặt ghế
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-6">
            <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
              <div className="grid grid-cols-2 gap-2">
                <StepButton
                  active={step === 1}
                  done={selectedSeatIds.length > 0 && !seatSelectionError}
                  icon={<Ticket size={17} />}
                  label="Chọn ghế"
                  meta={
                    seatSelectionError
                      ? 'Điều chỉnh ghế'
                      : selectedSeatIds.length > 0
                        ? `${selectedSeatIds.length} ghế`
                        : 'Bắt buộc'
                  }
                  onClick={() => setStep(1)}
                />
                <StepButton
                  active={step === 2}
                  done={selectedConcessionCount > 0}
                  icon={<ShoppingBag size={17} />}
                  label="Bắp nước"
                  meta={selectedConcessionCount > 0 ? `${selectedConcessionCount} món` : 'Tùy chọn'}
                  onClick={goToCombos}
                />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:p-6">
              {step === 1 ? (
                <>
                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-950">Sơ đồ ghế</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {selectedSeatIds.length > 0
                          ? `Đang giữ ${selectedSeatIds.length} ghế và đồng bộ tức thời với khách hàng khác.${
                              selectionHoldExpiresAt
                                ? ` Hết hạn lúc ${formatDateTime(selectionHoldExpiresAt)}.`
                                : ''
                            }`
                          : 'Chọn ghế trống để giữ chỗ ngay lập tức.'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedSeatIds.length > 0 && (
                        <button
                          onClick={handleClearSeatSelection}
                          disabled={isUpdatingSeatSelection}
                          className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                        >
                          Bỏ chọn tất cả
                        </button>
                      )}
                      <button
                        onClick={() => loadSeats(parsedShowtimeId)}
                        disabled={isRefreshingSeats || isUpdatingSeatSelection}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        <RefreshCw size={16} className={isRefreshingSeats ? 'animate-spin' : ''} />
                        Làm mới ghế
                      </button>
                    </div>
                  </div>
                  <SeatMap
                    seats={seats}
                    selectedSeatIds={selectedSeatIds}
                    ownHoldingSeatIds={ownHoldingSeatIds}
                    onSeatClick={handleSeatClick}
                    disabled={isBookingBlocked || !!pendingBooking || isUpdatingSeatSelection}
                  />
                  {seatSelectionError && (
                    <div className="mt-4 flex items-start gap-2 rounded-lg border border-pink-200 bg-pink-50 px-4 py-3 text-sm font-semibold text-pink-700">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                      <span>{seatSelectionError}</span>
                    </div>
                  )}
                </>
              ) : (
                <ComboSelector
                  combos={combos}
                  foodItems={foodItems}
                  selectedCombos={selectedCombos}
                  selectedFoodItems={selectedFoodItems}
                  onUpdateCombo={handleUpdateCombo}
                  onUpdateFoodItem={handleUpdateFoodItem}
                  getComboMaxQuantity={getComboMaxQuantity}
                  getFoodItemMaxQuantity={getFoodItemMaxQuantity}
                  onRefresh={() => loadConcessionProducts()}
                  refreshing={isRefreshingProducts}
                />
              )}
            </div>
          </section>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-950">Tóm tắt đơn hàng</h2>
                <CreditCard size={20} className="text-rose-600" />
              </div>

              <SummaryBlock title="Ghế đã chọn" empty="Chưa chọn ghế">
                {selectedSeats.map((seat) => (
                  <SummaryLine
                    key={seat.showtimeSeatId}
                    label={`${seat.seatCode || seat.seatNumber} · ${seatTypeLabel[seat.seatType || 'NORMAL'] || seat.seatType}`}
                    value={formatCurrency(getSeatPrice(seat, pricingConfig))}
                  />
                ))}
              </SummaryBlock>

              <SummaryBlock title="Bắp nước" empty="Chưa chọn bắp nước">
                {selectedComboDetails.map((combo) => (
                  <SummaryLine
                    key={combo.comboId}
                    label={`${combo.quantity}x ${combo.name}`}
                    value={formatCurrency(combo.price * combo.quantity)}
                  />
                ))}
                {selectedFoodItemDetails.map((item) => (
                  <SummaryLine
                    key={item.foodVariantId}
                    label={`${item.quantity}x ${item.name}`}
                    value={formatCurrency(item.price * item.quantity)}
                  />
                ))}
              </SummaryBlock>

              <div className="my-4 border-t border-dashed border-slate-200" />

              <SummaryLine label="Tiền ghế" value={formatCurrency(seatTotal)} />
              <SummaryLine label="Bắp nước" value={formatCurrency(comboTotal + foodTotal)} />
              {membership && <div className="my-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><b>{membership.planName}</b> · dự kiến +{formatCurrency(expectedPoints).replace("₫", " điểm")}<p className="mt-1 text-xs">Vé tích {membership.ticketEarnPercent}% · Bắp nước tích {membership.concessionEarnPercent}%</p></div>}
              {membership && availableMembershipBenefits.length > 0 && (
                <div className="my-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-black text-emerald-800"><Gift size={17} /> Dùng quyền lợi</div>
                  <div className="space-y-2">
                    {availableMembershipBenefits.map((benefit) => {
                      const selected = selectedBenefitIds.includes(benefit.benefitId);
                      const applicable = applicableMembershipBenefits.some(item => item.benefitId === benefit.benefitId);
                      const disabled = !selected && (!applicable || appliedFreeTicketBenefits.length >= freeTicketEligibleSeats.length);
                      return <label key={benefit.benefitId} className={`flex items-start gap-2 rounded-lg border bg-white p-2 text-xs ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}><input type="checkbox" className="mt-0.5" checked={selected} disabled={disabled} onChange={() => setSelectedBenefitIds((current) => current.includes(benefit.benefitId) ? current.filter((id) => id !== benefit.benefitId) : [...current, benefit.benefitId])} /><span><b>01 vé người lớn {membershipFreeTicketLabel(benefit.freeTicketType)} miễn phí</b><br /><span className="text-slate-500">{!applicable ? 'Không áp dụng cho suất chiếu này' : freeTicketEligibleSeats.length === 0 ? 'Không áp dụng cho ghế Couple' : `Hạn dùng ${new Date(benefit.expiresAt).toLocaleDateString('vi-VN')}`}</span></span></label>;
                    })}
                  </div>
                </div>
              )}
              {membershipTicketDiscount > 0 && <SummaryLine label="Quyền lợi vé miễn phí" value={`-${formatCurrency(membershipTicketDiscount)}`} />}

              {membership && availableMembershipVouchers.length > 0 && (
                <div className="my-3 rounded-xl border border-violet-200 bg-violet-50/70 p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-black text-violet-800"><Gift size={17} /> Voucher hội viên</div>
                  <select value={selectedMembershipRewardCode} onChange={event => setSelectedMembershipRewardCode(event.target.value)} className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-violet-500">
                    <option value="">Không sử dụng voucher hội viên</option>
                    {availableMembershipVouchers.map(item => {
                      const concessionVoucher = item.rewardTarget === 'CONCESSION';
                      const applicable = concessionVoucher ? concessionAfterBenefits > 0 : ticketAfterBenefits > 0;
                      return <option key={item.redemptionId} value={item.redemptionCode} disabled={!applicable}>{item.rewardName} · giảm {formatCurrency(item.valueAmount)}{!applicable ? concessionVoucher ? ' · cần chọn bắp nước' : ' · không có tiền vé phù hợp' : ''}</option>;
                    })}
                  </select>
                  {selectedMembershipReward && <p className={`mt-2 text-xs ${membershipRewardApplicable ? 'text-violet-700' : 'font-bold text-rose-600'}`}>{membershipRewardApplicable ? `${selectedMembershipReward.rewardTarget === 'CONCESSION' ? 'Áp dụng cho bắp nước' : 'Áp dụng cho tiền vé'} · mã ${selectedMembershipReward.redemptionCode}` : 'Voucher này chưa đủ điều kiện áp dụng cho đơn hàng.'}</p>}
                </div>
              )}
              {membershipRewardDiscount > 0 && <SummaryLine label="Voucher hội viên" value={`-${formatCurrency(membershipRewardDiscount)}`} />}

              <div className="mt-4 border-t border-slate-200 pt-4">
                <div className="mb-2 text-sm font-bold text-slate-700">Mã khuyến mãi (Tùy chọn)</div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={voucherInput}
                    onChange={(e) => setVoucherInput(e.target.value)}
                    placeholder="Nhập mã khuyến mãi"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm uppercase outline-none focus:border-indigo-500"
                    disabled={isValidatingPromotion || !!appliedPromotion}
                  />
                  {appliedPromotion ? (
                    <button
                      type="button"
                      onClick={() => {
                        setVoucherInput('');
                        setAppliedPromotion(null);
                      }}
                      className="rounded-lg bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-100"
                    >
                      Xóa
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={validatePromotion}
                      disabled={!voucherInput.trim() || isValidatingPromotion}
                      className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {isValidatingPromotion ? 'Đang xử lý...' : 'Áp dụng'}
                    </button>
                  )}
                </div>
                {promotionDiscount > 0 ? (
                  <div className="mt-2 text-sm font-semibold text-emerald-600">
                    Đã giảm: {formatCurrency(promotionDiscount || 0)}
                  </div>
                ) : appliedPromotion ? (
                  <div className="mt-2 text-sm font-semibold text-rose-600">
                    Đơn hàng thay đổi. Vui lòng áp dụng lại mã!
                  </div>
                ) : null}
              </div>

              <div className="mt-4 rounded-lg bg-slate-950 p-4 text-white">
                <div className="text-sm text-slate-300">Tổng thanh toán</div>
                {promotionDiscount > 0 && (
                  <div className="mt-1 text-sm text-slate-400 line-through">{formatCurrency(afterBenefits)}</div>
                )}
                <div className="mt-1 text-2xl font-extrabold">{formatCurrency(finalAmount)}</div>
              </div>

              <div className="mt-4">
                <div className="mb-2 text-sm font-bold text-slate-700">Phương thức thanh toán</div>
                <div className="grid grid-cols-2 gap-2">
                  <PaymentMethodButton
                    active={paymentMethod === 'ZALOPAY'}
                    label="ZaloPay"
                    meta="Ví điện tử"
                    tone="blue"
                    onClick={() => {
                      setPaymentMethod('ZALOPAY');
                      setAppliedPromotion(null);
                    }}
                  />
                  <PaymentMethodButton
                    active={paymentMethod === 'MOMO'}
                    label="MoMo"
                    meta="Ví MoMo"
                    tone="pink"
                    onClick={() => {
                      setPaymentMethod('MOMO');
                      setAppliedPromotion(null);
                    }}
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                {step === 1 ? (
                  <button
                    onClick={goToCombos}
                    disabled={isBookingBlocked || !!pendingBooking || selectedSeatIds.length === 0 || !!seatSelectionError}
                    className="h-11 rounded-lg bg-rose-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Tiếp tục
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleBookTickets}
                      disabled={isBooking || isBookingBlocked || !!pendingBooking || selectedSeatIds.length === 0 || !!seatSelectionError}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {isBooking ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                      {isBooking ? 'Đang xử lý...' : `Thanh toán ${paymentMethod === 'MOMO' ? 'MoMo' : 'ZaloPay'}`}
                    </button>
                    <button
                      onClick={() => setStep(1)}
                      className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Quay lại chọn ghế
                    </button>
                  </>
                )}
              </div>

              <p className="mt-4 text-xs leading-relaxed text-slate-500">
                Ghế sẽ được ghi nhận là đã đặt khi bạn bấm thanh toán. Nếu thanh toán thất bại hoặc quá thời gian,
                hệ thống sẽ tự mở lại ghế cho người khác đặt.
              </p>
            </div>
          </aside>
        </div>
      </main>

      <ConfirmDialog
        open={cancelPendingOpen}
        title="Hủy đơn đặt ghế?"
        message="Ghế trong đơn hiện tại sẽ được mở lại cho người khác đặt."
        confirmLabel="Hủy đặt ghế"
        loading={isCancellingHold}
        onClose={() => setCancelPendingOpen(false)}
        onConfirm={handleCancelPendingBooking}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-20 rounded-md bg-white px-3 py-2">
      <div className="text-base font-extrabold text-slate-950">{value}</div>
      <div className="text-[11px] font-semibold tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

function PaymentMethodButton({
  active,
  label,
  meta,
  tone,
  onClick,
}: {
  active: boolean;
  label: string;
  meta: string;
  tone: 'blue' | 'pink';
  onClick: () => void;
}) {
  const activeClass = tone === 'pink'
    ? 'border-pink-500 bg-pink-50 text-pink-700 ring-2 ring-pink-100'
    : 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-100';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-16 rounded-lg border px-3 py-2 text-left transition ${
        active ? activeClass : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      <span className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${active ? 'bg-current' : 'bg-slate-300'}`} />
        <span className="text-sm font-extrabold">{label}</span>
      </span>
      <span className="mt-1 block text-xs font-semibold opacity-75">{meta}</span>
    </button>
  );
}

function StepButton({
  active,
  done,
  icon,
  label,
  meta,
  onClick,
}: {
  active: boolean;
  done: boolean;
  icon: ReactNode;
  label: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg px-3 py-3 text-left transition ${
        active ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
          active ? 'bg-white/12 text-white' : 'bg-white text-slate-600'
        }`}
      >
        {done && !active ? <Check size={17} className="text-emerald-600" /> : icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold">{label}</span>
        <span className={`block text-xs ${active ? 'text-slate-300' : 'text-slate-500'}`}>{meta}</span>
      </span>
    </button>
  );
}

function SummaryBlock({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: ReactNode[];
}) {
  const hasItems = children.length > 0;
  return (
    <div className="mb-4">
      <div className="mb-2 text-sm font-bold text-slate-700">{title}</div>
      {hasItems ? <div className="space-y-2">{children}</div> : <div className="text-sm text-slate-400">{empty}</div>}
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="min-w-0 text-slate-600">{label}</span>
      <span className="shrink-0 font-semibold text-slate-950">{value}</span>
    </div>
  );
}
