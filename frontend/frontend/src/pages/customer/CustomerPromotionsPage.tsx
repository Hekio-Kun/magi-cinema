import { useState, useEffect } from "react";
import { promotionApi, PromotionCatalogResponse } from "@/api/promotionApi";
import { TicketPercent, Calendar, Scissors, Copy, CheckCircle2, ChevronRight, Tag } from "lucide-react";

export function CustomerPromotionsPage() {
  const [promotions, setPromotions] = useState<PromotionCatalogResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        setLoading(true);
        const data = await promotionApi.getPromotionCatalog();
        setPromotions(data);
      } catch (error) {
        console.error("Lỗi khi tải khuyến mãi:", error);
      } finally {
        setLoading(false);
      }
    };
    void fetchPromotions();
  }, []);

  const copyToClipboard = async (code: string, id: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Không thể copy: ", err);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Không thời hạn";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
  };

  return (
    <div className="min-h-screen" style={{ background: "#f8fafc", padding: "120px 24px 80px" }}>
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12 animate-fadeIn">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 text-white mb-6 shadow-lg shadow-rose-200">
            <TicketPercent size={32} />
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
            Kho Ưu Đãi Khổng Lồ
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Khám phá hàng loạt mã giảm giá, voucher quà tặng đặc quyền và những chương trình khuyến mãi bùng nổ chỉ có tại Magi Cinema.
          </p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin"></div>
          </div>
        ) : promotions.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <Tag size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Chưa có khuyến mãi nào!</h3>
            <p className="text-gray-500">Hãy quay lại sau để cập nhật những ưu đãi hấp dẫn nhất nhé.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {promotions.map((promo, index) => (
              <div 
                key={promo.promotionId} 
                className="relative bg-white rounded-3xl overflow-hidden flex flex-col sm:flex-row shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group animate-slideUp"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Dotted border line for coupon effect */}
                <div className="hidden sm:block absolute left-1/3 top-0 bottom-0 w-[2px] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMiIgaGVpZ2h0PSI4IiB2aWV3Qm94PSIwIDAgMiA4IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0xIDBMMSA0IiBzdHJva2U9IiNFMUU4RTIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtZGFzaGFycmF5PSI0IDQiLz48L3N2Zz4=')] opacity-50 z-10"></div>
                
                {/* Coupon notches */}
                <div className="hidden sm:block absolute -top-3 left-1/3 w-6 h-6 rounded-full bg-[#f8fafc] -translate-x-1/2 z-10 shadow-inner"></div>
                <div className="hidden sm:block absolute -bottom-3 left-1/3 w-6 h-6 rounded-full bg-[#f8fafc] -translate-x-1/2 z-10 shadow-inner"></div>

                {/* Left side: Value & Code */}
                <div className="sm:w-1/3 bg-gradient-to-br from-rose-50 to-orange-50 p-6 flex flex-col justify-center items-center text-center relative border-b sm:border-b-0 sm:border-r border-dashed border-rose-200">
                  <Scissors size={20} className="absolute top-2 right-2 text-rose-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <span className="text-sm font-bold text-rose-600 tracking-wider uppercase mb-1">
                    {promo.type === 'MEMBER_TIER' ? 'Thành viên' : 
                     promo.type === 'E_WALLET' ? 'Ví điện tử' : 
                     promo.type === 'BIRTHDAY' ? 'Sinh nhật' : 'Khuyến mãi'}
                  </span>
                  
                  <h3 className="text-3xl font-black text-gray-900 mb-4">
                    {promo.discountType === 'PERCENTAGE' 
                      ? `${promo.discountValue}%` 
                      : `${(promo.discountValue / 1000)}k`}
                  </h3>
                  
                  <button
                    onClick={() => copyToClipboard(promo.code, promo.promotionId)}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 ${
                      copiedId === promo.promotionId 
                        ? 'bg-green-500 text-white shadow-md shadow-green-200' 
                        : 'bg-white text-gray-800 border-2 border-gray-900 hover:bg-gray-900 hover:text-white'
                    }`}
                  >
                    {copiedId === promo.promotionId ? (
                      <>
                        <CheckCircle2 size={16} /> Đã chép
                      </>
                    ) : (
                      <>
                        <Copy size={16} /> {promo.code}
                      </>
                    )}
                  </button>
                </div>

                {/* Right side: Details */}
                <div className="sm:w-2/3 p-6 flex flex-col justify-between bg-white relative">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2 leading-tight">
                      {promo.name}
                    </h2>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-4 leading-relaxed">
                      {promo.description}
                    </p>
                    
                    <div className="space-y-2">
                      {promo.minOrderAmount && promo.minOrderAmount > 0 && (
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg w-fit">
                          <span className="text-gray-400">•</span>
                          Áp dụng cho đơn từ <strong className="text-gray-900">{formatCurrency(promo.minOrderAmount)}</strong>
                        </div>
                      )}
                      {promo.maxDiscountAmount && promo.maxDiscountAmount > 0 && promo.discountType === 'PERCENTAGE' && (
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg w-fit">
                          <span className="text-gray-400">•</span>
                          Giảm tối đa <strong className="text-gray-900">{formatCurrency(promo.maxDiscountAmount)}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-medium">
                    {new Date(promo.startAt) > new Date() ? (
                      <>
                        <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
                          <Calendar size={14} />
                          Từ: {formatDate(promo.startAt)}
                        </div>
                        <span className="flex items-center gap-1 text-gray-400 cursor-not-allowed">
                          Sắp mở <ChevronRight size={14} />
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5 text-orange-600 bg-orange-50 px-3 py-1.5 rounded-full">
                          <Calendar size={14} />
                          HSD: {formatDate(promo.endAt)}
                        </div>
                        <a href="/movies/now-showing" className="flex items-center gap-1 text-rose-600 hover:text-rose-700 hover:underline">
                          Dùng ngay <ChevronRight size={14} />
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
