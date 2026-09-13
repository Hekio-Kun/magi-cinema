package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import jakarta.persistence.EntityManager;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.PageResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.concession.ConcessionOrderItemRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.concession.ConcessionOrderItemResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.concession.ConcessionOrderRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.concession.ConcessionOrderResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Combo;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.ComboItem;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.CashierShift;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.ConcessionOrder;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.ConcessionOrderItem;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.ConcessionOrderStockReservation;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.FoodVariant;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.User;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ConcessionOrderItemType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ConcessionOrderStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PaymentMethod;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.ComboRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.ConcessionOrderRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.ConcessionOrderStockReservationRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.FoodVariantRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.UserRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ComboStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ConcessionOrderService {
    private static final int FOOD_STOCK_ALERT_THRESHOLD = 200;

    ConcessionOrderRepository orderRepository;
    ConcessionOrderStockReservationRepository reservationRepository;
    ComboRepository comboRepository;
    FoodVariantRepository foodVariantRepository;
    UserRepository userRepository;
    ComboAuditLogService comboAuditLogService;
    DashboardNotificationService dashboardNotificationService;
    EntityManager entityManager;
    CashierShiftService cashierShiftService;

    @Transactional
    public ConcessionOrderResponse createOrder(ConcessionOrderRequest request) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Đơn bắp nước phải có ít nhất một sản phẩm.");
        }
        if (request.getItems().size() > 100) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Đơn bắp nước không được vượt quá 100 dòng sản phẩm.");
        }

        Map<Long, StockRequirement> requirements = new LinkedHashMap<>();
        List<LineDraft> lines = new ArrayList<>();
        long total = 0L;
        long cost = 0L;
        for (ConcessionOrderItemRequest itemRequest : request.getItems()) {
            validateLineRequest(itemRequest);
            int quantity = itemRequest.getQuantity();
            if (itemRequest.getComboId() != null) {
                Combo combo = comboRepository.findById(itemRequest.getComboId())
                        .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR, "Combo không tồn tại."));
                if (combo.getStatus() != ComboStatus.ACTIVE) {
                    throw new AppException(ErrorCode.VALIDATION_ERROR, "Combo đã ngừng bán: " + combo.getName());
                }
                if (combo.getItems() == null || combo.getItems().isEmpty()) {
                    throw new AppException(ErrorCode.VALIDATION_ERROR, "Combo chưa có thành phần: " + combo.getName());
                }
                long comboCost = 0L;
                for (ComboItem comboItem : combo.getItems()) {
                    FoodVariant variant = resolveActiveVariant(comboItem.getFoodVariant());
                    int componentQuantity = positiveQuantity(comboItem.getQuantity(), "Số lượng thành phần combo không hợp lệ.");
                    addRequirement(requirements, variant, multiply(componentQuantity, quantity));
                    comboCost = add(comboCost, multiply(value(variant.getPurchasePrice()), componentQuantity));
                }
                long lineTotal = multiply(value(combo.getPrice()), quantity);
                long lineCost = multiply(comboCost, quantity);
                total = add(total, lineTotal);
                cost = add(cost, lineCost);
                lines.add(new LineDraft(ConcessionOrderItemType.COMBO, combo, null, combo.getName(), value(combo.getPrice()), comboCost, quantity, lineTotal, lineCost));
            } else {
                FoodVariant variant = resolveActiveVariant(foodVariantRepository.findById(itemRequest.getFoodVariantId()).orElse(null));
                long unitPrice = value(variant.getPrice());
                long unitCost = value(variant.getPurchasePrice());
                long lineTotal = multiply(unitPrice, quantity);
                long lineCost = multiply(unitCost, quantity);
                total = add(total, lineTotal);
                cost = add(cost, lineCost);
                lines.add(new LineDraft(ConcessionOrderItemType.FOOD_VARIANT, null, variant, displayName(variant), unitPrice, unitCost, quantity, lineTotal, lineCost));
            }
        }

        validatePayment(request.getPaymentMethod(), request.getCashReceived(), total);
        CashierShift cashierShift = cashierShiftService.requireOpenShiftForCurrentUser();
        reserveStock(requirements);

        Long cashReceived = request.getPaymentMethod() == PaymentMethod.CASH ? request.getCashReceived() : null;
        ConcessionOrder order = ConcessionOrder.builder()
                .orderCode(generateOrderCode())
                .customerName(clean(request.getCustomerName()))
                .customerPhone(clean(request.getCustomerPhone()))
                .totalAmount(total)
                .costAmount(cost)
                .profitAmount(total - cost)
                .cashReceived(cashReceived)
                .changeAmount(request.getPaymentMethod() == PaymentMethod.CASH ? cashReceived - total : 0L)
                .paymentMethod(request.getPaymentMethod())
                .status(ConcessionOrderStatus.PAID)
                .soldBy(resolveCurrentUser())
                .cashierShift(cashierShift)
                .items(new ArrayList<>())
                .stockReservations(new ArrayList<>())
                .build();
        ConcessionOrder saved = orderRepository.save(order);
        for (LineDraft line : lines) {
            saved.getItems().add(ConcessionOrderItem.builder()
                    .order(saved)
                    .itemType(line.itemType())
                    .combo(line.combo())
                    .foodVariant(line.variant())
                    .nameSnapshot(line.name())
                    .unitPriceSnapshot(line.unitPrice())
                    .unitCostSnapshot(line.unitCost())
                    .quantity(line.quantity())
                    .lineTotal(line.lineTotal())
                    .lineCostTotal(line.lineCost())
                    .build());
        }
        for (StockRequirement requirement : requirements.values()) {
            saved.getStockReservations().add(ConcessionOrderStockReservation.builder()
                    .order(saved)
                    .foodVariant(requirement.variant())
                    .quantity(requirement.quantity())
                    .build());
        }
        saved = orderRepository.save(saved);
        comboAuditLogService.record("CONCESSION_ORDER", saved.getConcessionOrderId(), saved.getOrderCode(), "SALE",
                "Bán lẻ bắp nước " + saved.getOrderCode(), null, orderSnapshot(saved), null);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public PageResponse<ConcessionOrderResponse> getOrders(LocalDate fromDate, LocalDate toDate,
                                                            ConcessionOrderStatus status, int page, int size) {
        LocalDate to = toDate == null ? LocalDate.now() : toDate;
        LocalDate from = fromDate == null ? to.minusDays(30) : fromDate;
        if (from.isAfter(to) || from.plusDays(366).isBefore(to)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Khoảng thời gian tìm kiếm không hợp lệ.");
        }
        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(size, 100));
        PageRequest pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<ConcessionOrder> orders = status == null
                ? orderRepository.findByCreatedAtBetween(from.atStartOfDay(), to.plusDays(1).atStartOfDay(), pageable)
                : orderRepository.findByCreatedAtBetweenAndStatus(from.atStartOfDay(), to.plusDays(1).atStartOfDay(), status, pageable);
        return PageResponse.<ConcessionOrderResponse>builder()
                .content(orders.getContent().stream().map(this::toResponse).toList())
                .page(orders.getNumber()).size(orders.getSize())
                .totalElements(orders.getTotalElements()).totalPages(orders.getTotalPages()).build();
    }

    @Transactional(readOnly = true)
    public ConcessionOrderResponse getOrder(Long orderId) {
        return toResponse(orderRepository.findById(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR, "Không tìm thấy đơn bắp nước.")));
    }

    @Transactional
    public ConcessionOrderResponse cancelOrder(Long orderId, String reason) {
        ConcessionOrder order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR, "Không tìm thấy đơn bắp nước."));
        if (order.getStatus() == ConcessionOrderStatus.CANCELLED) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Đơn bắp nước đã được hủy trước đó.");
        }
        String normalizedReason = clean(reason);
        if (normalizedReason == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Vui lòng nhập lý do hủy đơn.");
        }
        Map<String, Object> beforeSnapshot = orderSnapshot(order);
        Map<Long, Integer> quantities = new LinkedHashMap<>();
        reservationRepository.findByOrder_ConcessionOrderId(orderId).forEach(reservation -> {
            if (reservation.getFoodVariant() != null && reservation.getFoodVariant().getFoodVariantId() != null) {
                quantities.merge(reservation.getFoodVariant().getFoodVariantId(), Math.max(0, reservation.getQuantity()), Integer::sum);
            }
        });
        restoreStock(quantities);
        order.setStatus(ConcessionOrderStatus.CANCELLED);
        order.setCancelledAt(LocalDateTime.now());
        order.setCancelReason(normalizedReason);
        ConcessionOrder saved = orderRepository.save(order);
        comboAuditLogService.record("CONCESSION_ORDER", saved.getConcessionOrderId(), saved.getOrderCode(), "VOID",
                "Hủy đơn bắp nước " + saved.getOrderCode(), beforeSnapshot, orderSnapshot(saved), normalizedReason);
        return toResponse(saved);
    }

    private void validateLineRequest(ConcessionOrderItemRequest request) {
        boolean combo = request.getComboId() != null;
        boolean food = request.getFoodVariantId() != null;
        if (combo == food) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Mỗi dòng phải chọn đúng một combo hoặc một món lẻ.");
        }
        positiveQuantity(request.getQuantity(), "Số lượng sản phẩm phải lớn hơn 0.");
    }

    private FoodVariant resolveActiveVariant(FoodVariant variant) {
        if (variant == null || variant.getFoodVariantId() == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Biến thể món lẻ không tồn tại.");
        }
        if (!variant.isActive() || variant.getFoodItem() == null || !variant.getFoodItem().isActive()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Món lẻ đã ngừng bán: " + displayName(variant));
        }
        return variant;
    }

    private void addRequirement(Map<Long, StockRequirement> requirements, FoodVariant variant, int quantity) {
        if (quantity <= 0) throw new AppException(ErrorCode.VALIDATION_ERROR, "Số lượng tồn kho không hợp lệ.");
        Long id = variant.getFoodVariantId();
        StockRequirement existing = requirements.get(id);
        requirements.put(id, existing == null ? new StockRequirement(variant, quantity)
                : new StockRequirement(variant, addInt(existing.quantity(), quantity)));
    }

    private void reserveStock(Map<Long, StockRequirement> requirements) {
        if (requirements.isEmpty()) return;
        List<Long> ids = new ArrayList<>(requirements.keySet());
        Collections.sort(ids);
        Map<Long, FoodVariant> locked = foodVariantRepository.findAllByIdsSorted(ids).stream()
                .collect(Collectors.toMap(FoodVariant::getFoodVariantId, value -> value));
        for (Long id : ids) {
            FoodVariant variant = locked.get(id);
            StockRequirement requirement = requirements.get(id);
            if (variant == null) throw new AppException(ErrorCode.VALIDATION_ERROR, "Biến thể món lẻ không tồn tại.");
            entityManager.refresh(variant);
            int stock = variant.getStockQuantity() == null ? 0 : variant.getStockQuantity();
            if (stock < requirement.quantity()) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Món " + displayName(variant) + " chỉ còn " + stock + " phần.");
            }
            int remaining = stock - requirement.quantity();
            variant.setStockQuantity(remaining);
            foodVariantRepository.save(variant);
            if (remaining < FOOD_STOCK_ALERT_THRESHOLD) {
                dashboardNotificationService.createNotification("Cần nhập kho bắp nước",
                        "Sau khi bán " + displayName(variant) + ", tồn kho còn " + remaining + " phần.", "FOOD_STOCK");
            }
        }
    }

    private void restoreStock(Map<Long, Integer> quantities) {
        if (quantities.isEmpty()) return;
        List<Long> ids = quantities.keySet().stream().sorted().toList();
        for (FoodVariant variant : foodVariantRepository.findAllByIdsSorted(ids)) {
            entityManager.refresh(variant);
            int stock = variant.getStockQuantity() == null ? 0 : variant.getStockQuantity();
            variant.setStockQuantity(addInt(stock, quantities.getOrDefault(variant.getFoodVariantId(), 0)));
            foodVariantRepository.save(variant);
        }
    }

    private void validatePayment(PaymentMethod method, Long cashReceived, long total) {
        if (method == null) throw new AppException(ErrorCode.VALIDATION_ERROR, "Vui lòng chọn phương thức thanh toán.");
        if (method == PaymentMethod.CASH) {
            if (cashReceived == null || cashReceived < total) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Tiền khách đưa phải lớn hơn hoặc bằng tổng tiền.");
            }
        } else {
            if (method != PaymentMethod.BANK_TRANSFER) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Quầy chỉ hỗ trợ tiền mặt hoặc chuyển khoản.");
            }
            if (cashReceived != null && cashReceived < 0) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Tiền khách đưa không hợp lệ.");
            }
        }
    }

    private User resolveCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) return null;
        return userRepository.findByUsername(authentication.getName()).orElse(null);
    }

    private String generateOrderCode() {
        return "MCF-" + LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE) + "-" +
                UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
    }

    private String displayName(FoodVariant variant) {
        if (variant == null || variant.getFoodItem() == null) return "Món lẻ";
        List<String> parts = new ArrayList<>();
        parts.add(variant.getFoodItem().getName());
        if (variant.getVariantName() != null && !variant.getVariantName().isBlank() && !"mặc định".equalsIgnoreCase(variant.getVariantName().trim())) parts.add(variant.getVariantName().trim());
        if (variant.getSizeLabel() != null && !variant.getSizeLabel().isBlank()) parts.add("Size " + variant.getSizeLabel().trim());
        if (variant.getFlavor() != null && !variant.getFlavor().isBlank()) parts.add(variant.getFlavor().trim());
        return String.join(" - ", parts);
    }

    private ConcessionOrderResponse toResponse(ConcessionOrder order) {
        return ConcessionOrderResponse.builder()
                .orderId(order.getConcessionOrderId()).orderCode(order.getOrderCode())
                .customerName(order.getCustomerName()).customerPhone(order.getCustomerPhone())
                .totalAmount(value(order.getTotalAmount())).costAmount(value(order.getCostAmount())).profitAmount(value(order.getProfitAmount()))
                .cashReceived(order.getCashReceived()).changeAmount(value(order.getChangeAmount()))
                .paymentMethod(order.getPaymentMethod()).status(order.getStatus())
                .soldByUsername(order.getSoldBy() == null ? null : order.getSoldBy().getUsername())
                .cancelReason(order.getCancelReason()).createdAt(order.getCreatedAt()).cancelledAt(order.getCancelledAt())
                .items(order.getItems() == null ? List.of() : order.getItems().stream().map(item -> ConcessionOrderItemResponse.builder()
                        .itemId(item.getConcessionOrderItemId()).itemType(item.getItemType())
                        .comboId(item.getCombo() == null ? null : item.getCombo().getComboId())
                        .foodVariantId(item.getFoodVariant() == null ? null : item.getFoodVariant().getFoodVariantId())
                        .name(item.getNameSnapshot()).unitPrice(item.getUnitPriceSnapshot()).quantity(item.getQuantity()).lineTotal(item.getLineTotal()).build()).toList())
                .build();
    }

    private Map<String, Object> orderSnapshot(ConcessionOrder order) {
        return Map.of("orderCode", order.getOrderCode(), "status", order.getStatus().name(), "totalAmount", value(order.getTotalAmount()), "costAmount", value(order.getCostAmount()), "paymentMethod", order.getPaymentMethod().name());
    }

    private long value(Long value) { return value == null ? 0L : value; }
    private long add(long left, long right) { try { return Math.addExact(left, right); } catch (ArithmeticException e) { throw new AppException(ErrorCode.VALIDATION_ERROR, "Tổng tiền vượt giới hạn cho phép."); } }
    private long multiply(long left, long right) { try { return Math.multiplyExact(left, right); } catch (ArithmeticException e) { throw new AppException(ErrorCode.VALIDATION_ERROR, "Số lượng hoặc tổng tiền vượt giới hạn cho phép."); } }
    private int multiply(int left, int right) { try { return Math.multiplyExact(left, right); } catch (ArithmeticException e) { throw new AppException(ErrorCode.VALIDATION_ERROR, "Số lượng sản phẩm vượt giới hạn cho phép."); } }
    private int addInt(int left, int right) { try { return Math.addExact(left, right); } catch (ArithmeticException e) { throw new AppException(ErrorCode.VALIDATION_ERROR, "Số lượng sản phẩm vượt giới hạn cho phép."); } }
    private int positiveQuantity(Integer value, String message) { if (value == null || value < 1 || value > 1000) throw new AppException(ErrorCode.VALIDATION_ERROR, message); return value; }
    private String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }

    private record StockRequirement(FoodVariant variant, int quantity) { }
    private record LineDraft(ConcessionOrderItemType itemType, Combo combo, FoodVariant variant, String name, long unitPrice, long unitCost, int quantity, long lineTotal, long lineCost) { }
}
