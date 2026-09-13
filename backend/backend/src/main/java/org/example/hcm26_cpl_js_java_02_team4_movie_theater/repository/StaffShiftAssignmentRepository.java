package org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.StaffShiftAssignment;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.StaffScheduleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Repository
public interface StaffShiftAssignmentRepository extends JpaRepository<StaffShiftAssignment, Long> {
    List<StaffShiftAssignment> findByWorkDateBetweenOrderByWorkDateAscPlannedStartAsc(LocalDate from, LocalDate to);

    List<StaffShiftAssignment> findByStaff_UserIdAndWorkDateBetweenOrderByWorkDateAscPlannedStartAsc(String userId, LocalDate from, LocalDate to);

    List<StaffShiftAssignment> findByStaff_UserIdAndWorkDateAndStatusOrderByPlannedStartAsc(String userId, LocalDate workDate, StaffScheduleStatus status);

    @Query("""
            SELECT CASE WHEN COUNT(a) > 0 THEN true ELSE false END
            FROM StaffShiftAssignment a
            WHERE a.staff.userId = :userId
              AND a.workDate = :workDate
              AND a.status = org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.StaffScheduleStatus.SCHEDULED
              AND a.plannedStart < :plannedEnd
              AND a.plannedEnd > :plannedStart
              AND (:assignmentId IS NULL OR a.assignmentId <> :assignmentId)
            """)
    boolean existsOverlapping(
            @Param("userId") String userId,
            @Param("workDate") LocalDate workDate,
            @Param("plannedStart") LocalTime plannedStart,
            @Param("plannedEnd") LocalTime plannedEnd,
            @Param("assignmentId") Long assignmentId);
}
