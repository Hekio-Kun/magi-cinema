package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.combo.ComboAuditLogResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.ComboAuditLog;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.User;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.ComboAuditLogRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ComboAuditLogService {
    ComboAuditLogRepository auditLogRepository;
    UserRepository userRepository;
    ObjectMapper objectMapper;

    @Transactional
    public void record(
            String targetType,
            Long targetId,
            String targetName,
            String action,
            String summary,
            Object beforeSnapshot,
            Object afterSnapshot,
            String reason
    ) {
        Actor actor = resolveActor();
        auditLogRepository.save(ComboAuditLog.builder()
                .targetType(targetType)
                .targetId(targetId)
                .targetName(targetName)
                .action(action)
                .summary(summary)
                .actorUserId(actor.userId())
                .actorUsername(actor.username())
                .reason(reason)
                .beforeSnapshot(toJson(beforeSnapshot))
                .afterSnapshot(toJson(afterSnapshot))
                .build());
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAuthority('COMBO_MANAGE')")
    public List<ComboAuditLogResponse> getAuditLogs(String targetType, String action, String keyword, int limit) {
        int safeLimit = Math.max(10, Math.min(limit, 200));
        String normalizedTargetType = normalizeFilter(targetType);
        String normalizedAction = normalizeFilter(action);
        String normalizedKeyword = normalizeFilter(keyword);
        List<ComboAuditLog> logs = normalizedKeyword == null
                ? auditLogRepository.search(
                        normalizedTargetType,
                        normalizedAction,
                        PageRequest.of(0, safeLimit)
                )
                : auditLogRepository.searchWithKeyword(
                        normalizedTargetType,
                        normalizedAction,
                        normalizedKeyword,
                        PageRequest.of(0, safeLimit)
                );
        return logs
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyAuthority('USER_VIEW', 'SCHEDULE_MANAGE')")
    public List<ComboAuditLogResponse> getStaffAuditLogs(String keyword, int limit) {
        int safeLimit = Math.max(10, Math.min(limit, 200));
        String normalizedKeyword = normalizeFilter(keyword);
        return auditLogRepository.searchStaff(normalizedKeyword, PageRequest.of(0, safeLimit))
                .stream().map(this::toResponse).toList();
    }

    private Actor resolveActor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            return new Actor(null, "system");
        }
        String username = authentication.getName();
        return userRepository.findByUsername(username)
                .map(user -> new Actor(user.getUserId(), user.getUsername()))
                .orElseGet(() -> new Actor(null, username));
    }

    private String toJson(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof String text) {
            return text;
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            return String.valueOf(value);
        }
    }

    private String normalizeFilter(String value) {
        if (value == null || value.isBlank() || "ALL".equalsIgnoreCase(value.trim())) {
            return null;
        }
        return value.trim();
    }

    private ComboAuditLogResponse toResponse(ComboAuditLog log) {
        return ComboAuditLogResponse.builder()
                .auditLogId(log.getAuditLogId())
                .targetType(log.getTargetType())
                .targetId(log.getTargetId())
                .targetName(log.getTargetName())
                .action(log.getAction())
                .summary(log.getSummary())
                .actorUserId(log.getActorUserId())
                .actorUsername(log.getActorUsername())
                .reason(log.getReason())
                .beforeSnapshot(log.getBeforeSnapshot())
                .afterSnapshot(log.getAfterSnapshot())
                .createdAt(log.getCreatedAt())
                .build();
    }

    private record Actor(String userId, String username) {
    }
}
