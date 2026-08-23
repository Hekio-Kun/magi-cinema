import apiClient from './api';

export interface ComboItemResponse {
  comboItemId: number;
  foodItemId?: number | null;
  foodVariantId?: number | null;
  foodItemName: string;
  variantName?: string | null;
  displayName?: string | null;
  unitPrice?: number | null;
  unitCost?: number | null;
  totalCost?: number | null;
  quantity: number;
}

export interface ComboItemRequest {
  foodItemId?: number | null;
  foodVariantId?: number | null;
  quantity: number;
}

export interface ComboResponse {
  comboId: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  status: 'ACTIVE' | 'INACTIVE';
  items: ComboItemResponse[];
  availableQuantity?: number | null;
  costPerCombo?: number | null;
  profitPerCombo?: number | null;
  inventoryCost?: number | null;
  actualRevenue?: number | null;
  potentialRevenue?: number | null;
  potentialProfit?: number | null;
}

export interface ComboAuditLogResponse {
  auditLogId: number;
  targetType: string;
  targetId?: number | null;
  targetName?: string | null;
  action: string;
  summary?: string | null;
  actorUserId?: string | null;
  actorUsername?: string | null;
  reason?: string | null;
  beforeSnapshot?: string | null;
  afterSnapshot?: string | null;
  createdAt?: string | null;
}

export interface ComboRequest {
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  items: ComboItemRequest[];
}

export interface FoodItemResponse {
  foodItemId: number;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
  isActive: boolean;
  variants?: FoodVariantResponse[];
  totalStockQuantity?: number | null;
  inventoryCost?: number | null;
  actualRevenue?: number | null;
  potentialRevenue?: number | null;
  potentialProfit?: number | null;
}

export interface FoodItemRequest {
  name: string;
  price: number;
  imageUrl?: string;
  category?: string;
  isActive: boolean;
  variants?: FoodVariantRequest[];
}

export interface FoodVariantResponse {
  foodVariantId?: number | null;
  foodItemId?: number | null;
  variantName: string;
  sizeLabel?: string | null;
  flavor?: string | null;
  price: number;
  purchasePrice?: number | null;
  stockQuantity?: number | null;
  isActive: boolean;
  displayOrder?: number | null;
  displayName?: string | null;
  inventoryCost?: number | null;
  potentialRevenue?: number | null;
  potentialProfit?: number | null;
}

export interface FoodVariantRequest {
  foodVariantId?: number | null;
  variantName: string;
  sizeLabel?: string | null;
  flavor?: string | null;
  price: number;
  purchasePrice?: number | null;
  stockQuantity?: number | null;
  stockAdjustmentReason?: string | null;
  isActive: boolean;
  displayOrder?: number | null;
}

type RawFoodVariantResponse = FoodVariantResponse & { active?: boolean };
type RawFoodItemResponse = Omit<FoodItemResponse, 'variants'> & {
  active?: boolean;
  variants?: RawFoodVariantResponse[];
};

const normalizeFoodVariant = (variant: RawFoodVariantResponse): FoodVariantResponse => ({
  ...variant,
  isActive: variant.isActive ?? variant.active ?? false,
});

const normalizeFoodItem = (item: RawFoodItemResponse): FoodItemResponse => ({
  ...item,
  isActive: item.isActive ?? item.active ?? false,
  variants: (item.variants || []).map(normalizeFoodVariant),
});

