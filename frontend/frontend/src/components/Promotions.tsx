import { useEffect, useState } from "react";
import { Check, Copy, Gift, Tag, WalletCards } from "lucide-react";
import { promotionApi, type PromotionCatalogResponse } from "@/api/promotionApi";

const money = (value?: number) => `${Number(value || 0).toLocaleString("vi-VN")} ₫`;

const typeLabel: Record<PromotionCatalogResponse["type"], string> = {
  MEMBER_TIER: "Dành cho hạng thành viên",
  BIRTHDAY: "Ưu đãi sinh nhật",
  LEAP_DAY_BIRTHDAY: "Ưu đãi sinh nhật 29/02",
  E_WALLET: "Ưu đãi ví điện tử",
};

const promotionTypeLabel = (promotion: PromotionCatalogResponse) => {
  if (promotion.type === "MEMBER_TIER" && promotion.eligibleMemberTiers?.length) {
    return `Dành cho ${promotion.eligibleMemberTiers.join(", ")}`;
  }
  return typeLabel[promotion.type];
};

const iconFor = (type: PromotionCatalogResponse["type"]) => {
  if (type === "E_WALLET") return WalletCards;
  if (type === "BIRTHDAY" || type === "LEAP_DAY_BIRTHDAY") return Gift;
  return Tag;
};

const discountLabel = (promotion: PromotionCatalogResponse) => {
  if (promotion.discountType === "FIXED_AMOUNT") {
    return `Giảm ${money(promotion.discountValue)}`;
  }
  const maximum = promotion.maxDiscountAmount
    ? `, tối đa ${money(promotion.maxDiscountAmount)}`
    : "";
  return `Giảm ${promotion.discountValue}%${maximum}`;
};

export function Promotions() {
  const [promotions, setPromotions] = useState<PromotionCatalogResponse[]>([]);
  const [copiedCode, setCopiedCode] = useState("");

  useEffect(() => {
    let cancelled = false;
    promotionApi.getPromotionCatalog()
      .then((data) => {
        if (!cancelled) setPromotions(data);
      })
      .catch(() => {
        if (!cancelled) setPromotions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (promotions.length === 0) return null;

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    window.setTimeout(() => setCopiedCode(""), 1800);
  };

  return (
    <section id="promotions" className="bg-[#EFF2F5] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 text-center">
          <p className="text-xs font-black uppercase tracking-[.18em] text-slate-500">Ưu đãi đang hoạt động</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Khuyến mãi & ưu đãi</h2>
          <p className="mt-2 text-slate-500">Điều kiện được kiểm tra lại khi đặt vé và trước thanh toán.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {promotions.map((promotion) => {
            const Icon = iconFor(promotion.type);
            const copied = copiedCode === promotion.code;
            return (
              <article key={promotion.code} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <Icon size={19} />
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                    {promotionTypeLabel(promotion)}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-black text-slate-900">{promotion.name}</h3>
                <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">{promotion.description || discountLabel(promotion)}</p>
                <div className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
                  {discountLabel(promotion)}
                </div>
                {promotion.minOrderAmount ? (
                  <p className="mt-2 text-xs text-slate-500">Đơn tối thiểu {money(promotion.minOrderAmount)}</p>
                ) : null}
                <div className="mt-5 flex items-center gap-2">
                  <code className="flex-1 rounded-xl border border-dashed bg-slate-50 px-3 py-2.5 text-center font-black tracking-wider text-slate-700">
                    {promotion.code}
                  </code>
                  <button
                    type="button"
                    onClick={() => void copyCode(promotion.code)}
                    className="inline-flex h-11 items-center gap-1.5 rounded-xl border px-3 text-sm font-bold text-slate-600"
                  >
                    {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                    {copied ? "Đã sao chép" : "Sao chép"}
                  </button>
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  Hết hạn {new Date(promotion.endAt).toLocaleString("vi-VN")}
                  {promotion.walletPaymentMethod ? ` · ${promotion.walletPaymentMethod}` : ""}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
