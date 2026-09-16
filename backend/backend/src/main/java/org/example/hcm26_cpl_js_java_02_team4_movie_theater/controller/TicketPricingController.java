package org.example.hcm26_cpl_js_java_02_team4_movie_theater.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.ApiResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.pricing.TicketPriceConfigRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.pricing.TicketPriceConfigResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.pricing.TicketPriceConfigHistoryResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.pricing.TicketPriceRestoreRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.TicketPricingService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/ticket-pricing")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TicketPricingController {

    TicketPricingService ticketPricingService;

    @GetMapping("/public/config")
    public ApiResponse<TicketPriceConfigResponse> getConfig() {
        return ApiResponse.<TicketPriceConfigResponse>builder()
                .result(ticketPricingService.getPublicConfig())
                .build();
    }

    @GetMapping("/admin/config")
    @PreAuthorize("hasAuthority('SHOWTIME_MANAGE')")
    public ApiResponse<TicketPriceConfigResponse> getAdminConfig() {
        return ApiResponse.<TicketPriceConfigResponse>builder()
                .result(ticketPricingService.getConfig())
                .build();
    }

    @GetMapping("/admin/history")
    @PreAuthorize("hasAuthority('SHOWTIME_MANAGE')")
    public ApiResponse<List<TicketPriceConfigHistoryResponse>> getHistory(
            @RequestParam(defaultValue = "20") int limit) {
        return ApiResponse.<List<TicketPriceConfigHistoryResponse>>builder()
                .result(ticketPricingService.getHistory(limit))
                .build();
    }

    @PutMapping("/admin/config")
    @PreAuthorize("hasAuthority('SHOWTIME_MANAGE')")
    public ApiResponse<TicketPriceConfigResponse> updateConfig(
            @Valid @RequestBody TicketPriceConfigRequest request) {
        return ApiResponse.<TicketPriceConfigResponse>builder()
                .message("Cập nhật cấu hình giá vé thành công.")
                .result(ticketPricingService.updateConfig(request))
                .build();
    }

    @PostMapping("/admin/history/{historyId}/restore")
    @PreAuthorize("hasAuthority('SHOWTIME_MANAGE')")
    public ApiResponse<TicketPriceConfigResponse> restoreHistory(
            @PathVariable Long historyId,
            @Valid @RequestBody TicketPriceRestoreRequest request) {
        return ApiResponse.<TicketPriceConfigResponse>builder()
                .message("Khôi phục phiên bản bảng giá thành công.")
                .result(ticketPricingService.restoreHistory(historyId, request.getReason()))
                .build();
    }
}
