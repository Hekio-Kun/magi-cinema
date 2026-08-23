package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.combo.FoodItemMultipartRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.combo.FoodItemRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.combo.FoodItemResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.combo.FoodVariantRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.combo.FoodVariantResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.FoodItem;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.FoodVariant;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BookingStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.ComboItemRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.FoodItemRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.FoodVariantRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.BookingFoodItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class FoodItemService {
    private static final int FOOD_STOCK_ALERT_THRESHOLD = 200;

    FoodItemRepository foodItemRepository;
    FoodVariantRepository foodVariantRepository;
    ComboItemRepository comboItemRepository;
    BookingFoodItemRepository bookingFoodItemRepository;
    CloudinaryService cloudinaryService;
    DashboardNotificationService dashboardNotificationService;
    ComboAuditLogService comboAuditLogService;

    @Transactional(readOnly = true)
    public List<FoodItemResponse> getAllFoodItems(Boolean isActive) {
        if (isActive != null) {
            return foodItemRepository.findByIsActive(isActive).stream()
                    .map(foodItem -> toResponse(foodItem, true, false))
                    .toList();
        }
        return foodItemRepository.findAll().stream()
                .map(foodItem -> toResponse(foodItem, true, false))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FoodItemResponse> getActiveFoodItems() {
        return foodItemRepository.findByIsActiveTrue().stream()
                .map(foodItem -> toResponse(foodItem, false, true))
                .toList();
    }

    @Transactional
    public FoodItemResponse createFoodItem(FoodItemRequest request) {
        String imageUrl = request.getImageUrl();
        if (request instanceof FoodItemMultipartRequest multipartRequest) {
            imageUrl = uploadImageIfPresent(multipartRequest.getImage());
        }

        FoodItem foodItem = FoodItem.builder()
                .name(request.getName())
                .price(request.getPrice())
                .imageUrl(imageUrl)
                .category(request.getCategory())
                .isActive(request.isActive())
                .build();
        FoodItem saved = foodItemRepository.save(foodItem);
        syncVariants(saved, request);
        FoodItemResponse response = toResponse(saved, true, false);
        comboAuditLogService.record(
                "FOOD_ITEM",
                saved.getFoodItemId(),
                saved.getName(),
                "CREATE",
                "Tạo món lẻ " + saved.getName(),
                null,
                foodItemSnapshot(saved),
                null
        );
        return response;
    }

    @Transactional
    public FoodItemResponse updateFoodItem(Long foodItemId, FoodItemRequest request) {
        FoodItem foodItem = foodItemRepository.findById(foodItemId)
                .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR, "Không tìm thấy món lẻ"));
        Map<String, Object> beforeSnapshot = foodItemSnapshot(foodItem);
        boolean wasActive = foodItem.isActive();
        
        foodItem.setName(request.getName());
        foodItem.setPrice(request.getPrice());
        
        if (request instanceof FoodItemMultipartRequest multipartRequest) {
            if (hasImage(multipartRequest.getImage())) {
                if (foodItem.getImageUrl() != null) {
                    cloudinaryService.deleteImage(foodItem.getImageUrl());
                }
                foodItem.setImageUrl(cloudinaryService.uploadImage(multipartRequest.getImage()));
            }
        } else {
            foodItem.setImageUrl(request.getImageUrl());
        }
        
        foodItem.setCategory(request.getCategory());
        foodItem.setActive(request.isActive());

        FoodItem saved = foodItemRepository.save(foodItem);
        List<String> variantChanges = syncVariants(saved, request);
        FoodItemResponse response = toResponse(saved, true, false);
        String action = !wasActive && request.isActive()
                ? "RESTORE"
                : (variantChanges.stream().anyMatch(change -> change.startsWith("Tồn kho ")) ? "STOCK_ADJUST" : "UPDATE");
        String reason = variantChanges.isEmpty() ? null : String.join("; ", variantChanges);
        String summary = switch (action) {
            case "RESTORE" -> "Khôi phục món lẻ " + saved.getName();
            case "STOCK_ADJUST" -> "Điều chỉnh tồn kho món lẻ " + saved.getName();
            default -> "Cập nhật món lẻ " + saved.getName();
        };
        comboAuditLogService.record(
                "FOOD_ITEM",
                saved.getFoodItemId(),
                saved.getName(),
                action,
                summary,
                beforeSnapshot,
                foodItemSnapshot(saved),
                reason
        );
        return response;
    }

    private String uploadImageIfPresent(MultipartFile image) {
        if (!hasImage(image)) {
            return null;
        }
        return cloudinaryService.uploadImage(image);
    }

    private boolean hasImage(MultipartFile image) {
        return image != null && !image.isEmpty();
    }

    @Transactional
    public void deleteFoodItem(Long foodItemId) {
        FoodItem foodItem = foodItemRepository.findById(foodItemId)
                .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR, "Không tìm thấy món lẻ"));
        Map<String, Object> beforeSnapshot = foodItemSnapshot(foodItem);

        foodItem.setActive(false);
        FoodItem saved = foodItemRepository.save(foodItem);

        List<FoodVariant> variants = foodVariantRepository
                .findByFoodItem_FoodItemIdOrderByDisplayOrderAscFoodVariantIdAsc(foodItemId);
        for (FoodVariant variant : variants) {
            variant.setActive(false);
        }
        if (!variants.isEmpty()) {
            foodVariantRepository.saveAll(variants);
        }
        comboAuditLogService.record(
                "FOOD_ITEM",
                saved.getFoodItemId(),
                saved.getName(),
                "DISABLE",
                "Vô hiệu hóa món lẻ " + saved.getName(),
                beforeSnapshot,
                foodItemSnapshot(saved),
                null
        );
    }

    private FoodItemResponse toResponse(FoodItem foodItem, boolean includeFinancials, boolean activeVariantsOnly) {
        List<FoodVariantResponse> variants = toVariantResponses(foodItem, includeFinancials, activeVariantsOnly);
        int totalStockQuantity = variants.stream()
                .mapToInt(variant -> variant.getStockQuantity() == null ? 0 : variant.getStockQuantity())
                .sum();
        long inventoryCost = includeFinancials
                ? variants.stream().mapToLong(variant -> variant.getInventoryCost() == null ? 0L : variant.getInventoryCost()).sum()
                : 0L;
        long potentialRevenue = includeFinancials
                ? variants.stream().mapToLong(variant -> variant.getPotentialRevenue() == null ? 0L : variant.getPotentialRevenue()).sum()
                : 0L;
        long potentialProfit = includeFinancials
                ? variants.stream().mapToLong(variant -> variant.getPotentialProfit() == null ? 0L : variant.getPotentialProfit()).sum()
                : 0L;

        return FoodItemResponse.builder()
                .foodItemId(foodItem.getFoodItemId())
                .name(foodItem.getName())
                .price(foodItem.getPrice())
                .imageUrl(foodItem.getImageUrl())
                .category(foodItem.getCategory())
                .isActive(foodItem.isActive())
                .variants(variants)
                .totalStockQuantity(totalStockQuantity)
                .inventoryCost(includeFinancials ? inventoryCost : null)
                .actualRevenue(includeFinancials ? getActualRevenue(foodItem.getFoodItemId()) : null)
                .potentialRevenue(includeFinancials ? potentialRevenue : null)
                .potentialProfit(includeFinancials ? potentialProfit : null)
                .build();
    }

    private Long getActualRevenue(Long foodItemId) {
        if (foodItemId == null) {
            return 0L;
        }
        Long revenue = bookingFoodItemRepository.sumRevenueByFoodItemIdAndBookingStatus(foodItemId, BookingStatus.SUCCESS);
        return revenue == null ? 0L : revenue;
    }

    private List<String> syncVariants(FoodItem foodItem, FoodItemRequest request) {
        List<FoodVariantRequest> variantRequests = normalizeVariantRequests(request);
        boolean hasActiveVariant = variantRequests.stream().anyMatch(FoodVariantRequest::isActive);
        if (request.isActive() && !hasActiveVariant) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Món đang kinh doanh phải có ít nhất một biến thể đang bán.");
        }

        List<FoodVariant> existingVariants = foodVariantRepository
                .findByFoodItem_FoodItemIdOrderByDisplayOrderAscFoodVariantIdAsc(foodItem.getFoodItemId());
        Map<Long, FoodVariant> existingById = existingVariants.stream()
                .filter(variant -> variant.getFoodVariantId() != null)
                .collect(Collectors.toMap(FoodVariant::getFoodVariantId, Function.identity()));
        Set<Long> submittedIds = new HashSet<>();
        List<FoodVariant> variantsToSave = new ArrayList<>();
        List<String> lowStockNotifications = new ArrayList<>();
        List<String> variantChanges = new ArrayList<>();

        for (int i = 0; i < variantRequests.size(); i++) {
            FoodVariantRequest variantRequest = variantRequests.get(i);
            FoodVariant variant = null;
            int oldStockQuantity = 0;
            boolean existingVariant = variantRequest.getFoodVariantId() != null;
            boolean oldActive = false;
            if (variantRequest.getFoodVariantId() != null) {
                variant = existingById.get(variantRequest.getFoodVariantId());
                if (variant == null) {
                    throw new AppException(ErrorCode.VALIDATION_ERROR, "Biến thể không thuộc món này.");
                }
                oldStockQuantity = variant.getStockQuantity() == null ? 0 : variant.getStockQuantity();
                oldActive = variant.isActive();
                submittedIds.add(variantRequest.getFoodVariantId());
            }
            if (variant == null) {
                variant = FoodVariant.builder()
                        .foodItem(foodItem)
                        .build();
            }

            variant.setVariantName(normalizeRequired(variantRequest.getVariantName(), "Tên biến thể không được để trống."));
            variant.setSizeLabel(normalizeOptional(variantRequest.getSizeLabel()));
            variant.setFlavor(normalizeOptional(variantRequest.getFlavor()));
            variant.setPrice(variantRequest.getPrice() == null ? 0L : variantRequest.getPrice());
            variant.setPurchasePrice(variantRequest.getPurchasePrice() == null ? 0L : variantRequest.getPurchasePrice());
            variant.setActive(variantRequest.isActive());
            variant.setDisplayOrder(variantRequest.getDisplayOrder() == null ? i : variantRequest.getDisplayOrder());
            int newStockQuantity = variantRequest.getStockQuantity() == null ? 0 : variantRequest.getStockQuantity();
            if (newStockQuantity < 0) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Số lượng tồn không được âm.");
            }
            String adjustmentReason = normalizeOptional(variantRequest.getStockAdjustmentReason());
            if (variantRequest.getFoodVariantId() != null && newStockQuantity < oldStockQuantity && adjustmentReason == null) {
                throw new AppException(
                        ErrorCode.VALIDATION_ERROR,
                        "Vui lòng nhập lý do khi giảm tồn kho cho " + buildVariantDisplayName(variant) + "."
                );
            }
            variant.setStockQuantity(newStockQuantity);
            if (existingVariant && oldActive != variantRequest.isActive()) {
                variantChanges.add((variantRequest.isActive() ? "Bật bán biến thể " : "Ẩn biến thể ") + buildVariantDisplayName(variant));
            }
            if (existingVariant && newStockQuantity != oldStockQuantity) {
                String reasonText = adjustmentReason == null ? "" : ", lý do: " + adjustmentReason;
                variantChanges.add("Tồn kho " + buildVariantDisplayName(variant) + ": " + oldStockQuantity + " -> " + newStockQuantity + reasonText);
            }
            if (existingVariant
                    && oldStockQuantity >= FOOD_STOCK_ALERT_THRESHOLD
                    && newStockQuantity < FOOD_STOCK_ALERT_THRESHOLD) {
                lowStockNotifications.add(buildLowStockAdjustmentDescription(variant, newStockQuantity, adjustmentReason));
            }
            variantsToSave.add(variant);
        }

        for (FoodVariant existing : existingVariants) {
            Long variantId = existing.getFoodVariantId();
            if (variantId == null || submittedIds.contains(variantId)) {
                continue;
            }
            if (comboItemRepository.existsByFoodVariant_FoodVariantId(variantId)
                    || bookingFoodItemRepository.existsByFoodVariant_FoodVariantId(variantId)) {
                existing.setActive(false);
                variantsToSave.add(existing);
                variantChanges.add("Ẩn biến thể " + buildVariantDisplayName(existing));
            } else {
                variantChanges.add("Xóa biến thể " + buildVariantDisplayName(existing));
                foodVariantRepository.delete(existing);
            }
        }

        foodVariantRepository.saveAll(variantsToSave);
        lowStockNotifications.forEach(description -> dashboardNotificationService.createNotification(
                "Cần nhập kho bắp nước",
                description,
                "FOOD_STOCK"
        ));
        return variantChanges;
    }

    private List<FoodVariantRequest> normalizeVariantRequests(FoodItemRequest request) {
        if (request.getVariants() == null || request.getVariants().isEmpty()) {
            return List.of(FoodVariantRequest.builder()
                    .variantName("Mặc định")
                    .price(request.getPrice() == null ? 0L : request.getPrice())
                    .purchasePrice(0L)
                    .isActive(request.isActive())
                    .displayOrder(0)
                    .stockQuantity(0)
                    .build());
        }
        return request.getVariants().stream()
                .filter(variant -> variant != null)
                .toList();
    }

    private List<FoodVariantResponse> toVariantResponses(FoodItem foodItem, boolean includeFinancials, boolean activeVariantsOnly) {
        List<FoodVariant> variants = foodVariantRepository
                .findByFoodItem_FoodItemIdOrderByDisplayOrderAscFoodVariantIdAsc(foodItem.getFoodItemId());
        if (variants.isEmpty()) {
            return List.of(FoodVariantResponse.builder()
                    .foodItemId(foodItem.getFoodItemId())
                    .variantName("Mặc định")
                    .price(foodItem.getPrice())
                    .isActive(foodItem.isActive())
                    .displayOrder(0)
                    .displayName(foodItem.getName())
                    .stockQuantity(0)
                    .purchasePrice(includeFinancials ? 0L : null)
                    .inventoryCost(includeFinancials ? 0L : null)
                    .potentialRevenue(includeFinancials ? 0L : null)
                    .potentialProfit(includeFinancials ? 0L : null)
                    .build());
        }
        return variants.stream()
                .filter(variant -> !activeVariantsOnly || variant.isActive())
                .sorted(Comparator
                        .comparing(FoodVariant::getDisplayOrder, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(FoodVariant::getFoodVariantId, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(variant -> toVariantResponse(variant, includeFinancials))
                .toList();
    }

    private FoodVariantResponse toVariantResponse(FoodVariant variant, boolean includeFinancials) {
        int stockQuantity = variant.getStockQuantity() == null ? 0 : variant.getStockQuantity();
        long price = variant.getPrice() == null ? 0L : variant.getPrice();
        long purchasePrice = variant.getPurchasePrice() == null ? 0L : variant.getPurchasePrice();
        long inventoryCost = purchasePrice * stockQuantity;
        long potentialRevenue = price * stockQuantity;

        return FoodVariantResponse.builder()
                .foodVariantId(variant.getFoodVariantId())
                .foodItemId(variant.getFoodItem().getFoodItemId())
                .variantName(variant.getVariantName())
                .sizeLabel(variant.getSizeLabel())
                .flavor(variant.getFlavor())
                .price(price)
                .purchasePrice(includeFinancials ? purchasePrice : null)
                .isActive(variant.isActive())
                .displayOrder(variant.getDisplayOrder())
                .displayName(buildVariantDisplayName(variant))
                .stockQuantity(stockQuantity)
                .inventoryCost(includeFinancials ? inventoryCost : null)
                .potentialRevenue(includeFinancials ? potentialRevenue : null)
                .potentialProfit(includeFinancials ? potentialRevenue - inventoryCost : null)
                .build();
    }

    private String buildVariantDisplayName(FoodVariant variant) {
        List<String> parts = new ArrayList<>();
        if (variant.getFoodItem() != null && variant.getFoodItem().getName() != null) {
            parts.add(variant.getFoodItem().getName());
        }
        if (variant.getVariantName() != null && !variant.getVariantName().isBlank()
                && !"Mặc định".equalsIgnoreCase(variant.getVariantName().trim())) {
            parts.add(variant.getVariantName().trim());
        }
        if (variant.getSizeLabel() != null && !variant.getSizeLabel().isBlank()) {
            parts.add("Size " + variant.getSizeLabel().trim());
        }
        if (variant.getFlavor() != null && !variant.getFlavor().isBlank()) {
            parts.add(variant.getFlavor().trim());
        }
        return parts.isEmpty() ? "Món chưa đặt tên" : String.join(" - ", parts);
    }

    private Map<String, Object> foodItemSnapshot(FoodItem foodItem) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("foodItemId", foodItem.getFoodItemId());
        snapshot.put("name", foodItem.getName());
        snapshot.put("price", foodItem.getPrice());
        snapshot.put("imageUrl", foodItem.getImageUrl());
        snapshot.put("category", foodItem.getCategory());
        snapshot.put("isActive", foodItem.isActive());
        snapshot.put("variants", foodVariantRepository
                .findByFoodItem_FoodItemIdOrderByDisplayOrderAscFoodVariantIdAsc(foodItem.getFoodItemId())
                .stream()
                .map(this::foodVariantSnapshot)
                .toList());
        return snapshot;
    }

    private Map<String, Object> foodVariantSnapshot(FoodVariant variant) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("foodVariantId", variant.getFoodVariantId());
        snapshot.put("variantName", variant.getVariantName());
        snapshot.put("sizeLabel", variant.getSizeLabel());
        snapshot.put("flavor", variant.getFlavor());
        snapshot.put("price", variant.getPrice());
        snapshot.put("purchasePrice", variant.getPurchasePrice());
        snapshot.put("stockQuantity", variant.getStockQuantity());
        snapshot.put("isActive", variant.isActive());
        snapshot.put("displayOrder", variant.getDisplayOrder());
        return snapshot;
    }

    private String buildLowStockAdjustmentDescription(FoodVariant variant, int stockQuantity, String adjustmentReason) {
        String reasonText = adjustmentReason == null ? "" : " Lý do: " + adjustmentReason + ".";
        return "Tồn kho " + buildVariantDisplayName(variant) + " hiện còn " + stockQuantity
                + " phần sau điều chỉnh." + reasonText + " Cần nhập kho kịp thời.";
    }

    private String normalizeRequired(String value, String errorMessage) {
        if (value == null || value.isBlank()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, errorMessage);
        }
        return value.trim();
    }

    private String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
