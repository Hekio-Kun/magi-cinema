import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Gift, Loader2, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "@/api/errors";
import { membershipApi, type MembershipRewardRedemption } from "@/api/membershipApi";

const number = (value?: number) => new Intl.NumberFormat("vi-VN").format(value || 0);
const date = (value?: string) => value ? new Date(value).toLocaleDateString("vi-VN") : "—";

export function MembershipGifts() {
  const [items, setItems] = useState<MembershipRewardRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setItems(await membershipApi.getMyRewards());
      } catch (error) {
        toast.error(getApiErrorMessage(error, "Không thể tải danh sách quà đã đổi."));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const available = useMemo(() => items.filter(item => item.status === "AVAILABLE"), [items]);
  const history = useMemo(() => items.filter(item => item.status !== "AVAILABLE"), [items]);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success("Đã sao chép mã nhận quà.");
      window.setTimeout(() => setCopiedCode(current => current === code ? "" : current), 1800);
    } catch {
      toast.error("Không thể sao chép tự động. Bạn có thể đọc mã cho nhân viên.");
    }
  };

  if (loading) {
    return <div className="grid min-h-64 place-items-center rounded-2xl border bg-white"><Loader2 className="animate-spin text-rose-600" /></div>;
  }

  return <div className="space-y-6">
    <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-rose-600 to-orange-500 p-6 text-white shadow-lg">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/15"><QrCode size={27} /></span>
        <div><h2 className="text-2xl font-black">Quà tặng đã đổi</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-white/80">Đưa mã QR cho nhân viên tại quầy. Nếu không quét được, nhân viên có thể nhập mã chữ bên dưới.</p></div>
      </div>
      <div className="mt-5 inline-flex rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">{available.length} quà đang chờ nhận</div>
    </section>

    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <h3 className="flex items-center gap-2 text-lg font-black"><Gift className="text-rose-600" /> Quà đang chờ nhận</h3>
      {available.length === 0 ? <Empty text="Bạn không có quà nào đang chờ nhận tại quầy." /> :
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {available.map(item => <article key={item.redemptionId} className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
            <div className="flex flex-col gap-5 sm:flex-row">
              <div className="mx-auto shrink-0 rounded-2xl border border-emerald-200 bg-white p-3 shadow-sm sm:mx-0">
                <QRCodeSVG value={`${window.location.origin}/rewards/${item.redemptionCode}`} size={132} level="M" marginSize={1} title={`Mã nhận ${item.rewardName}`} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">Chờ nhận tại quầy</span>
                <h4 className="mt-3 text-lg font-black text-slate-950">{item.rewardName}</h4>
                <p className="mt-1 text-sm text-slate-500">Đã dùng {number(item.pointsSpent)} điểm</p>
                <p className="mt-1 text-sm font-bold text-rose-600">Hạn nhận: {date(item.expiresAt)}</p>
                <button type="button" onClick={() => void copyCode(item.redemptionCode)} className="mt-4 flex w-full items-center justify-between gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2.5 text-left font-mono text-xs font-black tracking-wide text-slate-900 sm:text-sm">
                  <span className="whitespace-nowrap">{item.redemptionCode}</span>
                  {copiedCode === item.redemptionCode ? <Check size={17} className="shrink-0 text-emerald-600" /> : <Copy size={17} className="shrink-0 text-slate-400" />}
                </button>
              </div>
            </div>
            {item.terms && <p className="mt-4 border-t border-emerald-200 pt-3 text-xs leading-5 text-slate-500">{item.terms}</p>}
            <p className="mt-3 text-xs font-medium text-amber-700">Mã chỉ dùng một lần. Không chia sẻ QR trước khi đến quầy nhận quà.</p>
          </article>)}
        </div>}
    </section>

    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <h3 className="text-lg font-black">Lịch sử nhận quà</h3>
      {history.length === 0 ? <Empty text="Chưa có quà đã nhận hoặc hết hạn." /> : <div className="mt-4 divide-y">
        {history.map(item => <div key={item.redemptionId} className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div><b>{item.rewardName}</b><p className="mt-1 text-xs text-slate-500">{number(item.pointsSpent)} điểm · Mã {item.redemptionCode}</p></div>
          <div className="text-right"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.status === "USED" ? "bg-slate-100 text-slate-600" : "bg-rose-50 text-rose-600"}`}>{item.status === "USED" ? "Đã nhận quà" : "Đã hết hạn"}</span><p className="mt-2 text-xs text-slate-400">{item.status === "USED" ? date(item.usedAt) : date(item.expiresAt)}</p></div>
        </div>)}
      </div>}
    </section>
  </div>;
}

function Empty({ text }: { text: string }) {
  return <p className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">{text}</p>;
}
