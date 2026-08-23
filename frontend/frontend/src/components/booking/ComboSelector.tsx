import { Minus, Plus, RefreshCw, ShoppingBag } from 'lucide-react';
import { ComboResponse, FoodItemResponse, FoodVariantResponse } from '@/api/comboApi';

interface ComboSelectorProps {
  combos: ComboResponse[];
  foodItems?: FoodItemResponse[];
  selectedCombos: { comboId: number; quantity: number }[];
  selectedFoodItems?: { foodVariantId: number; quantity: number }[];
  onUpdateCombo: (comboId: number, delta: number) => void;
  onUpdateFoodItem?: (foodVariantId: number, delta: number) => void;
  getComboMaxQuantity?: (comboId: number) => number;
  getFoodItemMaxQuantity?: (foodVariantId: number) => number;
  onRefresh?: () => void;
  refreshing?: boolean;
}

const getVariantName = (food: FoodItemResponse, variant: FoodVariantResponse) => {
  if (variant.displayName) return variant.displayName;
  const parts = [food.name];
  if (variant.variantName && variant.variantName.trim().toLowerCase() !== 'mặc định') parts.push(variant.variantName.trim());
  if (variant.sizeLabel?.trim()) parts.push(`Size ${variant.sizeLabel.trim()}`);
  if (variant.flavor?.trim()) parts.push(variant.flavor.trim());
  return parts.join(' - ');
};

export function ComboSelector({
  combos,
  foodItems = [],
  selectedCombos,
  selectedFoodItems = [],
  onUpdateCombo,
  onUpdateFoodItem,
  getComboMaxQuantity,
  getFoodItemMaxQuantity,
  onRefresh,
  refreshing = false,
}: ComboSelectorProps) {
  const getComboQuantity = (comboId: number) =>
    selectedCombos.find((combo) => combo.comboId === comboId)?.quantity || 0;
  const getFoodQuantity = (foodVariantId: number) =>
    selectedFoodItems.find((item) => item.foodVariantId === foodVariantId)?.quantity || 0;

  const foodVariantOptions = foodItems.flatMap((food) =>
    (food.variants || [])
      .filter((variant) => variant.isActive && variant.foodVariantId)
      .map((variant) => ({
        food,
        variant,
        foodVariantId: Number(variant.foodVariantId),
        name: getVariantName(food, variant),
        price: Number(variant.price || 0),
        stockQuantity: Number(variant.stockQuantity || 0),
      }))
  );

  if (combos.length === 0 && foodVariantOptions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
        <ShoppingBag size={34} className="mx-auto text-slate-400" />
        <div className="mt-3 text-base font-bold text-slate-800">Chưa có bắp nước mở bán</div>
        <div className="mt-1 text-sm text-slate-500">Bạn vẫn có thể tiếp tục thanh toán vé.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
            <ShoppingBag size={20} className="text-rose-600" /> Bắp nước
          </h2>
          <p className="mt-1 text-sm text-slate-500">Chọn thêm combo hoặc món lẻ nếu bạn muốn dùng kèm khi xem phim.</p>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            Làm mới
          </button>
        )}
      </div>

      {combos.length > 0 && (
        <div className="grid gap-3">
          {combos.map((combo) => {
          const quantity = getComboQuantity(combo.comboId);
          const availableQuantity = Math.max(0, getComboMaxQuantity?.(combo.comboId) ?? Number(combo.availableQuantity ?? 0));
          const reachedLimit = quantity >= availableQuantity;

          return (
            <article
              key={combo.comboId}
              className={`grid gap-4 rounded-lg border p-3 transition sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center ${
                quantity > 0 ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <img
                src={combo.imageUrl || 'https://placehold.co/160x120?text=Combo'}
                alt={combo.name}
                className="h-24 w-full rounded-md object-cover sm:w-24"
              />

              <div className="min-w-0">
                <h3 className="text-base font-extrabold text-slate-950">{combo.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">{combo.description || 'Combo bắp nước'}</p>
                {combo.items && combo.items.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {combo.items.slice(0, 3).map((item) => (
                      <span
                        key={item.comboItemId}
                        className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600"
                      >
                        {item.quantity}x {item.displayName || item.foodItemName}
                      </span>
                    ))}
                    {combo.items.length > 3 && (
                      <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">
                        +{combo.items.length - 3}
                      </span>
                    )}
                  </div>
                )}
                <div className="mt-2 text-sm font-bold text-rose-700">
                  {combo.price.toLocaleString('vi-VN')} VND
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <button
                  type="button"
                  onClick={() => onUpdateCombo(combo.comboId, -1)}
                  disabled={quantity === 0}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Giảm ${combo.name}`}
                >
                  <Minus size={16} />
                </button>
                <div className="w-8 text-center text-lg font-extrabold text-slate-950">{quantity}</div>
                <button
                  type="button"
                  onClick={() => onUpdateCombo(combo.comboId, 1)}
                  disabled={reachedLimit}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Tăng ${combo.name}`}
                >
                  <Plus size={16} />
                </button>
              </div>
            </article>
          );
          })}
        </div>
      )}

      {foodVariantOptions.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 text-sm font-extrabold tracking-wide text-slate-500">Món lẻ</div>
          <div className="grid gap-3">
            {foodVariantOptions.map((item) => {
              const quantity = getFoodQuantity(item.foodVariantId);
              const availableQuantity = Math.max(0, getFoodItemMaxQuantity?.(item.foodVariantId) ?? item.stockQuantity);
              const reachedLimit = quantity >= availableQuantity;
              return (
                <article
                  key={item.foodVariantId}
                  className={`grid gap-4 rounded-lg border p-3 transition sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:items-center ${
                    quantity > 0 ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <img
                    src={item.food.imageUrl || 'https://placehold.co/120x120?text=Food'}
                    alt={item.name}
                    className="h-20 w-full rounded-md object-cover sm:h-18 sm:w-18"
                  />
                  <div className="min-w-0">
                    <h3 className="text-base font-extrabold text-slate-950">{item.name}</h3>
                    <div className="mt-1 text-sm font-bold text-rose-700">{item.price.toLocaleString('vi-VN')} VND</div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <button
                      type="button"
                      onClick={() => onUpdateFoodItem?.(item.foodVariantId, -1)}
                      disabled={quantity === 0}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Giảm ${item.name}`}
                    >
                      <Minus size={16} />
                    </button>
                    <div className="w-8 text-center text-lg font-extrabold text-slate-950">{quantity}</div>
                    <button
                      type="button"
                      onClick={() => onUpdateFoodItem?.(item.foodVariantId, 1)}
                      disabled={reachedLimit}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Tăng ${item.name}`}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
