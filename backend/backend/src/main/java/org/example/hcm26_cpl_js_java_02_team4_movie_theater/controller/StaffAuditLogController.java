package org.example.hcm26_cpl_js_java_02_team4_movie_theater.controller;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.combo.ComboAuditLogResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.ApiResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.ComboAuditLogService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/staff-audit-logs")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class StaffAuditLogController {
    ComboAuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('USER_VIEW', 'SCHEDULE_MANAGE')")
    public ApiResponse<List<ComboAuditLogResponse>> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "100") int limit) {
        return ApiResponse.<List<ComboAuditLogResponse>>builder().result(auditLogService.getStaffAuditLogs(keyword, limit)).build();
    }
}
