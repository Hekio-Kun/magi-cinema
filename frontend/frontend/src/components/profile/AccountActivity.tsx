import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Film,
  Gift,
  ExternalLink,
  Loader2,
  QrCode,
  ReceiptText,
  RotateCcw,
  Ticket,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { bookingApi, BookingResponse } from "@/api/bookingApi";
import type { PaymentTransactionResponse } from "@/api/paymentApi";
import { formatPresentationLabelFromFields } from "@/utils/presentation";
import { promotionApi, type PromotionUsage } from "@/api/promotionApi";

type ActivityTab = "tickets" | "transactions" | "refunds" | "promotions";

interface AccountActivityProps {
  bookings: BookingResponse[];
  paymentTransactions?: PaymentTransactionResponse[];
  isLoading: boolean;
  initialTab?: ActivityTab;
  onRefresh?: () => Promise<void> | void;
}

const activityTabs: { key: ActivityTab; label: string; icon: typeof Ticket }[] = [
  { key: "tickets", label: "Lịch sử vé", icon: Ticket },
  { key: "transactions", label: "Chi tiêu", icon: WalletCards },
  { key: "refunds", label: "Vé đã hủy", icon: RotateCcw },
  { key: "promotions", label: "Ưu đãi", icon: Gift },
];

const currency = (value = 0) => value.toLocaleString("vi-VN", { style: "currency", currency: "VND" });

const formatDateTime = (value?: string) => {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatShowDate = (value?: string) => {
  if (!value) return "Chưa cập nhật";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const statusLabel: Record<string, string> = {
  SUCCESS: "Đã thanh toán",
  PENDING: "Chờ thanh toán",
  CANCELLED: "Đã hủy",
};

const statusClass = (status: string) => {
  if (status === "SUCCESS") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "PENDING") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "CANCELLED") return "border-slate-200 bg-slate-100 text-slate-600";
  return "border-slate-200 bg-white text-slate-600";
};

const paymentStatusLabel: Record<string, string> = {
  INITIATED: "Đang chờ cổng",
  SUCCESS: "Đã ghi nhận",
  FAILED: "Thất bại",
  INVALID: "Không hợp lệ",
  DUPLICATE: "Callback trùng",
};

const paymentStatusClass = (status: string) => {
  if (status === "SUCCESS" || status === "DUPLICATE") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "INITIATED") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return typeof message === "string" && message.trim() ? message : fallback;
};

export function AccountActivity(props: AccountActivityProps) {
  const initialTab = props.initialTab ?? "tickets";
  return <AccountActivityContent key={initialTab} {...props} initialTab={initialTab} />;
}

