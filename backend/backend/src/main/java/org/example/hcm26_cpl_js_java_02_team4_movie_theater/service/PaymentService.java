package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.payment.MomoPaymentResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.payment.ZaloPayCallbackResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.payment.ZaloPayPaymentResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.PaymentMethod;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final BookingService bookingService;
    private final ZaloPayPaymentService zaloPayPaymentService;
    private final MomoPaymentService momoPaymentService;
    private final MembershipService membershipService;
    private final PaymentTransactionService paymentTransactionService;

    public ZaloPayPaymentResponse createZaloPayOrder(Long bookingId) {
        ZaloPayPaymentResponse response = bookingService.createZaloPayPaymentForPendingBooking(bookingId);
        paymentTransactionService.recordInitiated(
                response.getBookingId(),
                PaymentMethod.ZALOPAY,
                response.getAppTransId(),
                response.getAmount());
        return response;
    }

    public MomoPaymentResponse createMomoOrder(Long bookingId) {
        MomoPaymentResponse response = bookingService.createMomoPaymentForPendingBooking(bookingId);
        paymentTransactionService.recordInitiated(
                response.getBookingId(),
                PaymentMethod.MOMO,
                response.getOrderId(),
                response.getAmount());
        return response;
    }

    @Transactional
    public PaymentReturnResult handleZaloPayReturn(Map<String, String> params) {
        log.info("Received ZaloPay return");

        if (!zaloPayPaymentService.verifyReturnChecksum(params)) {
            log.warn("Invalid ZaloPay return checksum");
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
        boolean successful = "1".equals(params.get("status"));
        String providerTransactionId = blankToNull(params.get("zptransid"));
        if (providerTransactionId == null) {
            providerTransactionId = blankToNull(params.get("zp_trans_id"));
        }
        long paidAmount = zaloPayPaymentService.parseLong(params.get("amount"));
        if (successful) {
            ZaloPayPaymentService.ZaloPayQueryResult queryResult =
                    zaloPayPaymentService.queryOrderStatus(appTransId);
            if (queryResult.success()) {
                paidAmount = queryResult.amount();
                if (queryResult.zpTransId() >= 0) {
                    providerTransactionId = String.valueOf(queryResult.zpTransId());
                }
            }
        }

        PaymentTransactionService.CallbackResult result = applyBookingCallback(
                PaymentMethod.ZALOPAY,
                appTransId,
                providerTransactionId,
                bookingId,
                paidAmount,
                successful,
                params.get("returnmessage"));
        return toPaymentReturnResult(result, successful);
    }

    @Transactional
    public ZaloPayCallbackResponse handleZaloPayCallback(Map<String, Object> payload) {
        log.info("Received ZaloPay callback");

        String data = valueOf(payload.get("data"));
        String mac = valueOf(payload.get("mac"));
        if (!zaloPayPaymentService.verifyCallbackSignature(data, mac)) {
            log.warn("Invalid ZaloPay callback signature");
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

            PaymentTransactionService.CallbackResult result = applyBookingCallback(
                    PaymentMethod.ZALOPAY,
                    appTransId,
                    blankToNull(valueOf(callbackData.get("zp_trans_id"))),
                    bookingId,
                    zaloPayPaymentService.parseLong(callbackData.get("amount")),
                    true,
                    "ZaloPay callback");
            return isSuccessfulResult(result)
                    ? callbackResponse(1, "success")
                    : callbackResponse(2, "cannot confirm booking");
        } catch (Exception exception) {
            log.error("Error processing ZaloPay callback", exception);
            return callbackResponse(2, "callback processing failed");
        }
    }

    @Transactional
    public PaymentReturnResult handleMomoReturn(Map<String, String> params) {
        log.info("Received MoMo return");

        if (!momoPaymentService.verifyCallbackSignature(params)) {
            log.warn("Invalid MoMo return signature");
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

        boolean successful = "0".equals(params.get("resultCode"));
        PaymentTransactionService.CallbackResult result = applyBookingCallback(
                PaymentMethod.MOMO,
                params.get("orderId"),
                params.get("transId"),
                bookingId,
                momoPaymentService.parseLong(params.get("amount")),
                successful,
                params.get("message"));
        return toPaymentReturnResult(result, successful);
    }

    @Transactional
    public void handleMomoIpn(Map<String, Object> payload) {
        log.info("Received MoMo IPN");

        Map<String, String> params = normalizePayload(payload);
        if (!momoPaymentService.verifyCallbackSignature(params)) {
            log.warn("Invalid MoMo IPN signature");
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
            log.warn("Invalid MoMo IPN orderId");
            return;
        }

        boolean successful = "0".equals(params.get("resultCode"));
        PaymentTransactionService.CallbackResult result = applyBookingCallback(
                PaymentMethod.MOMO,
                params.get("orderId"),
                params.get("transId"),
                bookingId,
                momoPaymentService.parseLong(params.get("amount")),
                successful,
                params.get("message"));
        if (!isSuccessfulResult(result)) {
            log.warn("MoMo IPN did not confirm booking {}. result={}", bookingId, result);
        }
    }

    private PaymentTransactionService.CallbackResult applyBookingCallback(
            PaymentMethod paymentMethod,
            String providerReference,
            String providerTransactionId,
            Long bookingId,
            long receivedAmount,
            boolean successful,
            String callbackMessage) {
        PaymentTransactionService.CallbackPreparation preparation = paymentTransactionService.prepareCallback(
                paymentMethod,
                providerReference,
                providerTransactionId,
                bookingId,
                receivedAmount,
                successful,
                callbackMessage);

        if (preparation.result() == PaymentTransactionService.CallbackResult.READY) {
            boolean confirmed = bookingService.confirmBookingPayment(bookingId, receivedAmount);
            if (confirmed) {
                paymentTransactionService.markSuccess(
                        preparation.transaction(),
                        providerTransactionId,
                        receivedAmount,
                        callbackMessage);
                return PaymentTransactionService.CallbackResult.CONFIRMED;
            }
            paymentTransactionService.markFailed(
                    preparation.transaction(),
                    receivedAmount,
                    "Booking không thể chuyển sang trạng thái đã thanh toán.");
            return PaymentTransactionService.CallbackResult.FAILED;
        }
        if (preparation.result() == PaymentTransactionService.CallbackResult.FAILED
                && preparation.firstTerminalTransition()
                && bookingId != null) {
            // A failed provider attempt releases the pending hold. Repeated callbacks
            // see the terminal transaction row and do not repeat this side effect.
            bookingService.cancelBookingPayment(bookingId);
        }
        return preparation.result();
    }

    private PaymentReturnResult toPaymentReturnResult(
            PaymentTransactionService.CallbackResult result,
            boolean providerReportedSuccess) {
        if (isSuccessfulResult(result)) {
            return new PaymentReturnResult(
                    "SUCCESS",
                    result == PaymentTransactionService.CallbackResult.DUPLICATE
                            ? "Giao dịch đã được ghi nhận trước đó"
                            : "Thanh toán thành công");
        }
        if (!providerReportedSuccess) {
            return new PaymentReturnResult("FAILED", "Thanh toán thất bại hoặc đã hủy");
        }
        if (result == PaymentTransactionService.CallbackResult.INVALID) {
            return new PaymentReturnResult("FAILED", "Callback thanh toán không hợp lệ hoặc sai số tiền");
        }
        return new PaymentReturnResult("FAILED", "Không thể xác nhận thanh toán");
    }

    private boolean isSuccessfulResult(PaymentTransactionService.CallbackResult result) {
        return result == PaymentTransactionService.CallbackResult.CONFIRMED
                || result == PaymentTransactionService.CallbackResult.DUPLICATE;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
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
