import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CreditCard, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import { paymentApi, type ZaloPayPaymentResponse } from '@/api/paymentApi';

const formatCurrency = (value?: number | null) =>
  typeof value === 'number'
    ? value.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })
    : 'Đang cập nhật';

type ApiErrorResponse = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return fallback;
  }
  return (error as ApiErrorResponse).response?.data?.message || fallback;
};

export default function ZaloPayPaymentPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const requestedRef = useRef(false);
  const parsedBookingId = Number(bookingId);

  const [payment, setPayment] = useState<ZaloPayPaymentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const canCreatePayment = Number.isFinite(parsedBookingId) && parsedBookingId > 0;

  const statusMessage = useMemo(() => {
    if (!payment?.returnMessage && !payment?.subReturnMessage) return 'Sẵn sàng chuyển sang cổng thanh toán';
    return payment.subReturnMessage || payment.returnMessage || 'Sẵn sàng chuyển sang cổng thanh toán';
  }, [payment?.returnMessage, payment?.subReturnMessage]);

  const loadPayment = useCallback(async () => {
    if (!canCreatePayment) {
      setErrorMessage('Mã đặt vé không hợp lệ.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');
      const result = await paymentApi.createZaloPayOrder(parsedBookingId);
      setPayment(result);
    } catch (error) {
      const message = getErrorMessage(error, 'Không thể tạo giao dịch ZaloPay.');
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [canCreatePayment, parsedBookingId]);

  useEffect(() => {
    if (requestedRef.current) return;
    requestedRef.current = true;
    loadPayment();
  }, [loadPayment]);

  const handleRetry = () => {
    requestedRef.current = false;
    setPayment(null);
    loadPayment();
  };

  const handlePay = () => {
    if (!payment?.orderUrl) {
      toast.error('Không nhận được đường dẫn thanh toán ZaloPay.');
      return;
    }
    window.location.href = payment.orderUrl;
  };

  return (
    <div className="min-h-screen bg-[#f4f6f8] px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => navigate(-1)}
          className="mb-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <ArrowLeft size={17} /> Quay lại
        </button>

        <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="border-b border-slate-200/70 p-6 sm:p-8 lg:border-b-0 lg:border-r">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                <ShieldCheck size={16} /> Thanh toán bảo mật
              </div>
              <h1 className="mt-5 text-3xl font-extrabold tracking-normal text-slate-950">
                Thanh toán qua ZaloPay
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                Kiểm tra lại thông tin giao dịch trước khi chuyển sang cổng thanh toán ZaloPay.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold text-slate-500">Mã đặt vé</div>
                  <div className="mt-2 text-xl font-bold text-slate-950">#{bookingId || '--'}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold text-slate-500">Số tiền</div>
                  <div className="mt-2 text-xl font-bold text-slate-950">
                    {formatCurrency(payment?.amount)}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-semibold text-slate-500">Mã giao dịch ZaloPay</div>
                <div className="mt-2 break-words text-sm font-bold text-slate-900">
                  {payment?.appTransId || 'Đang tạo giao dịch...'}
                </div>
              </div>
            </section>

            <section className="flex flex-col justify-center p-6 sm:p-8">
              {isLoading && (
                <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-8 text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-slate-800" />
                  <h2 className="mt-5 text-xl font-bold text-slate-950">Đang tạo giao dịch</h2>
                  <p className="mt-2 text-sm text-slate-500">Vui lòng chờ trong giây lát.</p>
                </div>
              )}

              {!isLoading && errorMessage && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
                  <h2 className="text-lg font-bold text-red-700">Không thể tạo thanh toán</h2>
                  <p className="mt-2 text-sm leading-6 text-red-600">{errorMessage}</p>
                  <button
                    onClick={handleRetry}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
                  >
                    <RefreshCw size={17} /> Thử lại
                  </button>
                </div>
              )}

              {!isLoading && payment && !errorMessage && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0068ff]/10 text-[#0068ff]">
                    <CreditCard size={28} />
                  </div>
                  <h2 className="mt-5 text-xl font-bold text-slate-950">Giao dịch đã sẵn sàng</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{statusMessage}</p>

                  <button
                    onClick={handlePay}
                    className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0068ff] px-5 py-3.5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(0,104,255,0.25)] transition hover:bg-[#0058d8]"
                  >
                    <CreditCard size={18} /> Thanh toán bằng ZaloPay
                  </button>
                  <button
                    onClick={handleRetry}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    <RefreshCw size={17} /> Tạo lại giao dịch
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
