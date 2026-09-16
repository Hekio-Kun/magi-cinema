import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Armchair,
  BadgeDollarSign,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  History,
  Info,
  Loader2,
  Moon,
  RefreshCcw,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  SunMedium,
  Ticket,
  Users,
} from "lucide-react";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "@/api/errors";
import {
  ticketPricingApi,
  type TicketPriceConfig,
  type TicketPriceConfigHistory,
  type TicketPriceConfigRequest,
} from "@/api/ticketPricingApi";

const DEFAULT_CONFIG: TicketPriceConfigRequest = {
  standard2dPrice: 75_000,
  standard3dPrice: 95_000,
  imax3dPrice: 125_000,
  fourDx3dPrice: 135_000,
  vipSeatSurcharge: 15_000,
  coupleSeatSurcharge: 75_000,
  disabledSeatSurcharge: 0,
  u22BasePrice: 55_000,
  u22Enabled: true,
  weekendSurcharge: 10_000,
  earlyBirdEnd: "12:00",
  earlyBirdDiscount: 10_000,
  primeTimeStart: "18:00",
  primeTimeEnd: "22:00",
  primeTimeSurcharge: 10_000,
  lateShowStart: "22:00",
  lateShowSurcharge: 5_000,
  priceRoundingUnit: 1_000,
  version: 0,
  changeReason: "",
};

type MoneyKey = "standard2dPrice" | "standard3dPrice" | "imax3dPrice" | "fourDx3dPrice" |
  "vipSeatSurcharge" | "coupleSeatSurcharge" | "disabledSeatSurcharge" | "u22BasePrice" |
  "weekendSurcharge" | "earlyBirdDiscount" | "primeTimeSurcharge" | "lateShowSurcharge";
type TimeKey = "earlyBirdEnd" | "primeTimeStart" | "primeTimeEnd" | "lateShowStart";
type PresentationKey = "standard2dPrice" | "standard3dPrice" | "imax3dPrice" | "fourDx3dPrice";
type SeatKind = "NORMAL" | "VIP" | "COUPLE" | "DISABLED";

const CONFIG_COMPARE_KEYS: (keyof TicketPriceConfigRequest)[] = [
  "standard2dPrice", "standard3dPrice", "imax3dPrice", "fourDx3dPrice",
  "vipSeatSurcharge", "coupleSeatSurcharge", "disabledSeatSurcharge",
  "u22BasePrice", "u22Enabled", "weekendSurcharge", "earlyBirdEnd",
  "earlyBirdDiscount", "primeTimeStart", "primeTimeEnd", "primeTimeSurcharge",
  "lateShowStart", "lateShowSurcharge", "priceRoundingUnit",
];

const money = (value: number) => new Intl.NumberFormat("vi-VN", {
  style: "currency", currency: "VND", maximumFractionDigits: 0,
}).format(Number(value) || 0);
const shortTime = (value: string) => value?.slice(0, 5) || "00:00";
const localDate = () => new Date().toLocaleDateString("en-CA");

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</section>;
}

function SectionTitle({ icon: Icon, title, description }: { icon: typeof Ticket; title: string; description: string }) {
  return <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600"><Icon size={17} /></div>
    <div><h2 className="text-sm font-black text-slate-900">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div>
  </div>;
}

function MoneyInput({ label, value, onChange, hint, disabled = false }: { label: string; value: number; onChange: (value: number) => void; hint?: string; disabled?: boolean }) {
  return <label className={`block rounded-xl border border-slate-200 bg-slate-50/70 p-3 ${disabled ? "opacity-55" : ""}`}>
    <span className="text-xs font-extrabold text-slate-700">{label}</span>
    {hint && <span className="mt-1 block text-[10px] leading-4 text-slate-500">{hint}</span>}
    <div className="relative mt-2"><input type="number" min={0} max={10_000_000} step={1_000} disabled={disabled} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-9 text-base font-black text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 disabled:bg-slate-100" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">đ</span></div>
    <span className="mt-1.5 block text-[11px] font-bold text-emerald-700">{money(value)}</span>
  </label>;
}

