import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Loader2, Plus, RefreshCw, X } from "lucide-react";
import { toast } from "react-toastify";
import { staffScheduleApi, type AttendanceStatus, type StaffScheduleResponse, type StaffShiftType } from "@/api/staffScheduleApi";
import { userService, type UserDetailResponse } from "@/api/userApi";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const shiftLabels: Record<StaffShiftType, string> = { MORNING: "Ca sáng", AFTERNOON: "Ca chiều", EVENING: "Ca tối", NIGHT: "Ca đêm" };
const attendanceLabels: Record<AttendanceStatus, string> = { PRESENT: "Đúng giờ", LATE: "Đi trễ", IN_PROGRESS: "Đang làm", ABSENT: "Vắng", LEAVE: "Nghỉ phép" };
const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (days: number) => { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); };
const errorMessage = (error: unknown, fallback: string) => (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

export function StaffSchedulePage() {
  const { username, roles, scopes } = useCurrentUser();
  const canManage = scopes.includes("SCHEDULE_MANAGE") || roles.some((role) => ["ADMIN", "MANAGER"].includes(role));
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(plusDays(14));
  const [schedules, setSchedules] = useState<StaffScheduleResponse[]>([]);
  const [staff, setStaff] = useState<UserDetailResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ staffUserId: "", workDate: today(), shiftType: "MORNING" as StaffShiftType, plannedStart: "09:00", plannedEnd: "17:00", note: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [items, users] = await Promise.all([staffScheduleApi.list(from, to), canManage ? userService.getStaffUsers() : Promise.resolve(undefined)]);
      setSchedules(items);
      if (users) setStaff(users.filter((user) => user.status === "ACTIVE"));
    } catch (error) { toast.error(errorMessage(error, "Không thể tải lịch ca")); }
    finally { setLoading(false); }
  }, [canManage, from, to]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  const todaySchedules = useMemo(() => schedules.filter((item) => item.workDate === today()), [schedules]);
  const create = async () => {
    if (!form.staffUserId) { toast.error("Vui lòng chọn nhân viên"); return; }
    setSaving(true);
    try { await staffScheduleApi.create(form); toast.success("Đã xếp lịch ca"); setShowForm(false); await load(); }
    catch (error) { toast.error(errorMessage(error, "Không thể xếp lịch ca")); }
    finally { setSaving(false); }
  };
  const attendance = async (item: StaffScheduleResponse, action: "in" | "out") => {
    try { const updated = action === "in" ? await staffScheduleApi.checkIn(item.assignmentId) : await staffScheduleApi.checkOut(item.assignmentId); setSchedules((current) => current.map((row) => row.assignmentId === updated.assignmentId ? updated : row)); toast.success(action === "in" ? "Đã ghi nhận vào ca" : "Đã ghi nhận ra ca"); }
    catch (error) { toast.error(errorMessage(error, "Không thể cập nhật chấm công")); }
  };
  const cancel = async (item: StaffScheduleResponse) => {
    if (!window.confirm(`Hủy lịch ${shiftLabels[item.shiftType]} của ${item.staffFullName}?`)) return;
    try { await staffScheduleApi.cancel(item.assignmentId, "Hủy theo điều chỉnh vận hành"); toast.success("Đã hủy lịch ca"); await load(); }
    catch (error) { toast.error(errorMessage(error, "Không thể hủy lịch ca")); }
  };

  return <div className="flex-1 overflow-auto bg-slate-50 p-6" style={{ fontFamily: "Inter, sans-serif" }}><div className="mx-auto max-w-[1450px]">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-extrabold text-slate-900">Lịch ca & chấm công</h1><p className="mt-1 text-sm text-slate-500">Xếp lịch theo ngày, ghi nhận giờ vào ra và theo dõi tình trạng đi làm.</p></div><div className="flex gap-2"><button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-slate-600"><RefreshCw size={16} /> Làm mới</button>{canManage && <button onClick={() => setShowForm((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-3 py-2 text-sm font-bold text-white"><Plus size={16} /> Xếp ca mới</button>}</div></div>
    {showForm && canManage && <section className="mb-5 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><h2 className="font-bold text-slate-900">Tạo lịch làm việc</h2><button onClick={() => setShowForm(false)} className="text-slate-400"><X size={18} /></button></div><div className="grid gap-3 md:grid-cols-6"><label className="text-xs font-semibold text-slate-500 md:col-span-2">Nhân viên<select value={form.staffUserId} onChange={(e) => setForm({ ...form, staffUserId: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"><option value="">Chọn nhân viên</option>{staff.map((user) => <option key={user.userId} value={user.userId}>{user.fullName || user.username} · {user.roleName}</option>)}</select></label><label className="text-xs font-semibold text-slate-500">Ngày<input type="date" value={form.workDate} onChange={(e) => setForm({ ...form, workDate: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" /></label><label className="text-xs font-semibold text-slate-500">Loại ca<select value={form.shiftType} onChange={(e) => setForm({ ...form, shiftType: e.target.value as StaffShiftType })} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">{Object.entries(shiftLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-xs font-semibold text-slate-500">Bắt đầu<input type="time" value={form.plannedStart} onChange={(e) => setForm({ ...form, plannedStart: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" /></label><label className="text-xs font-semibold text-slate-500">Kết thúc<input type="time" value={form.plannedEnd} onChange={(e) => setForm({ ...form, plannedEnd: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" /></label></div><div className="mt-3 flex justify-end"><button disabled={saving} onClick={() => void create()} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Check size={16} /> Lưu lịch</button></div></section>}
    <section className="mb-5 grid gap-4 md:grid-cols-3"><div className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Tổng lịch trong kỳ</p><p className="mt-2 text-2xl font-extrabold text-slate-900">{schedules.length}</p></div><div className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Lịch hôm nay</p><p className="mt-2 text-2xl font-extrabold text-amber-600">{todaySchedules.length}</p></div><div className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Đã vào ca hôm nay</p><p className="mt-2 text-2xl font-extrabold text-emerald-600">{todaySchedules.filter((item) => item.checkIn).length}</p></div></section>
    <section className="rounded-2xl border bg-white p-5 shadow-sm"><div className="mb-4 flex flex-wrap items-end gap-3"><label className="text-xs font-semibold text-slate-500">Từ ngày<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 rounded-xl border px-3 py-2 text-sm" /></label><label className="text-xs font-semibold text-slate-500">Đến ngày<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 rounded-xl border px-3 py-2 text-sm" /></label></div>{loading ? <div className="flex h-32 items-center justify-center text-slate-400"><Loader2 className="mr-2 animate-spin" size={18} /> Đang tải...</div> : <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead><tr className="border-b text-xs uppercase tracking-wide text-slate-400"><th className="pb-3">Ngày</th><th className="pb-3">Nhân viên</th><th className="pb-3">Ca</th><th className="pb-3">Khung giờ</th><th className="pb-3">Chấm công</th><th className="pb-3">Trạng thái</th><th className="pb-3 text-right">Thao tác</th></tr></thead><tbody>{schedules.map((item) => <tr key={item.assignmentId} className="border-b last:border-0"><td className="py-3 font-semibold">{new Date(`${item.workDate}T00:00:00`).toLocaleDateString("vi-VN")}</td><td className="py-3"><span className="font-semibold text-slate-800">{item.staffFullName}</span><span className="ml-2 text-xs text-slate-400">@{item.staffUsername}</span></td><td className="py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{shiftLabels[item.shiftType]}</span></td><td className="py-3 text-slate-500">{item.plannedStart} – {item.plannedEnd}</td><td className="py-3 text-xs text-slate-500">{item.checkIn ? new Date(item.checkIn).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "Chưa vào"}{item.checkOut ? ` → ${new Date(item.checkOut).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}` : ""}{item.workedMinutes != null ? ` · ${item.workedMinutes} phút` : ""}</td><td className="py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${item.status === "CANCELLED" ? "bg-slate-100 text-slate-500" : item.attendanceStatus === "LATE" ? "bg-amber-100 text-amber-700" : item.attendanceStatus === "ABSENT" ? "bg-rose-100 text-rose-700" : item.attendanceStatus === "LEAVE" ? "bg-blue-100 text-blue-700" : item.checkIn ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{item.status === "CANCELLED" ? "Đã hủy" : item.attendanceStatus ? attendanceLabels[item.attendanceStatus] : "Chưa chấm"}</span></td><td className="py-3 text-right">{item.status === "SCHEDULED" && item.staffUsername === username && <div className="inline-flex gap-1">{!item.checkIn && <button onClick={() => void attendance(item, "in")} className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white">Vào ca</button>}{item.checkIn && !item.checkOut && <button onClick={() => void attendance(item, "out")} className="rounded-lg bg-slate-900 px-2 py-1 text-xs font-bold text-white">Ra ca</button>}</div>}{canManage && item.status === "SCHEDULED" && <button onClick={() => void cancel(item)} className="ml-2 rounded-lg border border-rose-200 px-2 py-1 text-xs font-bold text-rose-600">Hủy</button>}</td></tr>)}</tbody></table>{!schedules.length && <p className="py-10 text-center text-sm text-slate-400">Chưa có lịch ca trong khoảng thời gian này</p>}</div>}</section>
  </div></div>;
}
