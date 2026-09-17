import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Filter,
  Inbox,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  UserCheck,
  X,
} from "lucide-react";
import {
  contactApi,
  ContactAnalyticsResponse,
  ContactCategory,
  ContactPriority,
  ContactResponse,
  ContactStatus,
} from "@/api/contactApi";
import { getApiErrorMessage } from "@/api/errors";

const STATUS_LABEL: Record<ContactStatus, string> = {
  NEW: "Mới tiếp nhận",
  IN_PROGRESS: "Đang xử lý",
  WAITING_CUSTOMER: "Chờ khách hàng",
  RESOLVED: "Đã giải quyết",
  CLOSED: "Đã đóng",
};
const PRIORITY_LABEL: Record<ContactPriority, string> = { LOW: "Thấp", NORMAL: "Bình thường", HIGH: "Cao", URGENT: "Khẩn cấp" };
const CATEGORY_LABEL: Record<ContactCategory, string> = {
  SERVICE_QUALITY: "Dịch vụ & chất lượng",
  BOOKING_PAYMENT: "Đặt vé & thanh toán",
  STAFF_ATTITUDE: "Thái độ nhân viên",
  PARTNERSHIP: "Hợp tác & quảng cáo",
  MOVIE_SCHEDULE: "Phim & lịch chiếu",
  OTHER: "Nội dung khác",
};
const EMPTY_ANALYTICS: ContactAnalyticsResponse = {
  totalActive: 0,
  newCount: 0,
  inProgressCount: 0,
  waitingCustomerCount: 0,
  overdueCount: 0,
  resolvedTodayCount: 0,
  flaggedCount: 0,
  averageFirstResponseMinutes: 0,
};

