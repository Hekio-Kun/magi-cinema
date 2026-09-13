package org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.StaffScheduleStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.StaffShiftType;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "staff_shift_assignment", indexes = {
        @Index(name = "idx_staff_schedule_date", columnList = "work_date"),
        @Index(name = "idx_staff_schedule_user_date", columnList = "staff_user_id,work_date")
}, uniqueConstraints = @UniqueConstraint(name = "uk_staff_schedule_shift", columnNames = {"staff_user_id", "work_date", "shift_type"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class StaffShiftAssignment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "assignment_id")
    Long assignmentId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "staff_user_id", nullable = false)
    User staff;

    @Column(name = "work_date", nullable = false)
    LocalDate workDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "shift_type", nullable = false, length = 20)
    StaffShiftType shiftType;

    @Column(name = "planned_start", nullable = false)
    LocalTime plannedStart;

    @Column(name = "planned_end", nullable = false)
    LocalTime plannedEnd;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    StaffScheduleStatus status = StaffScheduleStatus.SCHEDULED;

    @Column(name = "note", length = 500)
    String note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id")
    User createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt;
}
