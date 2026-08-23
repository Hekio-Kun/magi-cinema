package org.example.hcm26_cpl_js_java_02_team4_movie_theater.controller;

import lombok.RequiredArgsConstructor;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.ApiResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.dashboard.DashboardResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.DashboardService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER')")
    public ApiResponse<DashboardResponse> getStats() {
        return ApiResponse.<DashboardResponse>builder()
                .message("Lấy thống kê thành công")
                .result(dashboardService.getDashboardStats())
                .build();
    }
}
