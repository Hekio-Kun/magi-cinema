package org.example.hcm26_cpl_js_java_02_team4_movie_theater.controller;

import lombok.RequiredArgsConstructor;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.ApiResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.PageResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.payment.MomoPaymentResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.payment.PaymentTransactionResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.payment.ZaloPayCallbackResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.payment.ZaloPayPaymentResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.PaymentService;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.PaymentTransactionService;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.QrCodeService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/payment")
public class PaymentController {

    private final PaymentService paymentService;
    private final PaymentTransactionService paymentTransactionService;
    private final QrCodeService qrCodeService;

    @PostMapping("/zalopay/orders/{bookingId}")
    public ApiResponse<ZaloPayPaymentResponse> createZaloPayOrder(@PathVariable Long bookingId) {
        return ApiResponse.<ZaloPayPaymentResponse>builder()
                .result(paymentService.createZaloPayOrder(bookingId))
                .build();
    }

    @PostMapping("/momo/orders/{bookingId}")
    public ApiResponse<MomoPaymentResponse> createMomoOrder(@PathVariable Long bookingId) {
        return ApiResponse.<MomoPaymentResponse>builder()
                .result(paymentService.createMomoOrder(bookingId))
                .build();
    }

    @GetMapping("/transactions/my")
    public ApiResponse<List<PaymentTransactionResponse>> getMyTransactions() {
        return ApiResponse.<List<PaymentTransactionResponse>>builder()
                .result(paymentTransactionService.getMyTransactions())
                .build();
    }

    @GetMapping("/transactions")
    @PreAuthorize("hasAuthority('BOOKING_VIEW')")
    public ApiResponse<PageResponse<PaymentTransactionResponse>> getAdminTransactions(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.<PageResponse<PaymentTransactionResponse>>builder()
                .result(paymentTransactionService.getAdminTransactions(page, size))
                .build();
    }

    @GetMapping(value = "/qr-code", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> createQrCode(@RequestParam String content) {
        if (content == null || content.isBlank() || content.length() > 2048) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .body(qrCodeService.generatePng(content, 420));
    }

    @GetMapping("/zalopay/return")
    public ApiResponse<String> handleZaloPayReturn(@RequestParam Map<String, String> params) {
        PaymentService.PaymentReturnResult result = paymentService.handleZaloPayReturn(params);
        return ApiResponse.<String>builder()
                .message(result.message())
                .result(result.status())
                .build();
    }

    @PostMapping("/zalopay/callback")
    public ZaloPayCallbackResponse handleZaloPayCallback(@RequestBody Map<String, Object> payload) {
        return paymentService.handleZaloPayCallback(payload);
    }

    @GetMapping("/momo/return")
    public ApiResponse<String> handleMomoReturn(@RequestParam Map<String, String> params) {
        PaymentService.PaymentReturnResult result = paymentService.handleMomoReturn(params);
        return ApiResponse.<String>builder()
                .message(result.message())
                .result(result.status())
                .build();
    }

    @PostMapping("/momo/ipn")
    public ResponseEntity<Void> handleMomoIpn(@RequestBody Map<String, Object> payload) {
        paymentService.handleMomoIpn(payload);
        return ResponseEntity.noContent().build();
    }
}
