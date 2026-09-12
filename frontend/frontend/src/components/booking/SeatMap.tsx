import { ShowtimeSeat } from '@/types/seat';

interface SeatMapProps {
  seats: ShowtimeSeat[];
  selectedSeatIds: number[];
  ownHoldingSeatIds?: number[];
  onSeatClick: (seat: ShowtimeSeat) => void;
  disabled?: boolean;
}

const seatTypeLabel: Record<string, string> = {
  NORMAL: 'Thường',
  VIP: 'VIP',
  COUPLE: 'Đôi',
  DISABLED: 'Ghế',
};

const formatCurrency = (value?: number | null) =>
  typeof value === 'number'
    ? value.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })
    : 'Chưa có giá';

export function SeatMap({
  seats,
  selectedSeatIds,
  ownHoldingSeatIds = [],
  onSeatClick,
  disabled = false,
}: SeatMapProps) {
  const ownHoldingSeatIdSet = new Set(ownHoldingSeatIds);

  const rows = seats.reduce<Record<string, ShowtimeSeat[]>>((acc, seat) => {
    const row = seat.seatRow || 'Khác';
    acc[row] = [...(acc[row] || []), seat];
    return acc;
  }, {});

  const rowNames = Object.keys(rows).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));

  if (seats.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
        <div className="text-base font-bold text-slate-800">Chưa có sơ đồ ghế</div>
        <div className="mt-1 text-sm text-slate-500">Vui lòng kiểm tra lại cấu hình ghế cho suất chiếu này.</div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="mx-auto min-w-[560px] max-w-4xl">
        <div className="mb-8">
          <div className="mx-auto h-3 w-4/5 rounded-t-full bg-gradient-to-r from-slate-300 via-slate-500 to-slate-300 shadow-sm" />
          <div className="mx-auto mt-2 w-4/5 rounded-b-[50%] border-b border-slate-200 pb-5 text-center text-xs font-bold tracking-[0.24em] text-slate-500">
            Màn hình
          </div>
        </div>

        <div className="space-y-3">
          {rowNames.map((rowName) => {
            const rowSeats = rows[rowName].sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));
            return (
              <div key={rowName} className="grid grid-cols-[32px_minmax(0,1fr)_32px] items-center gap-3">
                <div className="text-center text-xs font-extrabold text-slate-400">{rowName}</div>
                <div className="flex justify-center gap-2">
                  {rowSeats.map((seat) => {
                    const isCouple = seat.seatType === 'COUPLE';
                    let partnerSeat: ShowtimeSeat | null = null;
                    let displayLabel = seat.seatCode || seat.seatNumber?.toString() || '';

                    if (isCouple) {
                      const rowCoupleSeats = rowSeats.filter((s) => s.seatType === 'COUPLE');
                      const seatIndex = rowCoupleSeats.findIndex((s) => s.showtimeSeatId === seat.showtimeSeatId);
                      if (seatIndex % 2 === 1) return null; // skip the second half of the pair
                      partnerSeat = rowCoupleSeats[seatIndex + 1] || null;
                      if (partnerSeat) {
                        const pLabel = partnerSeat.seatCode || partnerSeat.seatNumber?.toString() || '';
                        displayLabel = `${displayLabel} - ${pLabel}`;
                      }
                    }

                    const isSelected =
                      selectedSeatIds.includes(seat.showtimeSeatId) ||
                      (partnerSeat ? selectedSeatIds.includes(partnerSeat.showtimeSeatId) : false);
                    const isOwnHolding =
                      ownHoldingSeatIdSet.has(seat.showtimeSeatId) ||
                      (partnerSeat ? ownHoldingSeatIdSet.has(partnerSeat.showtimeSeatId) : false);

                    const combinedStatus = isSelected
                      ? 'SELECTED'
                      : seat.status === 'HOLDING' || partnerSeat?.status === 'HOLDING'
                        ? 'HOLDING'
                        : seat.status === 'BOOKED' || partnerSeat?.status === 'BOOKED'
                          ? 'BOOKED'
                          : 'AVAILABLE';

                    const isAvailable = (combinedStatus === 'AVAILABLE' || isSelected) && !disabled;
                    const typeLabel = seatTypeLabel[seat.seatType || 'NORMAL'] || seat.seatType || 'Ghế';
                    const statusLabel =
                      combinedStatus === 'SELECTED'
                        ? 'Đang chọn'
                        : combinedStatus === 'HOLDING'
                          ? 'Đang được giữ'
                          : combinedStatus;
                    const priceLabel = formatCurrency(seat.finalPrice);

                    let className: string;

                    if (combinedStatus === 'SELECTED') {
                      className = 'border-rose-600 bg-rose-600 text-white shadow-sm';
                    } else if (isOwnHolding) {
                      className = 'border-sky-500 bg-sky-50 text-sky-700 ring-2 ring-sky-100';
                    } else if (combinedStatus === 'HOLDING') {
                      className = 'border-amber-200 bg-amber-50 text-amber-500';
                    } else if (combinedStatus === 'BOOKED') {
                      className = 'border-slate-200 bg-slate-200 text-slate-400';
                    } else {
                      switch (seat.seatType) {
                        case 'VIP':
                          className =
                            'border-violet-300 bg-violet-50 text-violet-700 hover:border-violet-400 hover:bg-violet-100';
                          break;
                        case 'COUPLE':
                          className = 'border-pink-300 bg-pink-50 text-pink-700 hover:border-pink-400 hover:bg-pink-100';
                          break;
                        case 'DISABLED':
                          className = 'border-blue-300 bg-blue-50 text-blue-700 hover:border-blue-400 hover:bg-blue-100';
                          break;
                        default:
                          className = 'border-blue-300 bg-blue-50 text-blue-700 hover:border-blue-400 hover:bg-blue-100';
                      }
                    }

                    return (
                      <button
                        key={seat.showtimeSeatId}
                        type="button"
                        onClick={() => onSeatClick(seat)}
                        disabled={!isAvailable}
                        title={`${displayLabel} · ${typeLabel} · ${priceLabel} · ${statusLabel}`}
                        className={`relative flex h-9 shrink-0 items-center justify-center rounded-t-lg rounded-b-[4px] border px-0.5 text-[10px] font-extrabold leading-none transition disabled:cursor-not-allowed ${className} ${
                          isCouple ? 'w-[80px]' : 'w-9'
                        }`}
                      >
                        <span className="block max-w-full truncate">{displayLabel}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="text-center text-xs font-extrabold text-slate-400">{rowName}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-3 text-xs font-semibold text-slate-600">
          <Legend color="bg-blue-50 border-blue-300" label="Thường" />
          <Legend color="bg-violet-50 border-violet-300" label="VIP" />
          <Legend color="bg-pink-50 border-pink-300" label="Đôi" />
          <Legend color="bg-rose-600 border-rose-600" label="Đang chọn" dark />
          <Legend color="bg-amber-50 border-amber-200" label="Đã đặt" />
          <Legend color="bg-slate-200 border-slate-200" label="Đã bán" />
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label, dark = false }: { color: string; label: string; dark?: boolean }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className={`h-5 w-5 rounded-t-md rounded-b-[3px] border ${color} ${dark ? 'shadow-sm' : ''}`} />
      <span>{label}</span>
    </div>
  );
}
