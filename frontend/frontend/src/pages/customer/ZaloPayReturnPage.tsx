import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { paymentApi } from '@/api/paymentApi';

type PaymentStatus = 'loading' | 'success' | 'failed';

export default function ZaloPayReturnPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<PaymentStatus>('loading');

  const queryParams = useMemo(
    () => Object.fromEntries(searchParams.entries()) as Record<string, string>,
    [searchParams]
  );
  const isMembership = queryParams.apptransid?.includes('_M') ?? false;

  useEffect(() => {
    let isMounted = true;

    const processPayment = async () => {
      try {
        if (!queryParams.apptransid || !queryParams.checksum) {
          if (isMounted) setStatus('failed');
          return;
        }

        const result = await paymentApi.confirmZaloPayReturn(queryParams);
        if (!isMounted) return;

        if (result === 'SUCCESS') {
          setStatus('success');
          toast.success(isMembership ? 'Thanh toán thành công! Gói hội viên đã được kích hoạt.' : 'Thanh toán thành công! Vé của bạn đã được xuất.');
        } else {
          setStatus('failed');
          toast.error('Thanh toán thất bại hoặc đã bị hủy.');
        }
      } catch {
        if (!isMounted) return;
        setStatus('failed');
        toast.error('Có lỗi xảy ra khi xác nhận thanh toán.');
      }
    };

    processPayment();
    return () => {
      isMounted = false;
    };
  }, [isMembership, queryParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f6f8] px-4 py-24">
      <div className="w-full max-w-md rounded-2xl border border-white/70 bg-white/85 p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.14)] backdrop-blur-xl">
        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <Loader2 className="mb-4 h-16 w-16 animate-spin text-[#0068ff]" />
            <h2 className="mb-2 text-2xl font-bold text-slate-950">Đang xác nhận thanh toán</h2>
            <p className="text-sm text-slate-500">Vui lòng không đóng trang web.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center">
            <CheckCircle2 className="mb-4 h-20 w-20 text-green-500" />
            <h2 className="mb-2 text-2xl font-bold text-slate-950">Thanh toán thành công</h2>
            <p className="mb-8 text-sm leading-6 text-slate-500">
              {isMembership ? 'Gói hội viên đã được kích hoạt và quyền lợi có hiệu lực ngay.' : 'Cảm ơn bạn đã đặt vé. Bạn có thể xem vé trong mục hồ sơ.'}
            </p>
            <button
              onClick={() => navigate(isMembership ? '/profile?tab=membership' : '/profile?tab=tickets')}
              className="w-full rounded-xl bg-green-600 py-3 font-bold text-white shadow-lg transition hover:bg-green-700"
            >
              {isMembership ? 'Xem hội viên của tôi' : 'Xem vé của tôi'}
            </button>
          </div>
        )}

        {status === 'failed' && (
          <div className="flex flex-col items-center">
            <XCircle className="mb-4 h-20 w-20 text-red-500" />
            <h2 className="mb-2 text-2xl font-bold text-slate-950">Thanh toán thất bại</h2>
            <p className="mb-8 text-sm leading-6 text-slate-500">
              Giao dịch của bạn đã bị hủy hoặc không thể xác nhận.
            </p>
            <button
              onClick={() => navigate('/')}
              className="w-full rounded-xl bg-slate-900 py-3 font-bold text-white shadow-lg transition hover:bg-slate-800"
            >
              Trở về trang chủ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
