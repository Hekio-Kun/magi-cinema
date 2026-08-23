package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import jakarta.transaction.Transactional;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.combo.*;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Combo;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.ComboItem;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.FoodItem;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.FoodVariant;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.BookingStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ComboStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.BookingComboRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.ComboItemRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.ComboRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.FoodItemRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.FoodVariantRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ComboService {
    ComboRepository comboRepository;
    BookingComboRepository bookingComboRepository;
    ComboItemRepository comboItemRepository;
    FoodItemRepository foodItemRepository;
    FoodVariantRepository foodVariantRepository;
    CloudinaryService cloudinaryService;
    ComboAuditLogService comboAuditLogService;

    public List<ComboResponse> getCombos(ComboStatus status) {
        if (status != null) {
            return comboRepository.findAllByStatus(status).stream()
                    .sorted(Comparator.comparing(Combo::getComboId, Comparator.nullsLast(Comparator.naturalOrder())))
                    .map(combo -> toResponse(combo, true))
                    .toList();
        }
        return comboRepository.findAll().stream()
                .sorted(Comparator.comparing(Combo::getComboId, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(combo -> toResponse(combo, true))
                .toList();
    }

    public List<ComboResponse> getActiveCombos() {
        return comboRepository.findAllByStatus(ComboStatus.ACTIVE).stream()
                .sorted(Comparator.comparing(Combo::getComboId, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(combo -> toResponse(combo, false))
                .toList();
    }

    public ComboResponse getCombo(Long comboId) {
        return toResponse(getComboEntity(comboId), false);
    }

    @Transactional
    public ComboResponse createCombo(ComboRequest request) {
        validateRequest(request);
        String name = normalizeRequired(request.getName());
        if (comboRepository.existsByNameIgnoreCase(name)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Tên combo đã tồn tại.");
        }

        Combo combo = Combo.builder()
                .name(name)
                .description(normalizeOptional(request.getDescription()))
                .price(request.getPrice())
                .imageUrl(normalizeOptional(request.getImageUrl()))
                .items(new ArrayList<>())
                .build();
        
        Combo savedCombo = comboRepository.save(combo);
        saveComboItems(savedCombo, request.getItems());
        ComboResponse response = toResponse(savedCombo, true);
        comboAuditLogService.record(
                "COMBO",
                savedCombo.getComboId(),
                savedCombo.getName(),
                "CREATE",
                "Tạo combo " + savedCombo.getName(),
                null,
                comboSnapshot(savedCombo),
                null
        );
        return response;
    }

    @Transactional
    public ComboResponse createCombo(ComboMultipartRequest request) {
        validateRequest(request);
        String name = normalizeRequired(request.getName());
        if (comboRepository.existsByNameIgnoreCase(name)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Tên combo đã tồn tại.");
        }

        String imageUrl = uploadImageIfPresent(request.getImage());
        Combo combo = Combo.builder()
                .name(name)
                .description(normalizeOptional(request.getDescription()))
                .price(request.getPrice())
                .imageUrl(imageUrl)
                .items(new ArrayList<>())
                .build();
        
        Combo savedCombo = comboRepository.save(combo);
        saveComboItems(savedCombo, request.getItems());
        ComboResponse response = toResponse(savedCombo, true);
        comboAuditLogService.record(
                "COMBO",
                savedCombo.getComboId(),
                savedCombo.getName(),
                "CREATE",
                "Tạo combo " + savedCombo.getName(),
                null,
                comboSnapshot(savedCombo),
                null
        );
        return response;
    }

    @Transactional
    public ComboResponse updateCombo(Long comboId, ComboRequest request) {
        validateRequest(request);
        Combo combo = getComboEntity(comboId);
        Map<String, Object> beforeSnapshot = comboSnapshot(combo);
        String name = normalizeRequired(request.getName());
        if (comboRepository.existsByNameIgnoreCaseAndComboIdNot(name, comboId)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Tên combo đã tồn tại.");
        }

        combo.setName(name);
        combo.setDescription(normalizeOptional(request.getDescription()));
        combo.setPrice(request.getPrice());
        combo.setImageUrl(normalizeOptional(request.getImageUrl()));
        
        Combo savedCombo = comboRepository.save(combo);
        updateComboItems(savedCombo, request.getItems());
        ComboResponse response = toResponse(savedCombo, true);
        comboAuditLogService.record(
                "COMBO",
                savedCombo.getComboId(),
                savedCombo.getName(),
                "UPDATE",
                "Cập nhật combo " + savedCombo.getName(),
                beforeSnapshot,
                comboSnapshot(savedCombo),
                null
        );
        return response;
    }

    @Transactional
    public ComboResponse updateCombo(Long comboId, ComboMultipartRequest request) {
        validateRequest(request);
        Combo combo = getComboEntity(comboId);
        Map<String, Object> beforeSnapshot = comboSnapshot(combo);
        String name = normalizeRequired(request.getName());
        if (comboRepository.existsByNameIgnoreCaseAndComboIdNot(name, comboId)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Tên combo đã tồn tại.");
        }

        combo.setName(name);
        combo.setDescription(normalizeOptional(request.getDescription()));
        combo.setPrice(request.getPrice());

        if (hasImage(request.getImage())) {
            cloudinaryService.deleteImage(combo.getImageUrl());
            combo.setImageUrl(cloudinaryService.uploadImage(request.getImage()));
        }

        Combo savedCombo = comboRepository.save(combo);
        updateComboItems(savedCombo, request.getItems());
        ComboResponse response = toResponse(savedCombo, true);
        comboAuditLogService.record(
                "COMBO",
                savedCombo.getComboId(),
                savedCombo.getName(),
                "UPDATE",
                "Cập nhật combo " + savedCombo.getName(),
                beforeSnapshot,
                comboSnapshot(savedCombo),
                null
        );
        return response;
    }

    @Transactional
    public void deleteCombo(Long comboId) {
        Combo combo = getComboEntity(comboId);
        Map<String, Object> beforeSnapshot = comboSnapshot(combo);
        combo.setStatus(ComboStatus.INACTIVE);
        Combo savedCombo = comboRepository.save(combo);
        comboAuditLogService.record(
                "COMBO",
                savedCombo.getComboId(),
                savedCombo.getName(),
                "DISABLE",
                "Vô hiệu hóa combo " + savedCombo.getName(),
                beforeSnapshot,
                comboSnapshot(savedCombo),
                null
        );
    }

    @Transactional
    public ComboResponse restoreCombo(Long comboId) {
        Combo combo = getComboEntity(comboId);
        if (combo.getItems() == null || combo.getItems().isEmpty()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Combo cần có ít nhất một thành phần để khôi phục.");
        }
        for (ComboItem item : combo.getItems()) {
            FoodVariant variant = item.getFoodVariant();
            FoodItem foodItem = item.getFoodItem();
            if (variant == null || !variant.isActive() || foodItem == null || !foodItem.isActive()) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Combo có món lẻ đã ẩn. Vui lòng khôi phục món lẻ trước.");
            }
        }

        Map<String, Object> beforeSnapshot = comboSnapshot(combo);
        combo.setStatus(ComboStatus.ACTIVE);
        Combo savedCombo = comboRepository.save(combo);
        ComboResponse response = toResponse(savedCombo, true);
        comboAuditLogService.record(
                "COMBO",
                savedCombo.getComboId(),
                savedCombo.getName(),
                "RESTORE",
                "Khôi phục combo " + savedCombo.getName(),
                beforeSnapshot,
                comboSnapshot(savedCombo),
                null
        );
        return response;
    }

    private Combo getComboEntity(Long comboId) {
        return comboRepository.findById(comboId)
                .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR, "Không tìm thấy combo."));
    }

    private void validateRequest(ComboRequest request) {
        if (request == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Request không được để trống");
        }
        if (request.getName() == null || request.getName().isBlank()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Tên combo không được để trống");
        }
        if (request.getPrice() == null || request.getPrice() < 1) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Giá combo phải lớn hơn 0");
        }
    }

    private void validateRequest(ComboMultipartRequest request) {
        if (request == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Request không được để trống");
        }
        if (request.getName() == null || request.getName().isBlank()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Tên combo không được để trống");
        }
        if (request.getPrice() == null || request.getPrice() < 1) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Giá combo phải lớn hơn 0");
        }
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

    private void saveComboItems(Combo combo, List<ComboItemRequest> itemRequests) {
        if (itemRequests == null || itemRequests.isEmpty()) {
            return;
        }

        List<ComboItem> comboItems = itemRequests.stream()
                .map(req -> {
                    ResolvedComboFood resolvedFood = resolveComboFood(req);
                    return ComboItem.builder()
                            .combo(combo)
                            .foodItem(resolvedFood.foodItem())
                            .foodVariant(resolvedFood.foodVariant())
                            .quantity(req.getQuantity())
                            .build();
                }).collect(Collectors.toList());

        comboItemRepository.saveAll(comboItems);
        combo.setItems(comboItems);
    }

    private void updateComboItems(Combo combo, List<ComboItemRequest> itemRequests) {
        // Xóa các items cũ
        comboItemRepository.deleteByCombo_ComboId(combo.getComboId());
        
        // Lưu các items mới
        saveComboItems(combo, itemRequests);
    }

    private ComboResponse toResponse(Combo combo, boolean includeFinancials) {
        List<ComboItemResponse> items = combo.getItems() == null ? new ArrayList<>() : combo.getItems().stream()
                .map(comboItem -> toComboItemResponse(comboItem, includeFinancials))
                .toList();
        int availableQuantity = calculateAvailableQuantity(combo);
        long price = combo.getPrice() == null ? 0L : combo.getPrice();
        long costPerCombo = calculateCostPerCombo(combo);
        long profitPerCombo = price - costPerCombo;

        return ComboResponse.builder()
                .comboId(combo.getComboId())
                .name(combo.getName())
                .description(combo.getDescription())
                .price(price)
                .imageUrl(combo.getImageUrl())
                .status(combo.getStatus())
                .availableQuantity(availableQuantity)
                .costPerCombo(includeFinancials ? costPerCombo : null)
                .profitPerCombo(includeFinancials ? profitPerCombo : null)
                .inventoryCost(includeFinancials ? costPerCombo * availableQuantity : null)
                .actualRevenue(includeFinancials ? getActualRevenue(combo.getComboId()) : null)
                .potentialRevenue(includeFinancials ? price * availableQuantity : null)
                .potentialProfit(includeFinancials ? profitPerCombo * availableQuantity : null)
                .items(items)
                .build();
    }

    private Long getActualRevenue(Long comboId) {
        if (comboId == null) {
            return 0L;
        }
        Long revenue = bookingComboRepository.sumRevenueByComboIdAndBookingStatus(comboId, BookingStatus.SUCCESS);
        return revenue == null ? 0L : revenue;
    }

    private Map<String, Object> comboSnapshot(Combo combo) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("comboId", combo.getComboId());
        snapshot.put("name", combo.getName());
        snapshot.put("description", combo.getDescription());
        snapshot.put("price", combo.getPrice());
        snapshot.put("imageUrl", combo.getImageUrl());
        snapshot.put("status", combo.getStatus() == null ? null : combo.getStatus().name());
        snapshot.put("items", combo.getItems() == null ? List.of() : combo.getItems().stream()
                .sorted(Comparator.comparing(ComboItem::getComboItemId, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(this::comboItemSnapshot)
                .toList());
        return snapshot;
    }

    private Map<String, Object> comboItemSnapshot(ComboItem comboItem) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        FoodItem foodItem = comboItem.getFoodItem();
        FoodVariant variant = comboItem.getFoodVariant();
        snapshot.put("comboItemId", comboItem.getComboItemId());
        snapshot.put("foodItemId", foodItem == null ? null : foodItem.getFoodItemId());
        snapshot.put("foodVariantId", variant == null ? null : variant.getFoodVariantId());
        snapshot.put("displayName", variant == null ? (foodItem == null ? "Món đã xóa" : foodItem.getName()) : buildVariantDisplayName(variant));
        snapshot.put("quantity", comboItem.getQuantity());
        return snapshot;
    }

    private String normalizeRequired(String value) {
        return value == null ? "" : value.trim();
    }

    private String normalizeOptional(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private ResolvedComboFood resolveComboFood(ComboItemRequest req) {
        if (req.getFoodVariantId() != null) {
            FoodVariant variant = foodVariantRepository.findById(req.getFoodVariantId())
                    .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR, "Không tìm thấy biến thể món lẻ: " + req.getFoodVariantId()));
            if (!variant.isActive()) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Biến thể món lẻ đã ngừng bán: " + buildVariantDisplayName(variant));
            }
            if (variant.getFoodItem() == null || !variant.getFoodItem().isActive()) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Món lẻ đã ngừng bán: " + buildVariantDisplayName(variant));
            }
            return new ResolvedComboFood(variant.getFoodItem(), variant);
        }

        if (req.getFoodItemId() == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Vui lòng chọn món lẻ hoặc biến thể món lẻ cho combo.");
        }
        FoodItem foodItem = foodItemRepository.findById(req.getFoodItemId())
                .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR, "Không tìm thấy món lẻ: " + req.getFoodItemId()));
        if (!foodItem.isActive()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Món lẻ đã ngừng bán: " + foodItem.getName());
        }
        return new ResolvedComboFood(foodItem, null);
    }

    private ComboItemResponse toComboItemResponse(ComboItem comboItem, boolean includeFinancials) {
        FoodItem foodItem = comboItem.getFoodItem();
        FoodVariant variant = comboItem.getFoodVariant();
        String foodItemName = foodItem == null ? "Món đã xóa" : foodItem.getName();
        String variantName = variant == null ? null : variant.getVariantName();
        Long unitPrice = variant == null
                ? (foodItem == null ? null : foodItem.getPrice())
                : variant.getPrice();
        Long unitCost = variant == null ? 0L : (variant.getPurchasePrice() == null ? 0L : variant.getPurchasePrice());
        int quantity = comboItem.getQuantity() == null ? 0 : comboItem.getQuantity();

        return ComboItemResponse.builder()
                .comboItemId(comboItem.getComboItemId())
                .foodItemId(foodItem == null ? null : foodItem.getFoodItemId())
                .foodVariantId(variant == null ? null : variant.getFoodVariantId())
                .foodItemName(foodItemName)
                .variantName(variantName)
                .displayName(variant == null ? foodItemName : buildVariantDisplayName(variant))
                .unitPrice(unitPrice)
                .unitCost(includeFinancials ? unitCost : null)
                .totalCost(includeFinancials ? unitCost * quantity : null)
                .quantity(quantity)
                .build();
    }

    private Long calculateCostPerCombo(Combo combo) {
        if (combo.getItems() == null || combo.getItems().isEmpty()) {
            return 0L;
        }
        long totalCost = 0L;
        for (ComboItem item : combo.getItems()) {
            FoodVariant variant = item.getFoodVariant();
            int quantity = item.getQuantity() == null || item.getQuantity() <= 0 ? 1 : item.getQuantity();
            long purchasePrice = variant == null || variant.getPurchasePrice() == null ? 0L : variant.getPurchasePrice();
            totalCost += purchasePrice * quantity;
        }
        return totalCost;
    }

    private Integer calculateAvailableQuantity(Combo combo) {
        if (combo.getItems() == null || combo.getItems().isEmpty()) {
            return 0;
        }
        int available = Integer.MAX_VALUE;
        for (ComboItem item : combo.getItems()) {
            FoodVariant variant = item.getFoodVariant();
            if (variant == null || !variant.isActive() || variant.getFoodItem() == null || !variant.getFoodItem().isActive()) {
                return 0;
            }
            int quantityPerCombo = item.getQuantity() == null || item.getQuantity() <= 0 ? 1 : item.getQuantity();
            int stock = variant.getStockQuantity() == null ? 0 : variant.getStockQuantity();
            available = Math.min(available, stock / quantityPerCombo);
        }
        return available == Integer.MAX_VALUE ? 0 : available;
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

    private record ResolvedComboFood(FoodItem foodItem, FoodVariant foodVariant) {
    }
}
