import { ArrowLeft } from 'lucide-react';

interface BookingFooterProps {
  step: 1 | 2;
  selectedSeatsText: string;
  selectedCombosText: string;
  totalAmount: number;
  isBooking: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export function BookingFooter({
  step,
  selectedSeatsText,
  selectedCombosText,
  totalAmount,
  isBooking,
  onBack,
  onNext,
  onSubmit
}: BookingFooterProps) {
  return (
    <div className="border-t border-gray-200/60 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 mt-6">
      <div>
        <div className="text-gray-500 text-sm font-medium">Ghế đã chọn:</div>
        <div className="font-bold text-lg text-gray-900 leading-tight mt-1">
          {selectedSeatsText}
        </div>
        {selectedCombosText && (
          <div className="text-sm text-gray-500 mt-1">
            Combo: <span className="font-semibold text-gray-700">{selectedCombosText}</span>
          </div>
        )}
      </div>
      <div className="text-right">
        <div className="text-gray-500 text-sm font-medium">Tổng tiền:</div>
        <div className="font-extrabold text-2xl text-gray-900 mt-1">
          {totalAmount.toLocaleString()} VNĐ
        </div>
      </div>
      
      <div className="flex gap-3 w-full md:w-auto mt-2 md:mt-0">
        {step === 2 && (
          <button
            onClick={onBack}
            className="px-6 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center gap-2"
          >
            <ArrowLeft size={18} /> Quay lại
          </button>
        )}
        {step === 1 ? (
          <button
            onClick={onNext}
            className="flex-1 md:flex-none px-8 py-3.5 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 hover:-translate-y-0.5 transition-all shadow-[0_8px_20px_rgba(17,24,39,0.25)] hover:shadow-[0_12px_24px_rgba(17,24,39,0.35)]"
          >
            Tiếp tục
          </button>
        ) : (
          <button
            onClick={onSubmit}
            disabled={isBooking}
            className="flex-1 md:flex-none px-8 py-3.5 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 shadow-[0_8px_20px_rgba(17,24,39,0.25)] hover:shadow-[0_12px_24px_rgba(17,24,39,0.35)]"
          >
            {isBooking ? 'Đang xử lý...' : 'Thanh toán ZaloPay'}
          </button>
        )}
      </div>
    </div>
  );
}
