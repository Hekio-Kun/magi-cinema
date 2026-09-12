import { useState, useEffect, useMemo } from "react";
import { 
  MessageSquare, 
  Mail, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  Search, 
  Filter, 
  Send, 
  X, 
  RefreshCw, 
  ShieldAlert, 
  Clock, 
  MessageCircle,
  Trash2
} from "lucide-react";
import { contactApi, ContactResponse } from "@/api/contactApi";
import { getApiErrorMessage } from "@/api/errors";

type ContactFilterStatus = "ALL" | "RECEIVED" | "REPLIED" | "FLAGGED";

export function CustomerContactManagementPage() {
  const [contacts, setContacts] = useState<ContactResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<ContactFilterStatus>("ALL");

  // State to track which cards are currently showing raw unmasked text
  const [showRawTextMap, setShowRawTextMap] = useState<Record<number, boolean>>({});

  // Reply modal state
  const [replyingItem, setReplyingItem] = useState<ContactResponse | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const data = await contactApi.getAdminList();
      setContacts(data);
    } catch (err) {
      console.error("Failed to fetch contacts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    contactApi.getAdminList()
      .then((data) => { if (active) setContacts(data); })
      .catch((err) => { if (active) console.error("Failed to fetch contacts", err); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!notification) return;
    const timer = window.setTimeout(() => setNotification(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notification]);

  const toggleShowRawText = (id: number) => {
    setShowRawTextMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filtered lists and stats
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const matchSearch = 
        c.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.senderEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.message.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchSearch) return false;
      if (filterStatus === "RECEIVED") return c.status === "RECEIVED";
      if (filterStatus === "REPLIED") return c.status === "REPLIED";
      if (filterStatus === "FLAGGED") return !c.aiApproved || (c.badWords && c.badWords.length > 0);
      return true;
    });
  }, [contacts, searchQuery, filterStatus]);

  const stats = useMemo(() => {
    const total = contacts.length;
    const received = contacts.filter((c) => c.status === "RECEIVED").length;
    const replied = contacts.filter((c) => c.status === "REPLIED").length;
    const flagged = contacts.filter((c) => !c.aiApproved || (c.badWords && c.badWords.length > 0)).length;
    return { total, received, replied, flagged };
  }, [contacts]);

  const handleOpenReplyModal = (item: ContactResponse) => {
    setReplyingItem(item);
    setReplyText(item.adminReply || "");
    setReplyError("");
  };

  const handleCloseReplyModal = () => {
    setReplyingItem(null);
    setReplyText("");
    setReplyError("");
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingItem || !replyText.trim()) {
      setReplyError("Vui lòng nhập nội dung phản hồi.");
      return;
    }
    setSubmittingReply(true);
    setReplyError("");

    try {
      const updated = await contactApi.reply(replyingItem.contactId, replyText.trim());
      setContacts((prev) => prev.map((item) => item.contactId === updated.contactId ? updated : item));
      setNotification({ type: "success", text: `Đã gửi email phản hồi thành công đến ${replyingItem.senderEmail}!` });
      handleCloseReplyModal();
    } catch (err: unknown) {
      setReplyError(getApiErrorMessage(err, "Lỗi khi gửi email phản hồi. Kiểm tra lại kết nối mail server."));
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDeleteContact = async (contactId: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa góp ý này không? Hành động này không thể hoàn tác.")) {
      return;
    }
    try {
      await contactApi.delete(contactId);
      setContacts((prev) => prev.filter((item) => item.contactId !== contactId));
      setNotification({ type: "success", text: "Đã xóa góp ý thành công!" });
    } catch (err: unknown) {
      setNotification({ type: "error", text: getApiErrorMessage(err, "Lỗi khi xóa góp ý.") });
    }
  };

  return (
    <div style={{ padding: "28px 32px", height: "100%", overflowY: "auto", background: "#F4F5F7", fontFamily: "Inter, sans-serif" }}>
      {/* Header & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-[#111827] tracking-tight flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md">
              <MessageSquare size={22} />
            </div>
            <span>Quản lý Ý kiến & Góp ý Khách hàng</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Tiếp nhận, kiểm duyệt tự động từ vựng vi phạm và phản hồi trực tiếp qua Email Khách hàng
          </p>
        </div>

        <button
          onClick={fetchContacts}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold shadow-sm border border-gray-200 flex items-center gap-2 transition-all cursor-pointer border-none"
          style={{ border: "1px solid #E5E7EB" }}
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div className={`mb-6 p-4 rounded-xl shadow-md border flex items-center justify-between text-sm transition-all animate-fadeIn ${
          notification.type === "success" 
            ? "bg-emerald-50 border-emerald-300 text-emerald-800" 
            : "bg-rose-50 border-rose-300 text-rose-800"
        }`}>
          <div className="flex items-center gap-2.5 font-medium">
            <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-gray-700 bg-transparent border-none cursor-pointer">
            <X size={16} />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tổng số góp ý</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <MessageCircle size={24} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Chờ phản hồi</p>
            <p className="text-2xl font-extrabold text-amber-600 mt-1">{stats.received}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock size={24} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Đã gửi Email</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">{stats.replied}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Mail size={24} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Từ vựng vi phạm (AI)</p>
            <p className="text-2xl font-extrabold text-rose-600 mt-1">{stats.flagged}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <ShieldAlert size={24} />
          </div>
        </div>
      </div>

      {/* Filters & Search bar */}
      <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-xs mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center flex-wrap gap-2">
          <span className="text-xs font-semibold text-gray-400 uppercase mr-1 flex items-center gap-1">
            <Filter size={14} /> Trạng thái:
          </span>
          {[
            { id: "ALL", label: "Tất cả", count: stats.total },
            { id: "RECEIVED", label: "Chờ phản hồi", count: stats.received },
            { id: "REPLIED", label: "Đã phản hồi", count: stats.replied },
            { id: "FLAGGED", label: "⚠️ Có từ vi phạm", count: stats.flagged },
          ].map((tab) => {
            const active = filterStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id as ContactFilterStatus)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border-none ${
                  active 
                    ? "bg-slate-900 text-white shadow-xs" 
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo tên, email, chủ đề..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 focus:border-slate-800 text-sm outline-none transition-all bg-gray-50/50"
          />
        </div>
      </div>

      {/* Contact Items List */}
      {loading ? (
        <div className="py-20 text-center text-gray-500">
          <div className="w-8 h-8 border-3 border-gray-200 border-t-slate-800 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium">Đang tải danh sách góp ý...</p>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-gray-200 shadow-xs text-gray-500">
          <MessageSquare size={44} className="mx-auto mb-3 text-gray-300" />
          <p className="text-base font-semibold text-gray-700">Chưa có ý kiến góp ý nào</p>
          <p className="text-xs text-gray-400 mt-1">Không tìm thấy bản ghi nào khớp với điều kiện lọc hiện tại.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredContacts.map((item) => {
            const hasBadWords = !item.aiApproved || (item.badWords && item.badWords.length > 0);
            const isShowingRaw = showRawTextMap[item.contactId] || false;
            const displayedText = isShowingRaw ? item.message : (item.maskedMessage || item.message);

            return (
              <div 
                key={item.contactId} 
                className="p-6 rounded-2xl bg-white border border-gray-200/90 shadow-xs hover:shadow-md transition-all flex flex-col gap-4"
              >
                {/* Header of Card */}
                <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-gray-100">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-full bg-slate-100 border border-gray-200 flex items-center justify-center font-bold text-slate-700 flex-shrink-0 text-base">
                      {item.senderName ? item.senderName.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h4 className="text-base font-bold text-gray-900">{item.senderName}</h4>
                        <span className="text-xs text-gray-500 flex items-center gap-1 bg-gray-100 px-2.5 py-0.5 rounded-md font-mono">
                          <Mail size={12} /> {item.senderEmail}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={13} /> {item.createdAt || "Vừa xong"}
                        </span>
                        <span>•</span>
                        <span className="font-semibold text-slate-700 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">
                          Chủ đề: {item.subject}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.status === "REPLIED" ? (
                      <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                        <CheckCircle2 size={13} /> Đã phản hồi Email
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold flex items-center gap-1.5">
                        <Clock size={13} /> Chờ xử lý
                      </span>
                    )}
                  </div>
                </div>

                {/* Message Body with clean optional reveal toggle */}
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                  {hasBadWords && (
                    <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200 text-xs">
                      <span className="font-semibold text-rose-600 flex items-center gap-1.5">
                        <ShieldAlert size={14} /> Tin nhắn đã được tự động lọc từ ngữ vi phạm tiêu chuẩn
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleShowRawText(item.contactId)}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-gray-100 text-gray-700 font-semibold shadow-2xs border border-gray-300 flex items-center gap-1.5 text-[11px] transition-colors cursor-pointer border-none"
                        style={{ border: "1px solid #D1D5DB" }}
                      >
                        {isShowingRaw ? (
                          <>
                            <EyeOff size={13} className="text-rose-500" />
                            <span>🔒 Ẩn từ vi phạm (***)</span>
                          </>
                        ) : (
                          <>
                            <Eye size={13} className="text-emerald-600" />
                            <span>👁️ Hiển thị từ gốc</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                  <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">
                    {displayedText}
                  </div>
                </div>

                {/* Reply History or Action Footer */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="flex-1">
                    {item.status === "REPLIED" && item.adminReply ? (
                      <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 text-xs text-gray-700">
                        <div className="font-bold text-emerald-800 flex items-center gap-1.5 mb-1">
                          <Mail size={13} className="text-emerald-600" />
                          <span>Nội dung đã trả lời qua email ({item.repliedAt}):</span>
                        </div>
                        <p className="text-gray-800 italic bg-white/80 p-2.5 rounded-lg border border-emerald-100 mt-1">
                          "{item.adminReply}"
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">
                        * Có thể gửi trả lời trực tiếp đến email cá nhân của khách hàng bên cạnh.
                      </span>
                    )}
                  </div>

                  <div className="flex justify-end flex-shrink-0 gap-2">
                    <button
                      onClick={() => handleOpenReplyModal(item)}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm flex items-center gap-2 transition-all cursor-pointer border-none"
                    >
                      <Mail size={14} />
                      <span>{item.status === "REPLIED" ? "📧 Gửi lại Email" : "📧 Gửi Email Phản hồi"}</span>
                    </button>
                    <button
                      onClick={() => handleDeleteContact(item.contactId)}
                      className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold shadow-sm border border-rose-200 flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reply Modal */}
      {replyingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg overflow-hidden bg-white rounded-2xl border border-gray-200 shadow-2xl transition-all">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Mail size={18} className="text-emerald-400" />
                <h3 className="text-base font-bold">Gửi Email Phản Hồi Khách Hàng</h3>
              </div>
              <button onClick={handleCloseReplyModal} className="text-gray-400 hover:text-white bg-transparent border-none cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendReply} className="p-6 space-y-4">
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1.5 text-gray-600">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-500">Người nhận:</span>
                  <span className="font-bold text-gray-900">{replyingItem.senderName} ({replyingItem.senderEmail})</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-500">Chủ đề:</span>
                  <span className="font-medium text-gray-800">Phản hồi ý kiến [{replyingItem.subject}]</span>
                </div>
              </div>

              {replyError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle size={15} className="flex-shrink-0" />
                  <span>{replyError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Nội dung email phản hồi *
                </label>
                <textarea
                  required
                  rows={6}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Kính chào Quý khách, Ban quản lý rạp MagiCinema xin trân trọng phản hồi về ý kiến..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-slate-900 text-sm outline-none transition-all resize-none text-gray-800"
                />
                <p className="text-[11px] text-gray-400 mt-1 italic">
                  * Email sẽ được gửi trực tiếp thông qua hệ thống Mail của rạp phim MagiCinema đến trang thư của khách.
                </p>
              </div>

              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseReplyModal}
                  disabled={submittingReply}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs transition-colors border-none cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submittingReply}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm flex items-center gap-2 transition-all disabled:opacity-50 border-none cursor-pointer"
                >
                  {submittingReply ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Đang gửi email...</span>
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      <span>Gửi email ngay</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
