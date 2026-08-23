import { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { bookingApi, BookingResponse } from '@/api/bookingApi';
import { formatPresentationLabelFromFields } from '@/utils/presentation';

interface TicketHistoryProps {
  bookings: BookingResponse[];
  isLoading: boolean;
}

const getApiErrorMessage = (error: unknown, fallback: string) => {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return typeof message === "string" && message.trim() ? message : fallback;
};

export function TicketHistory({ bookings, isLoading }: TicketHistoryProps) {
  const [payingBookingId, setPayingBookingId] = useState<number | null>(null);

  const handlePayPendingBooking = async (bookingId: number) => {
    try {
      setPayingBookingId(bookingId);
      const response = await bookingApi.createPaymentForPendingBooking(bookingId);
      if (response.payUrl) {
        window.location.assign(response.payUrl);
        return;
      }
      toast.error('Không nhận được đường dẫn thanh toán.');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Không thể thanh toán booking này.'));
      console.error(error);
    } finally {
      setPayingBookingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center text-slate-500 p-10">
        Bạn chưa có vé nào.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {bookings.map(b => {
        const isPending = b.status === 'PENDING';
        const isPaying = payingBookingId === b.bookingId;
        const concessionItems = [...(b.combos || []), ...(b.foodItems || [])];
        const presentationLabel = formatPresentationLabelFromFields(b);

        return (
        <div key={b.bookingId} className="bg-slate-50/50 border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900 m-0">{b.movieTitle}</h3>
              <p className="m-0 mt-1 text-sm text-slate-500">
                Rạp {b.cinemaRoomName} • {presentationLabel ? `${presentationLabel} • ` : ''}{b.startTime} • {b.showDate}
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
              b.status === 'SUCCESS'
                ? 'bg-green-100 text-green-700'
                : isPending
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-slate-200 text-slate-600'
            }`}>
              {b.status}
            </div>
          </div>
          <div className="border-t border-dashed border-slate-300 pt-3 flex justify-between gap-4">
            <div>
              <p className="m-0 text-xs text-slate-500">Ghế</p>
              <p className="m-0 text-sm font-semibold">{b.seatCodes.join(', ')}</p>
              {concessionItems.length > 0 && (
                <div className="mt-2">
                  <p className="m-0 text-xs text-slate-500">Bắp nước</p>
                  <p className="m-0 text-sm font-medium text-slate-700">{concessionItems.join(', ')}</p>
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="m-0 text-xs text-slate-500">Tổng tiền</p>
              <p className="m-0 text-sm font-bold text-primary-600">{b.totalAmount.toLocaleString()} đ</p>
              {isPending && (
                <button
                  onClick={() => handlePayPendingBooking(b.bookingId)}
                  disabled={isPaying}
                  className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isPaying ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                  Thanh toán tiếp
                </button>
              )}
            </div>
          </div>
        </div>
      )})}
    </div>
  );
}
