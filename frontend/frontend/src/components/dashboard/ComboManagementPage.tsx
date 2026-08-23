import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { toast } from "react-toastify";
import {
  Ban,
  Coffee,
  Edit2,
  FileText,
  History,
  ImageIcon,
  Loader2,
  PackagePlus,
  Popcorn,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { comboApi, type ComboAuditLogResponse, type ComboRequest, type ComboResponse, type FoodItemResponse, type FoodItemRequest, type FoodVariantRequest, type FoodVariantResponse } from "@/api/comboApi";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

const FONT = "'Inter', sans-serif";

type ComboManagementTab = 'combo' | 'drink' | 'food' | 'history';
type ProductKind = 'drink' | 'food';

const PRODUCT_CATEGORY: Record<ProductKind, string> = {
  drink: "Đồ uống",
  food: "Đồ ăn",
};

const productKindOf = (item: Pick<FoodItemResponse, "name" | "category">): ProductKind => {
  const value = `${item.category || ""} ${item.name || ""}`.toLocaleLowerCase("vi");
  const foodKeywords = ["đồ ăn", "food", "bắp", "popcorn", "snack", "khoai", "gà", "xúc xích", "burger", "hotdog", "nachos", "kẹo"];
  const drinkKeywords = ["đồ uống", "drink", "beverage", "nước", "soda", "coffee", "cà phê", "trà", "juice"];
  if (foodKeywords.some((keyword) => value.includes(keyword))) return "food";
  if (drinkKeywords.some((keyword) => value.includes(keyword))) return "drink";
  return item.category?.trim() === PRODUCT_CATEGORY.food ? "food" : "drink";
};

const emptyForm: ComboRequest = {
  name: "",
  description: "",
  price: 0,
  imageUrl: "",
  items: [],
};

const emptyFoodForm: FoodItemRequest = {
  name: "",
  price: 0,
  imageUrl: "",
  category: PRODUCT_CATEGORY.drink,
  isActive: true,
  variants: [
    {
      variantName: "Mặc định",
      sizeLabel: "",
      flavor: "",
      price: 0,
      purchasePrice: 0,
      stockQuantity: 0,
      stockAdjustmentReason: "",
      isActive: true,
      displayOrder: 0,
    },
  ],
};

const formatCurrency = (value: number) =>
  value.toLocaleString("vi-VN", { style: "currency", currency: "VND" });

const comboItemKey = (item: { foodItemId?: number | null; foodVariantId?: number | null }) =>
  item.foodVariantId ? `variant-${item.foodVariantId}` : `food-${item.foodItemId}`;

const variantDisplayName = (food: FoodItemResponse, variant?: FoodVariantResponse | FoodVariantRequest | null) => {
  if (!variant) return food.name;
  if ("displayName" in variant && variant.displayName) return variant.displayName;
  const parts = [food.name];
  if (variant.variantName && variant.variantName.trim().toLowerCase() !== "mặc định") {
    parts.push(variant.variantName.trim());
  }
  if (variant.sizeLabel?.trim()) {
    parts.push(`Size ${variant.sizeLabel.trim()}`);
  }
  if (variant.flavor?.trim()) {
    parts.push(variant.flavor.trim());
  }
  return parts.join(" - ");
};

const getVariantStock = (variant?: FoodVariantResponse | FoodVariantRequest | null) =>
  Number(variant?.stockQuantity ?? 0);

const getVariantPurchasePrice = (variant?: FoodVariantResponse | FoodVariantRequest | null) =>
  Number(variant?.purchasePrice ?? 0);

const getFoodItemStock = (item: FoodItemResponse) =>
  (item.variants ?? []).reduce((sum, variant) => sum + getVariantStock(variant), 0);

const getFoodItemInventoryCost = (item: FoodItemResponse) =>
  Number(item.inventoryCost ?? (item.variants || [])
    .reduce((sum, variant) => sum + getVariantStock(variant) * getVariantPurchasePrice(variant), 0));

const getFoodItemActualRevenue = (item: FoodItemResponse) =>
  Number(item.actualRevenue ?? 0);

const getFoodItemPotentialRevenue = (item: FoodItemResponse) =>
  Number(item.potentialRevenue ?? (item.variants || [])
    .reduce((sum, variant) => sum + getVariantStock(variant) * Number(variant.price || 0), 0));

const getFoodItemPotentialProfit = (item: FoodItemResponse) =>
  Number(item.potentialProfit ?? getFoodItemPotentialRevenue(item) - getFoodItemInventoryCost(item));

const getErrorMessage = (error: unknown, fallback: string) => {
  const responseMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return responseMessage || fallback;
};

export function ComboManagementPage({ canManage = true }: { canManage?: boolean }) {
  const [activeTab, setActiveTab] = useState<ComboManagementTab>('combo');
  const [combos, setCombos] = useState<ComboResponse[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [keyword, setKeyword] = useState("");
  
  // Combo States
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<ComboResponse | null>(null);
  const [form, setForm] = useState<ComboRequest>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [formError, setFormError] = useState("");

  // Food Item States
  const [foodFormOpen, setFoodFormOpen] = useState(false);
  const [editingFood, setEditingFood] = useState<FoodItemResponse | null>(null);
  const [foodForm, setFoodForm] = useState<FoodItemRequest>(emptyFoodForm);
  const [foodSaving, setFoodSaving] = useState(false);
  const [deletingFood, setDeletingFood] = useState<FoodItemResponse | null>(null);
  const [deletingCombo, setDeletingCombo] = useState<ComboResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [restoringComboId, setRestoringComboId] = useState<number | null>(null);
  const [restoringFoodId, setRestoringFoodId] = useState<number | null>(null);

  const fetchCombos = useCallback(async () => {
    try {
      setLoading(true);
      const data = await comboApi.getCombosForAdmin(statusFilter);
      setCombos(data || []);
    } catch {
      toast.error("Không thể tải danh sách combo");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchFoodItems = useCallback(async () => {
    try {
      setLoading(true);
      const foodIsActive = statusFilter === 'ACTIVE';
      const data = await comboApi.getFoodItemsForAdmin(foodIsActive);
      setFoodItems(data || []);
    } catch {
      toast.error("Không thể tải danh sách đồ ăn và đồ uống");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchActiveFoodItemsForCombo = useCallback(async () => {
    try {
      const data = await comboApi.getFoodItemsForAdmin(true);
      setFoodItems(data || []);
    } catch {
      toast.error("Không thể tải đồ ăn và đồ uống để tạo combo");
    }
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      if (activeTab === 'combo') void fetchCombos();
      if (activeTab === 'drink' || activeTab === 'food') void fetchFoodItems();
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [activeTab, fetchCombos, fetchFoodItems]);

  useEffect(() => {
    return () => {
      if (imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const filteredCombos = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) return combos;
    return combos.filter((combo) =>
      [combo.name, combo.description, String(combo.price)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [combos, keyword]);

  const inventoryItems = useMemo(() => foodItems.filter((item) => (
    activeTab === "food" ? productKindOf(item) === "food" : productKindOf(item) === "drink"
  )), [activeTab, foodItems]);

  const filteredFoodItems = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) return inventoryItems;
    return inventoryItems.filter((item) =>
      [item.name, item.category, String(item.price)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized))
    );
  }, [inventoryItems, keyword]);

  const stats = useMemo(() => {
    const list = activeTab === 'combo' ? combos : inventoryItems;
    const sellableCount = activeTab === 'combo'
      ? combos.filter((combo) => combo.status === "ACTIVE" && Number(combo.availableQuantity ?? 0) > 0).length
      : inventoryItems.filter((item) => item.isActive && (item.variants || []).some((variant) => variant.isActive)).length;
    const outOfStockCount = activeTab === 'combo'
      ? combos.filter((combo) => combo.status === "ACTIVE" && Number(combo.availableQuantity ?? 0) <= 0).length
      : inventoryItems.filter((item) => item.isActive && getFoodItemStock(item) <= 0).length;
    const inventoryCount = activeTab === 'combo'
      ? combos.reduce((sum, combo) => sum + Number(combo.availableQuantity ?? 0), 0)
      : inventoryItems.reduce((sum, item) => sum + getFoodItemStock(item), 0);
    const inventoryCost = activeTab === 'combo'
      ? combos.reduce((sum, combo) => sum + Number(combo.inventoryCost ?? 0), 0)
      : inventoryItems.reduce((sum, item) => sum + getFoodItemInventoryCost(item), 0);
    const actualRevenue = activeTab === 'combo'
      ? combos.reduce((sum, combo) => sum + Number(combo.actualRevenue ?? 0), 0)
      : inventoryItems.reduce((sum, item) => sum + getFoodItemActualRevenue(item), 0);
    const potentialRevenue = activeTab === 'combo'
      ? combos.reduce((sum, combo) => sum + Number(combo.potentialRevenue ?? 0), 0)
      : inventoryItems.reduce((sum, item) => sum + getFoodItemPotentialRevenue(item), 0);
    const potentialProfit = activeTab === 'combo'
      ? combos.reduce((sum, combo) => sum + Number(combo.potentialProfit ?? 0), 0)
      : inventoryItems.reduce((sum, item) => sum + getFoodItemPotentialProfit(item), 0);
    return {
      total: list.length,
      sellableCount,
      outOfStockCount,
      inventoryCount,
      inventoryCost,
      actualRevenue,
      potentialRevenue,
      potentialProfit,
    };
  }, [activeTab, combos, inventoryItems]);

  const openCreateForm = () => {
    if (activeTab === 'combo') {
      fetchActiveFoodItemsForCombo();
      setEditingCombo(null);
      setForm(emptyForm);
      setImageFile(null);
      setImagePreview("");
      setFormError("");
      setFormOpen(true);
    } else if (activeTab === 'drink' || activeTab === 'food') {
      setEditingFood(null);
      setFoodForm({
        ...emptyFoodForm,
        category: PRODUCT_CATEGORY[activeTab],
      });
      setFormError("");
      setFoodFormOpen(true);
    }
  };

  const openEditForm = (combo: ComboResponse) => {
    fetchActiveFoodItemsForCombo();
    setEditingCombo(combo);
    setForm({
      name: combo.name || "",
      description: combo.description || "",
      price: Number(combo.price || 0),
      imageUrl: combo.imageUrl || "",
      items: (combo.items || []).map(ci => ({
        foodItemId: ci.foodItemId,
        foodVariantId: ci.foodVariantId,
        quantity: ci.quantity,
      })),
    });
    setImageFile(null);
    setImagePreview(combo.imageUrl || "");
    setFormError("");
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving || foodSaving) return;
    setFormOpen(false);
    setFoodFormOpen(false);
    setEditingCombo(null);
    setEditingFood(null);
    setForm(emptyForm);
    setFoodForm(emptyFoodForm);
    setImageFile(null);
    setImagePreview("");
    setFormError("");
  };

  const openEditFood = (item: FoodItemResponse) => {
    setEditingFood(item);
    setFoodForm({
      name: item.name,
      price: item.price,
      imageUrl: item.imageUrl,
      category: PRODUCT_CATEGORY[productKindOf(item)],
      isActive: item.isActive,
      variants: (item.variants && item.variants.length > 0 ? item.variants : [{
        foodItemId: item.foodItemId,
        variantName: "Mặc định",
        price: item.price,
        purchasePrice: 0,
        stockQuantity: 0,
        isActive: item.isActive,
        displayOrder: 0,
      }]).map((variant, index) => ({
        foodVariantId: variant.foodVariantId,
        variantName: variant.variantName || "Mặc định",
        sizeLabel: variant.sizeLabel || "",
        flavor: variant.flavor || "",
        price: Number(variant.price || 0),
        purchasePrice: getVariantPurchasePrice(variant),
        stockQuantity: getVariantStock(variant),
        stockAdjustmentReason: "",
        isActive: variant.isActive,
        displayOrder: variant.displayOrder ?? index,
      })),
    });
    setImageFile(null);
    setImagePreview(item.imageUrl || "");
    setFormError("");
    setFoodFormOpen(true);
  };

  const handleFoodSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const productLabel = foodForm.category === PRODUCT_CATEGORY.food ? "đồ ăn" : "đồ uống";
    if (!foodForm.name.trim()) {
      setFormError("Tên món không được để trống");
      return;
    }
    const variants = (foodForm.variants || [])
      .map((variant, index) => ({
        ...variant,
        variantName: variant.variantName?.trim() || "Mặc định",
        sizeLabel: variant.sizeLabel?.trim() || "",
        flavor: variant.flavor?.trim() || "",
        price: Number(variant.price || 0),
        purchasePrice: Math.max(0, Number(variant.purchasePrice || 0)),
        stockQuantity: Math.max(0, Number(variant.stockQuantity || 0)),
        stockAdjustmentReason: variant.stockAdjustmentReason?.trim() || "",
        displayOrder: variant.displayOrder ?? index,
      }))
      .filter((variant) => variant.variantName || variant.sizeLabel || variant.flavor);
    if (variants.length === 0) {
      setFormError(`${productLabel} phải có ít nhất một biến thể`);
      return;
    }
    if (foodForm.isActive && !variants.some((variant) => variant.isActive)) {
      setFormError("Món đang kinh doanh phải có ít nhất một biến thể đang bán");
      return;
    }
    if (variants.some((variant) => Number(variant.price || 0) < 0 || Number(variant.purchasePrice || 0) < 0 || Number(variant.stockQuantity || 0) < 0)) {
      setFormError("Giá bán, giá nhập và số lượng tồn không được âm");
      return;
    }
    if (editingFood) {
      const originalStockByVariantId = new Map(
        (editingFood.variants || [])
          .filter((variant) => variant.foodVariantId)
          .map((variant) => [Number(variant.foodVariantId), getVariantStock(variant)])
      );
      const decreasedVariantWithoutReason = variants.find((variant) => {
        if (!variant.foodVariantId) return false;
        const originalStock = originalStockByVariantId.get(Number(variant.foodVariantId));
        return originalStock !== undefined
          && Number(variant.stockQuantity || 0) < originalStock
          && !variant.stockAdjustmentReason?.trim();
      });
      if (decreasedVariantWithoutReason) {
        setFormError(`Vui lòng nhập lý do khi giảm tồn kho cho ${decreasedVariantWithoutReason.variantName || "biến thể này"}`);
        return;
      }
    }
    const representativePrice = variants
      .filter((variant) => variant.isActive)
      .reduce((min, variant) => Math.min(min, Number(variant.price || 0)), Number.POSITIVE_INFINITY);
    const payload: FoodItemRequest = {
      ...foodForm,
      name: foodForm.name.trim(),
      imageUrl: foodForm.imageUrl?.trim() || "",
      category: foodForm.category?.trim() || "",
      price: Number.isFinite(representativePrice) ? representativePrice : Number(foodForm.price || 0),
      variants,
    };
    try {
      setFoodSaving(true);
      if (editingFood) {
        if (imageFile) {
          await comboApi.updateFoodItemWithImage(editingFood.foodItemId, payload, imageFile);
        } else {
          await comboApi.updateFoodItem(editingFood.foodItemId, payload);
        }
        toast.success(`Cập nhật ${productLabel} thành công`);
      } else {
        if (imageFile) {
          await comboApi.createFoodItemWithImage(payload, imageFile);
        } else {
          await comboApi.createFoodItem(payload);
        }
        toast.success(`Tạo ${productLabel} thành công`);
      }
      closeForm();
      fetchFoodItems();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, `Lỗi khi lưu ${productLabel}`));
    } finally {
      setFoodSaving(false);
    }
  };

  const handleDeleteFood = async () => {
    if (!deletingFood) return;
    try {
      setIsDeleting(true);
      await comboApi.deleteFoodItem(deletingFood.foodItemId);
      toast.success("Đã vô hiệu hóa sản phẩm");
      setDeletingFood(null);
      fetchFoodItems();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Lỗi khi vô hiệu hóa sản phẩm"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestoreFood = async (item: FoodItemResponse) => {
    const variants = (item.variants && item.variants.length > 0 ? item.variants : [{
      foodVariantId: null,
      variantName: "Mặc định",
      sizeLabel: "",
      flavor: "",
      price: item.price,
      purchasePrice: 0,
      stockQuantity: 0,
      isActive: true,
      displayOrder: 0,
    }]).map((variant, index) => ({
      foodVariantId: variant.foodVariantId,
      variantName: variant.variantName || "Mặc định",
      sizeLabel: variant.sizeLabel || "",
      flavor: variant.flavor || "",
      price: Number(variant.price || 0),
      purchasePrice: getVariantPurchasePrice(variant),
      stockQuantity: getVariantStock(variant),
      stockAdjustmentReason: "",
      isActive: true,
      displayOrder: variant.displayOrder ?? index,
    }));
    const representativePrice = variants.reduce(
      (min, variant) => Math.min(min, Number(variant.price || 0)),
      Number.POSITIVE_INFINITY
    );
    const payload: FoodItemRequest = {
      name: item.name,
      price: Number.isFinite(representativePrice) ? representativePrice : Number(item.price || 0),
      imageUrl: item.imageUrl || "",
      category: item.category || "",
      isActive: true,
      variants,
    };

    try {
      setRestoringFoodId(item.foodItemId);
      await comboApi.updateFoodItem(item.foodItemId, payload);
      toast.success("Đã khôi phục sản phẩm");
      fetchFoodItems();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Không thể khôi phục sản phẩm"));
    } finally {
      setRestoringFoodId(null);
    }
  };

  const handleImageChange = (file: File | null) => {
    if (!file) {
      setImageFile(null);
      const fallback = activeTab === 'combo' ? (editingCombo?.imageUrl || "") : (editingFood?.imageUrl || "");
      setImagePreview(fallback);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setFormError("Vui lòng chọn file ảnh hợp lệ.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      const msg = activeTab === 'combo' ? "Ảnh combo không được vượt quá 5MB." : "Ảnh sản phẩm không được vượt quá 5MB.";
      setFormError(msg);
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setFormError("");
  };

  const validateForm = () => {
    if (!form.name.trim()) return "Tên combo không được để trống.";
    if (!Number.isFinite(Number(form.price)) || Number(form.price) <= 0) {
      return "Giá combo phải lớn hơn 0.";
    }
    return "";
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }

    const payload: ComboRequest = {
      name: form.name.trim(),
      description: form.description?.trim() || null,
      price: Number(form.price),
      imageUrl: form.imageUrl?.trim() || null,
      items: form.items,
    };

    try {
      setSaving(true);
      if (editingCombo) {
        if (imageFile) {
          await comboApi.updateComboWithImage(editingCombo.comboId, payload, imageFile);
        } else {
          await comboApi.updateCombo(editingCombo.comboId, {
            ...payload,
            imageUrl: editingCombo.imageUrl || null,
          });
        }
        toast.success("Đã cập nhật combo");
      } else {
        if (imageFile) {
          await comboApi.createComboWithImage(payload, imageFile);
        } else {
          await comboApi.createCombo(payload);
        }
        toast.success("Đã tạo combo");
      }
      closeForm();
      fetchCombos();
    } catch (error: unknown) {
      const message = getErrorMessage(error, "Không thể lưu combo");
      setFormError(message);
      toast.error(message);
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCombo) return;
    try {
      setIsDeleting(true);
      await comboApi.deleteCombo(deletingCombo.comboId);
      toast.success("Đã vô hiệu hóa combo");
      setDeletingCombo(null);
      fetchCombos();
    } catch (error: unknown) {
      const message = getErrorMessage(error, "Không thể vô hiệu hóa combo");
      toast.error(message);
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestoreCombo = async (combo: ComboResponse) => {
    try {
      setRestoringComboId(combo.comboId);
      await comboApi.restoreCombo(combo.comboId);
      toast.success("Đã khôi phục combo");
      fetchCombos();
    } catch (error: unknown) {
      const message = getErrorMessage(error, "Không thể khôi phục combo");
      toast.error(message);
      console.error(error);
    } finally {
      setRestoringComboId(null);
    }
  };

  return (
    <div style={{ flex: 1, background: "#F4F5F7", overflow: "auto", fontFamily: FONT }}>
      <div style={{ padding: "28px 32px 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 20, marginBottom: 24 }}>
          <div>
            <div style={{ color: "#E63946", fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", marginBottom: 8 }}>
              Food & Beverage
            </div>
            <h1 style={{ margin: 0, color: "#111827", fontSize: 28, fontWeight: 850, letterSpacing: "-0.03em" }}>
              {activeTab === 'combo'
                ? 'Quản lý combo'
                : activeTab === 'drink'
                  ? 'Quản lý đồ uống'
                  : activeTab === 'food'
                    ? 'Quản lý đồ ăn'
                    : 'Lịch sử combo, đồ ăn và đồ uống'}
            </h1>
            <p style={{ margin: "8px 0 0", color: "#6B7280", fontSize: 14 }}>
              {activeTab === 'combo'
                ? 'Ghép các biến thể đồ ăn và đồ uống thành gói bán chung.'
                : activeTab === 'drink'
                  ? 'Quản lý nước ngọt, trà, cà phê và các loại đồ uống theo size.'
                  : activeTab === 'food'
                    ? 'Quản lý bắp, snack và các món ăn theo biến thể, giá bán và tồn kho.'
                    : 'Theo dõi các thao tác tạo, sửa, vô hiệu hóa, khôi phục và điều chỉnh tồn kho.'}
            </p>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ display: "flex", background: "#E5E7EB", padding: 4, borderRadius: 10, marginRight: 10 }}>
              <button
                onClick={() => setActiveTab('combo')}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: activeTab === 'combo' ? "#fff" : "transparent",
                  color: activeTab === 'combo' ? "#111827" : "#6B7280",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.2s",
                }}
              >
                <ShoppingBag size={16} /> Combo
              </button>
              <button
                onClick={() => setActiveTab('drink')}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: activeTab === 'drink' ? "#fff" : "transparent",
                  color: activeTab === 'drink' ? "#111827" : "#6B7280",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.2s",
                }}
              >
                <Coffee size={16} /> Đồ uống
              </button>
              <button
                onClick={() => setActiveTab('food')}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: activeTab === 'food' ? "#fff" : "transparent",
                  color: activeTab === 'food' ? "#111827" : "#6B7280",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.2s",
                }}
              >
                <Popcorn size={16} /> Đồ ăn
              </button>
              <button
                onClick={() => setActiveTab('history')}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: activeTab === 'history' ? "#fff" : "transparent",
                  color: activeTab === 'history' ? "#111827" : "#6B7280",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.2s",
                }}
              >
                <History size={16} /> Lịch sử
              </button>
            </div>

            {canManage && activeTab !== 'history' && (
              <button
                onClick={openCreateForm}
                style={{
                  height: 42,
                  padding: "0 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "#E63946",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 8px 20px rgba(230,57,70,0.22)",
                }}
              >
                <Plus size={17} /> {activeTab === 'combo' ? 'Thêm combo' : activeTab === 'drink' ? 'Thêm đồ uống' : 'Thêm đồ ăn'}
              </button>
            )}
          </div>
        </div>

        {activeTab === 'history' ? (
          <AuditHistoryPanel />
        ) : (
          <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 18 }}>
          {activeTab !== 'combo' && (
            <Metric
              label="Tổng tồn kho"
              value={String(stats.inventoryCount)}
              hint={`${stats.sellableCount} món có biến thể bán`}
              tone="#2563EB"
            />
          )}
          <Metric
            label="Vốn nhập kho"
            value={formatCurrency(stats.inventoryCost)}
            hint="Số tiền đã bỏ ra nhập hàng"
            tone="#7C3AED"
          />
          <Metric
            label="Doanh thu đã bán"
            value={formatCurrency(stats.actualRevenue)}
            hint="Từ các đơn đã thanh toán"
            tone="#059669"
          />
          <Metric
            label="Lợi nhuận còn có thể đạt"
            value={formatCurrency(stats.potentialProfit)}
            hint="Nếu bán hết hàng tồn hiện tại"
            tone={stats.potentialProfit >= 0 ? "#059669" : "#DC2626"}
          />
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={17} style={{ position: "absolute", left: 13, top: 12, color: "#9CA3AF" }} />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={activeTab === 'combo' ? "Tìm combo, mô tả hoặc giá..." : "Tìm món, danh mục, biến thể hoặc giá..."}
              style={{
                width: "100%",
                height: 42,
                borderRadius: 8,
                border: "1px solid #D1D5DB",
                background: "#fff",
                padding: "0 14px 0 40px",
                outline: "none",
                fontSize: 14,
                color: "#111827",
                boxSizing: "border-box",
              }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'ACTIVE' | 'INACTIVE')}
            style={{
              height: 42,
              padding: "0 14px",
              borderRadius: 8,
              border: "1px solid #D1D5DB",
              background: "#fff",
              color: "#334155",
              fontSize: 13,
              fontFamily: FONT,
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Đã ẩn</option>
          </select>

          <button
            onClick={activeTab === 'combo' ? fetchCombos : fetchFoodItems}
            disabled={loading}
            style={{
              width: 42,
              height: 42,
              borderRadius: 8,
              border: "1px solid #D1D5DB",
              background: "#fff",
              color: "#374151",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Làm mới"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ color: "#111827", fontSize: 15, fontWeight: 850 }}>
                  {activeTab === 'combo' ? "Danh sách combo" : activeTab === 'drink' ? "Danh sách đồ uống" : "Danh sách đồ ăn"}
                </span>
                {activeTab !== 'combo' && (
                  <span style={{ ...pillStyle, background: "#F8FAFC", color: "#64748B", borderColor: "#E2E8F0" }}>
                    {stats.total} món
                  </span>
                )}
              </div>
              <div style={{ color: "#6B7280", fontSize: 12, marginTop: 3 }}>
                Hiển thị {activeTab === 'combo' ? filteredCombos.length : filteredFoodItems.length}/{stats.total} mục phù hợp bộ lọc.
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ ...pillStyle, background: statusFilter === "ACTIVE" ? "#ECFDF5" : "#F3F4F6", color: statusFilter === "ACTIVE" ? "#047857" : "#64748B", borderColor: statusFilter === "ACTIVE" ? "#A7F3D0" : "#E5E7EB" }}>
                {statusFilter === "ACTIVE" ? "Đang hoạt động" : "Đã ẩn"}
              </span>
              <span style={{ ...pillStyle, background: stats.outOfStockCount > 0 ? "#FEF2F2" : "#EFF6FF", color: stats.outOfStockCount > 0 ? "#B91C1C" : "#2563EB", borderColor: stats.outOfStockCount > 0 ? "#FECACA" : "#BFDBFE" }}>
                {stats.outOfStockCount > 0 ? `${stats.outOfStockCount} mục hết hàng` : "Tồn kho ổn"}
              </span>
            </div>
          </div>
          {activeTab === 'combo' ? (
            <>
              {loading ? (
                <LoadingState label="Đang tải combo..." />
              ) : filteredCombos.length === 0 ? (
                <EmptyState title="Chưa có combo phù hợp" description="Thêm combo mới hoặc thay đổi từ khóa tìm kiếm." />
              ) : (
                <div style={cardGridStyle}>
                  {filteredCombos.map((combo) => (
                    <ComboCard
                      key={combo.comboId}
                      combo={combo}
                      canManage={canManage}
                      onEdit={() => openEditForm(combo)}
                      onDelete={() => setDeletingCombo(combo)}
                      onRestore={() => handleRestoreCombo(combo)}
                      restoring={restoringComboId === combo.comboId}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {loading ? (
                <LoadingState label={activeTab === 'drink' ? "Đang tải đồ uống..." : "Đang tải đồ ăn..."} />
              ) : filteredFoodItems.length === 0 ? (
                <EmptyState
                  title={activeTab === 'drink' ? "Chưa có đồ uống phù hợp" : "Chưa có đồ ăn phù hợp"}
                  description={activeTab === 'drink' ? "Hãy thêm đồ uống hoặc thay đổi từ khóa tìm kiếm." : "Hãy thêm đồ ăn hoặc thay đổi từ khóa tìm kiếm."}
                />
              ) : (
                <div style={cardGridStyle}>
                  {filteredFoodItems.map((item) => (
                    <FoodItemCard
                      key={item.foodItemId}
                      item={item}
                      canManage={canManage}
                      onEdit={() => openEditFood(item)}
                      onDelete={() => setDeletingFood(item)}
                      onRestore={() => handleRestoreFood(item)}
                      restoring={restoringFoodId === item.foodItemId}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
          </>
        )}
      </div>

      {canManage && formOpen && (
        <ComboFormModal
          form={form}
          setForm={setForm}
          foodItems={foodItems.filter(i => i.isActive)}
          imagePreview={imagePreview}
          editingCombo={editingCombo}
          error={formError}
          saving={saving}
          onImageChange={handleImageChange}
          onClose={closeForm}
          onSubmit={handleSubmit}
        />
      )}

      {canManage && foodFormOpen && (
        <FoodItemFormModal
          form={foodForm}
          setForm={setFoodForm}
          editingItem={editingFood}
          imagePreview={imagePreview}
          onImageChange={handleImageChange}
          error={formError}
          saving={foodSaving}
          onClose={closeForm}
          onSubmit={handleFoodSubmit}
        />
      )}

      <ConfirmDialog
        open={!!deletingCombo}
        title="Vô hiệu hóa combo?"
        message={`Combo "${deletingCombo?.name}" sẽ bị ẩn khỏi danh sách đang kinh doanh.`}
        confirmLabel="Vô hiệu hóa"
        loading={isDeleting}
        onClose={() => setDeletingCombo(null)}
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={!!deletingFood}
        title={`Vô hiệu hóa ${deletingFood && productKindOf(deletingFood) === "food" ? "đồ ăn" : "đồ uống"}?`}
        message={`Sản phẩm "${deletingFood?.name}" sẽ bị ẩn khỏi danh sách đang kinh doanh. Bạn có thể xem lại bằng bộ lọc Đã ẩn và sửa để bật lại.`}
        confirmLabel="Vô hiệu hóa"
        loading={isDeleting}
        onClose={() => setDeletingFood(null)}
        onConfirm={handleDeleteFood}
      />
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  tone = "#111827",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, padding: "15px 16px", minWidth: 0 }}>
      <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 800, letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ color: tone, fontSize: 24, fontWeight: 850, marginTop: 6, lineHeight: 1 }}>{value}</div>
      {hint && <div style={{ color: "#94A3B8", fontSize: 12, fontWeight: 650, marginTop: 7, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{hint}</div>}
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div style={{ padding: 42, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "#6B7280", fontWeight: 700 }}>
      <Loader2 size={20} className="animate-spin" /> {label}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div style={{ padding: 42, textAlign: "center", color: "#6B7280" }}>
      <PackagePlus size={36} style={{ margin: "0 auto 10px", color: "#9CA3AF" }} />
      <div style={{ fontWeight: 800, color: "#111827" }}>{title}</div>
      <div style={{ fontSize: 13, marginTop: 4 }}>{description}</div>
    </div>
  );
}

function ComboCard({
  combo,
  canManage,
  onEdit,
  onDelete,
  onRestore,
  restoring,
}: {
  combo: ComboResponse;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onRestore: () => void;
  restoring: boolean;
}) {
  const isInactive = combo.status === "INACTIVE";
  const availableQuantity = Number(combo.availableQuantity ?? 0);
  const isSoldOut = !isInactive && availableQuantity <= 0;
  const visibleItems = combo.items || [];
  const costPerCombo = Number(combo.costPerCombo ?? visibleItems.reduce((sum, item) => sum + Number(item.totalCost || 0), 0));
  const profitPerCombo = Number(combo.profitPerCombo ?? Number(combo.price || 0) - costPerCombo);

  return (
    <div
      style={{
        border: `1px solid ${isSoldOut ? "#FECACA" : "#E5E7EB"}`,
        borderRadius: 8,
        background: isInactive ? "#F9FAFB" : "#fff",
        overflow: "hidden",
        opacity: isInactive ? 0.6 : 1,
      }}
    >
      <div style={{ padding: 14, display: "grid", gridTemplateColumns: "86px minmax(0, 1fr)", gap: 14 }}>
        <ComboImage src={combo.imageUrl} alt={combo.name} size={86} />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: "#111827", fontSize: 16, fontWeight: 850, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {combo.name}
              </div>
              <div style={{ color: "#64748B", fontSize: 12, marginTop: 4, lineHeight: 1.45, minHeight: 34, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {combo.description || "Chưa có mô tả"}
              </div>
            </div>
            <span style={{ ...pillStyle, background: isInactive ? "#F3F4F6" : isSoldOut ? "#FEF2F2" : "#ECFDF5", color: isInactive ? "#64748B" : isSoldOut ? "#B91C1C" : "#047857", borderColor: isInactive ? "#E5E7EB" : isSoldOut ? "#FECACA" : "#A7F3D0", flexShrink: 0 }}>
              {isInactive ? "Đã ẩn" : isSoldOut ? "Hết hàng" : "Đang bán"}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", borderTop: "1px solid #F1F5F9", borderBottom: "1px solid #F1F5F9" }}>
        <MiniInfo label="Giá bán" value={formatCurrency(Number(combo.price || 0))} />
        <MiniInfo label="Vốn/combo" value={formatCurrency(costPerCombo)} tone="#7C3AED" />
        <MiniInfo label="Lãi/combo" value={formatCurrency(profitPerCombo)} tone={profitPerCombo >= 0 ? "#047857" : "#B91C1C"} />
        <MiniInfo label="Còn bán" value={isInactive ? "--" : String(availableQuantity)} tone={availableQuantity > 0 ? "#047857" : "#B91C1C"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", borderBottom: "1px solid #F1F5F9", background: "#FAFAFB" }}>
        <MiniInfo label="Vốn tồn" value={formatCurrency(Number(combo.inventoryCost || 0))} tone="#7C3AED" />
        <MiniInfo label="Doanh thu" value={formatCurrency(Number(combo.actualRevenue || 0))} tone="#059669" />
        <MiniInfo label="Có thể bán thêm" value={formatCurrency(Number(combo.potentialRevenue || 0))} tone="#2563EB" />
        <MiniInfo label="Lợi nhuận còn lại" value={formatCurrency(Number(combo.potentialProfit || 0))} tone={Number(combo.potentialProfit || 0) >= 0 ? "#047857" : "#B91C1C"} />
      </div>

      <div style={{ padding: "12px 14px", minHeight: 74 }}>
        {visibleItems.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {visibleItems.slice(0, 4).map((ci) => (
              <span key={ci.comboItemId} style={{ ...pillStyle, background: "#EFF6FF", color: "#2563EB", borderColor: "#DBEAFE", textTransform: "none", fontSize: 11 }}>
                {ci.quantity}x {ci.displayName || ci.foodItemName} · vốn {formatCurrency(Number(ci.totalCost || 0))}
              </span>
            ))}
            {visibleItems.length > 4 && (
              <span style={{ ...pillStyle, background: "#F8FAFC", color: "#64748B", borderColor: "#E2E8F0" }}>
                +{visibleItems.length - 4}
              </span>
            )}
          </div>
        ) : (
          <div style={{ color: "#B91C1C", fontSize: 12, fontWeight: 750 }}>Combo chưa có thành phần.</div>
        )}
      </div>

      {canManage && (
        <div style={{ padding: "10px 14px", display: "flex", justifyContent: "flex-end", gap: 8, background: "#F8FAFC" }}>
          <IconButton title={isInactive ? "Sửa để kiểm tra lại" : "Sửa"} onClick={onEdit} color="#2563EB">
            <Edit2 size={16} />
          </IconButton>
          {isInactive ? (
            <IconButton title="Hoàn tác vô hiệu hóa" onClick={onRestore} color="#059669" disabled={restoring}>
              {restoring ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
            </IconButton>
          ) : (
            <IconButton title="Vô hiệu hóa" onClick={onDelete} color="#DC2626">
              <Ban size={16} />
            </IconButton>
          )}
        </div>
      )}
    </div>
  );
}

function FoodItemCard({
  item,
  canManage,
  onEdit,
  onDelete,
  onRestore,
  restoring,
}: {
  item: FoodItemResponse;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onRestore: () => void;
  restoring: boolean;
}) {
  const isInactive = !item.isActive;
  const activeVariants = (item.variants || []).filter((variant) => variant.isActive);
  const prices = (item.variants && item.variants.length > 0 ? item.variants : [{ price: item.price }])
    .map((variant) => Number(variant.price || 0));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const stockQuantity = getFoodItemStock(item);
  const actualRevenue = getFoodItemActualRevenue(item);
  const isSoldOut = item.isActive && stockQuantity <= 0;
  const totalVariants = item.variants?.length || 0;

  return (
    <div
      style={{
        border: `1px solid ${isSoldOut ? "#FECACA" : "#E5E7EB"}`,
        borderRadius: 8,
        background: isInactive ? "#F9FAFB" : "#fff",
        overflow: "hidden",
        opacity: isInactive ? 0.68 : 1,
      }}
    >
      <div style={{ padding: 14, display: "grid", gridTemplateColumns: "86px minmax(0, 1fr)", gap: 14 }}>
        <ComboImage src={item.imageUrl} alt={item.name} size={86} />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: "#111827", fontSize: 16, fontWeight: 850, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {item.category && (
                  <span style={{ ...pillStyle, background: "#F3F4F6", color: "#374151", borderColor: "#E5E7EB" }}>
                    {item.category}
                  </span>
                )}
                <span style={{ ...pillStyle, background: "#EFF6FF", color: "#2563EB", borderColor: "#BFDBFE" }}>
                  {activeVariants.length || item.variants?.length || 1} biến thể
                </span>
              </div>
            </div>
            <span style={{ ...pillStyle, background: isInactive ? "#F3F4F6" : isSoldOut ? "#FEF2F2" : "#ECFDF5", color: isInactive ? "#64748B" : isSoldOut ? "#B91C1C" : "#047857", borderColor: isInactive ? "#E5E7EB" : isSoldOut ? "#FECACA" : "#A7F3D0", flexShrink: 0 }}>
              {isInactive ? "Đã ẩn" : isSoldOut ? "Hết hàng" : "Đang bán"}
            </span>
          </div>
        </div>
        {item.variants && item.variants.length > 0 && (
          <div style={{ color: "#6B7280", fontSize: 12, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {item.variants.slice(0, 3).map((variant) => variantDisplayName(item, variant).replace(`${item.name} - `, "")).join(", ")}
            {item.variants.length > 3 ? "..." : ""}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", borderTop: "1px solid #F1F5F9", borderBottom: "1px solid #F1F5F9" }}>
        <MiniInfo label="Giá bán" value={minPrice === maxPrice ? formatCurrency(minPrice) : `${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}`} />
        <MiniInfo label="Tồn kho" value={String(stockQuantity)} tone={stockQuantity > 0 ? "#047857" : "#B91C1C"} />
        <MiniInfo label="Doanh thu" value={formatCurrency(actualRevenue)} tone="#059669" />
      </div>

      <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, color: "#64748B", fontSize: 12, fontWeight: 750 }}>
        <span>{activeVariants.length}/{totalVariants || 1} biến thể đang bán</span>
        {totalVariants === 0 && <span style={{ color: "#B91C1C" }}>Chưa có biến thể</span>}
      </div>

      {canManage && (
        <div style={{ padding: "10px 14px", display: "flex", justifyContent: "flex-end", gap: 8, background: "#F8FAFC" }}>
          <IconButton title={isInactive ? "Sửa để bật lại" : "Sửa"} onClick={onEdit} color="#2563EB">
            <Edit2 size={16} />
          </IconButton>
          {isInactive ? (
            <IconButton title="Hoàn tác vô hiệu hóa" onClick={onRestore} color="#059669" disabled={restoring}>
              {restoring ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
            </IconButton>
          ) : (
            <IconButton title="Vô hiệu hóa" onClick={onDelete} color="#DC2626">
              <Ban size={16} />
            </IconButton>
          )}
        </div>
      )}
    </div>
  );
}

function MiniInfo({ label, value, tone = "#111827" }: { label: string; value: string; tone?: string }) {
  return (
    <div style={{ padding: "10px 12px", minWidth: 0 }}>
      <div style={{ color: "#94A3B8", fontSize: 10, fontWeight: 850, letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ color: tone, fontSize: 13, fontWeight: 850, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
    </div>
  );
}

function MiniInfoBox({ label, value, tone = "#111827" }: { label: string; value: string; tone?: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, padding: "11px 12px", minWidth: 0 }}>
      <div style={{ color: "#64748B", fontSize: 11, fontWeight: 850, letterSpacing: "0.04em" }}>
        {label}
      </div>
      <div style={{ color: tone, fontSize: 15, fontWeight: 850, marginTop: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {value}
      </div>
    </div>
  );
}

const pillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  maxWidth: "100%",
  padding: "3px 7px",
  borderRadius: 999,
  border: "1px solid #E5E7EB",
  fontSize: 10,
  fontWeight: 850,
  lineHeight: 1.2,
  letterSpacing: "0.02em",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const cardGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))",
  gap: 14,
  padding: 16,
};

const auditActionLabels: Record<string, string> = {
  CREATE: "Tạo mới",
  UPDATE: "Cập nhật",
  STOCK_ADJUST: "Điều chỉnh tồn",
  DISABLE: "Vô hiệu hóa",
  RESTORE: "Khôi phục",
};

const auditTargetLabels: Record<string, string> = {
  COMBO: "Combo",
  FOOD_ITEM: "Đồ ăn / đồ uống",
  FOOD_VARIANT: "Biến thể",
};

function AuditHistoryPanel() {
  const [logs, setLogs] = useState<ComboAuditLogResponse[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [targetType, setTargetType] = useState("ALL");
  const [action, setAction] = useState("ALL");
  const [keyword, setKeyword] = useState("");
  const [selectedLog, setSelectedLog] = useState<ComboAuditLogResponse | null>(null);

  const loadLogs = useCallback(async () => {
    try {
      setLoadingLogs(true);
      const data = await comboApi.getAuditLogs({
        targetType,
        action,
        keyword: keyword.trim() || undefined,
        limit: 150,
      });
      setLogs(data);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Không thể tải lịch sử thao tác"));
    } finally {
      setLoadingLogs(false);
    }
  }, [action, keyword, targetType]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadLogs();
    }, 250);
    return () => window.clearTimeout(timerId);
  }, [loadLogs]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 1fr) 180px 180px 42px", gap: 12 }}>
        <div style={{ position: "relative" }}>
          <Search size={17} style={{ position: "absolute", left: 13, top: 12, color: "#9CA3AF" }} />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm theo tên combo, sản phẩm, người thao tác hoặc nội dung..."
            style={{
              ...inputStyle,
              height: 42,
              paddingLeft: 40,
              background: "#fff",
            }}
          />
        </div>
        <select
          value={targetType}
          onChange={(event) => setTargetType(event.target.value)}
          style={{ ...inputStyle, height: 42, background: "#fff", cursor: "pointer" }}
        >
          <option value="ALL">Tất cả đối tượng</option>
          <option value="COMBO">Combo</option>
          <option value="FOOD_ITEM">Đồ ăn / đồ uống</option>
          <option value="FOOD_VARIANT">Biến thể</option>
        </select>
        <select
          value={action}
          onChange={(event) => setAction(event.target.value)}
          style={{ ...inputStyle, height: 42, background: "#fff", cursor: "pointer" }}
        >
          <option value="ALL">Tất cả thao tác</option>
          <option value="CREATE">Tạo mới</option>
          <option value="UPDATE">Cập nhật</option>
          <option value="STOCK_ADJUST">Điều chỉnh tồn</option>
          <option value="DISABLE">Vô hiệu hóa</option>
          <option value="RESTORE">Khôi phục</option>
        </select>
        <button
          type="button"
          onClick={loadLogs}
          disabled={loadingLogs}
          title="Làm mới lịch sử"
          style={{
            width: 42,
            height: 42,
            borderRadius: 8,
            border: "1px solid #D1D5DB",
            background: "#fff",
            color: "#374151",
            cursor: loadingLogs ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <RefreshCw size={17} className={loadingLogs ? "animate-spin" : ""} />
        </button>
      </div>

      <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ color: "#111827", fontSize: 15, fontWeight: 850 }}>Nhật ký thao tác</div>
            <div style={{ color: "#6B7280", fontSize: 12, marginTop: 3 }}>
              Lưu lại các thay đổi quan trọng của combo, đồ ăn, đồ uống và tồn kho.
            </div>
          </div>
          <span style={{ ...pillStyle, background: "#F8FAFC", color: "#64748B", borderColor: "#E2E8F0" }}>
            {logs.length} bản ghi
          </span>
        </div>

        {loadingLogs ? (
          <LoadingState label="Đang tải lịch sử..." />
        ) : logs.length === 0 ? (
          <EmptyState title="Chưa có lịch sử phù hợp" description="Thử đổi bộ lọc hoặc thực hiện một thao tác trên combo, đồ ăn hoặc đồ uống." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "155px 130px 150px minmax(220px, 1fr) 140px",
                gap: 12,
                minWidth: 900,
                padding: "10px 16px",
                background: "#F8FAFC",
                borderBottom: "1px solid #E5E7EB",
                color: "#64748B",
                fontSize: 11,
                fontWeight: 850,
                letterSpacing: "0.04em",
              }}
            >
              <span>Thời gian</span>
              <span>Thao tác</span>
              <span>Đối tượng</span>
              <span>Nội dung</span>
              <span>Người thực hiện</span>
            </div>
            {logs.map((log) => (
              <button
                key={log.auditLogId}
                type="button"
                onClick={() => setSelectedLog(log)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "155px 130px 150px minmax(220px, 1fr) 140px",
                  gap: 12,
                  minWidth: 900,
                  width: "100%",
                  padding: "13px 16px",
                  border: "none",
                  borderBottom: "1px solid #F1F5F9",
                  background: "#fff",
                  cursor: "pointer",
                  textAlign: "left",
                  alignItems: "center",
                  fontFamily: FONT,
                }}
              >
                <span style={{ color: "#475569", fontSize: 12, fontWeight: 700 }}>{formatAuditDate(log.createdAt)}</span>
                <span>
                  <AuditPill action={log.action} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <div style={{ color: "#111827", fontSize: 13, fontWeight: 850, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {log.targetName || `#${log.targetId || ""}`}
                  </div>
                  <div style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}>
                    {auditTargetLabels[log.targetType] || log.targetType}
                  </div>
                </span>
                <span style={{ color: "#334155", fontSize: 13, fontWeight: 650, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {log.summary || "Không có mô tả"}
                </span>
                <span style={{ color: "#64748B", fontSize: 12, fontWeight: 750, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {log.actorUsername || "system"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedLog && (
        <AuditDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
}

function AuditPill({ action }: { action: string }) {
  const tone = action === "CREATE"
    ? { bg: "#ECFDF5", text: "#047857", border: "#A7F3D0" }
    : action === "DISABLE"
      ? { bg: "#FEF2F2", text: "#B91C1C", border: "#FECACA" }
      : action === "RESTORE"
        ? { bg: "#EFF6FF", text: "#2563EB", border: "#BFDBFE" }
        : action === "STOCK_ADJUST"
          ? { bg: "#FFFBEB", text: "#B45309", border: "#FDE68A" }
          : { bg: "#F8FAFC", text: "#475569", border: "#E2E8F0" };
  return (
    <span style={{ ...pillStyle, background: tone.bg, color: tone.text, borderColor: tone.border }}>
      {auditActionLabels[action] || action}
    </span>
  );
}

function AuditDetailModal({ log, onClose }: { log: ComboAuditLogResponse; onClose: () => void }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(17,24,39,0.45)", zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}
    >
      <div
        style={{ width: "min(1040px, 100%)", maxHeight: "90vh", background: "#fff", borderRadius: 10, boxShadow: "0 24px 60px rgba(0,0,0,0.22)", overflow: "hidden", display: "flex", flexDirection: "column" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <FileText size={18} color="#E63946" />
              <AuditPill action={log.action} />
              <span style={{ ...pillStyle, background: "#F8FAFC", color: "#64748B", borderColor: "#E2E8F0" }}>
                {auditTargetLabels[log.targetType] || log.targetType}
              </span>
            </div>
            <div style={{ color: "#111827", fontSize: 18, fontWeight: 850 }}>{log.targetName || `#${log.targetId || ""}`}</div>
            <div style={{ color: "#64748B", fontSize: 13, marginTop: 5 }}>
              {formatAuditDate(log.createdAt)} bởi {log.actorUsername || "system"}
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "#6B7280" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 22, display: "grid", gap: 14, overflow: "auto" }}>
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: 14 }}>
            <div style={{ color: "#111827", fontSize: 13, fontWeight: 850, marginBottom: 4 }}>Tóm tắt</div>
            <div style={{ color: "#334155", fontSize: 13, lineHeight: 1.6 }}>{log.summary || "Không có mô tả"}</div>
            {log.reason && (
              <div style={{ marginTop: 8, color: "#92400E", fontSize: 13, fontWeight: 700, lineHeight: 1.6 }}>
                {log.reason}
              </div>
            )}
          </div>

          <AuditChangeTable
            beforeValue={log.beforeSnapshot}
            afterValue={log.afterSnapshot}
            targetType={log.targetType}
          />
        </div>
      </div>
    </div>
  );
}

function AuditChangeTable({
  beforeValue,
  afterValue,
  targetType,
}: {
  beforeValue?: string | null;
  afterValue?: string | null;
  targetType: string;
}) {
  const rows = buildAuditRows(parseAuditSnapshot(beforeValue), parseAuditSnapshot(afterValue), targetType);

  if (rows.length === 0) {
    return (
      <div style={{ border: "1px solid #E5E7EB", borderRadius: 8, padding: 16, color: "#64748B", fontSize: 13, fontWeight: 700 }}>
        Không có dữ liệu thay đổi để hiển thị.
      </div>
    );
  }

  return (
    <div style={{ border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden", minWidth: 0 }}>
      <div style={{ padding: "10px 12px", background: "#F9FAFB", borderBottom: "1px solid #E5E7EB", color: "#111827", fontSize: 13, fontWeight: 850 }}>
        Chi tiết thay đổi
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(180px, 0.8fr) minmax(180px, 1fr) minmax(180px, 1fr)",
          background: "#F8FAFC",
          color: "#64748B",
          fontSize: 11,
          fontWeight: 850,
          letterSpacing: "0.04em",
          borderBottom: "1px solid #E5E7EB",
        }}
      >
        <div style={{ padding: "10px 12px" }}>Trường</div>
        <div style={{ padding: "10px 12px" }}>Trước thay đổi</div>
        <div style={{ padding: "10px 12px" }}>Sau thay đổi</div>
      </div>
      <div style={{ maxHeight: 430, overflow: "auto" }}>
        {rows.map((row) => (
          <div
            key={row.label}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(180px, 0.8fr) minmax(180px, 1fr) minmax(180px, 1fr)",
              borderBottom: "1px solid #F1F5F9",
              background: row.changed ? "#FFFBEB" : "#FFFFFF",
            }}
          >
            <div style={{ padding: "11px 12px", color: "#334155", fontSize: 13, fontWeight: 850 }}>
              {row.label}
            </div>
            <AuditCell value={row.before} changed={row.changed} />
            <AuditCell value={row.after} changed={row.changed} />
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditCell({ value, changed }: { value: string; changed: boolean }) {
  return (
    <div
      style={{
        padding: "11px 12px",
        color: value === "-" ? "#94A3B8" : changed ? "#92400E" : "#111827",
        fontSize: 13,
        fontWeight: changed ? 800 : 650,
        lineHeight: 1.5,
        wordBreak: "break-word",
      }}
    >
      {value}
    </div>
  );
}

type AuditSnapshotObject = Record<string, unknown>;

function parseAuditSnapshot(value?: string | null): AuditSnapshotObject | null {
  if (!value) {
    return null;
  }
  try {
    const parsed = JSON.parse(value);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function buildAuditRows(before: AuditSnapshotObject | null, after: AuditSnapshotObject | null, targetType: string) {
  const beforeMap = auditDisplayMap(before, targetType);
  const afterMap = auditDisplayMap(after, targetType);
  const labels = Array.from(new Set([...Object.keys(beforeMap), ...Object.keys(afterMap)]));

  return labels.map((label) => {
    const beforeText = beforeMap[label] || "-";
    const afterText = afterMap[label] || "-";
    return {
      label,
      before: beforeText,
      after: afterText,
      changed: beforeText !== afterText,
    };
  });
}

function auditDisplayMap(snapshot: AuditSnapshotObject | null, targetType: string) {
  const map: Record<string, string> = {};
  if (!snapshot) {
    return map;
  }

  const isCombo = targetType === "COMBO" || "comboId" in snapshot;
  if (isCombo) {
    setAuditField(map, "Mã combo", snapshot.comboId);
    setAuditField(map, "Tên combo", snapshot.name);
    setAuditField(map, "Mô tả", snapshot.description);
    setAuditField(map, "Giá bán", snapshot.price, "money");
    setAuditField(map, "Ảnh", snapshot.imageUrl);
    setAuditField(map, "Trạng thái", snapshot.status, "status");
    addAuditItems(map, snapshot.items);
    return map;
  }

  setAuditField(map, "Mã món", snapshot.foodItemId);
  setAuditField(map, "Tên món", snapshot.name);
  setAuditField(map, "Danh mục", snapshot.category);
  setAuditField(map, "Giá đại diện", snapshot.price, "money");
  setAuditField(map, "Ảnh", snapshot.imageUrl);
  setAuditField(map, "Trạng thái", snapshot.isActive, "active");
  addAuditVariants(map, snapshot.variants);
  return map;
}

function addAuditItems(map: Record<string, string>, value: unknown) {
  if (!Array.isArray(value)) {
    return;
  }
  value.forEach((item, index) => {
    if (!isRecord(item)) return;
    const label = String(item.displayName || `Thành phần ${index + 1}`);
    map[`Thành phần ${index + 1}`] = label;
    map[`Số lượng ${label}`] = formatAuditValue(item.quantity);
  });
}

function addAuditVariants(map: Record<string, string>, value: unknown) {
  if (!Array.isArray(value)) {
    return;
  }
  value.forEach((variant, index) => {
    if (!isRecord(variant)) return;
    const label = buildAuditVariantName(variant, index);
    map[`Biến thể ${index + 1}`] = label;
    map[`Giá bán ${label}`] = formatAuditValue(variant.price, "money");
    map[`Giá nhập ${label}`] = formatAuditValue(variant.purchasePrice, "money");
    map[`Tồn kho ${label}`] = formatAuditValue(variant.stockQuantity);
    map[`Trạng thái ${label}`] = formatAuditValue(variant.isActive, "active");
  });
}

function buildAuditVariantName(variant: AuditSnapshotObject, index: number) {
  const parts = [
    variant.variantName,
    variant.sizeLabel ? `Size ${variant.sizeLabel}` : null,
    variant.flavor,
  ]
    .filter((part) => typeof part === "string" && part.trim())
    .map((part) => String(part).trim());
  return parts.length > 0 ? parts.join(" - ") : `Biến thể ${index + 1}`;
}

function setAuditField(
  map: Record<string, string>,
  label: string,
  value: unknown,
  type?: "money" | "status" | "active"
) {
  if (value === undefined || value === null || value === "") {
    return;
  }
  map[label] = formatAuditValue(value, type);
}

function formatAuditValue(value: unknown, type?: "money" | "status" | "active") {
  if (value === undefined || value === null || value === "") {
    return "-";
  }
  if (type === "money") {
    return formatCurrency(Number(value || 0));
  }
  if (type === "status") {
    return value === "ACTIVE" ? "Đang hoạt động" : value === "INACTIVE" ? "Đã ẩn" : String(value);
  }
  if (type === "active") {
    return value ? "Đang bán" : "Đã ẩn";
  }
  return String(value);
}

function isRecord(value: unknown): value is AuditSnapshotObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatAuditDate(value?: string | null) {
  if (!value) {
    return "--";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ComboFormModal({
  form,
  setForm,
  foodItems,
  imagePreview,
  editingCombo,
  error,
  saving,
  onImageChange,
  onClose,
  onSubmit,
}: {
  form: ComboRequest;
  setForm: (form: ComboRequest) => void;
  foodItems: FoodItemResponse[];
  imagePreview: string;
  editingCombo: ComboResponse | null;
  error: string;
  saving: boolean;
  onImageChange: (file: File | null) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const variantOptions = foodItems.flatMap((food) => {
    const activeVariants = (food.variants || []).filter((variant) => variant.isActive);
    if (activeVariants.length === 0) {
      return [{
        key: `food-${food.foodItemId}`,
        foodItemId: food.foodItemId,
        foodVariantId: null,
        name: food.name,
        price: food.price,
        purchasePrice: 0,
        stockQuantity: 0,
        imageUrl: food.imageUrl,
        kind: productKindOf(food),
      }];
    }
    return activeVariants.map((variant) => ({
      key: variant.foodVariantId ? `variant-${variant.foodVariantId}` : `food-${food.foodItemId}`,
      foodItemId: food.foodItemId,
      foodVariantId: variant.foodVariantId || null,
      name: variantDisplayName(food, variant),
      price: variant.price,
      purchasePrice: getVariantPurchasePrice(variant),
      stockQuantity: getVariantStock(variant),
      imageUrl: food.imageUrl,
      kind: productKindOf(food),
    }));
  });

  const toggleFoodItem = (option: { foodItemId: number; foodVariantId?: number | null }) => {
    const key = comboItemKey(option);
    const exists = form.items.find((i) => comboItemKey(i) === key);
    if (exists) {
      setForm({ ...form, items: form.items.filter((i) => comboItemKey(i) !== key) });
    } else {
      setForm({ ...form, items: [...form.items, { foodItemId: option.foodItemId, foodVariantId: option.foodVariantId || null, quantity: 1 }] });
    }
  };

  const removeFoodItem = (key: string) => {
    setForm({ ...form, items: form.items.filter((item) => comboItemKey(item) !== key) });
  };

  const updateQuantity = (key: string, delta: number) => {
    setForm({
      ...form,
      items: form.items.map((i) =>
        comboItemKey(i) === key ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
      ),
    });
  };

  return (
    <div 
      style={{ position: "fixed", inset: 0, background: "rgba(17,24,39,0.45)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={onClose}
    >
      <form 
        onSubmit={onSubmit} 
        style={{ position: "relative", width: "min(850px, 100%)", maxHeight: "90vh", display: "flex", flexDirection: "column", background: "#fff", borderRadius: 10, boxShadow: "0 24px 60px rgba(0,0,0,0.22)", overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ color: "#111827", fontSize: 18, fontWeight: 850 }}>
              {editingCombo ? "Cập nhật combo" : "Thêm combo"}
            </div>
            <div style={{ color: "#6B7280", fontSize: 13, marginTop: 3 }}>
              Chọn biến thể từ cả đồ ăn và đồ uống, sau đó nhập số lượng cho từng thành phần.
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            disabled={saving} 
            style={{ 
              width: 30, height: 30, borderRadius: "50%", 
              background: "rgba(0,0,0,0.05)", border: "none", cursor: "pointer", 
              color: "#6B7280", display: "flex", alignItems: "center", justifyContent: "center"
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 22, overflow: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* Cột trái: Thông tin cơ bản */}
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ flexShrink: 0 }}>
                <ComboImage src={imagePreview || ""} alt={form.name || "Combo"} size={100} />
                <label style={{
                  marginTop: 8, height: 32, borderRadius: 6, border: "1px solid #D1D5DB",
                  background: "#fff", color: "#374151", fontSize: 12, fontWeight: 800,
                  cursor: saving ? "not-allowed" : "pointer", display: "flex",
                  alignItems: "center", justifyContent: "center", gap: 4, opacity: saving ? 0.6 : 1,
                }}>
                  Đổi ảnh
                  <input type="file" accept="image/*" disabled={saving} onChange={(e) => onImageChange(e.target.files?.[0] || null)} style={{ display: "none" }} />
                </label>
              </div>
              <div style={{ flex: 1, display: "grid", gap: 12 }}>
                <Field label="Tên combo" required>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="Nhập tên combo" />
                </Field>
                <Field label="Giá bán (VND)" required>
                  <input type="number" min={1} value={form.price || ""} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} style={inputStyle} placeholder="Nhập giá bán" />
                </Field>
              </div>
            </div>

            <Field label="Mô tả">
              <textarea
                value={form.description || ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                style={{ ...inputStyle, height: 60, paddingTop: 8, resize: "none" }}
                placeholder="Nhập mô tả combo"
              />
            </Field>

            <div style={{ border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ background: "#F9FAFB", padding: "8px 12px", borderBottom: "1px solid #E5E7EB", color: "#374151", fontSize: 13, fontWeight: 800 }}>
                Thành phần combo ({form.items.length})
              </div>
              <div style={{ minHeight: 120, maxHeight: 200, overflow: "auto", padding: 8 }}>
                {form.items.length === 0 ? (
                  <div style={{ padding: 20, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>
                    Chưa có món nào. Chọn ở bên phải {"->"}
                  </div>
                ) : (
                  form.items.map((item) => {
                    const key = comboItemKey(item);
                    const option = variantOptions.find((variant) => variant.key === key);
                    return (
                      <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", background: "#F3F4F6", borderRadius: 6, marginBottom: 4 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {option?.name || "Biến thể đã ngừng bán"}
                          </div>
                          {option?.price != null && (
                            <div style={{ fontSize: 11, color: "#6B7280" }}>{formatCurrency(option.price)}</div>
                          )}
                          {option && (
                            <div style={{ fontSize: 11, color: "#7C3AED" }}>
                              Vốn/combo: {formatCurrency(Number(option.purchasePrice || 0) * Number(item.quantity || 0))}
                            </div>
                          )}
                          {option && (
                            <div style={{ fontSize: 11, color: Number(option.stockQuantity || 0) > 0 ? "#047857" : "#B91C1C" }}>
                              Tồn: {Number(option.stockQuantity || 0)}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <button type="button" onClick={() => updateQuantity(key, -1)} style={qtyBtnStyle}>-</button>
                          <span style={{ fontSize: 13, fontWeight: 800, minWidth: 20, textAlign: "center" }}>{item.quantity}</span>
                          <button type="button" onClick={() => updateQuantity(key, 1)} style={qtyBtnStyle}>+</button>
                          <button type="button" onClick={() => removeFoodItem(key)} style={{ marginLeft: 6, border: "none", background: "none", color: "#EF4444", cursor: "pointer" }}><X size={14}/></button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Cột phải: Danh sách đồ ăn và đồ uống để chọn */}
          <div style={{ display: "flex", flexDirection: "column", border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ background: "#F9FAFB", padding: "8px 12px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "#374151", fontSize: 13, fontWeight: 800 }}>Chọn biến thể món</span>
              <span style={{ color: "#6B7280", fontSize: 11 }}>Nhấp để thêm/xóa</span>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
              {variantOptions.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "#9CA3AF", fontSize: 12 }}>Không có biến thể món khả dụng.</div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {([
                    { kind: "food" as ProductKind, label: "Đồ ăn", color: "#B45309", background: "#FFFBEB" },
                    { kind: "drink" as ProductKind, label: "Đồ uống", color: "#0369A1", background: "#F0F9FF" },
                  ]).map((group) => {
                    const options = variantOptions.filter((item) => item.kind === group.kind);
                    if (options.length === 0) return null;
                    return (
                      <div key={group.kind} style={{ display: "grid", gap: 6 }}>
                        <div style={{ borderRadius: 6, background: group.background, color: group.color, padding: "6px 8px", fontSize: 11, fontWeight: 850 }}>
                          {group.label} · {options.length} biến thể
                        </div>
                        {options.map((item) => {
                          const isSelected = form.items.some(i => comboItemKey(i) === item.key);
                          return (
                            <div
                              key={item.key}
                              onClick={() => toggleFoodItem(item)}
                              style={{
                                display: "flex", alignItems: "center", gap: 10, padding: 8,
                                borderRadius: 8, border: `1px solid ${isSelected ? "#E63946" : "#E5E7EB"}`,
                                background: isSelected ? "#FEF2F2" : "#fff", cursor: "pointer", transition: "all 0.2s"
                              }}
                            >
                              <ComboImage src={item.imageUrl} alt={item.name} size={40} />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? "#E63946" : "#111827" }}>{item.name}</div>
                                <div style={{ fontSize: 11, color: "#6B7280" }}>{formatCurrency(item.price)}</div>
                                <div style={{ fontSize: 11, color: Number(item.stockQuantity || 0) > 0 ? "#047857" : "#B91C1C" }}>
                                  Tồn: {Number(item.stockQuantity || 0)}
                                </div>
                                <div style={{ fontSize: 11, color: "#7C3AED" }}>
                                  Giá nhập: {formatCurrency(Number(item.purchasePrice || 0))}
                                </div>
                              </div>
                              {isSelected && <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#E63946", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>✓</div>}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {error && <div style={{ margin: "0 22px 16px", background: "#FEF2F2", color: "#B91C1C", borderRadius: 8, padding: "10px 12px", fontSize: 13, fontWeight: 700 }}>{error}</div>}

        <div style={{ padding: "16px 22px", borderTop: "1px solid #E5E7EB", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button type="button" onClick={onClose} disabled={saving} style={secondaryButtonStyle}>Hủy</button>
          <button type="submit" disabled={saving} style={primaryButtonStyle}>
            {saving && <Loader2 size={16} className="animate-spin" />}
            {editingCombo ? "Lưu thay đổi" : "Tạo combo"}
          </button>
        </div>
      </form>
    </div>
  );
}

const qtyBtnStyle: CSSProperties = {
  width: 24, height: 24, borderRadius: 4, border: "1px solid #D1D5DB", background: "#fff", 
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14
};

function FoodItemFormModal({
  form,
  setForm,
  editingItem,
  imagePreview,
  onImageChange,
  error,
  saving,
  onClose,
  onSubmit,
}: {
  form: FoodItemRequest;
  setForm: (form: FoodItemRequest) => void;
  editingItem: FoodItemResponse | null;
  imagePreview: string;
  onImageChange: (file: File | null) => void;
  error: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const productKind: ProductKind = form.category === PRODUCT_CATEGORY.food ? "food" : "drink";
  const productLabel = productKind === "food" ? "đồ ăn" : "đồ uống";
  const variants = form.variants && form.variants.length > 0 ? form.variants : emptyFoodForm.variants || [];
  const originalStockByVariantId = useMemo(() => new Map(
    (editingItem?.variants || [])
      .filter((variant) => variant.foodVariantId)
      .map((variant) => [Number(variant.foodVariantId), getVariantStock(variant)])
  ), [editingItem]);
  const getOriginalStock = (variant: FoodVariantRequest) =>
    variant.foodVariantId ? originalStockByVariantId.get(Number(variant.foodVariantId)) : undefined;
  const isStockDecreased = (variant: FoodVariantRequest) => {
    const originalStock = getOriginalStock(variant);
    return originalStock !== undefined && getVariantStock(variant) < originalStock;
  };
  const activeVariantCount = variants.filter((variant) => variant.isActive).length;
  const totalStock = variants.reduce((sum, variant) => sum + getVariantStock(variant), 0);
  const inventoryCost = variants.reduce((sum, variant) => sum + getVariantStock(variant) * getVariantPurchasePrice(variant), 0);
  const stockAdjustmentCount = variants.filter(isStockDecreased).length;
  const updateVariant = (index: number, patch: Partial<FoodVariantRequest>) => {
    setForm({
      ...form,
      variants: variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, ...patch } : variant
      ),
    });
  };
  const addVariant = () => {
    setForm({
      ...form,
      variants: [
        ...variants,
        {
          variantName: "",
          sizeLabel: "",
          flavor: "",
          price: 0,
          purchasePrice: 0,
          stockQuantity: 0,
          stockAdjustmentReason: "",
          isActive: true,
          displayOrder: variants.length,
        },
      ],
    });
  };
  const removeVariant = (index: number) => {
    if (variants.length <= 1) return;
    setForm({
      ...form,
      variants: variants.filter((_, variantIndex) => variantIndex !== index),
    });
  };

  return (
    <div 
      style={{ position: "fixed", inset: 0, background: "rgba(17,24,39,0.45)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, overflow: "hidden" }}
      onClick={onClose}
    >
      <form 
        onSubmit={onSubmit} 
        style={{ position: "relative", width: "min(1040px, 100%)", height: "calc(100vh - 48px)", maxHeight: 900, minHeight: 0, display: "flex", flexDirection: "column", background: "#fff", borderRadius: 10, boxShadow: "0 24px 60px rgba(0,0,0,0.22)", overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ color: "#111827", fontSize: 18, fontWeight: 850 }}>
              {editingItem ? `Cập nhật ${productLabel}` : `Thêm ${productLabel}`}
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} style={{ border: "none", background: "none", cursor: "pointer", color: "#6B7280" }}><X size={20} /></button>
        </div>

        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, overflow: "hidden", background: "#F8FAFC", flex: "1 1 auto", minHeight: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(260px, 0.8fr)", gap: 12, flexShrink: 0 }}>
            <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, padding: 12, display: "grid", gap: 10 }}>
              <div>
                <div style={{ color: "#111827", fontSize: 14, fontWeight: 850 }}>Thông tin món</div>
              </div>
              <Field label="Tên món" required>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="Ví dụ: Bắp rang bơ" />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                <Field label="Giá đại diện (VND)" required>
                  <input type="number" min={0} value={form.price || ""} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} style={inputStyle} placeholder="Giá hiển thị" />
                </Field>
                <Field label="Nhóm sản phẩm" required>
                  <select
                    value={productKind}
                    onChange={(e) => setForm({ ...form, category: PRODUCT_CATEGORY[e.target.value as ProductKind] })}
                    style={inputStyle}
                  >
                    <option value="drink">Đồ uống</option>
                    <option value="food">Đồ ăn</option>
                  </select>
                </Field>
              </div>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#374151", fontSize: 13, fontWeight: 800 }}>
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                Đang kinh doanh
              </label>
            </div>

            <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, padding: 12, display: "grid", gap: 10 }}>
              <div>
                <div style={{ color: "#111827", fontSize: 14, fontWeight: 850 }}>Ảnh món</div>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 8,
                    background: "#F3F4F6",
                    border: "1px dashed #D1D5DB",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <ImageIcon color="#9CA3AF" />
                  )}
                </div>
                <div style={{ flex: 1, display: "grid", gap: 8, minWidth: 0 }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => onImageChange(e.target.files?.[0] || null)}
                    style={{ fontSize: 13 }}
                  />
                  <input
                    value={form.imageUrl || ""}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    style={inputStyle}
                    placeholder="Hoặc dán URL ảnh"
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, flexShrink: 0 }}>
            <MiniInfoBox label="Biến thể đang bán" value={`${activeVariantCount}/${variants.length}`} tone="#2563EB" />
            <MiniInfoBox label="Tổng tồn kho" value={`${totalStock} phần`} tone={totalStock > 0 ? "#047857" : "#B91C1C"} />
            <MiniInfoBox label="Vốn tồn" value={formatCurrency(inventoryCost)} tone="#7C3AED" />
            <MiniInfoBox label="Cần lý do giảm tồn" value={String(stockAdjustmentCount)} tone={stockAdjustmentCount > 0 ? "#B45309" : "#047857"} />
          </div>

          <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden", display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0 }}>
            <div style={{ background: "#F9FAFB", padding: "12px 14px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0 }}>
              <div>
                <div style={{ color: "#111827", fontSize: 14, fontWeight: 850 }}>Biến thể bán hàng</div>
                <div style={{ color: "#6B7280", fontSize: 12, marginTop: 2 }}>Mỗi biến thể có giá bán, giá nhập và tồn kho riêng.</div>
              </div>
              <button type="button" onClick={addVariant} disabled={saving} style={{ ...secondaryButtonStyle, height: 34, padding: "0 12px", fontSize: 12 }}>
                <Plus size={14} /> Thêm biến thể
              </button>
            </div>
            <div style={{ display: "grid", gap: 12, padding: 12, overflowY: "auto", overflowX: "hidden", flex: "1 1 auto", minHeight: 0, overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}>
              {variants.map((variant, index) => {
                const stockDecreased = isStockDecreased(variant);
                return (
                  <div
                    key={variant.foodVariantId || index}
                    style={{
                      border: `1px solid ${stockDecreased ? "#F59E0B" : "#E5E7EB"}`,
                      borderRadius: 8,
                      background: stockDecreased ? "#FFFBEB" : "#fff",
                      padding: 12,
                      display: "grid",
                      gap: 12,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <span style={{ ...pillStyle, background: "#EFF6FF", color: "#2563EB", borderColor: "#BFDBFE" }}>
                          Biến thể {index + 1}
                        </span>
                        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#374151", fontSize: 12, fontWeight: 800 }}>
                          <input
                            type="checkbox"
                            checked={variant.isActive}
                            onChange={(e) => updateVariant(index, { isActive: e.target.checked })}
                          />
                          Đang bán
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeVariant(index)}
                        disabled={saving || variants.length <= 1}
                        title="Xóa biến thể khỏi form"
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 8,
                          border: "1px solid #E5E7EB",
                          background: "#fff",
                          color: variants.length <= 1 ? "#CBD5E1" : "#DC2626",
                          cursor: saving || variants.length <= 1 ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                      <Field label="Tên biến thể">
                        <input
                          value={variant.variantName || ""}
                          onChange={(e) => updateVariant(index, { variantName: e.target.value })}
                          style={inputStyle}
                          placeholder="Mặc định, Lớn..."
                        />
                      </Field>
                      <Field label="Size">
                        <input
                          value={variant.sizeLabel || ""}
                          onChange={(e) => updateVariant(index, { sizeLabel: e.target.value })}
                          style={inputStyle}
                          placeholder="M, L..."
                        />
                      </Field>
                      <Field label="Vị">
                        <input
                          value={variant.flavor || ""}
                          onChange={(e) => updateVariant(index, { flavor: e.target.value })}
                          style={inputStyle}
                          placeholder="Phô mai, caramel..."
                        />
                      </Field>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
                      <Field label="Giá bán">
                        <input
                          type="number"
                          min={0}
                          value={variant.price || ""}
                          onChange={(e) => updateVariant(index, { price: Number(e.target.value) })}
                          style={inputStyle}
                          placeholder="Giá bán"
                        />
                      </Field>
                      <Field label="Giá nhập">
                        <input
                          type="number"
                          min={0}
                          value={variant.purchasePrice ?? ""}
                          onChange={(e) => updateVariant(index, { purchasePrice: Math.max(0, Number(e.target.value || 0)) })}
                          style={inputStyle}
                          placeholder="Giá nhập"
                        />
                      </Field>
                      <Field label="Tồn kho">
                        <input
                          type="number"
                          min={0}
                          value={variant.stockQuantity ?? ""}
                          onChange={(e) => updateVariant(index, { stockQuantity: Math.max(0, Number(e.target.value || 0)) })}
                          style={inputStyle}
                          placeholder="Số lượng"
                        />
                      </Field>
                    </div>

                    {stockDecreased && (
                      <div style={{ display: "grid", gap: 7 }}>
                        <div style={{ color: "#B45309", fontSize: 12, fontWeight: 800 }}>
                          Giảm tồn từ {getOriginalStock(variant)} xuống {getVariantStock(variant)} phần
                        </div>
                        <input
                          value={variant.stockAdjustmentReason || ""}
                          onChange={(e) => updateVariant(index, { stockAdjustmentReason: e.target.value })}
                          style={{
                            ...inputStyle,
                            borderColor: variant.stockAdjustmentReason?.trim() ? "#D1D5DB" : "#F59E0B",
                            background: "#fff",
                          }}
                          placeholder="Nhập lý do giảm tồn kho, ví dụ: kiểm kê lại, hư hỏng, hết hạn..."
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {error && <div style={{ margin: "12px 22px", background: "#FEF2F2", color: "#B91C1C", borderRadius: 8, padding: "10px 12px", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{error}</div>}

        <div style={{ padding: "16px 22px", borderTop: "1px solid #E5E7EB", display: "flex", justifyContent: "flex-end", gap: 10, flexShrink: 0, background: "#fff" }}>
          <button type="button" onClick={onClose} disabled={saving} style={secondaryButtonStyle}>Hủy</button>
          <button type="submit" disabled={saving} style={primaryButtonStyle}>
            {saving && <Loader2 size={16} className="animate-spin" />}
            {editingItem ? "Lưu thay đổi" : productKind === "food" ? "Tạo đồ ăn" : "Tạo đồ uống"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ color: "#374151", fontSize: 13, fontWeight: 800 }}>
        {label} {required && <span style={{ color: "#E63946" }}>*</span>}
      </span>
      {children}
    </label>
  );
}

function ComboImage({ src, alt, size }: { src?: string | null; alt: string; size: number }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const imageSrc = src || "";
  const shouldShowImage = imageSrc && failedSrc !== imageSrc;

  return (
    <div style={{ width: size, height: size, borderRadius: 8, background: "#F3F4F6", border: "1px solid #E5E7EB", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {shouldShowImage ? (
        <img src={imageSrc} alt={alt} onError={() => setFailedSrc(imageSrc)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <ImageIcon size={Math.max(22, size / 3)} color="#9CA3AF" />
      )}
    </div>
  );
}

function IconButton({
  title,
  color,
  onClick,
  disabled,
  children,
}: {
  title: string;
  color: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 34,
        height: 34,
        borderRadius: 8,
        border: "1px solid #E5E7EB",
        background: disabled ? "#F9FAFB" : "#fff",
        color: disabled ? "#9CA3AF" : color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

const inputStyle: CSSProperties = {
  width: "100%",
  height: 40,
  borderRadius: 8,
  border: "1px solid #D1D5DB",
  padding: "0 12px",
  outline: "none",
  fontSize: 14,
  color: "#111827",
  boxSizing: "border-box",
};

const primaryButtonStyle: CSSProperties = {
  height: 40,
  padding: "0 16px",
  borderRadius: 8,
  border: "none",
  background: "#E63946",
  color: "#fff",
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const secondaryButtonStyle: CSSProperties = {
  height: 40,
  padding: "0 16px",
  borderRadius: 8,
  border: "1px solid #D1D5DB",
  background: "#fff",
  color: "#374151",
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
};