function AccountActivityContent({ bookings, paymentTransactions = [], isLoading, initialTab = "tickets", onRefresh }: AccountActivityProps) {
  const [activeTab, setActiveTab] = useState<ActivityTab>(initialTab);
  const [selectedBooking, setSelectedBooking] = useState<BookingResponse | null>(null);
  const [payingBookingId, setPayingBookingId] = useState<number | null>(null);

  const paidBookings = useMemo(() => bookings.filter((booking) => booking.status === "SUCCESS"), [bookings]);
  const pendingBookings = useMemo(() => bookings.filter((booking) => booking.status === "PENDING"), [bookings]);
  const cancelledBookings = useMemo(() => bookings.filter((booking) => booking.status === "CANCELLED"), [bookings]);

  const countTickets = (items: BookingResponse[]) => items.reduce(
    (sum, booking) => sum + (booking.ticketDetails?.length || booking.seatCodes?.length || 0), 0,
  );

  const spendingSummary = useMemo(() => {
    const total = paidBookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
    const ticketCount = countTickets(paidBookings);
    const ticketTotal = paidBookings.reduce((sum, booking) => sum + (
      booking.ticketSubtotal
      ?? booking.ticketDetails?.reduce((ticketSum, ticket) => ticketSum + ticket.price, 0)
      ?? 0
    ), 0);
    const average = ticketCount > 0 ? Math.round(ticketTotal / ticketCount) : 0;
    return { total, average, ticketCount };
  }, [paidBookings]);

  const monthlySpending = useMemo(() => {
    const grouped = new Map<string, number>();
    paidBookings.forEach((booking) => {
      const date = new Date(booking.createdAt);
      const key = Number.isNaN(date.getTime())
        ? "Không rõ"
        : `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
      grouped.set(key, (grouped.get(key) || 0) + (booking.totalAmount || 0));
    });
    return Array.from(grouped.entries()).map(([month, total]) => ({ month, total }));
  }, [paidBookings]);

  const handlePayPendingBooking = async (bookingId: number) => {
    try {
      setPayingBookingId(bookingId);
      const response = await bookingApi.createPaymentForPendingBooking(bookingId);
      if (response.payUrl) {
        window.location.assign(response.payUrl);
        return;
      }
      toast.error("Không nhận được đường dẫn thanh toán.");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Không thể thanh toán đơn đặt vé này."));
      console.error(error);
      await onRefresh?.();
    } finally {
      setPayingBookingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-slate-200 bg-white">
        <Loader2 size={32} className="animate-spin text-rose-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Vé đã thanh toán" value={spendingSummary.ticketCount.toString()} icon={<Ticket size={18} />} />
        <MetricCard label="Tổng chi tiêu" value={currency(spendingSummary.total)} icon={<WalletCards size={18} />} />
        <MetricCard label="Vé đang giữ chỗ" value={countTickets(pendingBookings).toString()} icon={<Clock size={18} />} />
        <MetricCard label="Vé đã hủy" value={countTickets(cancelledBookings).toString()} icon={<RotateCcw size={18} />} />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-2">
        <div className="grid gap-2 sm:grid-cols-4">
          {activityTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-bold transition ${
                  active ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "tickets" && (
        <TicketList
          bookings={bookings}
          payingBookingId={payingBookingId}
          onPay={handlePayPendingBooking}
          onView={setSelectedBooking}
        />
      )}

      {activeTab === "transactions" && (
        <TransactionHistory
          bookings={bookings}
          monthlySpending={monthlySpending}
          total={spendingSummary.total}
          average={spendingSummary.average}
          paymentTransactions={paymentTransactions}
          onView={setSelectedBooking}
        />
      )}

      {activeTab === "refunds" && (
        <CancelledBookingHistory cancelledBookings={cancelledBookings} onView={setSelectedBooking} />
      )}

      {activeTab === "promotions" && (
        <PromotionHistory />
      )}

      {selectedBooking && (
        <TicketDetailModal
          booking={selectedBooking}
          isPaying={payingBookingId === selectedBooking.bookingId}
          onPay={handlePayPendingBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}
    </div>
  );
}

function TicketList({
  bookings,
  payingBookingId,
  onPay,
  onView,
}: {
  bookings: BookingResponse[];
  payingBookingId: number | null;
  onPay: (bookingId: number) => void;
  onView: (booking: BookingResponse) => void;
}) {
  if (bookings.length === 0) {
    return <EmptyState icon={<Ticket size={28} />} title="Bạn chưa có vé nào" description="Các vé đã đặt sẽ xuất hiện tại đây." />;
  }

  return (
    <div className="grid gap-3">
      {bookings.map((booking) => (
        <TicketRow
          key={booking.bookingId}
          booking={booking}
          isPaying={payingBookingId === booking.bookingId}
          onPay={onPay}
          onView={onView}
        />
      ))}
    </div>
  );
}

function TicketRow({
  booking,
  isPaying,
  onPay,
  onView,
}: {
  booking: BookingResponse;
  isPaying: boolean;
  onPay: (bookingId: number) => void;
  onView: (booking: BookingResponse) => void;
}) {
  const presentationLabel = formatPresentationLabelFromFields(booking);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="m-0 text-base font-extrabold text-slate-950">{booking.movieTitle}</h3>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(booking.status)}`}>
              {statusLabel[booking.status] || booking.status}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
            <span>{booking.cinemaRoomName}</span>
            {presentationLabel && <span className="font-bold text-indigo-600">{presentationLabel}</span>}
            <span>{formatShowDate(booking.showDate)}</span>
            <span>{booking.startTime?.slice(0, 5)}</span>
            <span>Ghế {booking.seatCodes?.join(", ") || "chưa cập nhật"}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="text-left sm:text-right">
            <div className="text-xs font-semibold text-slate-500">Tổng tiền</div>
            <div className="text-base font-extrabold text-rose-600">{currency(booking.totalAmount)}</div>
          </div>
          <button
            type="button"
            onClick={() => onView(booking)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Chi tiết
          </button>
          {booking.status === "PENDING" && (
            <button
              type="button"
              onClick={() => onPay(booking.bookingId)}
              disabled={isPaying}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isPaying ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
              Thanh toán tiếp
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TransactionHistory({
  bookings,
  paymentTransactions,
  monthlySpending,
  total,
  average,
  onView,
}: {
  bookings: BookingResponse[];
  paymentTransactions: PaymentTransactionResponse[];
  monthlySpending: { month: string; total: number }[];
  total: number;
  average: number;
  onView: (booking: BookingResponse) => void;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
      <div className="space-y-3">
        <MetricCard label="Tổng đã thanh toán" value={currency(total)} icon={<CheckCircle2 size={18} />} />
        <MetricCard label="Trung bình giá vé" value={currency(average)} icon={<ReceiptText size={18} />} />
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 text-sm font-extrabold text-slate-900">Chi tiêu theo tháng</div>
          {monthlySpending.length === 0 ? (
            <div className="text-sm text-slate-500">Chưa có dữ liệu chi tiêu.</div>
          ) : (
            <div className="space-y-2">
              {monthlySpending.map((item) => (
                <div key={item.month} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-semibold text-slate-600">{item.month}</span>
                  <span className="font-extrabold text-slate-950">{currency(item.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3 text-sm font-extrabold text-slate-900">Lịch sử giao dịch</div>
        {bookings.length === 0 ? (
          <EmptyState icon={<ReceiptText size={28} />} title="Chưa có giao dịch" description="Các đơn đặt vé và thanh toán sẽ được liệt kê tại đây." />
        ) : (
          <div className="divide-y divide-slate-100">
            {bookings.map((booking) => {
              const presentationLabel = formatPresentationLabelFromFields(booking);

              return (
                <button
                  key={booking.bookingId}
                  type="button"
                  onClick={() => onView(booking)}
                  className="grid w-full gap-3 px-4 py-3 text-left hover:bg-slate-50 sm:grid-cols-[1fr_140px_140px]"
                >
                  <div>
                    <div className="font-bold text-slate-950">#{booking.bookingId} · {booking.movieTitle}</div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      {presentationLabel && <span className="font-bold text-indigo-600">{presentationLabel}</span>}
                      <span>{booking.ticketDetails?.length || booking.seatCodes?.length || 0} vé · Ghế {booking.seatCodes?.join(", ")}</span>
                      {(booking.concessionSubtotal || 0) > 0 && <span>Bắp nước {currency(booking.concessionSubtotal)}</span>}
                      <span>{formatDateTime(booking.createdAt)}</span>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-slate-700">{statusLabel[booking.status] || booking.status}</div>
                  <div className="text-sm font-extrabold text-rose-600 sm:text-right">{currency(booking.totalAmount)}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {paymentTransactions.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-extrabold text-slate-900">Chi tiết giao dịch cổng thanh toán</div>
          <div className="divide-y divide-slate-100">
            {paymentTransactions.map((transaction) => (
              <div key={transaction.paymentTransactionId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <div className="font-bold text-slate-950">#{transaction.bookingId} · {transaction.paymentMethod === "MOMO" ? "MoMo" : "ZaloPay"}</div>
                  <div className="mt-1 truncate text-xs text-slate-500">Mã lệnh: {transaction.providerReference}{transaction.providerTransactionId ? ` · Mã cổng: ${transaction.providerTransactionId}` : ""}</div>
                  <div className="mt-1 text-xs text-slate-400">{formatDateTime(transaction.callbackReceivedAt ?? transaction.createdAt ?? undefined)}</div>
                </div>
                <div className="text-right">
                  <div className="font-extrabold text-slate-950">{currency(transaction.receivedAmount ?? transaction.expectedAmount)}</div>
                  <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${paymentStatusClass(transaction.status)}`}>
                    {paymentStatusLabel[transaction.status] || transaction.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

function CancelledBookingHistory({
  cancelledBookings,
  onView,
}: {
  cancelledBookings: BookingResponse[];
  onView: (booking: BookingResponse) => void;
}) {
  if (cancelledBookings.length === 0) {
    return (
      <EmptyState
        icon={<RotateCcw size={28} />}
        title="Chưa có booking đã hủy"
        description="Hiện hệ thống chưa ghi nhận booking nào bị hủy từ tài khoản của bạn."
      />
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3 text-sm font-extrabold text-slate-900">Đơn đặt vé đã hủy</div>
      <div className="divide-y divide-slate-100">
        {cancelledBookings.map((booking) => {
          const presentationLabel = formatPresentationLabelFromFields(booking);

          return (
            <button
              key={booking.bookingId}
              type="button"
              onClick={() => onView(booking)}
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-slate-50"
            >
              <div>
                <div className="font-bold text-slate-950">{booking.movieTitle}</div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                  {presentationLabel && <span className="font-bold text-indigo-600">{presentationLabel}</span>}
                  <span>Đơn đặt vé #{booking.bookingId} · {formatDateTime(booking.createdAt)}</span>
                </div>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                Đã hủy
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PromotionHistory() {
  const [usages, setUsages] = useState<PromotionUsage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    promotionApi.getMyUsages()
      .then((data) => {
        if (!cancelled) setUsages(data);
      })
      .catch(() => {
        if (!cancelled) setUsages([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="flex min-h-36 items-center justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;
  }
  if (usages.length === 0) {
    return (
      <EmptyState
        icon={<Gift size={28} />}
        title="Chưa có lịch sử dùng ưu đãi"
        description="Các promotion đã giữ, áp dụng hoặc giải phóng sẽ xuất hiện tại đây."
      />
    );
  }

  return (
    <div className="space-y-3">
      {usages.map((usage) => (
        <div key={usage.promotionUsageId} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-extrabold text-slate-950">{usage.promotionCode}</div>
              <div className="mt-1 text-xs text-slate-500">
                Đơn #{usage.bookingId} · {formatDateTime(usage.confirmedAt || usage.releasedAt || usage.reservedAt)}
              </div>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
              usage.status === "APPLIED"
                ? "bg-emerald-100 text-emerald-700"
                : usage.status === "RESERVED"
                  ? "bg-sky-100 text-sky-700"
                  : "bg-slate-100 text-slate-600"
            }`}>
              {usage.status}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-dashed pt-3 text-sm">
            <span className="text-slate-500">{currency(usage.originalAmount)} → {currency(usage.finalAmount)}</span>
            <span className="font-extrabold text-emerald-600">-{currency(usage.discountAmount)}</span>
          </div>
          {usage.releaseReason && <p className="mt-2 text-xs text-slate-500">{usage.releaseReason}</p>}
        </div>
      ))}
    </div>
  );
}

function TicketDetailModal({
  booking,
  isPaying,
  onPay,
  onClose,
}: {
  booking: BookingResponse;
  isPaying: boolean;
  onPay: (bookingId: number) => void;
  onClose: () => void;
}) {
  const concessionItems = [...(booking.combos || []), ...(booking.foodItems || [])];
  const presentationLabel = formatPresentationLabelFromFields(booking);
  const ticketDetails = booking.ticketDetails || (booking.seatCodes || []).map((seatCode, index) => ({
    ticketId: index,
    seatCode,
    seatType: null,
    price: booking.seatCodes?.length ? Math.round((booking.ticketSubtotal || 0) / booking.seatCodes.length) : 0,
  }));

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-5">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-rose-600">Đơn đặt vé #{booking.bookingId}</div>
            <h3 className="mt-1 truncate text-lg font-black text-slate-950">{booking.movieTitle}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <DetailItem icon={<CalendarDays size={15} />} label="Suất chiếu" value={`${formatShowDate(booking.showDate)} · ${booking.startTime?.slice(0, 5)}`} />
            <DetailItem icon={<Ticket size={15} />} label="Phòng & ghế" value={`${booking.cinemaRoomName} · ${booking.seatCodes?.join(", ") || "Chưa cập nhật"}`} />
            {presentationLabel && <DetailItem icon={<Film size={15} />} label="Phiên bản" value={presentationLabel} />}
            <DetailItem icon={<CreditCard size={15} />} label="Trạng thái" value={statusLabel[booking.status] || booking.status} />
          </div>

          <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]">
            <section className="rounded-xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between"><b className="text-sm text-slate-950">Chi tiết vé</b><span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600">{ticketDetails.length} vé</span></div>
              <div className="grid gap-2 sm:grid-cols-2">
                {ticketDetails.map((ticket, index) => (
                  <div key={ticket.ticketId ?? index} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <div className="min-w-0"><span className="text-xs text-slate-500">Vé {index + 1}</span><b className="block truncate">Ghế {ticket.seatCode}{ticket.seatType ? ` · ${ticket.seatType}` : ""}</b></div>
                    <b className="shrink-0 text-slate-950">{currency(ticket.price)}</b>
                  </div>
                ))}
              </div>
              {booking.status === "SUCCESS" && booking.ticketQrToken && (
                <div className="mt-4 grid items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:grid-cols-[156px_1fr]">
                  <img
                    src={bookingApi.getTicketQrImageUrl(booking.ticketQrToken)}
                    alt={`Mã QR vé #${booking.bookingId}`}
                    className="mx-auto h-36 w-36 rounded-lg border bg-white p-1"
                  />
                  <div>
                    <div className="flex items-center gap-2 font-black text-emerald-900"><QrCode size={19} /> QR vé điện tử</div>
                    <p className="mt-2 text-sm leading-6 text-emerald-800">Dùng Camera hoặc Google Lens trên điện thoại để quét và xem thông tin xác thực vé.</p>
                    <a
                      href={`/tickets/${booking.ticketQrToken}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white"
                    >
                      <ExternalLink size={14} /> Mở trang xác thực
                    </a>
                  </div>
                </div>
              )}
            </section>

            <div className="space-y-3">
              <section className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 text-sm font-extrabold text-slate-950">Combo & bắp nước</div>
                {(booking.productDetails?.length || 0) > 0 ? (
                  <div className="space-y-2">
                    {booking.productDetails!.map((item, index) => <div key={`${item.type}-${item.name}-${index}`} className="flex justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm"><div><b>{item.name}</b><p className="mt-0.5 text-xs text-slate-500">{item.quantity} × {currency(item.unitPrice)}</p></div><b className="shrink-0">{currency(item.totalPrice)}</b></div>)}
                  </div>
                ) : concessionItems.length > 0 ? (
                  <div className="flex flex-wrap gap-2">{concessionItems.map((item, index) => <span key={`${item}-${index}`} className="rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700">{item}</span>)}</div>
                ) : <div className="text-sm text-slate-500">Không có sản phẩm đi kèm.</div>}
              </section>

              <section className="space-y-2 rounded-xl bg-slate-950 p-4 text-sm text-white">
                <PriceLine label="Tiền vé" value={booking.ticketSubtotal || 0} />
                <PriceLine label="Combo & bắp nước" value={booking.concessionSubtotal || 0} />
                {(booking.voucherDiscount || 0) > 0 && <PriceLine label="Voucher" value={-(booking.voucherDiscount || 0)} discount />}
                {(booking.loyaltyPointsRedeemed || 0) > 0 && <PriceLine label="Điểm đã dùng" value={-(booking.loyaltyPointsRedeemed || 0)} discount />}
                <div className="border-t border-white/15 pt-2 text-rose-300"><PriceLine label="Tổng thanh toán" value={booking.totalAmount} strong /></div>
                {(booking.loyaltyPointsEarned || 0) > 0 && <div className="flex justify-between text-emerald-300"><span>Điểm đã tích</span><b>+{(booking.loyaltyPointsEarned || 0).toLocaleString("vi-VN")} điểm</b></div>}
              </section>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>Đặt lúc {formatDateTime(booking.createdAt)}</span><span>Mã giao dịch #{booking.bookingId}</span></div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Tổng thanh toán</div>
            {(booking.discountAmount || 0) > 0 && (
              <div className="mt-1 text-xs text-slate-500">
                {booking.promotionCode} · {currency(booking.originalAmount || booking.totalAmount)}
                {" - "}{currency(booking.discountAmount || 0)}
              </div>
            )}
            <div className="text-2xl font-extrabold text-rose-600">{currency(booking.totalAmount)}</div>
          </div>
          {booking.status === "PENDING" && (
            <button
              type="button"
              onClick={() => onPay(booking.bookingId)}
              disabled={isPaying}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isPaying ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
              Thanh toán tiếp
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PriceLine({ label, value, discount = false, strong = false }: { label: string; value: number; discount?: boolean; strong?: boolean }) {
  return <div className={`flex justify-between ${strong ? "text-base font-extrabold" : ""}`}><span>{label}</span><b className={discount ? "text-emerald-600" : ""}>{value < 0 ? `-${currency(Math.abs(value))}` : currency(value)}</b></div>;
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-1 flex items-center gap-2 text-xs font-bold tracking-wide text-slate-500">
        {icon}
        {label}
      </div>
      <div className="text-sm font-bold text-slate-950">{value}</div>
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-rose-50 text-rose-600">{icon}</div>
      <div className="text-xs font-bold tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-extrabold text-slate-950">{value}</div>
    </div>
  );
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-white p-10 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        {icon}
      </div>
      <div className="text-base font-extrabold text-slate-950">{title}</div>
      <div className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">{description}</div>
    </div>
  );
}
