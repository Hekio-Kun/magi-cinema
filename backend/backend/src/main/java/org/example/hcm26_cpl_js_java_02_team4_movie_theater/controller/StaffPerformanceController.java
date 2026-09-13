package org.example.hcm26_cpl_js_java_02_team4_movie_theater.controller;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.ApiResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.performance.StaffPerformanceResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.StaffPerformanceService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/staff-performance")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class StaffPerformanceController {
    StaffPerformanceService performanceService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('SCHEDULE_MANAGE', 'USER_VIEW')")
    public ApiResponse<List<StaffPerformanceResponse>> getPerformance(
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to) {
        return ApiResponse.<List<StaffPerformanceResponse>>builder().result(performanceService.getPerformance(from, to)).build();
    }
}
