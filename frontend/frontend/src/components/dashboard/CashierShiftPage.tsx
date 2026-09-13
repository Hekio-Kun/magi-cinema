import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, Calculator, Loader2, LockKeyhole, RefreshCw, UnlockKeyhole } from "lucide-react";
import { toast } from "react-toastify";
import { cashierShiftApi, type CashierShiftResponse } from "@/api/cashierShiftApi";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const money = (value?: number | null) => Number(value || 0).toLocaleString("vi-VN", { style: "currency", currency: "VND" });
const dateTime = (value?: string | null) => value ? new Date(value).toLocaleString("vi-VN") : "—";

export function CashierShiftPage() {
  const { roles, scopes } = useCurrentUser();
  const canOperate = scopes.includes("BOOKING_MANAGE") || roles.some((role) => ["ADMIN", "STAFF"].includes(role.replace(/^ROLE_/, "")));
  const canApprove = roles.some((role) => ["ADMIN", "MANAGER"].includes(role.replace(/^ROLE_/, "")));
  const [current, setCurrent] = useState<CashierShiftResponse | null>(null);
  const [shifts, setShifts] = useState<CashierShiftResponse[]>([]);
  const [openingCash, setOpeningCash] = useState(0);
  const [actualCash, setActualCash] = useState(0);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, open] = await Promise.all([
        cashierShiftApi.list(0, 30),
        canOperate ? cashierShiftApi.current() : Promise.resolve(null),
      ]);
      setShifts(list.content || []); setCurrent(open);
    } catch { toast.error("Không thể tải dữ liệu ca thu ngân"); }
    finally { setLoading(false); }
  }, [canOperate]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  const expected = Number(current?.expectedCash ?? (current ? current.openingCash + current.cashSales : 0));
  const variancePreview = actualCash - expected;
  const pendingApproval = useMemo(() => shifts.filter((shift) => shift.status === "CLOSED" && shift.reconciliationStatus === "PENDING_APPROVAL"), [shifts]);

  const open = async () => {
    if (openingCash < 0) return;
    setSaving(true);
    try { const shift = await cashierShiftApi.open(openingCash, note); setCurrent(shift); setNote(""); setOpeningCash(0); toast.success(`Đã mở ca ${shift.shiftCode}`); await load(); }
    catch (error) { toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Không thể mở ca"); }
    finally { setSaving(false); }
  };
  const close = async () => {
    if (!current) return;
    setSaving(true);
    try { await cashierShiftApi.close(current.shiftId, actualCash, note); setCurrent(null); setNote(""); setActualCash(0); toast.success("Đã kết ca, chờ quản lý đối soát"); await load(); }
    catch (error) { toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Không thể kết ca"); }
    finally { setSaving(false); }
  };
  const approve = async (shift: CashierShiftResponse, approved: boolean) => {
    const approvalNote = window.prompt(approved ? "Ghi chú duyệt ca (không bắt buộc):" : "Lý do từ chối đối soát:", approved ? "" : "Cần kiểm tra lại chênh lệch");
    if (!approved && !approvalNote?.trim()) return;
    try { await cashierShiftApi.approve(shift.shiftId, approved, approvalNote || undefined); toast.success(approved ? "Đã duyệt đối soát ca" : "Đã từ chối đối soát ca"); await load(); }
    catch { toast.error("Không thể cập nhật đối soát"); }
  };

  return <div className="flex-1 overflow-auto bg-slate-50 p-6" style={{ fontFamily: "Inter, sans-serif" }}><div className="mx-auto max-w-[1450px]">
    <div className="mb-5 flex items-center justify-between gap-3"><div><h1 className="text-2xl font-extrabold text-slate-900">Ca thu ngân & đối soát</h1><p className="mt-1 text-sm text-slate-500">Kiểm soát tiền đầu ca, doanh thu từng quầy và chênh lệch cuối ca.</p></div><button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"><RefreshCw size={16} /> Làm mới</button></div>
    {canOperate && <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">{current ? <><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-600"><span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" /> Ca đang mở</p><h2 className="mt-1 text-xl font-extrabold text-slate-900">{current.shiftCode}</h2><p className="mt-1 text-sm text-slate-500">Mở lúc {dateTime(current.openedAt)} · Tiền đầu ca {money(current.openingCash)}</p></div><div className="rounded-xl bg-emerald-50 px-4 py-3 text-right"><p className="text-xs text-emerald-700">Doanh thu hiện tại</p><b className="text-lg text-emerald-800">{money(current.totalSales)}</b></div></div><div className="mt-5 grid gap-3 sm:grid-cols-4"><Metric label="Tiền mặt" value={money(current.cashSales)} /><Metric label="Chuyển khoản" value={money(current.transferSales)} /><Metric label="Vé" value={money(current.ticketSales)} /><Metric label="Bắp nước" value={money(current.concessionSales)} /></div><div className="mt-5 flex flex-wrap items-end gap-3 border-t pt-4"><label className="min-w-[230px] flex-1 text-xs font-semibold text-slate-500">Tiền thực tế cuối ca<input type="number" min={0} value={actualCash || ""} onChange={(e) => setActualCash(Number(e.target.value || 0))} placeholder={String(expected)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-amber-400" /></label><div className={`rounded-xl px-4 py-2 text-sm ${variancePreview === 0 ? "bg-emerald-50 text-emerald-700" : variancePreview > 0 ? "bg-blue-50 text-blue-700" : "bg-rose-50 text-rose-700"}`}><span>Chênh lệch dự kiến</span><b className="ml-2">{money(variancePreview)}</b></div><button disabled={saving} onClick={() => void close()} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-500 disabled:opacity-50"><LockKeyhole size={16} /> Kết ca</button></div></> : <div className="flex flex-wrap items-end gap-3"><div className="mr-auto"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Chưa có ca mở</p><p className="mt-1 text-sm text-slate-500">Mở ca trước khi bán vé hoặc bắp nước tại quầy.</p></div><label className="text-xs font-semibold text-slate-500">Tiền đầu ca<input type="number" min={0} value={openingCash || ""} onChange={(e) => setOpeningCash(Number(e.target.value || 0))} placeholder="0" className="mt-1 w-44 rounded-xl border px-3 py-2 text-sm outline-none focus:border-amber-400" /></label><button disabled={saving} onClick={() => void open()} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-50"><UnlockKeyhole size={16} /> Mở ca</button></div>}</section>}
    {canApprove && pendingApproval.length > 0 && <section className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 className="flex items-center gap-2 font-bold text-amber-900"><BadgeCheck size={18} /> Ca chờ duyệt ({pendingApproval.length})</h2><div className="mt-3 space-y-2">{pendingApproval.map((shift) => <div key={shift.shiftId} className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-3"><div className="mr-auto"><b>{shift.shiftCode}</b><p className="text-xs text-slate-500">{shift.cashierUsername} · {dateTime(shift.closedAt)}</p></div><span className={`text-sm font-bold ${Number(shift.variance) === 0 ? "text-emerald-600" : "text-rose-600"}`}>{Number(shift.variance) > 0 ? "+" : ""}{money(shift.variance)}</span><button onClick={() => void approve(shift, true)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Duyệt</button><button onClick={() => void approve(shift, false)} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600">Từ chối</button></div>)}</div></section>}
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 flex items-center gap-2 font-bold text-slate-900"><Calculator size={19} className="text-slate-500" /> Lịch sử ca</h2>{loading ? <div className="flex h-32 items-center justify-center text-slate-400"><Loader2 className="mr-2 animate-spin" size={18} /> Đang tải...</div> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="border-b text-xs uppercase tracking-wide text-slate-400"><th className="pb-3">Ca</th><th className="pb-3">Nhân viên</th><th className="pb-3">Thời gian</th><th className="pb-3 text-right">Tiền đầu ca</th><th className="pb-3 text-right">Doanh thu</th><th className="pb-3 text-right">Tiền kỳ vọng</th><th className="pb-3 text-right">Thực tế</th><th className="pb-3 text-right">Chênh lệch</th><th className="pb-3 text-right">Đối soát</th></tr></thead><tbody>{shifts.map((shift) => <tr key={shift.shiftId} className="border-b last:border-0"><td className="py-3 font-bold">{shift.shiftCode}</td><td className="py-3 text-slate-600">{shift.cashierUsername}</td><td className="py-3 text-slate-500">{dateTime(shift.openedAt)}<br />{shift.closedAt ? `→ ${dateTime(shift.closedAt)}` : <span className="text-emerald-600">Đang mở</span>}</td><td className="py-3 text-right">{money(shift.openingCash)}</td><td className="py-3 text-right font-semibold">{money(shift.totalSales)}</td><td className="py-3 text-right">{money(shift.expectedCash)}</td><td className="py-3 text-right">{money(shift.actualCash)}</td><td className={`py-3 text-right font-bold ${Number(shift.variance) === 0 ? "text-emerald-600" : "text-rose-600"}`}>{shift.variance == null ? "—" : `${Number(shift.variance) > 0 ? "+" : ""}${money(shift.variance)}`}</td><td className="py-3 text-right"><span className={`rounded-full px-2 py-1 text-xs font-bold ${shift.status === "OPEN" ? "bg-emerald-100 text-emerald-700" : shift.reconciliationStatus === "APPROVED" ? "bg-blue-100 text-blue-700" : shift.reconciliationStatus === "REJECTED" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{shift.status === "OPEN" ? "Đang mở" : shift.reconciliationStatus === "APPROVED" ? "Đã duyệt" : shift.reconciliationStatus === "REJECTED" ? "Từ chối" : "Chờ duyệt"}</span></td></tr>)}</tbody></table>{!shifts.length && <p className="py-10 text-center text-sm text-slate-400">Chưa có lịch sử ca</p>}</div>}</section>
  </div></div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-bold text-slate-800">{value}</p></div>; }
