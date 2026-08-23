import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, BadgeCheck, Crown, Gift, Loader2, Sparkles, Star, X } from "lucide-react";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "@/api/errors";
import { membershipApi, membershipFreeTicketLabel, type Membership, type MembershipBenefit, type MembershipPlan, type MembershipPoint, type MembershipReward, type MembershipTierHistory } from "@/api/membershipApi";

const number = (value?: number) => new Intl.NumberFormat("vi-VN").format(value || 0);
const date = (value?: string) => value ? new Date(value).toLocaleDateString("vi-VN") : "—";
const tierStyle: Record<string, string> = {
  MEMBER: "from-slate-600 to-slate-800",
  VIP: "from-amber-500 to-orange-600",
  VVIP: "from-cyan-500 to-indigo-700",
};

export function MembershipProfile() {
  const [mine, setMine] = useState<Membership | null>(null);
  const [tiers, setTiers] = useState<MembershipPlan[]>([]);
  const [points, setPoints] = useState<MembershipPoint[]>([]);
  const [benefits, setBenefits] = useState<MembershipBenefit[]>([]);
  const [tierHistory, setTierHistory] = useState<MembershipTierHistory[]>([]);
  const [rewards, setRewards] = useState<MembershipReward[]>([]);
  const [selectedReward, setSelectedReward] = useState<MembershipReward | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [membership, tierItems] = await Promise.all([membershipApi.getMine(), membershipApi.getPlans()]);
      setMine(membership);
      setTiers(tierItems || []);
      if (membership) {
        const [pointItems, benefitItems, historyItems, rewardItems] = await Promise.all([
          membershipApi.getPoints(), membershipApi.getBenefits(), membershipApi.getTierHistory(),
          membershipApi.getRewards(),
        ]);
        setPoints(pointItems || []);
        setBenefits(benefitItems || []);
        setTierHistory(historyItems || []);
        setRewards(rewardItems || []);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không thể tải thông tin hội viên."));
    } finally { setLoading(false); }
  };

  // Initial API loading is the external synchronization owned by this effect.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);

  const enroll = async () => {
    setEnrolling(true);
    try {
      await membershipApi.enroll();
      toast.success("Đăng ký hội viên thành công. Bạn đã bắt đầu ở hạng Member.");
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không thể đăng ký hội viên."));
    } finally { setEnrolling(false); }
  };

  const redeem = async () => {
    if (!selectedReward || redeeming) return;
    setRedeeming(true);
    try {
      await membershipApi.redeemReward(selectedReward.rewardId);
      toast.success(`Đổi ${selectedReward.name} thành công. Mã QR nhận quà nằm trong mục Quà đã đổi.`);
      setSelectedReward(null);
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không thể đổi phần thưởng."));
    } finally {
      setRedeeming(false);
    }
  };

  if (loading) return <div className="grid min-h-64 place-items-center rounded-2xl border bg-white"><Loader2 className="animate-spin text-rose-600" /></div>;

  if (!mine) return (
    <section className="rounded-2xl border bg-white p-8 text-center shadow-sm">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-amber-100 text-amber-700"><Crown size={34} /></span>
      <h2 className="mt-5 text-2xl font-black">Tham gia MagiCinema Membership</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">Đăng ký hoàn toàn miễn phí. Chi tiêu vé và bắp nước sẽ được tích điểm, đồng thời giúp bạn tự động lên hạng VIP hoặc VVIP.</p>
      <p className="mx-auto mt-5 max-w-lg rounded-xl bg-slate-50 p-4 text-left text-sm text-slate-600">Điều kiện: hồ sơ có họ tên, ngày sinh, số điện thoại duy nhất và khách hàng đủ 12 tuổi. Khi đăng ký, bạn đồng ý với điều khoản chương trình hội viên.</p>
      <button disabled={enrolling} onClick={() => void enroll()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-6 py-3 font-extrabold text-white disabled:opacity-60">{enrolling && <Loader2 size={17} className="animate-spin" />} Đăng ký miễn phí</button>
    </section>
  );

  const progress = mine.nextTierSpend ? Math.min(100, Math.round(mine.annualSpend / mine.nextTierSpend * 100)) : 100;
  const freeTicketBenefits = benefits.filter(item => item.type === "FREE_2D_TICKET");
  const available = freeTicketBenefits.filter(item => item.status === "AVAILABLE");
  const benefitHistory = freeTicketBenefits.filter(item => item.status !== "AVAILABLE");

  return <div className="space-y-6">
    <section className={`overflow-hidden rounded-2xl bg-gradient-to-r ${tierStyle[mine.planCode] || tierStyle.MEMBER} p-6 text-white shadow-lg`}>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div><p className="text-xs font-bold uppercase tracking-[.2em] text-white/70">MagiCinema Membership</p><h2 className="mt-2 flex items-center gap-2 text-3xl font-black"><Crown /> {mine.planName}</h2><p className="mt-2 text-sm text-white/70">Mã hội viên: {mine.memberCode}</p></div>
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold"><BadgeCheck size={15} /> Đang hoạt động</span>
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Điểm khả dụng" value={`${number(mine.loyaltyPoints)} điểm`} />
        <Metric label="Điểm hết hạn" value={date(mine.pointsExpireAt || mine.endAt)} />
        <Metric label="Chi tiêu chu kỳ" value={`${number(mine.annualSpend)} đ`} />
        <Metric label="Ngày tham gia" value={date(mine.joinedAt)} />
      </div>
      <p className="mt-4 text-xs text-white/75">Chu kỳ hiện tại: {date(mine.startAt)} – {date(mine.endAt)}. Điểm và quyền lợi chưa dùng sẽ hết hạn khi chu kỳ kết thúc.</p>
      <div className="mt-6"><div className="mb-2 flex justify-between text-xs"><span>Tiến độ hạng</span><b>{mine.nextTierSpend ? `Còn ${number(mine.spendToNextTier)} đ để lên hạng` : "Đã đạt hạng cao nhất"}</b></div><div className="h-2 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} /></div></div>
    </section>

    <section className="grid gap-4 lg:grid-cols-3">
      {tiers.map(tier => <article key={tier.planId} className={`rounded-2xl border bg-white p-5 shadow-sm ${mine.planCode === tier.code ? "ring-2 ring-rose-500" : ""}`}>
        <div className="flex items-center justify-between"><h3 className="text-xl font-black">{tier.name}</h3>{mine.planCode === tier.code && <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600">Hạng hiện tại</span>}</div>
        <p className="mt-1 text-sm text-slate-500">Từ {number(tier.annualSpendMin)} đ/chu kỳ</p>
        <ul className="mt-4 space-y-2 text-sm text-slate-700"><li>✓ Vé: tích {tier.ticketEarnPercent}%</li><li>✓ Bắp nước: tích {tier.concessionEarnPercent}%</li><li>✓ {tier.annualFreeTickets} vé {membershipFreeTicketLabel(tier.freeTicketType)} miễn phí/chu kỳ</li></ul>
      </article>)}
    </section>

    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-black"><Sparkles className="text-amber-500" /> Kho quà tặng</h3>
          <p className="mt-1 text-sm text-slate-500">Bạn đang có <b className="text-slate-900">{number(mine.loyaltyPoints)} điểm</b>. Quà đã đổi được nhận tại quầy và không thể hủy hoặc hoàn điểm.</p>
        </div>
      </div>
      {rewards.length === 0 ? <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Hiện chưa có phần thưởng mở đổi.</p> :
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {rewards.map(reward => <article key={reward.rewardId} className="flex min-h-64 flex-col rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-5">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-amber-600"><Gift size={23} /></span>
            <p className="mt-4 text-xs font-extrabold uppercase tracking-wider text-slate-400">Quà tặng nhận tại quầy</p>
            <h4 className="mt-1 font-black text-slate-950">{reward.name}</h4>
            <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">{reward.description}</p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <b className="text-lg text-rose-600">{number(reward.pointCost)} điểm</b>
              <span className="text-xs text-slate-400">Hạn {reward.validityDays} ngày</span>
            </div>
            <button type="button" disabled={!reward.redeemable} onClick={() => setSelectedReward(reward)} className="mt-4 rounded-xl bg-slate-950 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">
              {reward.redeemable ? "Đổi ngay" : reward.unavailableReason || "Không thể đổi"}
            </button>
          </article>)}
        </div>}
    </section>

    <section className="rounded-2xl border bg-white p-6 shadow-sm"><h3 className="flex items-center gap-2 text-lg font-black"><Gift className="text-rose-600" /> Quyền lợi của bạn</h3>
      {available.length === 0 ? <p className="mt-4 text-sm text-slate-500">Chưa có quyền lợi khả dụng.</p> : <div className="mt-4 grid gap-3 sm:grid-cols-2">{available.map(item => <div key={item.benefitId} className="rounded-xl bg-emerald-50 p-4 text-emerald-800"><div className="flex items-center gap-2 font-extrabold"><Star size={18} />01 vé {membershipFreeTicketLabel(item.freeTicketType)} miễn phí</div><p className="mt-1 text-xs">Hạn dùng: {date(item.expiresAt)}</p></div>)}</div>}
      {benefitHistory.length > 0 && <div className="mt-5 border-t pt-4"><h4 className="text-sm font-black text-slate-700">Lịch sử sử dụng quyền lợi</h4><div className="mt-2 divide-y">{benefitHistory.slice(0, 10).map(item => <div key={item.benefitId} className="flex items-center justify-between gap-3 py-3 text-sm"><div><b>01 vé {membershipFreeTicketLabel(item.freeTicketType)} miễn phí</b><p className="mt-1 text-xs text-slate-500">{item.bookingId ? `Booking #${item.bookingId}` : `Hạn ${date(item.expiresAt)}`}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.status === "USED" ? "bg-slate-100 text-slate-600" : item.status === "HELD" ? "bg-amber-100 text-amber-700" : "bg-rose-50 text-rose-600"}`}>{item.status === "USED" ? "Đã dùng" : item.status === "HELD" ? "Đang giữ" : item.status === "EXPIRED" ? "Hết hạn" : "Đã thu hồi"}</span></div>)}</div></div>}
    </section>

    <div className="grid gap-6 xl:grid-cols-2">
      <History title="Lịch sử điểm" icon={<Sparkles size={20} />} empty="Chưa có giao dịch điểm.">{points.slice(0, 8).map(item => <Row key={item.transactionId} title={item.description} meta={date(item.createdAt)} value={`${item.points > 0 ? "+" : ""}${number(item.points)}`} positive={item.points >= 0} />)}</History>
      <History title="Lịch sử hạng" icon={<Crown size={20} />} empty="Chưa có thay đổi hạng.">{tierHistory.slice(0, 8).map(item => <Row key={item.historyId} title={`${item.fromTier || "Bắt đầu"} → ${item.toTier}`} meta={`${date(item.createdAt)} · ${number(item.annualSpend)} đ`} />)}</History>
    </div>

    {selectedReward && <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b p-5">
          <div className="flex gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600"><AlertTriangle size={23} /></span><div><h3 className="text-lg font-black">Xác nhận đổi thưởng</h3><p className="mt-1 text-sm text-slate-500">Vui lòng kiểm tra trước khi xác nhận.</p></div></div>
          <button type="button" onClick={() => !redeeming && setSelectedReward(null)} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>
        <div className="p-5">
          <div className="rounded-xl bg-slate-50 p-4"><b>{selectedReward.name}</b><div className="mt-3 flex justify-between text-sm"><span>Điểm sử dụng</span><b className="text-rose-600">-{number(selectedReward.pointCost)} điểm</b></div><div className="mt-2 flex justify-between text-sm"><span>Điểm còn lại</span><b>{number(mine.loyaltyPoints - selectedReward.pointCost)} điểm</b></div></div>
          <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-800"><b>Lưu ý:</b> Sau khi đổi thành công, giao dịch không thể hủy và điểm không được hoàn lại.</p>
        </div>
        <div className="flex justify-end gap-3 border-t bg-slate-50 p-4"><button type="button" disabled={redeeming} onClick={() => setSelectedReward(null)} className="rounded-xl border bg-white px-4 py-2.5 font-bold text-slate-700 disabled:opacity-50">Để sau</button><button type="button" disabled={redeeming} onClick={() => void redeem()} className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 font-extrabold text-white disabled:opacity-60">{redeeming && <Loader2 size={17} className="animate-spin" />} Xác nhận đổi</button></div>
      </div>
    </div>}
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-white/10 p-4"><p className="text-xs text-white/65">{label}</p><b className="mt-1 block text-lg">{value}</b></div>; }
function History({ title, icon, empty, children }: { title: string; icon: ReactNode; empty: string; children: ReactNode }) { const has = Array.isArray(children) ? children.length > 0 : Boolean(children); return <section className="rounded-2xl border bg-white p-6 shadow-sm"><h3 className="flex items-center gap-2 text-lg font-black text-slate-900">{icon}{title}</h3><div className="mt-3 divide-y">{has ? children : <p className="py-4 text-sm text-slate-500">{empty}</p>}</div></section>; }
function Row({ title, meta, value, positive }: { title: string; meta: string; value?: string; positive?: boolean }) { return <div className="flex items-center justify-between gap-3 py-3"><div><b className="text-sm">{title}</b><p className="mt-1 text-xs text-slate-500">{meta}</p></div>{value && <b className={positive ? "text-emerald-600" : "text-rose-600"}>{value}</b>}</div>; }
