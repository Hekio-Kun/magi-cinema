import { useEffect, useMemo, useState } from "react";
import { BadgeDollarSign, CheckCircle2, Clapperboard, Loader2, Save, Sparkles } from "lucide-react";
import { toast } from "react-toastify";

import { getApiErrorMessage } from "@/api/errors";
import {
  ticketPricingApi,
  type TicketPriceConfig,
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
};

type PriceField = keyof TicketPriceConfigRequest;

type PriceOption = {
  key: PriceField;
  title: string;
  description: string;
  badge: string;
  accent: string;
  min: number;
};

const BASE_PRICE_OPTIONS: PriceOption[] = [
  {
    key: "standard2dPrice",
    title: "Standard · 2D",
    description: "Mức giá cơ bản cho phim 2D tại phòng Standard.",
    badge: "Phổ biến",
    accent: "border-blue-200 bg-blue-50 text-blue-700",
    min: 1_000,
  },
  {
    key: "standard3dPrice",
    title: "Standard · 3D",
    description: "Áp dụng cho phim 3D được chiếu tại phòng Standard.",
    badge: "3D",
    accent: "border-violet-200 bg-violet-50 text-violet-700",
    min: 1_000,
  },
  {
    key: "imax3dPrice",
    title: "IMAX · 3D",
    description: "Mức giá cơ bản cho tất cả phiên bản IMAX đang hoạt động.",
    badge: "IMAX",
    accent: "border-amber-200 bg-amber-50 text-amber-700",
    min: 1_000,
  },
  {
    key: "fourDx3dPrice",
    title: "4DX · 3D",
    description: "Mức giá cơ bản cho tất cả phiên bản 4DX đang hoạt động.",
    badge: "4DX",
    accent: "border-emerald-200 bg-emerald-50 text-emerald-700",
    min: 1_000,
  },
];

const ADVANCED_PRICE_OPTIONS: PriceOption[] = [
  {
    key: "vipSeatSurcharge",
    title: "Phụ thu ghế VIP",
    description: "Cộng thêm vào giá nền khi khách chọn một ghế VIP.",
    badge: "Loại ghế",
    accent: "border-rose-200 bg-rose-50 text-rose-700",
    min: 0,
  },
  {
    key: "coupleSeatSurcharge",
    title: "Phụ thu ghế đôi",
    description: "Cộng thêm vào giá nền cho mỗi ghế thuộc khu vực ghế đôi.",
    badge: "Ghế đôi",
    accent: "border-pink-200 bg-pink-50 text-pink-700",
    min: 0,
  },
  {
    key: "disabledSeatSurcharge",
    title: "Phụ thu ghế hỗ trợ",
    description: "Mặc định bằng 0đ; chỉ thay đổi khi rạp có chính sách riêng cho loại ghế này.",
    badge: "Hỗ trợ",
    accent: "border-cyan-200 bg-cyan-50 text-cyan-700",
    min: 0,
  },
  {
    key: "u22BasePrice",
    title: "Giá nền U22",
    description: "Giá ưu đãi tối đa cho khách U22, sau đó cộng phụ thu loại ghế nếu có.",
    badge: "Ưu đãi",
    accent: "border-teal-200 bg-teal-50 text-teal-700",
    min: 1_000,
  },
];

const PRICE_OPTIONS = [...BASE_PRICE_OPTIONS, ...ADVANCED_PRICE_OPTIONS];

const formatCurrency = (value: number) => new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
}).format(value || 0);

