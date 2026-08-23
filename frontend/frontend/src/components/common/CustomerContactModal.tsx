import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Send, X, MessageSquare, User, Mail, RefreshCw, Film } from "lucide-react";
import { contactApi } from "@/api/contactApi";
import { useAuthToken } from "@/hooks/useAuthToken";
import { userService } from "@/api/userApi";

interface CustomerContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOPICS = [
  "Góp ý dịch vụ & Chất lượng rạp",
  "Sự cố đặt vé & Thanh toán",
  "Góp ý thái độ nhân viên",
  "Hợp tác đối tác & Quảng cáo",
  "Đề xuất phim & Lịch chiếu",
  "Khác",
];

export function CustomerContactModal({ isOpen, onClose }: CustomerContactModalProps) {
  const token = useAuthToken();
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [subject, setSubject] = useState(TOPICS[0]);
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isOpen && token && (!senderName || !senderEmail)) {
      userService.getMyProfile().then((profile) => {
        if (profile) {
          if (profile.fullName) setSenderName(profile.fullName);
          else if (profile.username) setSenderName(profile.username);
          if (profile.email) setSenderEmail(profile.email);
        }
      }).catch(() => {
        // Ignore error if profile can't be fetched
      });
    }
  }, [isOpen, token]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderName.trim() || !senderEmail.trim() || !message.trim()) {
      setErrorMessage("Vui lòng điền đầy đủ họ tên, email và nội dung liên hệ.");
      return;
    }
    setLoading(true);
    setErrorMessage("");

    try {
      await contactApi.submit({
        senderName: senderName.trim(),
        senderEmail: senderEmail.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });
      // Luôn ghi nhận thành công và hiển thị lời cảm ơn tới khách hàng
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || "Đã xảy ra lỗi kết nối khi gửi liên hệ. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMessage("");
    setIsSuccess(false);
    setErrorMessage("");
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="w-full max-w-xl overflow-hidden bg-[#111827] rounded-2xl border border-gray-800 shadow-2xl transition-all text-white"
        style={{ boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.65)" }}
      >
        {/* Clean Header */}
        <div className="px-6 py-4 bg-gray-900 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center shadow-sm">
              <Film size={18} className="text-gray-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Liên hệ & Góp ý Khách hàng
              </h3>
              <p className="text-[11px] text-gray-400">
                Chúng tôi sẵn sàng lắng nghe và giải quyết yêu cầu hỗ trợ 24/7
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-colors border-none cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {isSuccess ? (
            <div className="py-6 text-center animate-fadeIn">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-400 shadow-sm">
                <CheckCircle2 size={36} />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">🎉 Góp ý đã được gửi thành công!</h4>
              <p className="text-xs text-gray-300 max-w-md mx-auto leading-relaxed mb-6">
                MagiCinema chân thành cảm ơn ý kiến đóng góp quý báu của bạn. Thông điệp đã được tiếp nhận và chuyển tới Ban quản lý rạp để xử lý và phản hồi trong thời gian sớm nhất.
              </p>
              <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl text-left max-w-sm mx-auto mb-6 text-xs text-gray-400">
                <div className="flex justify-between pb-2 border-b border-gray-800 mb-2">
                  <span className="font-semibold text-gray-300">Chủ đề:</span>
                  <span className="text-white font-medium">{subject}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-300">Trạng thái:</span>
                  <span className="text-emerald-400 font-semibold">
                    ● Đã chuyển tới Ban quản lý
                  </span>
                </div>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium text-xs flex items-center gap-1.5 transition-all border-none cursor-pointer"
                >
                  <RefreshCw size={13} /> Gửi góp ý khác
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-medium text-xs transition-all border-none cursor-pointer"
                >
                  Hoàn tất
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* General Error Message */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                  <AlertTriangle size={16} className="flex-shrink-0 text-amber-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Name & Email inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <User size={12} className="text-gray-400" /> Họ và tên *
                  </label>
                  <input
                    type="text"
                    required
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-700 focus:border-gray-500 text-white text-xs outline-none transition-all placeholder-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Mail size={12} className="text-gray-400" /> Email liên hệ *
                  </label>
                  <input
                    type="email"
                    required
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-700 focus:border-gray-500 text-white text-xs outline-none transition-all placeholder-gray-600"
                  />
                </div>
              </div>

              {/* Subject topics pills */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Chủ đề quan tâm *
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {TOPICS.map((t) => {
                    const active = subject === t;
                    return (
                      <button
                        type="button"
                        key={t}
                        onClick={() => setSubject(t)}
                        className={`px-2.5 py-1 rounded-lg text-[11.5px] font-medium transition-all duration-200 border cursor-pointer ${
                          active
                            ? "bg-gray-200 text-gray-900 border-gray-300 font-bold"
                            : "bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700"
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message textarea */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <MessageSquare size={12} className="text-gray-400" /> Nội dung góp ý *
                </label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Chia sẻ trải nghiệm, đóng góp ý kiến hoặc thông báo vấn đề bạn cần hỗ trợ..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-900 border border-gray-700 focus:border-gray-500 text-white text-xs outline-none transition-all resize-none placeholder-gray-600 leading-relaxed"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-gray-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium text-xs transition-colors border-none cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-white hover:bg-gray-200 text-gray-900 font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border-none cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      <span>Gửi góp ý ngay</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
