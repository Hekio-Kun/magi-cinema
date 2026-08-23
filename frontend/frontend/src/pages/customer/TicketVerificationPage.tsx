import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Armchair,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Film,
  Loader2,
  MapPin,
  ShieldCheck,
  Ticket,
  XCircle,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { bookingApi, type TicketVerificationResponse } from "@/api/bookingApi";
import { formatPresentationLabelFromFields } from "@/utils/presentation";

const money = (value = 0) => value.toLocaleString("vi-VN", {
  style: "currency",
  currency: "VND",
});

const showDate = (value?: string) => {
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

export default function TicketVerificationPage() {
  const { token = "" } = useParams();
  const [ticket, setTicket] = useState<TicketVerificationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    bookingApi.verifyTicket(token)
      .then((data) => {
        if (!cancelled) setTicket(data);
      })
      .catch((requestError: unknown) => {
        const message = (requestError as { response?: { data?: { message?: string } } })
          .response?.data?.message;
        if (!cancelled) setError(message || "Mã QR vé không hợp lệ hoặc không tồn tại.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return <main className="grid min-h-[70vh] place-items-center bg-slate-100"><Loader2 className="animate-spin text-rose-600" size={34} /></main>;
  }

  if (!ticket || error) {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-slate-100 px-5 py-16">
        <section className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-xl">
          <XCircle className="mx-auto text-rose-600" size={52} />
          <h1 className="mt-4 text-2xl font-black text-slate-950">Không xác thực được vé</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{error}</p>
          <Link to="/" className="mt-6 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">Về trang chủ</Link>
        </section>
      </main>
    );
  }

  const presentation = formatPresentationLabelFromFields(ticket);

  return (
    <main className="min-h-screen bg-slate-100 px-4 pb-6 pt-24 sm:px-6 sm:pb-8 sm:pt-28">
      <article className="mx-auto w-full max-w-[52rem] overflow-hidden rounded-3xl border border-white/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
        <header className={`px-6 py-5 text-white sm:px-7 ${ticket.validTicket ? "bg-emerald-600" : "bg-rose-600"}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-white/80"><ShieldCheck size={16} /> CinePrime E-ticket</p>
              <h1 className="mt-2 text-2xl font-black">{ticket.validTicket ? "Vé hợp lệ" : "Vé không hợp lệ"}</h1>
              <p className="mt-1 text-sm text-white/85">{ticket.verificationMessage}</p>
            </div>
            {ticket.validTicket ? <CheckCircle2 size={38} /> : <XCircle size={38} />}
          </div>
        </header>

        <div className="p-5 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[.16em] text-rose-600">Đơn vé #{ticket.bookingId}</p>
          <h2 className="mt-2 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">{ticket.movieTitle}</h2>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_13rem] lg:gap-6">
            <div className="min-w-0">
              <div className="grid gap-3 sm:grid-cols-2">
                <Info icon={<CalendarDays size={18} />} label="Ngày chiếu" value={showDate(ticket.showDate)} />
                <Info icon={<Clock3 size={18} />} label="Giờ chiếu" value={ticket.startTime.slice(0, 5)} />
                <Info icon={<MapPin size={18} />} label="Phòng chiếu" value={ticket.cinemaRoomName} />
                <Info icon={<Film size={18} />} label="Phiên bản" value={presentation || "Tiêu chuẩn"} />
              </div>

              <section className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 font-black text-slate-950"><Armchair size={19} className="text-rose-600" /> Ghế</div>
                  <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-700">{ticket.ticketCount} vé</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {ticket.seatCodes.map((seat) => <span key={seat} className="grid h-11 min-w-11 place-items-center rounded-xl bg-slate-950 px-3 font-black text-white">{seat}</span>)}
                </div>
              </section>

              <div className="mt-5 flex items-end justify-between gap-4 border-t border-slate-100 pt-4">
                <div><p className="text-xs font-bold text-slate-500">Tổng thanh toán</p><p className="mt-1 text-2xl font-black text-rose-600">{money(ticket.totalAmount)}</p></div>
                <div className="text-right"><Ticket className="ml-auto text-slate-400" size={22} /><p className="mt-1 text-xs font-bold text-slate-500">Đã xác thực từ hệ thống</p></div>
              </div>
            </div>

            <aside className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
              <div className="rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-slate-200">
                <img
                  src={bookingApi.getTicketQrImageUrl(token)}
                  alt={`Mã QR vé #${ticket.bookingId}`}
                  className={`h-36 w-36 sm:h-40 sm:w-40 lg:h-36 lg:w-36 ${ticket.isScanned ? "opacity-30 grayscale" : ""}`}
                />
              </div>
              <p className="mt-4 text-sm font-black text-slate-950">Mã vé #{ticket.bookingId}</p>
              
              {!ticket.isScanned && ticket.validTicket ? (
                <button 
                  onClick={async () => {
                    try {
                      await bookingApi.markTicketAsScanned(token);
                      setTicket(prev => prev ? { ...prev, isScanned: true, validTicket: false, verificationMessage: "Vé đã được sử dụng (quét mã) trước đó." } : prev);
                      alert("Đã xác nhận quét vé thành công!");
                    } catch (err: any) {
                      alert(err.response?.data?.message || "Lỗi khi xác nhận quét vé. Vui lòng đăng nhập với tài khoản nhân viên.");
                    }
                  }}
                  className="mt-4 w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700 active:scale-95 transition-all"
                >
                  Xác nhận vé đã quét
                </button>
              ) : (
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {ticket.isScanned ? "Mã QR này đã bị vô hiệu hóa vì đã được sử dụng." : "Xuất trình mã QR này tại cổng soát vé."}
                </p>
              )}
            </aside>
          </div>
        </div>
      </article>
    </main>
  );
}

function Info({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3.5">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-1 font-black text-slate-950">{value}</p></div>
    </div>
  );
}