export function TicketPricingManagementPage() {
  const [form, setForm] = useState<TicketPriceConfigRequest>(DEFAULT_CONFIG);
  const [savedConfig, setSavedConfig] = useState<TicketPriceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const hasChanges = useMemo(() => {
    if (!savedConfig) return false;
    return PRICE_OPTIONS.some(({ key }) => form[key] !== savedConfig[key]);
  }, [form, savedConfig]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const config = await ticketPricingApi.getConfig();
        if (!active) return;
        setSavedConfig(config);
        setForm(config);
      } catch (requestError) {
        if (active) setError(getApiErrorMessage(requestError, "Không thể tải cấu hình giá vé."));
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const updatePrice = (key: PriceField, value: number) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  };

  const validate = () => {
    const invalid = PRICE_OPTIONS.find(({ key, min }) => !Number.isInteger(form[key])
      || form[key] < min
      || form[key] > 10_000_000);
    if (!invalid) return true;
    setError(`${invalid.title}: giá trị phải từ ${formatCurrency(invalid.min)} đến 10.000.000đ.`);
    return false;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    setError("");
    try {
      const config = await ticketPricingApi.updateConfig(form);
      setSavedConfig(config);
      setForm(config);
      toast.success("Đã lưu cấu hình giá vé.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Không thể lưu cấu hình giá vé."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="overflow-hidden rounded-2xl bg-slate-900 px-6 py-5 text-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-slate-950">
                <BadgeDollarSign size={25} />
              </div>
              <div>
                <h1 className="text-xl font-black">Cấu hình giá vé</h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300">
                  Quản lý giá nền theo định dạng, phụ thu từng loại ghế và giá ưu đãi U22 tại một nơi. Hệ thống tự áp dụng khi tạo lịch và khi khách đặt vé.
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-right">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Phạm vi áp dụng</div>
              <div className="mt-1 text-sm font-extrabold">Lịch tự động tạo mới</div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">
          <div className="flex items-start gap-3">
            <Sparkles size={17} className="mt-1 shrink-0" />
            <p>
              Giá cuối cùng = <strong>giá nền của suất chiếu + phụ thu loại ghế</strong>. Với vé U22, hệ thống dùng mức thấp hơn giữa giá nền của suất và giá U22, sau đó mới cộng phụ thu ghế. Thay đổi giá nền không sửa các suất đã tạo trước đó.
            </p>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500">
            <Loader2 className="mr-2 animate-spin" size={18} /> Đang tải bảng giá...
          </div>
        ) : (
          <div className="space-y-5">
            {[
              {
                title: "Giá nền theo định dạng chiếu",
                description: "Là giá khởi điểm của suất chiếu trước khi cộng phụ thu loại ghế hoặc áp dụng U22.",
                options: BASE_PRICE_OPTIONS,
              },
              {
                title: "Phụ thu ghế và giá ưu đãi",
                description: "Các giá trị này được áp dụng trực tiếp khi khách chọn ghế và xác nhận đặt vé.",
                options: ADVANCED_PRICE_OPTIONS,
              },
            ].map((group) => (
              <section key={group.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                  <h2 className="text-base font-black text-slate-900">{group.title}</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{group.description}</p>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {group.options.map((option) => (
                    <article key={option.key} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <Clapperboard size={16} className="text-slate-500" />
                            <h3 className="text-sm font-black text-slate-900">{option.title}</h3>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-slate-500">{option.description}</p>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${option.accent}`}>
                          {option.badge}
                        </span>
                      </div>

                      <label className="mt-4 block">
                        <span className="mb-1.5 block text-xs font-bold text-slate-600">
                          {option.key.endsWith("Surcharge") ? "Mức phụ thu" : "Mức giá áp dụng"}
                        </span>
                        <div className="relative">
                          <input
                            type="number"
                            min={option.min}
                            max={10_000_000}
                            step={1_000}
                            value={form[option.key]}
                            onChange={(event) => updatePrice(option.key, Number(event.target.value))}
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-14 text-lg font-black text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">đ</span>
                        </div>
                        <span className="mt-2 block text-xs font-semibold text-emerald-700">{formatCurrency(form[option.key])}</span>
                      </label>
                    </article>
                  ))}
                </div>
              </section>
            ))}

            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="text-base font-black text-amber-950">Ví dụ giá Standard 2D hiện tại</h2>
              <p className="mt-1 text-xs text-amber-800">Giúp kiểm tra nhanh kết quả trước khi lưu cấu hình.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Ghế thường", form.standard2dPrice],
                  ["Ghế VIP", form.standard2dPrice + form.vipSeatSurcharge],
                  ["Ghế đôi", form.standard2dPrice + form.coupleSeatSurcharge],
                  ["U22 · ghế VIP", Math.min(form.standard2dPrice, form.u22BasePrice) + form.vipSeatSurcharge],
                ].map(([label, price]) => (
                  <div key={String(label)} className="rounded-xl border border-amber-200 bg-white px-4 py-3">
                    <div className="text-[11px] font-bold text-slate-500">{label}</div>
                    <div className="mt-1 text-base font-black text-slate-900">{formatCurrency(Number(price))}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={19} className={hasChanges ? "text-amber-500" : "text-emerald-500"} />
            <div>
              <div className="text-sm font-extrabold text-slate-800">
                {hasChanges ? "Bạn có thay đổi chưa lưu" : "Bảng giá đã được đồng bộ"}
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                {savedConfig?.updatedAt
                  ? `Cập nhật gần nhất: ${new Date(savedConfig.updatedAt).toLocaleString("vi-VN")}`
                  : "Hệ thống đang dùng bảng giá mặc định."}
              </div>
            </div>
          </div>
          <button
            type="button"
            disabled={loading || saving || !hasChanges}
            onClick={() => void save()}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-black text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Đang lưu..." : "Lưu bảng giá"}
          </button>
        </section>
      </div>
    </main>
  );
}
