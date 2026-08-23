import { useEffect, useMemo, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { Crown, Edit3, Gift, Loader2, Lock, LockOpen, Plus, RefreshCw, Search, Sparkles, TrendingUp, Users, WalletCards, X } from "lucide-react";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "@/api/errors";
import { membershipApi, membershipFreeTicketLabel, membershipFreeTicketOptions, type AdminMembership, type MembershipAdminSummary, type MembershipFreeTicketType, type MembershipPlan, type MembershipPlanCreate, type MembershipPlanUpdate, type MembershipReward, type MembershipRewardUpsert } from "@/api/membershipApi";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

const number = (value?: number) => new Intl.NumberFormat("vi-VN").format(value || 0);
const initial: MembershipAdminSummary = { activeMembers: 0, totalPointsBalance: 0, totalAnnualSpend: 0, joinedThisMonth: 0, activeByPlan: {}, pendingPayments: 0, scheduledMemberships: 0, expiringWithinSevenDays: 0, newRegistrationsThisMonth: 0, revenueThisMonth: 0 };

export function MembershipManagementPage() {
  const [summary, setSummary] = useState(initial);
  const [members, setMembers] = useState<AdminMembership[]>([]);
  const [tiers, setTiers] = useState<MembershipPlan[]>([]);
  const [rewards, setRewards] = useState<MembershipReward[]>([]);
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<MembershipPlan | null>(null);
  const [creating, setCreating] = useState(false);
  const [creatingReward, setCreatingReward] = useState(false);
  const [editingReward, setEditingReward] = useState<MembershipReward | null>(null);
  const [claimCode, setClaimCode] = useState("");
  const [claimingGift, setClaimingGift] = useState(false);
  const [claimConfirmOpen, setClaimConfirmOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<AdminMembership | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [s, m, t, r] = await Promise.all([membershipApi.getAdminSummary(), membershipApi.getAdminMemberships(), membershipApi.getAdminPlans(), membershipApi.getAdminRewards()]);
      setSummary(s || initial); setMembers(m || []); setTiers(t || []); setRewards(r || []);
    } catch (error) { toast.error(getApiErrorMessage(error, "Không thể tải quản lý hội viên.")); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    let mounted = true;
    const loadInitialData = async () => {
      try {
        const [s, m, t, r] = await Promise.all([
          membershipApi.getAdminSummary(),
          membershipApi.getAdminMemberships(),
          membershipApi.getAdminPlans(),
          membershipApi.getAdminRewards(),
        ]);
        if (!mounted) return;
        setSummary(s || initial);
        setMembers(m || []);
        setTiers(t || []);
        setRewards(r || []);
      } catch (error) {
        if (mounted) toast.error(getApiErrorMessage(error, "Không thể tải quản lý hội viên."));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadInitialData();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const key = query.trim().toLowerCase();
    return members.filter(item => (!tier || item.planCode === tier)
      && (!status || item.status === status)
      && (!key || [item.fullName, item.username, item.email, item.phoneNumber, item.memberCode].some(v => v?.toLowerCase().includes(key))));
  }, [members, query, status, tier]);

  const updateMembershipStatus = async () => {
    if (!statusTarget) return;
    const nextStatus = statusTarget.status === "LOCKED" ? "ACTIVE" : "LOCKED";
    setUpdatingStatus(true);
    try {
      await membershipApi.updateAdminMembershipStatus(statusTarget.membershipId, nextStatus);
      toast.success(nextStatus === "ACTIVE" ? "Đã mở lại Membership." : "Đã tạm khóa Membership.");
      setStatusTarget(null);
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không thể cập nhật trạng thái hội viên."));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const claimGift = async () => {
    const code = claimCode.trim();
    if (!code || claimingGift) return;
    setClaimingGift(true);
    try {
      const claimed = await membershipApi.claimGiftAtCounter(code);
      toast.success(`Đã xác nhận trao quà: ${claimed.rewardName}.`);
      setClaimCode("");
      setClaimConfirmOpen(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không thể xác nhận mã nhận quà."));
    } finally {
      setClaimingGift(false);
    }
  };

  if (loading) return <div className="grid min-h-0 flex-1 place-items-center overflow-y-auto bg-slate-100"><Loader2 className="animate-spin text-orange-500" /></div>;

  return <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100 px-5 py-6 text-slate-950">
    <div className="mx-auto max-w-[1680px] space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.16em] text-orange-600">Khách hàng &amp; bán hàng</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Quản lý hội viên</h1>
          <p className="mt-1 text-sm text-slate-500">Theo dõi hạng, điểm, chi tiêu chu kỳ và cấu hình quyền lợi Membership.</p>
        </div>
        <button onClick={() => void load()} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-orange-300 hover:text-orange-600">
          <RefreshCw size={17} /> Làm mới dữ liệu
        </button>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<Users />} label="Hội viên hoạt động" value={number(summary.activeMembers)} detail="Tài khoản đang tham gia" tone="orange" />
        <MetricCard icon={<WalletCards />} label="Chi tiêu chu kỳ hiện tại" value={`${number(summary.totalAnnualSpend)} đ`} detail="Tổng chi tiêu xét hạng" tone="blue" />
        <MetricCard icon={<Sparkles />} label="Điểm đang lưu hành" value={number(summary.totalPointsBalance)} detail="Số dư điểm toàn hệ thống" tone="violet" />
        <MetricCard icon={<Crown />} label="Tham gia tháng này" value={number(summary.joinedThisMonth)} detail="Hội viên đăng ký mới" tone="emerald" />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Cấu hình hạng hội viên</h2>
            <p className="mt-1 text-sm text-slate-500">Ngưỡng chi tiêu và quyền lợi của từng hạng.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">Thay đổi chỉ áp dụng cho giao dịch mới</span>
            <button type="button" onClick={() => setCreating(true)} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-orange-600">
              <Plus size={17} /> Thêm hạng hội viên
            </button>
          </div>
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {tiers.map(item => <PlanCard key={item.planId} plan={item} onEdit={() => setEditing(item)} />)}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-xl font-black">Kho quà tặng hội viên</h2><p className="mt-1 text-sm text-slate-500">Quản lý các quà tặng khách hàng có thể đổi bằng điểm và nhận trực tiếp tại quầy.</p></div>
          <button type="button" onClick={() => setCreatingReward(true)} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-violet-700"><Plus size={17} /> Thêm quà tặng</button>
        </div>
        {rewards.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed p-8 text-center text-sm text-slate-500">Chưa có phần thưởng hội viên.</div> : <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {rewards.map(reward => <article key={reward.rewardId} className={`rounded-2xl border p-5 ${reward.status === "ACTIVE" ? "border-violet-200 bg-violet-50/40" : "border-slate-200 bg-slate-50 opacity-65"}`}>
            <div className="flex items-start justify-between gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-violet-600 shadow-sm"><Gift size={20} /></span><button type="button" onClick={() => setEditingReward(reward)} className="rounded-lg border bg-white p-2 text-slate-500 hover:text-violet-600"><Edit3 size={16} /></button></div>
            <p className="mt-4 text-[11px] font-black uppercase tracking-wider text-violet-600">Quà nhận tại quầy</p>
            <h3 className="mt-1 font-black">{reward.name}</h3><p className="mt-2 min-h-10 text-sm text-slate-500">{reward.description}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm"><div className="rounded-lg bg-white p-2"><span className="text-xs text-slate-400">Điểm đổi</span><b className="block">{number(reward.pointCost)}</b></div><div className="rounded-lg bg-white p-2"><span className="text-xs text-slate-400">Tồn kho</span><b className="block">{number(reward.stockQuantity)}</b></div></div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span>Hạn {reward.validityDays} ngày</span><span className={`rounded-full px-2 py-1 font-bold ${reward.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200"}`}>{reward.status === "ACTIVE" ? "Đang mở đổi" : "Tạm ngừng"}</span></div>
          </article>)}
        </div>}
        <div className="mt-5 flex flex-wrap items-end gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <label className="min-w-64 flex-1 text-sm font-bold text-emerald-950">Xác nhận trao quà tại quầy
            <input value={claimCode} onChange={event => setClaimCode(event.target.value.toUpperCase())} onKeyDown={event => { if (event.key === "Enter" && claimCode.trim()) setClaimConfirmOpen(true); }} placeholder="Nhập mã MR... khách hàng cung cấp" className="mt-2 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 font-mono font-bold uppercase outline-none focus:border-emerald-500" />
          </label>
          <button type="button" disabled={!claimCode.trim() || claimingGift} onClick={() => setClaimConfirmOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 font-black text-white disabled:opacity-50">{claimingGift && <Loader2 size={17} className="animate-spin" />} Xác nhận đã trao quà</button>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-5">
          <div className="mr-auto">
            <h2 className="text-xl font-black">Danh sách hội viên</h2>
            <p className="mt-1 text-sm text-slate-500">Hiển thị {number(filtered.length)} trên {number(members.length)} hội viên</p>
          </div>
          <label className="flex min-w-72 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-orange-400 focus-within:bg-white xl:max-w-xl">
            <Search size={18} className="text-slate-400" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tên, username, email, SĐT hoặc mã hội viên..." className="w-full border-0 bg-transparent py-2.5 text-sm outline-none" />
          </label>
          <select value={tier} onChange={e => setTier(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold outline-none focus:border-orange-400">
            <option value="">Tất cả hạng</option>
            {tiers.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
          </select>
          <select value={status} onChange={e => setStatus(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold outline-none focus:border-orange-400">
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="LOCKED">Tạm khóa</option>
          </select>
        </div>

        <div className="overflow-hidden">
          <table className="w-full table-fixed text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-[20%] px-4 py-4">Hội viên</th>
                <th className="w-[8%] px-3 py-4">Hạng</th>
                <th className="w-[9%] px-3 py-4">Điểm</th>
                <th className="w-[13%] px-3 py-4">Chi tiêu chu kỳ</th>
                <th className="w-[16%] px-3 py-4">Tiến độ lên hạng</th>
                <th className="w-[9%] px-3 py-4">Vé tặng</th>
                <th className="w-[10%] px-3 py-4">Tích điểm</th>
                <th className="w-[15%] px-3 py-4">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(item => {
                const progress = item.nextTierSpend ? Math.min(100, item.annualSpend * 100 / item.nextTierSpend) : 100;
                return <tr key={item.membershipId} className="transition hover:bg-orange-50/40">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-950 font-black text-white">{(item.fullName || item.username).trim().charAt(0).toUpperCase()}</span>
                      <div className="min-w-0">
                        <b className="block max-w-56 truncate">{item.fullName || item.username}</b>
                        <p className="mt-0.5 max-w-64 truncate text-xs text-slate-500">{item.memberCode} · {item.phoneNumber || item.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4"><Tier code={item.planCode} /></td>
                  <td className="px-5 py-4 font-black">{number(item.loyaltyPoints)}</td>
                  <td className="px-5 py-4"><b>{number(item.annualSpend)} đ</b><p className="mt-1 text-xs text-slate-400">Hết hạn {item.endAt ? new Date(item.endAt).toLocaleDateString("vi-VN") : "—"}</p></td>
                  <td className="px-5 py-4">
                    <div className="w-40">
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-orange-500" style={{ width: `${progress}%` }} /></div>
                      <p className="mt-1.5 text-xs text-slate-500">{item.nextTierSpend ? `Còn ${number(item.spendToNextTier)} đ` : "Đã đạt hạng cao nhất"}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4"><span className="inline-flex items-center gap-1.5 font-black text-emerald-700"><Gift size={16} /> {number(item.availableFreeTickets)}</span></td>
                  <td className="px-5 py-4"><p>Vé <b>{item.ticketEarnPercent}%</b></p><p className="mt-1 text-xs text-slate-500">Bắp nước <b>{item.concessionEarnPercent}%</b></p></td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${item.status === "LOCKED" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {item.status === "LOCKED" ? "Tạm khóa" : "Đang hoạt động"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setStatusTarget(item)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${item.status === "LOCKED" ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50" : "border-rose-200 text-rose-700 hover:bg-rose-50"}`}
                      >
                        {item.status === "LOCKED" ? <LockOpen size={14} /> : <Lock size={14} />}
                        {item.status === "LOCKED" ? "Mở lại" : "Tạm khóa"}
                      </button>
                    </div>
                  </td>
                </tr>;
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="grid min-h-44 place-items-center border-t bg-slate-50/50 text-center"><div><Search className="mx-auto text-slate-300" /><p className="mt-2 text-sm font-semibold text-slate-500">Không tìm thấy hội viên phù hợp.</p></div></div>}
        </div>
      </section>
    </div>
    {creating && <TierCreator onClose={() => setCreating(false)} onSaved={async () => { setCreating(false); await load(); }} />}
    {editing && <TierEditor tier={editing} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await load(); }} />}
    {creatingReward && <RewardEditor onClose={() => setCreatingReward(false)} onSaved={async () => { setCreatingReward(false); await load(); }} />}
    {editingReward && <RewardEditor reward={editingReward} onClose={() => setEditingReward(null)} onSaved={async () => { setEditingReward(null); await load(); }} />}
    <ConfirmDialog
      open={claimConfirmOpen}
      title="Xác nhận đã trao quà?"
      message={`Mã ${claimCode.trim() || "MR..."} sẽ chuyển sang trạng thái đã nhận. Thao tác này không thể hoàn tác hoặc hoàn điểm.`}
      confirmLabel="Đã trao quà"
      tone="warning"
      loading={claimingGift}
      onClose={() => setClaimConfirmOpen(false)}
      onConfirm={claimGift}
    />
    <ConfirmDialog
      open={Boolean(statusTarget)}
      title={statusTarget?.status === "LOCKED" ? "Mở lại Membership?" : "Tạm khóa Membership?"}
      message={statusTarget?.status === "LOCKED"
        ? `Hội viên ${statusTarget.fullName || statusTarget.username} sẽ được tiếp tục tích điểm và sử dụng quyền lợi.`
        : `Hội viên ${statusTarget?.fullName || statusTarget?.username || "này"} sẽ tạm thời không thể tích điểm hoặc sử dụng quyền lợi. Tài khoản đăng nhập vẫn hoạt động.`}
      confirmLabel={statusTarget?.status === "LOCKED" ? "Mở lại" : "Tạm khóa"}
      tone="warning"
      loading={updatingStatus}
      onClose={() => setStatusTarget(null)}
      onConfirm={updateMembershipStatus}
    />
  </div>;
}