export const comboApi = {
  getCombos: async () => {
    const res = await apiClient.get('/combos');
    return res.data.result as ComboResponse[];
  },

  getCombosForAdmin: async (status?: string) => {
    const res = await apiClient.get('/combos/admin', { params: { status } });
    return res.data.result as ComboResponse[];
  },

  getCombo: async (comboId: number) => {
    const res = await apiClient.get(`/combos/${comboId}`);
    return res.data.result as ComboResponse;
  },

  createCombo: async (data: ComboRequest) => {
    const res = await apiClient.post('/combos', data);
    return res.data.result as ComboResponse;
  },

  createComboWithImage: async (data: ComboRequest, image?: File | null) => {
    const formData = toComboFormData(data, image);
    const res = await apiClient.post('/combos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.result as ComboResponse;
  },

  updateCombo: async (comboId: number, data: ComboRequest) => {
    const res = await apiClient.put(`/combos/${comboId}`, data);
    return res.data.result as ComboResponse;
  },

  updateComboWithImage: async (comboId: number, data: ComboRequest, image?: File | null) => {
    const formData = toComboFormData(data, image);
    const res = await apiClient.put(`/combos/${comboId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.result as ComboResponse;
  },

  deleteCombo: async (comboId: number) => {
    const res = await apiClient.delete(`/combos/${comboId}`);
    return res.data;
  },

  restoreCombo: async (comboId: number) => {
    const res = await apiClient.patch(`/combos/${comboId}/restore`);
    return res.data.result as ComboResponse;
  },

  // Food Items
  getFoodItems: async () => {
    const res = await apiClient.get('/food-items');
    return ((res.data.result || []) as RawFoodItemResponse[]).map(normalizeFoodItem);
  },

  getFoodItemsForAdmin: async (isActive?: boolean) => {
    const res = await apiClient.get('/food-items/admin', { params: { isActive } });
    return ((res.data.result || []) as RawFoodItemResponse[]).map(normalizeFoodItem);
  },

  createFoodItem: async (data: FoodItemRequest) => {
    const res = await apiClient.post('/food-items', data);
    return normalizeFoodItem(res.data.result as RawFoodItemResponse);
  },

  updateFoodItem: async (foodItemId: number, data: FoodItemRequest) => {
    const res = await apiClient.put(`/food-items/${foodItemId}`, data);
    return normalizeFoodItem(res.data.result as RawFoodItemResponse);
  },

  createFoodItemWithImage: async (data: FoodItemRequest, image?: File | null) => {
    const formData = toFoodItemFormData(data, image);
    const res = await apiClient.post('/food-items', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return normalizeFoodItem(res.data.result as RawFoodItemResponse);
  },

  updateFoodItemWithImage: async (foodItemId: number, data: FoodItemRequest, image?: File | null) => {
    const formData = toFoodItemFormData(data, image);
    const res = await apiClient.put(`/food-items/${foodItemId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return normalizeFoodItem(res.data.result as RawFoodItemResponse);
  },

  deleteFoodItem: async (foodItemId: number) => {
    const res = await apiClient.delete(`/food-items/${foodItemId}`);
    return res.data;
  },

  getAuditLogs: async (params?: {
    targetType?: string;
    action?: string;
    keyword?: string;
    limit?: number;
  }) => {
    const res = await apiClient.get('/combo-audit-logs', { params });
    return (res.data.result || []) as ComboAuditLogResponse[];
  },
};

function toFoodItemFormData(data: FoodItemRequest, image?: File | null) {
  const formData = new FormData();
  formData.append('name', data.name);
  formData.append('price', String(data.price));
  formData.append('category', data.category || '');
  formData.append('active', String(data.isActive));
  if (data.variants && data.variants.length > 0) {
    data.variants.forEach((variant, index) => {
      if (variant.foodVariantId) {
        formData.append(`variants[${index}].foodVariantId`, String(variant.foodVariantId));
      }
      formData.append(`variants[${index}].variantName`, variant.variantName);
      formData.append(`variants[${index}].sizeLabel`, variant.sizeLabel || '');
      formData.append(`variants[${index}].flavor`, variant.flavor || '');
      formData.append(`variants[${index}].price`, String(variant.price));
      formData.append(`variants[${index}].purchasePrice`, String(variant.purchasePrice ?? 0));
      formData.append(`variants[${index}].stockQuantity`, String(variant.stockQuantity ?? 0));
      formData.append(`variants[${index}].stockAdjustmentReason`, variant.stockAdjustmentReason || '');
      formData.append(`variants[${index}].active`, String(variant.isActive));
      formData.append(`variants[${index}].displayOrder`, String(variant.displayOrder ?? index));
    });
  }
  if (image) {
    formData.append('image', image);
  }
  return formData;
}

function toComboFormData(data: ComboRequest, image?: File | null) {
  const formData = new FormData();
  formData.append('name', data.name);
  formData.append('description', data.description || '');
  formData.append('price', String(data.price));
  if (image) {
    formData.append('image', image);
  }
  
  if (data.items && data.items.length > 0) {
    data.items.forEach((item, index) => {
      if (item.foodItemId) {
        formData.append(`items[${index}].foodItemId`, String(item.foodItemId));
      }
      if (item.foodVariantId) {
        formData.append(`items[${index}].foodVariantId`, String(item.foodVariantId));
      }
      formData.append(`items[${index}].quantity`, String(item.quantity));
    });
  }
  
  return formData;
}
