import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Copy,
  Film,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  User,
  X,
} from "lucide-react";
import {
  contactApi,
  ContactCategory,
  ContactSubmitResponse,
  ContactTrackingResponse,
} from "@/api/contactApi";
import { getApiErrorMessage } from "@/api/errors";
import { useAuthToken } from "@/hooks/useAuthToken";
import { userService } from "@/api/userApi";

interface CustomerContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOPICS: Array<{ category: ContactCategory; label: string }> = [
  { category: "SERVICE_QUALITY", label: "Dịch vụ & chất lượng rạp" },
  { category: "BOOKING_PAYMENT", label: "Đặt vé & thanh toán" },
  { category: "STAFF_ATTITUDE", label: "Thái độ nhân viên" },
  { category: "PARTNERSHIP", label: "Hợp tác & quảng cáo" },
  { category: "MOVIE_SCHEDULE", label: "Phim & lịch chiếu" },
  { category: "OTHER", label: "Nội dung khác" },
];

const STATUS_LABEL = {
  NEW: "Đã tiếp nhận",
  IN_PROGRESS: "Đang xử lý",
  WAITING_CUSTOMER: "Đang chờ khách hàng",
  RESOLVED: "Đã giải quyết",
  CLOSED: "Đã đóng",
};

export function CustomerContactModal({ isOpen, onClose }: CustomerContactModalProps) {
  const token = useAuthToken();
  const [mode, setMode] = useState<"SUBMIT" | "TRACK">("SUBMIT");
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitResult, setSubmitResult] = useState<ContactSubmitResponse | null>(null);
  const [trackingCode, setTrackingCode] = useState("");
  const [trackingEmail, setTrackingEmail] = useState("");
  const [trackingResult, setTrackingResult] = useState<ContactTrackingResponse | null>(null);

  useEffect(() => {
    if (!isOpen || !token || (senderName && senderEmail)) return;
    userService.getMyProfile().then((profile) => {
      setSenderName(profile.fullName || profile.username || "");
      setSenderEmail(profile.email || "");
      setTrackingEmail(profile.email || "");
    }).catch(() => undefined);
  }, [isOpen, token, senderEmail, senderName]);

  if (!isOpen) return null;

  const submitContact = async (event: React.FormEvent) => {
    event.preventDefault();
    if (message.trim().length < 10) {
      setErrorMessage("Nội dung góp ý cần ít nhất 10 ký tự để nhân viên có đủ thông tin xử lý.");
      return;
    }
    setLoading(true);
    setErrorMessage("");
    try {
      const result = await contactApi.submit({
        senderName: senderName.trim(),
        senderEmail: senderEmail.trim(),
        subject: topic.label,
        category: topic.category,
        message: message.trim(),
      });
      setSubmitResult(result);
      setTrackingCode(result.ticketCode);
      setTrackingEmail(senderEmail.trim());
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Không thể gửi góp ý. Vui lòng thử lại."));
    } finally {
      setLoading(false);
    }
  };

  const trackContact = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setTrackingResult(null);
    try {
      setTrackingResult(await contactApi.track(trackingCode.trim(), trackingEmail.trim()));
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Không tìm thấy yêu cầu. Hãy kiểm tra lại mã và email."));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMessage("");
    setSubmitResult(null);
    setErrorMessage("");
  };

  const copyTicket = () => {
    if (submitResult?.ticketCode) void navigator.clipboard.writeText(submitResult.ticketCode);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-[#111827] text-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-950/95 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-slate-950"><Film size={20} /></div>
            <div>
              <h3 className="font-bold">Trung tâm hỗ trợ Magi Cinema</h3>
              <p className="text-xs text-slate-400">Gửi yêu cầu và theo dõi tiến độ bằng mã tra cứu</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg border-0 bg-slate-800 p-2 text-slate-300 hover:bg-slate-700"><X size={17} /></button>
        </div>

        <div className="p-6">
          <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-900 p-1">
            <button onClick={() => { setMode("SUBMIT"); setErrorMessage(""); }} className={`rounded-lg border-0 px-4 py-2.5 text-xs font-bold ${mode === "SUBMIT" ? "bg-white text-slate-950" : "bg-transparent text-slate-400"}`}>
              <MessageSquare size={14} className="mr-2 inline" />Gửi góp ý
            </button>
            <button onClick={() => { setMode("TRACK"); setErrorMessage(""); }} className={`rounded-lg border-0 px-4 py-2.5 text-xs font-bold ${mode === "TRACK" ? "bg-white text-slate-950" : "bg-transparent text-slate-400"}`}>
              <Search size={14} className="mr-2 inline" />Tra cứu yêu cầu
            </button>
          </div>

          {errorMessage && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              <AlertTriangle size={16} />{errorMessage}
            </div>
          )}

          {mode === "SUBMIT" && submitResult ? (
            <div className="py-3 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"><CheckCircle2 size={36} /></div>
              <h4 className="text-xl font-bold">Yêu cầu đã được tiếp nhận</h4>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-300">Magi Cinema đã tạo một hồ sơ hỗ trợ riêng. Hãy lưu mã dưới đây để theo dõi phản hồi.</p>
              <div className="mx-auto my-5 max-w-md rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300">Mã tra cứu</p>
                <div className="mt-1 flex items-center justify-center gap-2 text-xl font-black tracking-wide text-white">
                  {submitResult.ticketCode}
                  <button onClick={copyTicket} title="Sao chép mã" className="border-0 bg-transparent p-1 text-amber-300"><Copy size={16} /></button>
                </div>
                {submitResult.dueAt && <p className="mt-2 text-xs text-slate-300">Dự kiến xử lý trước {submitResult.dueAt}</p>}
              </div>
              <div className="flex justify-center gap-3">
                <button onClick={resetForm} className="rounded-xl border-0 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200"><RefreshCw size={14} className="mr-2 inline" />Gửi yêu cầu khác</button>
                <button onClick={() => setMode("TRACK")} className="rounded-xl border-0 bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950">Theo dõi ngay</button>
              </div>
            </div>
          ) : mode === "SUBMIT" ? (
            <form onSubmit={submitContact} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field icon={<User size={13} />} label="Họ và tên">
                  <input required maxLength={100} value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Nguyễn Văn A" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none placeholder:text-slate-600 focus:border-amber-400" />
                </Field>
                <Field icon={<Mail size={13} />} label="Email nhận phản hồi">
                  <input required type="email" maxLength={150} value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} placeholder="ban@email.com" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none placeholder:text-slate-600 focus:border-amber-400" />
                </Field>
              </div>
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-300">Nội dung cần hỗ trợ</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {TOPICS.map((item) => (
                    <button type="button" key={item.category} onClick={() => setTopic(item)} className={`rounded-xl border px-3 py-2.5 text-left text-[11px] font-semibold ${topic.category === item.category ? "border-amber-400 bg-amber-400/10 text-amber-200" : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"}`}>{item.label}</button>
                  ))}
                </div>
              </div>
              <Field icon={<MessageSquare size={13} />} label="Mô tả chi tiết">
                <textarea required minLength={10} maxLength={5000} rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Mô tả thời gian, giao dịch hoặc tình huống để chúng tôi xử lý nhanh hơn..." className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none placeholder:text-slate-600 focus:border-amber-400 resize-none" />
                <p className="mt-1 text-right text-[10px] text-slate-500">{message.length}/5000</p>
              </Field>
              <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                <button type="button" onClick={onClose} className="rounded-xl border-0 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300">Đóng</button>
                <button disabled={loading} className="rounded-xl border-0 bg-amber-400 px-5 py-2.5 text-xs font-black text-slate-950 disabled:opacity-50"><Send size={14} className="mr-2 inline" />{loading ? "Đang gửi..." : "Tạo yêu cầu"}</button>
              </div>
            </form>
          ) : (
            <div>
              <form onSubmit={trackContact} className="grid gap-3 rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:grid-cols-[1fr_1fr_auto]">
                <input required value={trackingCode} onChange={(e) => setTrackingCode(e.target.value.toUpperCase())} placeholder="MAGI-20260918-000001" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none placeholder:text-slate-600 focus:border-amber-400" />
                <input required type="email" value={trackingEmail} onChange={(e) => setTrackingEmail(e.target.value)} placeholder="Email đã dùng khi gửi" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none placeholder:text-slate-600 focus:border-amber-400" />
                <button disabled={loading} className="rounded-xl border-0 bg-amber-400 px-5 py-2.5 text-xs font-black text-slate-950"><Search size={14} className="mr-2 inline" />Tra cứu</button>
              </form>
              {trackingResult ? (
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><p className="font-mono text-xs text-amber-300">{trackingResult.ticketCode}</p><h4 className="mt-1 font-bold">{trackingResult.subject}</h4><p className="mt-1 text-xs text-slate-400">Đã gửi {trackingResult.createdAt}</p></div>
                      <span className="rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-xs font-bold text-blue-200">{STATUS_LABEL[trackingResult.status]}</span>
                    </div>
                    {trackingResult.dueAt && !trackingResult.resolvedAt && <p className="mt-4 flex items-center gap-2 text-xs text-slate-300"><Clock3 size={14} className="text-amber-300" />Mục tiêu phản hồi trước {trackingResult.dueAt}</p>}
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Lịch sử phản hồi</p>
                    {trackingResult.replies.length === 0 ? <p className="rounded-xl bg-slate-900 p-4 text-xs text-slate-400">Nhân viên đang tiếp nhận yêu cầu của bạn.</p> : trackingResult.replies.map((reply) => (
                      <div key={reply.replyId} className="mb-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                        <div className="mb-2 flex justify-between text-[11px] text-emerald-300"><strong>{reply.staffName || "Magi Cinema"}</strong><span>{reply.createdAt} · {reply.emailDelivered ? "Đã gửi email" : "Trên cổng tra cứu"}</span></div>
                        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-200">{reply.replyMessage}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="mt-4 text-center text-xs text-slate-500">Mã tra cứu có trong màn hình xác nhận sau khi gửi góp ý.</p>}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-300">{icon}{label} *</span>{children}</label>;
}
