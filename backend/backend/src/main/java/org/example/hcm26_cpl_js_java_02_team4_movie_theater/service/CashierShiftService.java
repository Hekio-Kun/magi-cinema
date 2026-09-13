package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.cashier.ApproveCashierShiftRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.cashier.CashierShiftResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.cashier.CloseCashierShiftRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.cashier.OpenCashierShiftRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.PageResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.CashierShift;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.User;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.CashierReconciliationStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.CashierShiftStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PaymentMethod;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.UserStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.BookingRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.CashierShiftRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.ConcessionOrderRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.UserRepository;
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
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CashierShiftService {
    CashierShiftRepository shiftRepository;
    BookingRepository bookingRepository;
    ConcessionOrderRepository concessionOrderRepository;
    UserRepository userRepository;
    ComboAuditLogService comboAuditLogService;

    @Transactional
    public CashierShiftResponse openShift(OpenCashierShiftRequest request) {
        User cashier = currentUser();
        if (cashier.getStatus() != UserStatus.ACTIVE) {
            throw new AppException(ErrorCode.USER_LOCKED);
        }
        if (shiftRepository.findFirstByCashier_UserIdAndStatusOrderByOpenedAtDesc(cashier.getUserId(), CashierShiftStatus.OPEN).isPresent()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Bạn đang có một ca mở. Hãy kết ca trước khi mở ca mới.");
        }
        long openingCash = request.getOpeningCash();
        CashierShift shift = CashierShift.builder()
                .shiftCode(generateShiftCode())
                .cashier(cashier)
                .status(CashierShiftStatus.OPEN)
                .reconciliationStatus(CashierReconciliationStatus.PENDING_APPROVAL)
                .openingCash(openingCash)
                .openedNote(clean(request.getNote()))
                .build();
        CashierShift saved = shiftRepository.save(shift);
        comboAuditLogService.record("CASHIER_SHIFT", saved.getCashierShiftId(), saved.getShiftCode(), "OPEN",
                "Mở ca thu ngân " + saved.getShiftCode(), null, snapshot(saved), null);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public CashierShiftResponse getCurrentShift() {
        User cashier = currentUser();
        return shiftRepository.findFirstByCashier_UserIdAndStatusOrderByOpenedAtDesc(cashier.getUserId(), CashierShiftStatus.OPEN)
                .map(this::toResponse).orElse(null);
    }

    @Transactional(readOnly = true)
    public CashierShift requireOpenShiftForCurrentUser() {
        User cashier = currentUser();
        return shiftRepository.findFirstByCashier_UserIdAndStatusOrderByOpenedAtDesc(cashier.getUserId(), CashierShiftStatus.OPEN)
                .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR, "Bạn chưa mở ca thu ngân. Hãy mở ca trước khi bán hàng tại quầy."));
    }

    @Transactional
    public CashierShiftResponse closeShift(Long shiftId, CloseCashierShiftRequest request) {
        User cashier = currentUser();
        CashierShift shift = shiftRepository.findByIdForUpdate(shiftId)
                .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR, "Không tìm thấy ca thu ngân."));
        if (!cashier.getUserId().equals(shift.getCashier().getUserId())) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }
        if (shift.getStatus() != CashierShiftStatus.OPEN) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Ca thu ngân đã được kết ca.");
        }
        refreshTotals(shift);
        long actualCash = request.getActualCash();
        long expectedCash = value(shift.getOpeningCash()) + value(shift.getCashSales());
        shift.setExpectedCash(expectedCash);
        shift.setActualCash(actualCash);
        shift.setVariance(actualCash - expectedCash);
        shift.setClosingNote(clean(request.getNote()));
        shift.setClosedAt(LocalDateTime.now());
        shift.setStatus(CashierShiftStatus.CLOSED);
        shift.setReconciliationStatus(CashierReconciliationStatus.PENDING_APPROVAL);
        CashierShift saved = shiftRepository.save(shift);
        comboAuditLogService.record("CASHIER_SHIFT", saved.getCashierShiftId(), saved.getShiftCode(), "CLOSE",
                "Kết ca thu ngân " + saved.getShiftCode(), null, snapshot(saved), saved.getVariance() == 0 ? null : "Chênh lệch tiền: " + saved.getVariance());
        return toResponse(saved);
    }

    @Transactional
    public CashierShiftResponse approveShift(Long shiftId, ApproveCashierShiftRequest request) {
        CashierShift shift = shiftRepository.findByIdForUpdate(shiftId)
                .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR, "Không tìm thấy ca thu ngân."));
        if (shift.getStatus() != CashierShiftStatus.CLOSED) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Chỉ có thể duyệt ca đã kết thúc.");
        }
        if (shift.getReconciliationStatus() != CashierReconciliationStatus.PENDING_APPROVAL) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Ca thu ngân đã được xử lý đối soát.");
        }
        User approver = currentUser();
        shift.setApprovedBy(approver);
        shift.setApprovedAt(LocalDateTime.now());
        shift.setApprovalNote(clean(request.getNote()));
        shift.setReconciliationStatus(Boolean.TRUE.equals(request.getApproved())
                ? CashierReconciliationStatus.APPROVED : CashierReconciliationStatus.REJECTED);
        CashierShift saved = shiftRepository.save(shift);
        comboAuditLogService.record("CASHIER_SHIFT", saved.getCashierShiftId(), saved.getShiftCode(),
                Boolean.TRUE.equals(request.getApproved()) ? "APPROVE" : "REJECT",
                "Đối soát ca thu ngân " + saved.getShiftCode(), null, snapshot(saved), clean(request.getNote()));
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public PageResponse<CashierShiftResponse> getShifts(int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(size, 100));
        Page<CashierShift> result = shiftRepository.findAllByOrderByOpenedAtDesc(PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "openedAt")));
        return PageResponse.<CashierShiftResponse>builder()
                .content(result.getContent().stream().map(this::toResponse).toList())
                .page(result.getNumber()).size(result.getSize())
                .totalElements(result.getTotalElements()).totalPages(result.getTotalPages()).build();
    }

    @Transactional
    public CashierShiftResponse refreshAndGet(Long shiftId) {
        CashierShift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR, "Không tìm thấy ca thu ngân."));
        refreshTotals(shift);
        return toResponse(shift);
    }

    private void refreshTotals(CashierShift shift) {
        Long id = shift.getCashierShiftId();
        long cashSales = value(bookingRepository.sumSuccessfulAmountByShiftAndPaymentMethod(id, PaymentMethod.CASH))
                + value(concessionOrderRepository.sumPaidAmountByShiftAndPaymentMethod(id, PaymentMethod.CASH));
        long transferSales = value(bookingRepository.sumSuccessfulAmountByShiftAndPaymentMethod(id, PaymentMethod.BANK_TRANSFER))
                + value(concessionOrderRepository.sumPaidAmountByShiftAndPaymentMethod(id, PaymentMethod.BANK_TRANSFER));
        shift.setCashSales(cashSales);
        shift.setTransferSales(transferSales);
        shift.setTicketSales(value(bookingRepository.sumSuccessfulTicketRevenueByShift(id)));
        shift.setConcessionSales(value(bookingRepository.sumSuccessfulConcessionRevenueByShift(id))
                + value(concessionOrderRepository.sumPaidAmountByShiftAndPaymentMethod(id, PaymentMethod.CASH))
                + value(concessionOrderRepository.sumPaidAmountByShiftAndPaymentMethod(id, PaymentMethod.BANK_TRANSFER)));
    }

    private User currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
        return userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    private String generateShiftCode() {
        return "SHIFT-" + LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE) + "-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
    }

    private CashierShiftResponse toResponse(CashierShift shift) {
        long totalSales = value(shift.getCashSales()) + value(shift.getTransferSales());
        return CashierShiftResponse.builder()
                .shiftId(shift.getCashierShiftId()).shiftCode(shift.getShiftCode())
                .cashierUserId(shift.getCashier() == null ? null : shift.getCashier().getUserId())
                .cashierUsername(shift.getCashier() == null ? null : shift.getCashier().getUsername())
                .status(shift.getStatus()).reconciliationStatus(shift.getReconciliationStatus())
                .openingCash(value(shift.getOpeningCash())).expectedCash(shift.getExpectedCash()).actualCash(shift.getActualCash()).variance(shift.getVariance())
                .cashSales(value(shift.getCashSales())).transferSales(value(shift.getTransferSales())).ticketSales(value(shift.getTicketSales())).concessionSales(value(shift.getConcessionSales())).totalSales(totalSales)
                .openedNote(shift.getOpenedNote()).closingNote(shift.getClosingNote()).approvalNote(shift.getApprovalNote())
                .approvedByUsername(shift.getApprovedBy() == null ? null : shift.getApprovedBy().getUsername())
                .openedAt(shift.getOpenedAt()).closedAt(shift.getClosedAt()).approvedAt(shift.getApprovedAt()).build();
    }

    private Map<String, Object> snapshot(CashierShift shift) {
        return Map.of("shiftCode", shift.getShiftCode(), "status", shift.getStatus().name(), "reconciliationStatus", shift.getReconciliationStatus().name(), "openingCash", value(shift.getOpeningCash()), "expectedCash", value(shift.getExpectedCash()), "actualCash", value(shift.getActualCash()), "variance", value(shift.getVariance()), "cashSales", value(shift.getCashSales()), "transferSales", value(shift.getTransferSales()));
    }

    private long value(Long value) { return value == null ? 0L : value; }
    private String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}
