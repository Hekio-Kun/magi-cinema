package org.example.hcm26_cpl_js_java_02_team4_movie_theater.controller;

import lombok.RequiredArgsConstructor;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.ApiResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.payment.MomoPaymentResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.payment.ZaloPayCallbackResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.payment.ZaloPayPaymentResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.PaymentService;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.QrCodeService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/payment")
public class PaymentController {

    private final PaymentService paymentService;
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