export function CustomerContactManagementPage() {
  const [contacts, setContacts] = useState<ContactResponse[]>([]);
  const [analytics, setAnalytics] = useState<ContactAnalyticsResponse>(EMPTY_ANALYTICS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | ContactStatus | "OVERDUE">("ALL");
  const [priority, setPriority] = useState<"ALL" | ContactPriority>("ALL");
  const [category, setCategory] = useState<"ALL" | ContactCategory>("ALL");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [rawIds, setRawIds] = useState<Set<number>>(new Set());
  const [replying, setReplying] = useState<ContactResponse | null>(null);
  const [replyText, setReplyText] = useState("");
  const [resolveAfterReply, setResolveAfterReply] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [items, summary] = await Promise.all([contactApi.getAdminList(), contactApi.getAnalytics()]);
      setContacts(items);
      setAnalytics(summary);
    } catch (error) {
      setNotice({ type: "error", text: getApiErrorMessage(error, "Không thể tải hàng đợi góp ý.") });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([contactApi.getAdminList(), contactApi.getAnalytics()])
      .then(([items, summary]) => {
        if (!active) return;
        setContacts(items);
        setAnalytics(summary);
      })
      .catch((error) => {
        if (active) setNotice({ type: "error", text: getApiErrorMessage(error, "Không thể tải hàng đợi góp ý.") });
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const filtered = useMemo(() => contacts.filter((item) => {
    const needle = search.trim().toLowerCase();
    const matchesSearch = !needle || [item.ticketCode, item.senderName, item.senderEmail, item.subject, item.message]
      .some((value) => value?.toLowerCase().includes(needle));
    const matchesStatus = status === "ALL" || (status === "OVERDUE" ? item.overdue : item.status === status);
    return matchesSearch && matchesStatus && (priority === "ALL" || item.priority === priority) && (category === "ALL" || item.category === category);
  }), [contacts, search, status, priority, category]);

  const replaceContact = (updated: ContactResponse) => {
    setContacts((current) => current.map((item) => item.contactId === updated.contactId ? updated : item));
  };

  const updateContact = async (item: ContactResponse, data: Parameters<typeof contactApi.update>[1], message: string) => {
    try {
      replaceContact(await contactApi.update(item.contactId, data));
      setNotice({ type: "success", text: message });
      const summary = await contactApi.getAnalytics();
      setAnalytics(summary);
    } catch (error) {
      setNotice({ type: "error", text: getApiErrorMessage(error, "Không thể cập nhật yêu cầu.") });
    }
  };

  const archiveContact = async (item: ContactResponse) => {
    if (!window.confirm(`Lưu trữ yêu cầu ${item.ticketCode}? Bạn vẫn có thể giữ lịch sử để báo cáo.`)) return;
    try {
      await contactApi.archive(item.contactId);
      setContacts((current) => current.filter((contact) => contact.contactId !== item.contactId));
      setNotice({ type: "success", text: `Đã lưu trữ ${item.ticketCode}.` });
      setAnalytics(await contactApi.getAnalytics());
    } catch (error) {
      setNotice({ type: "error", text: getApiErrorMessage(error, "Không thể lưu trữ yêu cầu.") });
    }
  };

  const sendReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!replying || !replyText.trim()) return;
    setSubmitting(true);
    try {
      const updated = await contactApi.reply(replying.contactId, replyText.trim(), resolveAfterReply);
      replaceContact(updated);
      setReplying(null);
      setReplyText("");
      setNotice({ type: "success", text: `Đã gửi phản hồi cho ${updated.senderEmail}.` });
      setAnalytics(await contactApi.getAnalytics());
    } catch (error) {
      setNotice({ type: "error", text: getApiErrorMessage(error, "Không thể gửi email phản hồi.") });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 px-5 py-6 text-slate-900 md:px-8">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-black tracking-tight"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-amber-300"><MessageSquare size={22} /></span>Góp ý & phản hồi</h1>
          <p className="mt-1 text-sm text-slate-500">Điều phối yêu cầu theo mức ưu tiên, SLA và lịch sử chăm sóc khách hàng.</p>
        </div>
        <button onClick={() => void loadData()} disabled={loading} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold shadow-sm hover:bg-slate-50"><RefreshCw size={15} className={loading ? "animate-spin" : ""} />Làm mới</button>
      </div>

      {notice && <div className={`mb-5 flex items-center justify-between rounded-xl border p-3.5 text-sm ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}><span className="flex items-center gap-2"><CheckCircle2 size={17} />{notice.text}</span><button onClick={() => setNotice(null)} className="border-0 bg-transparent"><X size={16} /></button></div>}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Đang hoạt động" value={analytics.totalActive} icon={<Inbox size={19} />} tone="slate" />
        <Metric label="Mới tiếp nhận" value={analytics.newCount} icon={<Mail size={19} />} tone="blue" />
        <Metric label="Đang xử lý" value={analytics.inProgressCount} icon={<UserCheck size={19} />} tone="violet" />
        <Metric label="Quá SLA" value={analytics.overdueCount} icon={<AlertTriangle size={19} />} tone="rose" />
        <Metric label="Xử lý hôm nay" value={analytics.resolvedTodayCount} icon={<CheckCircle2 size={19} />} tone="emerald" />
        <Metric label="Phản hồi đầu TB" value={Math.round(analytics.averageFirstResponseMinutes)} suffix=" phút" icon={<Clock3 size={19} />} tone="amber" />
      </div>

      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_180px_160px_210px]">
          <label className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Mã ticket, khách hàng, email, nội dung..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-500" /></label>
          <FilterSelect value={status} onChange={(value) => setStatus(value as typeof status)} options={[['ALL','Mọi trạng thái'],['NEW','Mới tiếp nhận'],['IN_PROGRESS','Đang xử lý'],['WAITING_CUSTOMER','Chờ khách hàng'],['RESOLVED','Đã giải quyết'],['CLOSED','Đã đóng'],['OVERDUE','Quá SLA']]} />
          <FilterSelect value={priority} onChange={(value) => setPriority(value as typeof priority)} options={[['ALL','Mọi ưu tiên'],['URGENT','Khẩn cấp'],['HIGH','Cao'],['NORMAL','Bình thường'],['LOW','Thấp']]} />
          <FilterSelect value={category} onChange={(value) => setCategory(value as typeof category)} options={[['ALL','Mọi nhóm'], ...Object.entries(CATEGORY_LABEL)]} />
        </div>
        <p className="mt-3 flex items-center gap-1 text-xs text-slate-400"><Filter size={13} />Hiển thị {filtered.length}/{contacts.length} yêu cầu</p>
      </div>

      {loading ? <div className="py-20 text-center text-sm text-slate-500"><RefreshCw className="mx-auto mb-3 animate-spin" />Đang tải hàng đợi...</div> : filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500"><Inbox size={40} className="mx-auto mb-3 text-slate-300" /><strong>Không có yêu cầu phù hợp</strong></div> : (
        <div className="space-y-3">
          {filtered.map((item) => <ContactCard key={item.contactId} item={item} expanded={expandedId === item.contactId} raw={rawIds.has(item.contactId)} onToggle={() => setExpandedId(expandedId === item.contactId ? null : item.contactId)} onToggleRaw={() => setRawIds((current) => { const next = new Set(current); if (next.has(item.contactId)) next.delete(item.contactId); else next.add(item.contactId); return next; })} onUpdate={updateContact} onReply={() => { setReplying(item); setReplyText(""); setResolveAfterReply(true); }} onArchive={() => void archiveContact(item)} />)}
        </div>
      )}

      {replying && <ReplyModal item={replying} replyText={replyText} setReplyText={setReplyText} resolveAfterReply={resolveAfterReply} setResolveAfterReply={setResolveAfterReply} submitting={submitting} onClose={() => setReplying(null)} onSubmit={sendReply} />}
    </div>
  );
}

function ContactCard({ item, expanded, raw, onToggle, onToggleRaw, onUpdate, onReply, onArchive }: {
  item: ContactResponse; expanded: boolean; raw: boolean; onToggle: () => void; onToggleRaw: () => void;
  onUpdate: (item: ContactResponse, data: Parameters<typeof contactApi.update>[1], message: string) => Promise<void>;
  onReply: () => void; onArchive: () => void;
}) {
  const [note, setNote] = useState(item.internalNote || "");
  const hasFlag = !item.aiApproved || Boolean(item.badWords?.length);
  return <article className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${item.overdue ? "border-rose-300" : "border-slate-200"}`}>
    <div className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-black text-blue-700">{item.ticketCode}</span><PriorityBadge priority={item.priority} />{item.overdue && <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-black text-rose-700">QUÁ SLA</span>}{hasFlag && <span title="Nội dung đã được kiểm duyệt" className="text-rose-500"><ShieldAlert size={15} /></span>}</div>
          <h3 className="mt-2 font-bold text-slate-900">{item.subject}</h3>
          <p className="mt-1 text-xs text-slate-500"><strong className="text-slate-700">{item.senderName}</strong> · {item.senderEmail} · {item.createdAt}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={item.status} onChange={(e) => void onUpdate(item, { status: e.target.value as ContactStatus }, "Đã cập nhật trạng thái.")} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold outline-none">{Object.entries(STATUS_LABEL).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
          {!item.assignedToName && <button onClick={() => void onUpdate(item, { assignToMe: true }, "Bạn đã nhận xử lý yêu cầu.")} className="flex items-center gap-1.5 rounded-xl border-0 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700"><UserCheck size={14} />Nhận xử lý</button>}
          <button onClick={onToggle} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500">{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
        </div>
      </div>
      <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-xs sm:grid-cols-3">
        <Info label="Phân loại" value={CATEGORY_LABEL[item.category]} />
        <Info label="Người phụ trách" value={item.assignedToName || "Chưa phân công"} />
        <Info label="SLA" value={item.dueAt || "Chưa thiết lập"} alert={item.overdue} />
      </div>
    </div>
    {expanded && <div className="border-t border-slate-200 bg-slate-50 p-5">
      <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-black uppercase tracking-wide text-slate-500">Nội dung khách gửi</p>{hasFlag && <button onClick={onToggleRaw} className="border-0 bg-transparent text-[11px] font-bold text-blue-700">{raw ? "Ẩn nội dung gốc" : "Xem nội dung gốc"}</button>}</div><p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{raw ? item.message : item.maskedMessage || item.message}</p></div>
          <div><p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Lịch sử phản hồi ({item.replies?.length || 0})</p>{item.replies?.length ? <div className="space-y-2">{item.replies.map((reply) => <div key={reply.replyId} className={`rounded-xl border p-3 ${reply.emailDelivered ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}><div className={`mb-1 flex justify-between text-[11px] ${reply.emailDelivered ? "text-emerald-700" : "text-amber-700"}`}><strong>{reply.staffName || "Magi Cinema"}</strong><span>{reply.createdAt} · {reply.emailDelivered ? "Đã gửi email" : "Email fallback"}</span></div><p className="whitespace-pre-wrap text-sm text-slate-700">{reply.replyMessage}</p></div>)}</div> : <p className="rounded-xl border border-dashed border-slate-300 p-4 text-xs text-slate-400">Chưa có phản hồi nào được gửi.</p>}</div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4"><label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">Mức ưu tiên</label><select value={item.priority} onChange={(e) => void onUpdate(item, { priority: e.target.value as ContactPriority }, "Đã cập nhật ưu tiên và SLA.")} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none">{Object.entries(PRIORITY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">Ghi chú nội bộ</label><textarea rows={4} maxLength={3000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Thông tin chỉ nhân viên nhìn thấy..." className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-slate-500" /><button onClick={() => void onUpdate(item, { internalNote: note }, "Đã lưu ghi chú nội bộ.")} className="mt-2 w-full rounded-xl border-0 bg-slate-800 px-3 py-2 text-xs font-bold text-white">Lưu ghi chú</button></div>
          <button onClick={onReply} className="flex w-full items-center justify-center gap-2 rounded-xl border-0 bg-amber-400 px-4 py-3 text-xs font-black text-slate-950"><Mail size={15} />Gửi phản hồi qua email</button>
          <button onClick={onArchive} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-rose-600"><Archive size={14} />Lưu trữ yêu cầu</button>
        </div>
      </div>
    </div>}
  </article>;
}

function ReplyModal({ item, replyText, setReplyText, resolveAfterReply, setResolveAfterReply, submitting, onClose, onSubmit }: { item: ContactResponse; replyText: string; setReplyText: (value: string) => void; resolveAfterReply: boolean; setResolveAfterReply: (value: boolean) => void; submitting: boolean; onClose: () => void; onSubmit: (event: React.FormEvent) => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"><div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between bg-slate-950 px-6 py-4 text-white"><div><p className="font-bold">Phản hồi {item.ticketCode}</p><p className="mt-0.5 text-xs text-slate-400">Gửi tới {item.senderEmail}</p></div><button onClick={onClose} className="border-0 bg-transparent text-slate-400"><X size={18} /></button></div><form onSubmit={onSubmit} className="space-y-4 p-6"><textarea required maxLength={5000} rows={7} autoFocus value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Nhập câu trả lời rõ ràng, hướng xử lý và thông tin khách hàng cần biết..." className="w-full resize-none rounded-xl border border-slate-300 p-3.5 text-sm leading-6 outline-none focus:border-slate-700" /><label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"><input type="checkbox" checked={resolveAfterReply} onChange={(e) => setResolveAfterReply(e.target.checked)} className="mt-0.5" /><span><strong className="block text-xs text-slate-800">Đánh dấu đã giải quyết sau khi gửi</strong><span className="text-[11px] text-slate-500">Bỏ chọn nếu vẫn cần theo dõi hoặc chờ thêm thông tin từ khách.</span></span></label><div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><button type="button" onClick={onClose} className="rounded-xl border-0 bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-600">Hủy</button><button disabled={submitting || !replyText.trim()} className="rounded-xl border-0 bg-slate-950 px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50"><Send size={14} className="mr-2 inline" />{submitting ? "Đang gửi..." : "Gửi phản hồi"}</button></div></form></div></div>;
}

function Metric({ label, value, suffix = "", icon, tone }: { label: string; value: number; suffix?: string; icon: React.ReactNode; tone: string }) { const colors: Record<string, string> = { slate: "bg-slate-100 text-slate-700", blue: "bg-blue-50 text-blue-700", violet: "bg-violet-50 text-violet-700", rose: "bg-rose-50 text-rose-700", emerald: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700" }; return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${colors[tone]}`}>{icon}</div><p className="text-xl font-black">{value}{suffix}</p><p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p></div>; }
function Info({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) { return <div><span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</span><strong className={`mt-1 block ${alert ? "text-rose-600" : "text-slate-700"}`}>{value}</strong></div>; }
function PriorityBadge({ priority }: { priority: ContactPriority }) { const styles: Record<ContactPriority, string> = { LOW: "bg-slate-100 text-slate-600", NORMAL: "bg-blue-50 text-blue-700", HIGH: "bg-orange-100 text-orange-700", URGENT: "bg-rose-100 text-rose-700" }; return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${styles[priority]}`}>{PRIORITY_LABEL[priority]}</span>; }
function FilterSelect({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: Array<[string, string]> }) { return <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold outline-none">{options.map(([option, label]) => <option key={option} value={option}>{label}</option>)}</select>; }
