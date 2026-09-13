package org.example.hcm26_cpl_js_java_02_team4_movie_theater.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.ApiResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.PageResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.concession.ConcessionOrderRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.concession.ConcessionOrderResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ConcessionOrderStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.ConcessionOrderService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/concession-orders")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ConcessionOrderController {
    ConcessionOrderService concessionOrderService;

    @PostMapping
    @PreAuthorize("hasAuthority('BOOKING_MANAGE')")
    public ApiResponse<ConcessionOrderResponse> create(@Valid @RequestBody ConcessionOrderRequest request) {
        return ApiResponse.<ConcessionOrderResponse>builder()
                .message("Bán bắp nước thành công!")
                .result(concessionOrderService.createOrder(request))
                .build();
    }

    @GetMapping
    @PreAuthorize("hasAuthority('BOOKING_VIEW')")
    public ApiResponse<PageResponse<ConcessionOrderResponse>> getOrders(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) ConcessionOrderStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.<PageResponse<ConcessionOrderResponse>>builder()
                .result(concessionOrderService.getOrders(from, to, status, page, size))
                .build();
    }

    @GetMapping("/{orderId}")
    @PreAuthorize("hasAuthority('BOOKING_VIEW')")
    public ApiResponse<ConcessionOrderResponse> getOrder(@PathVariable Long orderId) {
        return ApiResponse.<ConcessionOrderResponse>builder().result(concessionOrderService.getOrder(orderId)).build();
    }

    @PostMapping("/{orderId}/cancel")
    @PreAuthorize("hasAuthority('BOOKING_MANAGE')")
    public ApiResponse<ConcessionOrderResponse> cancel(@PathVariable Long orderId, @RequestParam String reason) {
        return ApiResponse.<ConcessionOrderResponse>builder()
                .message("Đã hủy đơn và hoàn tồn kho bắp nước.")
                .result(concessionOrderService.cancelOrder(orderId, reason))
                .build();
    }
}
