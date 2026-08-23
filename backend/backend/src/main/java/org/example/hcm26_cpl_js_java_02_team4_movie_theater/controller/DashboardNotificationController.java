package org.example.hcm26_cpl_js_java_02_team4_movie_theater.controller;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.ApiResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.notification.DashboardNotificationListResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.DashboardNotificationService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/dashboard/notifications")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DashboardNotificationController {
    DashboardNotificationService notificationService;

    @GetMapping
    public ApiResponse<DashboardNotificationListResponse> getNotifications(
            @RequestParam(defaultValue = "10") int limit) {
        return ApiResponse.<DashboardNotificationListResponse>builder()
                .result(notificationService.getNotifications(limit))
                .build();
    }

    @PutMapping("/read-all")
    public ApiResponse<Void> markAllAsRead() {
        notificationService.markAllAsRead();
        return ApiResponse.<Void>builder()
                .message("Đã đánh dấu tất cả thông báo là đã đọc.")
                .build();
    }
}
