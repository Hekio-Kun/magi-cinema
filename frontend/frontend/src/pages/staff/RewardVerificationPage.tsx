import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Gift, Loader2, XCircle } from "lucide-react";
import { membershipApi } from "@/api/membershipApi";
import type { MembershipRewardRedemption } from "@/api/membershipApi";
import { getApiErrorMessage } from "@/api/errors";

const date = (value?: string) => value ? new Date(value).toLocaleDateString("vi-VN") : "—";

export default function RewardVerificationPage() {
  const { code = "" } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [reward, setReward] = useState<MembershipRewardRedemption | null>(null);

  const claimReward = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await membershipApi.claimGiftAtCounter(code);
      setReward(data);
      setSuccess(true);
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, "Mã quà tặng không hợp lệ, đã hết hạn hoặc đã được sử dụng."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 pb-6 pt-24 sm:px-6 sm:pb-8 sm:pt-28">
      <article className="mx-auto w-full max-w-[32rem] overflow-hidden rounded-3xl border border-white/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
        <header className={`px-6 py-5 text-white sm:px-7 ${success ? "bg-emerald-600" : error ? "bg-rose-600" : "bg-blue-600"}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-white/80">
                <Gift size={16} /> CinePrime Rewards
              </p>
              <h1 className="mt-2 text-2xl font-black">
                {success ? "Đổi quà thành công" : error ? "Lỗi đổi quà" : "Xác nhận đổi quà"}
              </h1>
              {success && <p className="mt-1 text-sm text-white/85">Khách hàng đã nhận quà thành công.</p>}
            </div>
            {success ? <CheckCircle2 size={38} /> : error ? <XCircle size={38} /> : <Gift size={38} />}
          </div>
        </header>

        <div className="p-5 sm:p-7 text-center">
          {!success && !error ? (
            <div className="py-6">
              <h2 className="text-xl font-bold text-slate-800 mb-2">Mã quà tặng: {code}</h2>
              <p className="text-sm text-slate-500 mb-8">Nhấn nút bên dưới để xác nhận đổi quà cho khách hàng.</p>
              
              <button 
                onClick={claimReward} 
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 px-5 py-4 font-bold text-white shadow-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                Xác nhận đã giao quà
              </button>
            </div>
          ) : success && reward ? (
            <div className="py-2 text-left">
              <div className="rounded-xl bg-emerald-50 p-5 border border-emerald-100">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">Chi tiết phần quà</div>
                <h3 className="text-2xl font-black text-slate-900 mb-4">{reward.rewardName}</h3>
                
                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex justify-between">
                    <span>Mã quà tặng:</span>
                    <span className="font-mono font-bold text-slate-900">{reward.redemptionCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Trạng thái:</span>
                    <span className="font-bold text-emerald-600">Đã nhận</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Điểm đã trừ:</span>
                    <span className="font-bold">{reward.pointsSpent} điểm</span>
                  </div>
                  <div className="flex justify-between border-t border-emerald-200/60 pt-2 mt-2">
                    <span>Thời gian nhận:</span>
                    <span className="font-bold">{date(reward.usedAt || new Date().toISOString())}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-4">
              <p className="text-rose-600 font-medium">{error}</p>
            </div>
          )}

          <div className="mt-6 border-t border-slate-100 pt-5">
            <Link to="/" className="text-sm font-bold text-slate-500 hover:text-slate-900">Về trang chủ</Link>
          </div>
        </div>
      </article>
    </main>
  );
}