const metricTone = {
  orange: "bg-orange-50 text-orange-600",
  blue: "bg-sky-50 text-sky-600",
  violet: "bg-violet-50 text-violet-600",
  emerald: "bg-emerald-50 text-emerald-600",
};
function MetricCard({ icon, label, value, detail, tone }: { icon: ReactNode; label: string; value: string; detail: string; tone: keyof typeof metricTone }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><span className={`grid h-11 w-11 place-items-center rounded-xl ${metricTone[tone]}`}>{icon}</span><TrendingUp size={18} className="text-slate-300" /></div><b className="mt-4 block text-2xl font-black tracking-tight">{value}</b><p className="mt-1 text-sm font-bold text-slate-700">{label}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></article>;
}
function PlanCard({ plan, onEdit }: { plan: MembershipPlan; onEdit: () => void }) {
  const theme = plan.code === "VVIP" ? "border-indigo-200 bg-indigo-50/40" : plan.code === "VIP" ? "border-amber-200 bg-amber-50/40" : "border-slate-200 bg-slate-50/70";
  const accent = plan.code === "VVIP" ? "text-indigo-600" : plan.code === "VIP" ? "text-amber-600" : "text-slate-600";
  return <article className={`rounded-2xl border p-5 ${theme} ${plan.status === "INACTIVE" ? "opacity-60" : ""}`}><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className={`text-xs font-black tracking-wider ${accent}`}>{plan.code}</span>{plan.status === "INACTIVE" && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-black text-slate-600">Tạm ngừng</span>}</div><h3 className="mt-0.5 text-2xl font-black">{plan.name}</h3></div><button onClick={onEdit} aria-label={`Chỉnh sửa hạng ${plan.name}`} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm transition hover:border-orange-300 hover:text-orange-600"><Edit3 size={17} /></button></div><div className="mt-4 rounded-xl bg-white/80 p-3 text-sm text-slate-600"><span>Ngưỡng chi tiêu chu kỳ</span><b className="mt-1 block text-slate-950">{number(plan.annualSpendMin)} đ{plan.annualSpendMax ? ` – dưới ${number(plan.annualSpendMax)} đ` : " trở lên"}</b></div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><PlanBenefit label="Tích điểm vé" value={`${plan.ticketEarnPercent}%`} /><PlanBenefit label="Bắp nước" value={`${plan.concessionEarnPercent}%`} /><PlanBenefit label={`${membershipFreeTicketLabel(plan.freeTicketType)}/chu kỳ`} value={number(plan.annualFreeTickets)} /></div></article>;
}
function PlanBenefit({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-white/80 px-2 py-3"><b className="block text-lg font-black">{value}</b><span className="mt-1 block text-[11px] text-slate-500">{label}</span></div>; }
function Tier({ code }: { code: string }) { const style = code === "VVIP" ? "bg-indigo-100 text-indigo-700" : code === "VIP" ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-700"; return <span className={`rounded-full px-3 py-1 text-xs font-black ${style}`}>{code}</span>; }
function TierCreator({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<MembershipPlanCreate>({
    code: "",
    name: "",
    description: "",
    annualSpendMin: 1,
    ticketEarnPercent: 0,
    concessionEarnPercent: 0,
    annualFreeTickets: 0,
    freeTicketType: "STANDARD_2D",
    status: "ACTIVE",
  });
  const [saving, setSaving] = useState(false);
  const setNumber = (key: "annualSpendMin" | "ticketEarnPercent" | "concessionEarnPercent" | "annualFreeTickets", value: string) => {
    setForm(prev => ({ ...prev, [key]: Number(value) }));
  };
  const save = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.warning("Vui lòng nhập mã hạng và tên hạng.");
      return;
    }
    setSaving(true);
    try {
      await membershipApi.createAdminPlan(form);
      toast.success(`Đã thêm hạng ${form.name.trim()}.`);
      onSaved();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không thể thêm hạng hội viên."));
    } finally {
      setSaving(false);
    }
  };

  return <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/60 p-4">
    <div className="my-auto w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-wider text-orange-600">Cấu hình hạng mới</p><h3 className="mt-1 text-2xl font-black">Thêm hạng hội viên</h3><p className="mt-1 text-sm text-slate-500">Hạng sẽ được tự động xếp theo ngưỡng chi tiêu.</p></div>
        <button type="button" onClick={onClose} aria-label="Đóng"><X /></button>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Mã hạng"><input maxLength={30} placeholder="Ví dụ: SVIP" value={form.code} onChange={e => setForm(prev => ({ ...prev, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") }))} /></Field>
        <Field label="Tên hạng"><input maxLength={80} placeholder="Ví dụ: Super VIP" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} /></Field>
        <div className="sm:col-span-2"><Field label="Mô tả"><textarea rows={2} maxLength={1000} placeholder="Mô tả ngắn về hạng hội viên" value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} /></Field></div>
        <Field label="Chi tiêu tối thiểu/chu kỳ (đ)"><input type="number" min={1} value={form.annualSpendMin} onChange={e => setNumber("annualSpendMin", e.target.value)} /></Field>
        <Field label="Trạng thái"><select value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value as MembershipPlan["status"] }))}><option value="ACTIVE">Đang áp dụng</option><option value="INACTIVE">Tạm ngừng</option></select></Field>
        <Field label="Tích điểm vé (%)"><input type="number" min={0} max={100} step="0.1" value={form.ticketEarnPercent} onChange={e => setNumber("ticketEarnPercent", e.target.value)} /></Field>
        <Field label="Tích điểm bắp nước (%)"><input type="number" min={0} max={100} step="0.1" value={form.concessionEarnPercent} onChange={e => setNumber("concessionEarnPercent", e.target.value)} /></Field>
        <Field label="Số vé tặng/chu kỳ"><input type="number" min={0} value={form.annualFreeTickets} onChange={e => setNumber("annualFreeTickets", e.target.value)} /></Field>
        <Field label="Loại vé được tặng"><select value={form.freeTicketType} onChange={e => setForm(prev => ({ ...prev, freeTicketType: e.target.value as MembershipFreeTicketType }))}>{membershipFreeTicketOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
      </div>
      <p className="mt-5 rounded-xl bg-sky-50 p-3 text-sm text-sky-800">Ngưỡng tối đa được hệ thống tự tính theo hạng kế tiếp. Hạng mới chỉ áp dụng cho các lần xét hạng và giao dịch sau khi tạo.</p>
      <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl border px-5 py-2.5 font-bold">Hủy</button><button type="button" disabled={saving} onClick={() => void save()} className="rounded-xl bg-slate-950 px-5 py-2.5 font-bold text-white disabled:opacity-60">{saving ? "Đang thêm..." : "Thêm hạng"}</button></div>
    </div>
  </div>;
}
function TierEditor({ tier, onClose, onSaved }: { tier: MembershipPlan; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<MembershipPlanUpdate>({ annualSpendMin: tier.annualSpendMin, annualSpendMax: tier.annualSpendMax, ticketEarnPercent: tier.ticketEarnPercent, concessionEarnPercent: tier.concessionEarnPercent, annualFreeTickets: tier.annualFreeTickets, freeTicketType: tier.freeTicketType || "STANDARD_2D", status: tier.status });
  const [saving, setSaving] = useState(false);
  const set = (key: keyof MembershipPlanUpdate, value: string) => setForm(prev => ({ ...prev, [key]: value === "" ? null : Number(value) }));
  const save = async () => { setSaving(true); try { await membershipApi.updateAdminPlan(tier.planId, form); toast.success("Đã cập nhật cấu hình hạng."); onSaved(); } catch (error) { toast.error(getApiErrorMessage(error, "Không thể cập nhật cấu hình.")); } finally { setSaving(false); } };
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4"><div className="w-full max-w-xl rounded-2xl bg-white p-6"><div className="flex justify-between"><div><p className="text-xs font-bold uppercase text-orange-600">Cấu hình quyền lợi</p><h3 className="text-2xl font-black">Hạng {tier.name}</h3></div><button onClick={onClose}><X /></button></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Chi tiêu tối thiểu/chu kỳ"><input type="number" disabled={tier.code === "MEMBER"} min={tier.code === "MEMBER" ? 0 : 1} value={form.annualSpendMin} onChange={e => set("annualSpendMin", e.target.value)} /></Field><Field label="Chi tiêu tối đa/chu kỳ"><input disabled value={form.annualSpendMax == null ? "Hạng cao nhất" : number(form.annualSpendMax)} /></Field><Field label="Tích điểm vé (%)"><input type="number" min={0} max={100} step="0.1" value={form.ticketEarnPercent} onChange={e => set("ticketEarnPercent", e.target.value)} /></Field><Field label="Tích điểm bắp nước (%)"><input type="number" min={0} max={100} step="0.1" value={form.concessionEarnPercent} onChange={e => set("concessionEarnPercent", e.target.value)} /></Field><Field label="Số vé tặng/chu kỳ"><input type="number" min={0} value={form.annualFreeTickets} onChange={e => set("annualFreeTickets", e.target.value)} /></Field><Field label="Loại vé được tặng"><select value={form.freeTicketType} onChange={e => setForm(prev => ({ ...prev, freeTicketType: e.target.value as MembershipFreeTicketType }))}>{membershipFreeTicketOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field><Field label="Trạng thái"><select disabled={tier.code === "MEMBER"} value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value as MembershipPlan["status"] }))}><option value="ACTIVE">Đang áp dụng</option><option value="INACTIVE">Tạm ngừng</option></select></Field></div><p className="mt-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Loại vé và số lượng mới chỉ áp dụng cho quyền lợi được cấp sau khi lưu; quyền lợi khách đã nhận vẫn giữ nguyên. Ngưỡng tối đa được tự động tính theo hạng kế tiếp.</p><div className="mt-6 flex justify-end gap-3"><button onClick={onClose} className="rounded-xl border px-5 py-2.5 font-bold">Đóng</button><button disabled={saving} onClick={() => void save()} className="rounded-xl bg-slate-950 px-5 py-2.5 font-bold text-white disabled:opacity-60">{saving ? "Đang lưu..." : "Lưu thay đổi"}</button></div></div></div>;
}
function RewardEditor({ reward, onClose, onSaved }: { reward?: MembershipReward; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<MembershipRewardUpsert>(reward ? {
    code: reward.code, name: reward.name, description: reward.description, terms: reward.terms,
    pointCost: reward.pointCost,
    stockQuantity: reward.stockQuantity, validityDays: reward.validityDays,
    maxRedemptionsPerCycle: reward.maxRedemptionsPerCycle, displayOrder: reward.displayOrder, status: reward.status,
  } : {
    code: "", name: "", description: "", terms: "",
    pointCost: 10000, stockQuantity: 100, validityDays: 30,
    maxRedemptionsPerCycle: 3, displayOrder: 0, status: "ACTIVE",
  });
  const [saving, setSaving] = useState(false);
  const setNumber = (key: "pointCost" | "stockQuantity" | "validityDays" | "maxRedemptionsPerCycle", value: string) => setForm(current => ({ ...current, [key]: Number(value) }));
  const save = async () => {
    if (!form.code.trim() || !form.name.trim()) { toast.warning("Vui lòng nhập mã và tên phần thưởng."); return; }
    setSaving(true);
    try {
      if (reward) await membershipApi.updateAdminReward(reward.rewardId, form);
      else await membershipApi.createAdminReward(form);
      toast.success(reward ? "Đã cập nhật phần thưởng hội viên." : "Đã thêm phần thưởng hội viên.");
      onSaved();
    } catch (error) { toast.error(getApiErrorMessage(error, "Không thể lưu phần thưởng hội viên.")); }
    finally { setSaving(false); }
  };
  return <div className="fixed inset-0 z-[110] grid place-items-center overflow-y-auto bg-black/60 p-4"><div className="my-auto w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl">
    <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-wider text-violet-600">Membership · Đổi điểm</p><h3 className="mt-1 text-2xl font-black">{reward ? "Chỉnh sửa quà tặng" : "Thêm quà tặng hội viên"}</h3><p className="mt-1 text-sm text-slate-500">Điểm chỉ dùng để đổi quà hiện vật và nhận trực tiếp tại quầy.</p></div><button type="button" onClick={onClose}><X /></button></div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <Field label="Mã quà tặng"><input maxLength={40} value={form.code} onChange={e => setForm(current => ({ ...current, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_") }))} placeholder="GIFT_SMALL_POPCORN" /></Field>
      <Field label="Tên quà tặng"><input maxLength={120} value={form.name} onChange={e => setForm(current => ({ ...current, name: e.target.value }))} placeholder="01 bắp rang cỡ nhỏ" /></Field>
      <Field label="Điểm cần đổi"><input type="number" min={1} value={form.pointCost} onChange={e => setNumber("pointCost", e.target.value)} /></Field>
      <Field label="Tồn kho"><input type="number" min={0} value={form.stockQuantity} onChange={e => setNumber("stockQuantity", e.target.value)} /></Field>
      <Field label="Hạn sử dụng sau khi đổi (ngày)"><input type="number" min={1} max={365} value={form.validityDays} onChange={e => setNumber("validityDays", e.target.value)} /></Field>
      <Field label="Giới hạn mỗi hội viên/chu kỳ"><input type="number" min={0} value={form.maxRedemptionsPerCycle} onChange={e => setNumber("maxRedemptionsPerCycle", e.target.value)} /></Field>
      <Field label="Trạng thái"><select value={form.status} onChange={e => setForm(current => ({ ...current, status: e.target.value as MembershipReward["status"] }))}><option value="ACTIVE">Đang mở đổi</option><option value="INACTIVE">Tạm ngừng</option></select></Field>
      <div />
      <div className="sm:col-span-2"><Field label="Mô tả"><textarea rows={2} maxLength={500} value={form.description || ""} onChange={e => setForm(current => ({ ...current, description: e.target.value }))} /></Field></div>
      <div className="sm:col-span-2"><Field label="Điều kiện sử dụng"><textarea rows={2} maxLength={500} value={form.terms || ""} onChange={e => setForm(current => ({ ...current, terms: e.target.value }))} /></Field></div>
    </div>
    <p className="mt-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Quà đã được khách đổi sẽ giữ nguyên tên và điều kiện tại thời điểm đổi. Chỉnh sửa chỉ áp dụng cho lượt đổi mới.</p>
    <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl border px-5 py-2.5 font-bold">Đóng</button><button type="button" disabled={saving} onClick={() => void save()} className="rounded-xl bg-violet-600 px-5 py-2.5 font-bold text-white disabled:opacity-60">{saving ? "Đang lưu..." : "Lưu phần thưởng"}</button></div>
  </div></div>;
}
function Field({ label, children }: { label: string; children: ReactElement }) { return <label className="text-sm font-bold text-slate-700">{label}<span className="mt-2 block [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:px-3 [&_input]:py-2.5 [&_input]:font-normal [&_input:disabled]:bg-slate-100 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:bg-white [&_select]:px-3 [&_select]:py-2.5 [&_select]:font-normal [&_textarea]:w-full [&_textarea]:resize-none [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:px-3 [&_textarea]:py-2.5 [&_textarea]:font-normal">{children}</span></label>; }
