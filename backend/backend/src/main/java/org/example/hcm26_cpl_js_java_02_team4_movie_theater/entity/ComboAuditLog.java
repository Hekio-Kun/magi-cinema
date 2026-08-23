package org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "combo_audit_log")
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ComboAuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "audit_log_id")
    Long auditLogId;

    @Column(name = "target_type", nullable = false, length = 40)
    String targetType;

    @Column(name = "target_id")
    Long targetId;

    @Column(name = "target_name")
    String targetName;

    @Column(name = "action", nullable = false, length = 40)
    String action;

    @Column(name = "summary", length = 600)
    String summary;

    @Column(name = "actor_user_id", length = 36)
    String actorUserId;

    @Column(name = "actor_username", length = 100)
    String actorUsername;

    @Column(name = "reason", columnDefinition = "TEXT")
    String reason;

    @Column(name = "before_snapshot", columnDefinition = "TEXT")
    String beforeSnapshot;

    @Column(name = "after_snapshot", columnDefinition = "TEXT")
    String afterSnapshot;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt;
}
