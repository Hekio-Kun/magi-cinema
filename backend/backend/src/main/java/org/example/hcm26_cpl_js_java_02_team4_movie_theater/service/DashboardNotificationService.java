package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.notification.DashboardNotificationListResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.notification.DashboardNotificationResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.DashboardNotification;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.DashboardNotificationRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DashboardNotificationService {
    DashboardNotificationRepository notificationRepository;

    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER')")
    public DashboardNotificationListResponse getNotifications(int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 50));
        return DashboardNotificationListResponse.builder()
                .unreadCount(notificationRepository.countByUnreadTrue())
                .notifications(notificationRepository.findByOrderByCreatedAtDesc(PageRequest.of(0, safeLimit))
                        .stream()
                        .map(this::toResponse)
                        .toList())
                .build();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void createNotification(String title, String description, String type) {
        notificationRepository.save(DashboardNotification.builder()
                .title(title)
                .description(description)
                .type(type)
                .unread(true)
                .build());
    }

    @Transactional
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER')")
    public void markAllAsRead() {
        notificationRepository.findAll().forEach(notification -> notification.setUnread(false));
    }

    @Transactional
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_MANAGER')")
    public void setReadState(Long notificationId, boolean read) {
        DashboardNotification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR, "Không tìm thấy thông báo."));
        notification.setUnread(!read);
    }

    private DashboardNotificationResponse toResponse(DashboardNotification notification) {
        return DashboardNotificationResponse.builder()
                .notificationId(notification.getNotificationId())
                .title(notification.getTitle())
                .description(notification.getDescription())
                .type(notification.getType())
                .unread(notification.isUnread())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
