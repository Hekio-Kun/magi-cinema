package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.payment.MomoPaymentResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.payment.ZaloPayCallbackResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.payment.ZaloPayPaymentResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.springframework.stereotype.Service;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final BookingService bookingService;
    private final ZaloPayPaymentService zaloPayPaymentService;
    private final MomoPaymentService momoPaymentService;
    private final MembershipService membershipService;

    public ZaloPayPaymentResponse createZaloPayOrder(Long bookingId) {
        return bookingService.createZaloPayPaymentForPendingBooking(bookingId);
    }

    public MomoPaymentResponse createMomoOrder(Long bookingId) {
        return bookingService.createMomoPaymentForPendingBooking(bookingId);
    }

    public PaymentReturnResult handleZaloPayReturn(Map<String, String> params) {
        log.info("Received ZaloPay return: {}", params);

        if (!zaloPayPaymentService.verifyReturnChecksum(params)) {
            log.warn("Invalid ZaloPay return checksum: {}", params);
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Chữ ký thanh toán ZaloPay không hợp lệ");
        }

        String appTransId = params.get("apptransid");
        Long membershipId = zaloPayPaymentService.extractMembershipId(appTransId).orElse(null);
        if (membershipId != null) {
            if (!"1".equals(params.get("status"))) return new PaymentReturnResult("FAILED", "Thanh toán thất bại hoặc đã hủy");
            ZaloPayPaymentService.ZaloPayQueryResult queryResult = zaloPayPaymentService.queryOrderStatus(appTransId);
            long paidAmount = queryResult.success() ? queryResult.amount() : zaloPayPaymentService.parseLong(params.get("amount"));
            membershipService.activateAfterSuccessfulPayment(membershipId, Math.toIntExact(paidAmount));
            return new PaymentReturnResult("SUCCESS", "Kích hoạt hội viên thành công");
        }
        Long bookingId = zaloPayPaymentService.extractBookingId(appTransId)
                .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR, "Mã giao dịch ZaloPay không hợp lệ"));

        if ("1".equals(params.get("status"))) {
            ZaloPayPaymentService.ZaloPayQueryResult queryResult =
                    zaloPayPaymentService.queryOrderStatus(appTransId);
            long paidAmount = queryResult.success()
                    ? queryResult.amount()
                    : zaloPayPaymentService.parseLong(params.get("amount"));
            boolean confirmed = bookingService.confirmBookingPayment(bookingId, paidAmount);
            return confirmed
                    ? new PaymentReturnResult("SUCCESS", "Thanh toán thành công")
                    : new PaymentReturnResult("FAILED", "Không thể xác nhận thanh toán");
        }

        bookingService.cancelBookingPayment(bookingId);
        return new PaymentReturnResult("FAILED", "Thanh toán thất bại hoặc đã hủy");
    }

    public ZaloPayCallbackResponse handleZaloPayCallback(Map<String, Object> payload) {
        log.info("Received ZaloPay callback: {}", payload);

        String data = valueOf(payload.get("data"));
        String mac = valueOf(payload.get("mac"));
        if (!zaloPayPaymentService.verifyCallbackSignature(data, mac)) {
            log.warn("Invalid ZaloPay callback signature: {}", payload);
            return callbackResponse(-1, "mac not equal");
        }

        try {
            Map<String, Object> callbackData = zaloPayPaymentService.parseCallbackData(data);
            String appTransId = valueOf(callbackData.get("app_trans_id"));
            Long membershipId = zaloPayPaymentService.extractMembershipId(appTransId).orElse(null);
            if (membershipId != null) {
                membershipService.activateAfterSuccessfulPayment(
                        membershipId, Math.toIntExact(zaloPayPaymentService.parseLong(callbackData.get("amount"))));
                return callbackResponse(1, "success");
            }
            Long bookingId = zaloPayPaymentService.extractBookingId(appTransId).orElse(null);
            if (bookingId == null) {
                return callbackResponse(2, "invalid app_trans_id");
            }

            boolean confirmed = bookingService.confirmBookingPayment(
                    bookingId,
                    zaloPayPaymentService.parseLong(callbackData.get("amount")));
            return confirmed
                    ? callbackResponse(1, "success")
                    : callbackResponse(2, "cannot confirm booking");
        } catch (Exception exception) {
            log.error("Error processing ZaloPay callback", exception);
            return callbackResponse(2, "callback processing failed");
        }
    }

    public PaymentReturnResult handleMomoReturn(Map<String, String> params) {
        log.info("Received MoMo return: {}", params);

        if (!momoPaymentService.verifyCallbackSignature(params)) {
            log.warn("Invalid MoMo return signature: {}", params);
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Chữ ký thanh toán MoMo không hợp lệ");
        }

        Long membershipId = momoPaymentService.extractMembershipId(params.get("orderId")).orElse(null);
        if (membershipId != null) {
            if ("0".equals(params.get("resultCode"))) {
                membershipService.activateAfterSuccessfulPayment(
                        membershipId, Math.toIntExact(momoPaymentService.parseLong(params.get("amount"))));
                return new PaymentReturnResult("SUCCESS", "Kích hoạt hội viên thành công");
            }
            return new PaymentReturnResult("FAILED", "Thanh toán thất bại hoặc đã hủy");
        }
        Long bookingId = momoPaymentService.extractBookingId(params.get("orderId"))
                .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR, "Mã giao dịch MoMo không hợp lệ"));

        if ("0".equals(params.get("resultCode"))) {
            boolean confirmed = bookingService.confirmBookingPayment(
                    bookingId,
                    momoPaymentService.parseLong(params.get("amount")));
            return confirmed
                    ? new PaymentReturnResult("SUCCESS", "Thanh toán thành công")
                    : new PaymentReturnResult("FAILED", "Không thể xác nhận thanh toán");
        }

        bookingService.cancelBookingPayment(bookingId);
        return new PaymentReturnResult("FAILED", "Thanh toán thất bại hoặc đã hủy");
    }

    public void handleMomoIpn(Map<String, Object> payload) {
        log.info("Received MoMo IPN: {}", payload);

        Map<String, String> params = normalizePayload(payload);
        if (!momoPaymentService.verifyCallbackSignature(params)) {
            log.warn("Invalid MoMo IPN signature: {}", payload);
            return;
        }

        Long bookingId = momoPaymentService.extractBookingId(params.get("orderId")).orElse(null);
        Long membershipId = momoPaymentService.extractMembershipId(params.get("orderId")).orElse(null);
        if (membershipId != null) {
            if ("0".equals(params.get("resultCode"))) {
                membershipService.activateAfterSuccessfulPayment(
                        membershipId, Math.toIntExact(momoPaymentService.parseLong(params.get("amount"))));
            }
            return;
        }
        if (bookingId == null) {
            log.warn("Invalid MoMo IPN orderId: {}", payload);
            return;
        }

        if ("0".equals(params.get("resultCode"))) {
            boolean confirmed = bookingService.confirmBookingPayment(
                    bookingId,
                    momoPaymentService.parseLong(params.get("amount")));
            if (!confirmed) {
                log.warn("Cannot confirm booking {} from MoMo IPN", bookingId);
            }
            return;
        }

        bookingService.cancelBookingPayment(bookingId);
    }

    private ZaloPayCallbackResponse callbackResponse(int code, String message) {
        return ZaloPayCallbackResponse.builder()
                .returnCode(code)
                .returnMessage(message)
                .build();
    }

    private Map<String, String> normalizePayload(Map<String, Object> payload) {
        return payload.entrySet().stream()
                .collect(java.util.stream.Collectors.toMap(
                        Map.Entry::getKey,
                        entry -> valueOf(entry.getValue()),
                        (first, second) -> second,
                        java.util.LinkedHashMap::new));
    }

    private String valueOf(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    public record PaymentReturnResult(String status, String message) {
    }
}
