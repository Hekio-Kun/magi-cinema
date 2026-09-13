package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.schedule;

import lombok.*;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.AttendanceStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.StaffScheduleStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.StaffShiftType;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class StaffScheduleResponse {
    Long assignmentId;
    String staffUserId;
    String staffUsername;
    String staffFullName;
    LocalDate workDate;
    StaffShiftType shiftType;
    LocalTime plannedStart;
    LocalTime plannedEnd;
    StaffScheduleStatus status;
    String note;
    Long attendanceId;
    LocalDateTime checkIn;
    LocalDateTime checkOut;
    AttendanceStatus attendanceStatus;
    Integer workedMinutes;
}
