package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.combo;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ComboAuditLogResponse {
    Long auditLogId;
    String targetType;
    Long targetId;
    String targetName;
    String action;
    String summary;
    String actorUserId;
    String actorUsername;
    String reason;
    String beforeSnapshot;
    String afterSnapshot;
    LocalDateTime createdAt;
}