function RuleRow({ icon: Icon, title, description, timeLabel, time, onTime, amountLabel, amount, onAmount, discount = false }: {
  icon: typeof Clock3; title: string; description: string; timeLabel: string; time: string; onTime: (value: string) => void; amountLabel: string; amount: number; onAmount: (value: number) => void; discount?: boolean;
}) {
  return <div className="grid gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0 lg:grid-cols-[1fr_145px_190px] lg:items-center">
    <div className="flex items-start gap-3"><div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${discount ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}><Icon size={17} /></div><div><div className="text-sm font-black text-slate-900">{title}</div><div className="mt-1 text-xs leading-5 text-slate-500">{description}</div></div></div>
    <label><span className="mb-1 block text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{timeLabel}</span><input type="time" value={shortTime(time)} onChange={(event) => onTime(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-amber-400" /></label>
    <label><span className="mb-1 block text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{amountLabel}</span><div className="relative"><input type="number" min={0} max={10_000_000} step={1_000} value={amount} onChange={(event) => onAmount(Number(event.target.value))} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm font-black outline-none focus:border-amber-400" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">đ</span></div></label>
  </div>;
}

function PrimeRuleRow({ start, end, amount, onStart, onEnd, onAmount }: { start: string; end: string; amount: number; onStart: (value: string) => void; onEnd: (value: string) => void; onAmount: (value: number) => void }) {
  return <div className="grid gap-4 border-b border-slate-100 px-5 py-4 lg:grid-cols-[1fr_245px_190px] lg:items-center">
    <div className="flex items-start gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600"><Sparkles size={17} /></div><div><div className="text-sm font-black text-slate-900">Khung giờ cao điểm</div><div className="mt-1 text-xs leading-5 text-slate-500">Cộng phụ thu cho suất nằm trong khoảng bắt đầu và kết thúc.</div></div></div>
    <div className="grid grid-cols-2 gap-2"><label><span className="mb-1 block text-[10px] font-extrabold uppercase text-slate-500">Từ</span><input type="time" value={shortTime(start)} onChange={(event) => onStart(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold" /></label><label><span className="mb-1 block text-[10px] font-extrabold uppercase text-slate-500">Đến trước</span><input type="time" value={shortTime(end)} onChange={(event) => onEnd(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold" /></label></div>
    <label><span className="mb-1 block text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Phụ thu</span><div className="relative"><input type="number" min={0} max={10_000_000} step={1_000} value={amount} onChange={(event) => onAmount(Number(event.target.value))} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 pr-8 text-sm font-black outline-none focus:border-amber-400" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">đ</span></div></label>
  </div>;
}

export function TicketPricingManagementPage() {
  const [form, setForm] = useState<TicketPriceConfigRequest>(DEFAULT_CONFIG);
  const [savedConfig, setSavedConfig] = useState<TicketPriceConfig | null>(null);
  const [history, setHistory] = useState<TicketPriceConfigHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [previewDate, setPreviewDate] = useState(localDate());
  const [previewTime, setPreviewTime] = useState("19:30");
  const [previewPresentation, setPreviewPresentation] = useState<PresentationKey>("standard2dPrice");
  const [previewSeat, setPreviewSeat] = useState<SeatKind>("NORMAL");
  const [previewU22, setPreviewU22] = useState(false);

  const hasChanges = useMemo(() => !!savedConfig && CONFIG_COMPARE_KEYS.some((key) => {
    const current = form[key];
    const saved = savedConfig[key as keyof TicketPriceConfig];
    return typeof current === "string" && typeof saved === "string" ? shortTime(current) !== shortTime(saved) : current !== saved;
  }), [form, savedConfig]);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [config, versions] = await Promise.all([ticketPricingApi.getAdminConfig(), ticketPricingApi.getHistory(20)]);
      setSavedConfig(config); setForm({ ...config, changeReason: "" }); setHistory(versions || []);
    } catch (requestError) { setError(getApiErrorMessage(requestError, "Không thể tải cấu hình giá vé.")); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const setMoney = (key: MoneyKey, value: number) => { setForm((current) => ({ ...current, [key]: value })); setError(""); };
  const setTime = (key: TimeKey, value: string) => { setForm((current) => ({ ...current, [key]: value })); setError(""); };

  const validate = () => {
    const moneyKeys: MoneyKey[] = ["standard2dPrice", "standard3dPrice", "imax3dPrice", "fourDx3dPrice", "vipSeatSurcharge", "coupleSeatSurcharge", "disabledSeatSurcharge", "u22BasePrice", "weekendSurcharge", "earlyBirdDiscount", "primeTimeSurcharge", "lateShowSurcharge"];
    if (moneyKeys.some((key) => !Number.isInteger(form[key]) || form[key] < 0 || form[key] > 10_000_000)) return "Mọi mức giá phải là số nguyên từ 0đ đến 10.000.000đ.";
    if (form.standard2dPrice < 1_000 || form.standard3dPrice < form.standard2dPrice) return "Giá Standard 3D phải bằng hoặc cao hơn Standard 2D.";
    if (form.imax3dPrice < form.standard3dPrice || form.fourDx3dPrice < form.standard3dPrice) return "Giá IMAX và 4DX phải bằng hoặc cao hơn Standard 3D.";
    if (form.u22BasePrice < 1_000 || form.u22BasePrice > form.standard2dPrice) return "Giá U22 phải từ 1.000đ và không cao hơn Standard 2D.";
    if (shortTime(form.earlyBirdEnd) >= shortTime(form.primeTimeStart)) return "Giờ kết thúc suất sớm phải trước giờ cao điểm.";
    if (shortTime(form.primeTimeStart) >= shortTime(form.primeTimeEnd)) return "Khung giờ cao điểm chưa hợp lệ.";
    if (shortTime(form.lateShowStart) < shortTime(form.primeTimeEnd)) return "Suất muộn phải bắt đầu sau khi kết thúc giờ cao điểm.";
    if (reason.trim().length < 5) return "Hãy nhập lý do thay đổi tối thiểu 5 ký tự để lưu vào lịch sử.";
    return "";
  };

  const save = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setSaving(true); setError("");
    try {
      const config = await ticketPricingApi.updateConfig({ ...form, version: savedConfig?.version, changeReason: reason.trim() });
      setSavedConfig(config); setForm({ ...config, changeReason: "" }); setReason("");
      setHistory(await ticketPricingApi.getHistory(20));
      toast.success("Đã áp dụng bảng giá mới.");
    } catch (requestError) { setError(getApiErrorMessage(requestError, "Không thể lưu cấu hình giá vé.")); }
    finally { setSaving(false); }
  };

  const restore = async (item: TicketPriceConfigHistory) => {
    if (!window.confirm(`Khôi phục bảng giá phiên bản #${item.historyId} ngày ${new Date(item.createdAt).toLocaleString("vi-VN")}?`)) return;
    setRestoringId(item.historyId); setError("");
    try {
      const config = await ticketPricingApi.restoreHistory(item.historyId, `Khôi phục phiên bản #${item.historyId}`);
      setSavedConfig(config); setForm({ ...config, changeReason: "" }); setReason("");
      setHistory(await ticketPricingApi.getHistory(20));
      toast.success("Đã khôi phục và áp dụng phiên bản bảng giá.");
    } catch (requestError) { setError(getApiErrorMessage(requestError, "Không thể khôi phục bảng giá.")); }
    finally { setRestoringId(null); }
  };

  const preview = useMemo(() => {
    const base = previewU22 && form.u22Enabled ? Math.min(form[previewPresentation], form.u22BasePrice) : form[previewPresentation];
    const seatSurcharge = previewSeat === "VIP" ? form.vipSeatSurcharge : previewSeat === "COUPLE" ? form.coupleSeatSurcharge : previewSeat === "DISABLED" ? form.disabledSeatSurcharge : 0;
    const rules: { label: string; value: number }[] = [];
    const previewDay = new Date(`${previewDate}T12:00:00`).getDay();
    if (previewDay === 0 || previewDay === 6) rules.push({ label: "Phụ thu cuối tuần", value: form.weekendSurcharge });
    if (previewTime < shortTime(form.earlyBirdEnd)) rules.push({ label: "Ưu đãi suất sớm", value: -form.earlyBirdDiscount });
    else if (previewTime >= shortTime(form.primeTimeStart) && previewTime < shortTime(form.primeTimeEnd)) rules.push({ label: "Phụ thu cao điểm", value: form.primeTimeSurcharge });
    else if (previewTime >= shortTime(form.lateShowStart)) rules.push({ label: "Phụ thu suất muộn", value: form.lateShowSurcharge });
    const scheduleAdjustment = rules.reduce((sum, rule) => sum + rule.value, 0);
    const raw = Math.max(1_000, base + seatSurcharge + scheduleAdjustment);
    const unit = form.priceRoundingUnit || 1_000;
    return { base, seatSurcharge, rules, final: Math.ceil(raw / unit) * unit };
  }, [form, previewDate, previewPresentation, previewSeat, previewTime, previewU22]);

  if (loading) return <main className="flex flex-1 items-center justify-center bg-slate-50"><Loader2 className="mr-2 animate-spin text-amber-500" /> <span className="text-sm font-bold text-slate-600">Đang tải chính sách giá...</span></main>;

  return <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
    <div className="mx-auto max-w-[1380px] space-y-5">
      <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-5 px-6 py-6">
          <div className="flex items-start gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-400 text-slate-950"><BadgeDollarSign size={26} /></div><div><div className="flex items-center gap-2"><h1 className="text-2xl font-black">Chính sách giá vé</h1><span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-black">Phiên bản {savedConfig?.version ?? 0}</span></div><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-300">Quản lý giá nền, phụ thu ghế, ưu đãi U22 và điều chỉnh theo lịch chiếu. Giá được tính lại ở máy chủ khi tạo booking.</p></div></div>
          <div className="flex gap-3"><div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"><div className="text-[10px] font-bold uppercase text-slate-400">Cập nhật gần nhất</div><div className="mt-1 text-xs font-extrabold">{savedConfig?.updatedAt ? new Date(savedConfig.updatedAt).toLocaleString("vi-VN") : "Chưa có"}</div></div><button type="button" onClick={() => void load()} className="grid h-12 w-12 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10" title="Tải lại"><RefreshCcw size={18} /></button></div>
        </div>
        <div className="grid border-t border-white/10 sm:grid-cols-4"><div className="px-5 py-3"><div className="text-[10px] font-bold uppercase text-slate-500">Standard 2D</div><b className="mt-1 block text-lg text-amber-300">{money(form.standard2dPrice)}</b></div><div className="border-white/10 px-5 py-3 sm:border-l"><div className="text-[10px] font-bold uppercase text-slate-500">U22</div><b className="mt-1 block text-lg text-emerald-300">{form.u22Enabled ? money(form.u22BasePrice) : "Tạm ngừng"}</b></div><div className="border-white/10 px-5 py-3 sm:border-l"><div className="text-[10px] font-bold uppercase text-slate-500">Cao điểm</div><b className="mt-1 block text-lg">+{money(form.primeTimeSurcharge)}</b></div><div className="border-white/10 px-5 py-3 sm:border-l"><div className="text-[10px] font-bold uppercase text-slate-500">Cuối tuần</div><b className="mt-1 block text-lg">+{money(form.weekendSurcharge)}</b></div></div>
      </section>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Card><SectionTitle icon={Ticket} title="Giá nền theo định dạng" description="Được chụp vào suất chiếu khi tạo lịch; thay đổi ở đây áp dụng cho suất tạo mới." /><div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4"><MoneyInput label="Standard · 2D" value={form.standard2dPrice} onChange={(value) => setMoney("standard2dPrice", value)} /><MoneyInput label="Standard · 3D" value={form.standard3dPrice} onChange={(value) => setMoney("standard3dPrice", value)} /><MoneyInput label="IMAX · 3D" value={form.imax3dPrice} onChange={(value) => setMoney("imax3dPrice", value)} /><MoneyInput label="4DX · 3D" value={form.fourDx3dPrice} onChange={(value) => setMoney("fourDx3dPrice", value)} /></div></Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card><SectionTitle icon={Armchair} title="Phụ thu theo loại ghế" description="Cộng vào từng ghế trước khi áp dụng quy tắc ngày và giờ." /><div className="grid gap-3 p-5"><MoneyInput label="Ghế VIP" value={form.vipSeatSurcharge} onChange={(value) => setMoney("vipSeatSurcharge", value)} /><MoneyInput label="Ghế đôi" value={form.coupleSeatSurcharge} onChange={(value) => setMoney("coupleSeatSurcharge", value)} hint="Tính trên mỗi vị trí ghế đôi được bán." /><MoneyInput label="Ghế hỗ trợ" value={form.disabledSeatSurcharge} onChange={(value) => setMoney("disabledSeatSurcharge", value)} /></div></Card>
            <Card><SectionTitle icon={Users} title="Chính sách U22" description="Nhân viên phải xác minh giấy tờ trước khi xác nhận đơn." /><div className="p-5"><button type="button" role="switch" aria-checked={form.u22Enabled} onClick={() => { setForm((current) => ({ ...current, u22Enabled: !current.u22Enabled })); if (form.u22Enabled) setPreviewU22(false); }} className={`flex w-full items-center justify-between rounded-xl border p-4 text-left ${form.u22Enabled ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}><span><b className="block text-sm text-slate-900">Cho phép bán vé U22</b><span className="mt-1 block text-xs text-slate-500">Áp dụng giá thấp hơn giữa giá suất và giá U22.</span></span><span className={`relative h-6 w-11 rounded-full ${form.u22Enabled ? "bg-emerald-500" : "bg-slate-300"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${form.u22Enabled ? "left-[22px]" : "left-0.5"}`} /></span></button><div className="mt-3"><MoneyInput label="Giá nền U22" value={form.u22BasePrice} onChange={(value) => setMoney("u22BasePrice", value)} disabled={!form.u22Enabled} /></div><div className="mt-3 flex gap-2 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-800"><ShieldCheck size={16} className="mt-0.5 shrink-0" />Backend vẫn kiểm tra cờ xác minh giấy tờ cho từng ghế U22 khi tạo booking.</div></div></Card>
          </div>

          <Card><SectionTitle icon={CalendarDays} title="Quy tắc theo ngày và khung giờ" description="Cuối tuần được cộng cùng một quy tắc theo giờ; các khung giờ sớm, cao điểm và muộn loại trừ nhau." /><div className="grid gap-4 border-b border-slate-100 px-5 py-4 lg:grid-cols-[1fr_190px] lg:items-center"><div className="flex items-start gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-violet-600"><CalendarDays size={17} /></div><div><div className="text-sm font-black">Thứ Bảy và Chủ Nhật</div><div className="mt-1 text-xs text-slate-500">Cộng thêm cho mọi suất trong hai ngày cuối tuần.</div></div></div><MoneyInput label="Phụ thu cuối tuần" value={form.weekendSurcharge} onChange={(value) => setMoney("weekendSurcharge", value)} /></div><RuleRow icon={SunMedium} title="Ưu đãi suất sớm" description="Giảm giá cho suất bắt đầu trước mốc này." timeLabel="Kết thúc trước" time={form.earlyBirdEnd} onTime={(value) => setTime("earlyBirdEnd", value)} amountLabel="Mức giảm" amount={form.earlyBirdDiscount} onAmount={(value) => setMoney("earlyBirdDiscount", value)} discount /><PrimeRuleRow start={form.primeTimeStart} end={form.primeTimeEnd} amount={form.primeTimeSurcharge} onStart={(value) => setTime("primeTimeStart", value)} onEnd={(value) => setTime("primeTimeEnd", value)} onAmount={(value) => setMoney("primeTimeSurcharge", value)} /><RuleRow icon={Moon} title="Suất chiếu muộn" description="Cộng phụ thu cho suất bắt đầu từ mốc này trở đi." timeLabel="Bắt đầu từ" time={form.lateShowStart} onTime={(value) => setTime("lateShowStart", value)} amountLabel="Phụ thu" amount={form.lateShowSurcharge} onAmount={(value) => setMoney("lateShowSurcharge", value)} /></Card>

          <Card><SectionTitle icon={History} title="Lịch sử phiên bản" description="Mỗi lần lưu tạo một ảnh chụp cấu hình để truy vết và khôi phục." /><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Phiên bản</th><th className="px-4 py-3">Thời điểm</th><th className="px-4 py-3">Người thay đổi</th><th className="px-4 py-3">Lý do</th><th className="px-4 py-3">Standard 2D</th><th className="px-5 py-3 text-right">Thao tác</th></tr></thead><tbody className="divide-y divide-slate-100">{history.length ? history.map((item) => <tr key={item.historyId} className="text-xs"><td className="px-5 py-3 font-black text-slate-900">#{item.historyId}</td><td className="px-4 py-3 text-slate-600">{new Date(item.createdAt).toLocaleString("vi-VN")}</td><td className="px-4 py-3 font-bold text-slate-700">{item.changedBy}</td><td className="max-w-[260px] truncate px-4 py-3 text-slate-600" title={item.changeReason}>{item.changeReason}</td><td className="px-4 py-3 font-black">{money(item.config.standard2dPrice)}</td><td className="px-5 py-3 text-right"><button type="button" disabled={restoringId !== null} onClick={() => void restore(item)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 font-bold text-slate-600 hover:border-amber-300 hover:text-amber-700 disabled:opacity-50">{restoringId === item.historyId ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}Khôi phục</button></td></tr>) : <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-500">Chưa có lịch sử bảng giá.</td></tr>}</tbody></table></div></Card>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-4">
          <Card><SectionTitle icon={BadgeDollarSign} title="Mô phỏng giá bán" description="Kiểm tra ngay kết quả từ biểu mẫu chưa lưu." /><div className="space-y-3 p-5"><div className="grid grid-cols-2 gap-3"><label><span className="mb-1 block text-[10px] font-black uppercase text-slate-500">Ngày chiếu</span><input type="date" value={previewDate} onChange={(event) => setPreviewDate(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-2 text-xs font-bold" /></label><label><span className="mb-1 block text-[10px] font-black uppercase text-slate-500">Giờ chiếu</span><input type="time" value={previewTime} onChange={(event) => setPreviewTime(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-2 text-xs font-bold" /></label></div><label className="block"><span className="mb-1 block text-[10px] font-black uppercase text-slate-500">Định dạng</span><select value={previewPresentation} onChange={(event) => setPreviewPresentation(event.target.value as PresentationKey)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold"><option value="standard2dPrice">Standard · 2D</option><option value="standard3dPrice">Standard · 3D</option><option value="imax3dPrice">IMAX · 3D</option><option value="fourDx3dPrice">4DX · 3D</option></select></label><label className="block"><span className="mb-1 block text-[10px] font-black uppercase text-slate-500">Loại ghế</span><select value={previewSeat} onChange={(event) => setPreviewSeat(event.target.value as SeatKind)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold"><option value="NORMAL">Ghế thường</option><option value="VIP">Ghế VIP</option><option value="COUPLE">Ghế đôi</option><option value="DISABLED">Ghế hỗ trợ</option></select></label><button type="button" disabled={!form.u22Enabled} onClick={() => setPreviewU22((value) => !value)} className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-xs font-bold ${previewU22 ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600"} disabled:opacity-40`}><span>Áp dụng vé U22</span>{previewU22 && <CheckCircle2 size={16} />}</button></div>
            <div className="border-t border-slate-100 bg-slate-50 p-5"><div className="space-y-2 text-xs"><div className="flex justify-between text-slate-600"><span>Giá nền{previewU22 ? " U22" : ""}</span><b>{money(preview.base)}</b></div><div className="flex justify-between text-slate-600"><span>Phụ thu ghế</span><b>+{money(preview.seatSurcharge)}</b></div>{preview.rules.map((rule) => <div key={rule.label} className="flex justify-between text-slate-600"><span>{rule.label}</span><b className={rule.value < 0 ? "text-emerald-600" : ""}>{rule.value >= 0 ? "+" : "−"}{money(Math.abs(rule.value))}</b></div>)}<div className="flex justify-between text-slate-400"><span>Làm tròn lên</span><span>{money(form.priceRoundingUnit)}</span></div></div><div className="mt-4 flex items-end justify-between border-t border-dashed border-slate-300 pt-4"><div><div className="text-[10px] font-black uppercase text-slate-500">Giá cuối</div><div className="mt-1 text-2xl font-black text-amber-600">{money(preview.final)}</div></div><ChevronRight className="text-amber-500" /></div></div>
          </Card>
          <Card className="p-5"><div className="flex items-start gap-3"><Info size={18} className="mt-0.5 shrink-0 text-blue-600" /><div><b className="text-sm text-slate-900">Thứ tự tính giá</b><ol className="mt-2 space-y-1.5 text-xs leading-5 text-slate-600"><li>1. Giá nền của suất hoặc U22</li><li>2. Cộng phụ thu loại ghế</li><li>3. Cộng phụ thu cuối tuần</li><li>4. Áp dụng một quy tắc theo giờ</li><li>5. Làm tròn lên theo đơn vị</li></ol></div></div></Card>
        </aside>
      </div>

      <section className="sticky bottom-0 z-20 rounded-2xl border border-slate-200 bg-white/95 px-5 py-4 shadow-[0_-8px_30px_rgba(15,23,42,.08)] backdrop-blur">
        <div className="flex flex-wrap items-end justify-between gap-4"><div className="min-w-[280px] flex-1"><div className="flex items-center gap-2"><CheckCircle2 size={18} className={hasChanges ? "text-amber-500" : "text-emerald-500"} /><b className="text-sm text-slate-900">{hasChanges ? "Có thay đổi chưa lưu" : "Bảng giá đang đồng bộ"}</b></div><label className="mt-2 block"><span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">Lý do thay đổi {hasChanges && <span className="text-red-500">*</span>}</span><input value={reason} onChange={(event) => setReason(event.target.value)} disabled={!hasChanges} maxLength={300} placeholder="Ví dụ: Điều chỉnh giá cuối tuần tháng 9" className="h-10 w-full max-w-2xl rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-amber-400 disabled:bg-slate-100" /></label></div><div className="flex gap-2"><button type="button" disabled={!hasChanges || saving} onClick={() => { if (savedConfig) setForm({ ...savedConfig, changeReason: "" }); setReason(""); setError(""); }} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 disabled:opacity-40">Hoàn tác</button><button type="button" disabled={!hasChanges || saving} onClick={() => void save()} className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-black text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-300">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{saving ? "Đang áp dụng..." : "Lưu và áp dụng"}</button></div></div>
      </section>
    </div>
  </main>;
}
