package org.example.hcm26_cpl_js_java_02_team4_movie_theater.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.ApiResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.pricing.TicketPriceConfigRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.pricing.TicketPriceConfigResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.TicketPricingService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/ticket-pricing")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TicketPricingController {

    TicketPricingService ticketPricingService;

    @GetMapping({"/admin/config", "/public/config"})
    public ApiResponse<TicketPriceConfigResponse> getConfig() {
        return ApiResponse.<TicketPriceConfigResponse>builder()
                .result(ticketPricingService.getConfig())
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
}
