import { useEffect, useMemo, useState } from "react";
import { Banknote, CheckCircle2, ClipboardList, Coffee, Loader2, Minus, Plus, RotateCcw, Search, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { comboApi, type ComboResponse, type FoodItemResponse, type FoodVariantResponse } from "@/api/comboApi";
import { concessionOrderApi, type ConcessionOrderResponse, type ConcessionPaymentMethod } from "@/api/concessionOrderApi";

const money = (value: number) => Number(value || 0).toLocaleString("vi-VN", { style: "currency", currency: "VND" });
const variantName = (food: FoodItemResponse, variant: FoodVariantResponse) => {
  const parts = [food.name];
  if (variant.variantName && variant.variantName.toLowerCase() !== "mặc định") parts.push(variant.variantName);
  if (variant.sizeLabel) parts.push(`Size ${variant.sizeLabel}`);
  if (variant.flavor) parts.push(variant.flavor);
  return parts.join(" - ");
};

type CartLine = {
  key: string;
  name: string;
  price: number;
  maxStock: number;
  comboId?: number;
  foodVariantId?: number;
  quantity: number;
};

export function ConcessionSalesPage() {
  const [combos, setCombos] = useState<ComboResponse[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItemResponse[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<ConcessionPaymentMethod>("CASH");
  const [cashReceived, setCashReceived] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastOrder, setLastOrder] = useState<ConcessionOrderResponse | null>(null);
  const [orders, setOrders] = useState<ConcessionOrderResponse[]>([]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const [comboData, foodData] = await Promise.all([comboApi.getCombos(), comboApi.getFoodItems()]);
      setCombos((comboData || []).filter((combo) => combo.status === "ACTIVE"));
      setFoodItems(foodData || []);
    } catch {
      toast.error("Không thể tải danh mục bắp nước");
    } finally {
      setLoading(false);
    }
  };
  const loadOrders = async () => {
    try {
      const result = await concessionOrderApi.list({ page: 0, size: 8 });
      setOrders(result.content || []);
    } catch {
      // Lịch sử chỉ là phần phụ, không chặn bán hàng.
    }
  };
  useEffect(() => {
    const timer = window.setTimeout(() => { void loadProducts(); void loadOrders(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const visibleCombos = useMemo(() => {
    const q = keyword.trim().toLocaleLowerCase("vi");
    return combos.filter((combo) => !q || `${combo.name} ${combo.description}`.toLocaleLowerCase("vi").includes(q));
  }, [combos, keyword]);
  const visibleFoods = useMemo(() => {
    const q = keyword.trim().toLocaleLowerCase("vi");
    return foodItems.flatMap((food) => (food.variants || []).filter((variant) => variant.isActive && Number(variant.stockQuantity || 0) > 0).map((variant) => ({ food, variant })))
      .filter(({ food, variant }) => !q || `${food.name} ${variant.variantName} ${variant.sizeLabel || ""} ${variant.flavor || ""}`.toLocaleLowerCase("vi").includes(q));
  }, [foodItems, keyword]);
  const cartWithQuantity = cart;
  const total = cartWithQuantity.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const change = paymentMethod === "CASH" ? Math.max(0, cashReceived - total) : 0;

  const addProduct = (line: Omit<CartLine, "quantity">) => {
    setCart((current) => {
      const existing = current.find((item) => item.key === line.key);
      if (existing) {
        if (existing.quantity >= line.maxStock) { toast.warning("Số lượng vượt tồn kho hiện tại"); return current; }
        return current.map((item) => item.key === line.key ? { ...item, quantity: existing.quantity + 1 } : item);
      }
      return [...current, { ...line, quantity: 1 }];
    });
  };
  const updateQuantity = (key: string, delta: number) => setCart((current) => current.flatMap((item) => {
    if (item.key !== key) return [item];
    const next = item.quantity + delta;
    return next <= 0 ? [] : next > item.maxStock ? [item] : [{ ...item, quantity: next }];
  }));

  const submitOrder = async () => {
    if (!cartWithQuantity.length) { toast.warning("Hãy chọn sản phẩm trước khi thanh toán"); return; }
    if (paymentMethod === "CASH" && cashReceived < total) { toast.error("Tiền khách đưa chưa đủ"); return; }
    setSaving(true);
    try {
      const order = await concessionOrderApi.create({
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        paymentMethod,
        cashReceived: paymentMethod === "CASH" ? cashReceived : undefined,
        items: cartWithQuantity.map((line) => ({ comboId: line.comboId, foodVariantId: line.foodVariantId, quantity: line.quantity })),
      });
      setLastOrder(order); setCart([]); setCashReceived(0); setCustomerName(""); setCustomerPhone("");
      toast.success(`Đã thanh toán ${order.orderCode}`); await loadProducts(); await loadOrders();
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || "Không thể tạo đơn bắp nước");
      await loadProducts();
    } finally { setSaving(false); }
  };

  const cancelOrder = async (order: ConcessionOrderResponse) => {
    const reason = window.prompt("Lý do hủy đơn để hoàn tồn kho:", "Khách đổi ý tại quầy");
    if (!reason?.trim()) return;
    try { await concessionOrderApi.cancel(order.orderId, reason.trim()); toast.success("Đã hủy và hoàn tồn kho"); await loadOrders(); await loadProducts(); }
    catch { toast.error("Không thể hủy đơn"); }
  };

  return <div className="flex-1 overflow-auto bg-slate-50 p-6" style={{ fontFamily: "Inter, sans-serif" }}>
    <div className="mx-auto max-w-[1500px]">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-extrabold text-slate-900">Bán bắp nước tại quầy</h1><p className="mt-1 text-sm text-slate-500">Bán riêng không cần tạo đơn vé · tồn kho được trừ ngay khi thanh toán</p></div>
        <button onClick={() => { void loadProducts(); void loadOrders(); }} className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"><RotateCcw size={16} /> Làm mới</button>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_390px]">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3"><Search size={18} className="text-slate-400" /><input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Tìm combo, bắp, nước..." className="w-full bg-transparent text-sm outline-none" /></div>
          {loading ? <div className="flex h-56 items-center justify-center text-slate-500"><Loader2 className="mr-2 animate-spin" size={20} /> Đang tải danh mục...</div> : <>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500"><ShoppingCart size={16} /> Combo đang bán</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visibleCombos.map((combo) => { const stock = Number(combo.availableQuantity ?? 0); return <ProductCard key={`combo-${combo.comboId}`} name={combo.name} description={combo.description || combo.items.map((item) => `${item.quantity} ${item.displayName || item.foodItemName}`).join(", ")} price={combo.price} stock={stock} disabled={!stock} onAdd={() => addProduct({ key: `combo-${combo.comboId}`, comboId: combo.comboId, name: combo.name, price: combo.price, maxStock: stock })} />; })}</div>
            <h2 className="mb-3 mt-7 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500"><Coffee size={16} /> Món lẻ</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visibleFoods.map(({ food, variant }) => { const stock = Number(variant.stockQuantity || 0); return <ProductCard key={`food-${variant.foodVariantId}`} name={variantName(food, variant)} price={variant.price} stock={stock} onAdd={() => addProduct({ key: `food-${variant.foodVariantId}`, foodVariantId: variant.foodVariantId!, name: variantName(food, variant), price: variant.price, maxStock: stock })} />; })}</div>
          </>}
        </section>
        <aside className="flex flex-col gap-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 font-bold text-slate-900"><ShoppingCart size={19} className="text-amber-500" /> Giỏ hàng</h2><span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">{cartWithQuantity.reduce((sum, line) => sum + line.quantity, 0)} món</span></div>
            {!cartWithQuantity.length ? <div className="py-10 text-center text-sm text-slate-400">Chọn combo hoặc món lẻ để bắt đầu</div> : <div className="space-y-3">{cartWithQuantity.map((line) => <div key={line.key} className="flex items-center gap-2 rounded-xl bg-slate-50 p-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{line.name}</p><p className="text-xs text-slate-500">{money(line.price)}</p></div><button onClick={() => updateQuantity(line.key, -1)} className="rounded-lg border bg-white p-1 text-slate-500"><Minus size={14} /></button><b className="w-5 text-center text-sm">{line.quantity}</b><button onClick={() => updateQuantity(line.key, 1)} className="rounded-lg border bg-white p-1 text-slate-500"><Plus size={14} /></button><button onClick={() => setCart((items) => items.filter((item) => item.key !== line.key))} className="ml-1 p-1 text-rose-500"><Trash2 size={15} /></button></div>)}</div>}
            <div className="mt-5 border-t pt-4"><div className="mb-1 flex justify-between text-sm text-slate-500"><span>Tạm tính</span><b className="text-slate-700">{money(total)}</b></div><div className="flex justify-between text-lg font-extrabold text-slate-900"><span>Thanh toán</span><span className="text-amber-600">{money(total)}</span></div></div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 font-bold text-slate-900">Thông tin thanh toán</h2><div className="grid grid-cols-2 gap-2"><button onClick={() => setPaymentMethod("CASH")} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${paymentMethod === "CASH" ? "border-amber-400 bg-amber-50 text-amber-700" : "text-slate-500"}`}><Banknote size={16} className="mx-auto mb-1" /> Tiền mặt</button><button onClick={() => setPaymentMethod("BANK_TRANSFER")} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${paymentMethod === "BANK_TRANSFER" ? "border-amber-400 bg-amber-50 text-amber-700" : "text-slate-500"}`}>QR / Chuyển khoản</button></div><input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Tên khách (không bắt buộc)" className="mt-3 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-amber-400" /><input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Số điện thoại (không bắt buộc)" className="mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-amber-400" />{paymentMethod === "CASH" && <><label className="mt-3 block text-xs font-semibold text-slate-500">Tiền khách đưa</label><input type="number" min={0} value={cashReceived || ""} onChange={(e) => setCashReceived(Number(e.target.value || 0))} placeholder={String(total)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-amber-400" /><p className="mt-2 flex justify-between text-sm"><span className="text-slate-500">Tiền thối</span><b className="text-emerald-600">{money(change)}</b></p></>}<button disabled={saving || !cartWithQuantity.length} onClick={() => void submitOrder()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 font-bold text-white shadow-sm hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50">{saving ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />} Thanh toán & xuất đơn</button></section>
          {lastOrder && <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><p className="flex items-center gap-2 font-bold text-emerald-800"><CheckCircle2 size={18} /> Đơn vừa thanh toán</p><p className="mt-2 text-2xl font-extrabold text-emerald-900">{lastOrder.orderCode}</p><p className="mt-1 text-sm text-emerald-700">Tổng {money(lastOrder.totalAmount)} · Thối {money(lastOrder.changeAmount)}</p></section>}
        </aside>
      </div>
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 flex items-center gap-2 font-bold text-slate-900"><ClipboardList size={19} className="text-slate-500" /> Giao dịch gần đây</h2><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr className="border-b text-xs uppercase tracking-wide text-slate-400"><th className="pb-3">Mã đơn</th><th className="pb-3">Thời gian</th><th className="pb-3">Sản phẩm</th><th className="pb-3">Thanh toán</th><th className="pb-3 text-right">Tổng</th><th className="pb-3 text-right">Trạng thái</th><th /></tr></thead><tbody>{orders.map((order) => <tr key={order.orderId} className="border-b last:border-0"><td className="py-3 font-bold text-slate-800">{order.orderCode}</td><td className="py-3 text-slate-500">{order.createdAt ? new Date(order.createdAt).toLocaleString("vi-VN") : "—"}</td><td className="max-w-[270px] truncate py-3 text-slate-600">{order.items.map((item) => `${item.quantity}× ${item.name}`).join(", ")}</td><td className="py-3 text-slate-500">{order.paymentMethod === "CASH" ? "Tiền mặt" : "Chuyển khoản"}</td><td className="py-3 text-right font-bold">{money(order.totalAmount)}</td><td className="py-3 text-right"><span className={`rounded-full px-2 py-1 text-xs font-bold ${order.status === "PAID" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{order.status === "PAID" ? "Đã thu tiền" : "Đã hủy"}</span></td><td className="py-3 text-right">{order.status === "PAID" && <button title="Hủy và hoàn kho" onClick={() => void cancelOrder(order)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><RotateCcw size={16} /></button>}</td></tr>)}</tbody></table>{!orders.length && <p className="py-8 text-center text-sm text-slate-400">Chưa có giao dịch bắp nước</p>}</div></section>
    </div>
  </div>;
}

function ProductCard({ name, description, price, stock, disabled, onAdd }: { name: string; description?: string; price: number; stock: number; disabled?: boolean; onAdd: () => void }) {
  return <article className="flex flex-col rounded-2xl border border-slate-200 p-3 transition hover:border-amber-300 hover:shadow-sm"><div className="flex-1"><div className="mb-2 flex h-14 w-14 items-center justify-center rounded-xl bg-amber-50 text-2xl">🍿</div><h3 className="line-clamp-1 text-sm font-bold text-slate-800">{name}</h3>{description && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{description}</p>}</div><div className="mt-3 flex items-end justify-between gap-2"><div><p className="font-extrabold text-amber-600">{money(price)}</p><p className={`text-[11px] ${stock > 0 ? "text-slate-400" : "text-rose-500"}`}>{stock > 0 ? `Còn ${stock}` : "Hết hàng"}</p></div><button disabled={disabled} onClick={onAdd} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-40">Thêm</button></div></article>;
}
