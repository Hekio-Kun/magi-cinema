package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.schedule;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.StaffShiftType;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateStaffScheduleRequest {
    @NotBlank(message = "Nhân viên không được để trống")
    String staffUserId;
    @NotNull(message = "Ngày làm việc không được để trống")
    LocalDate workDate;
    @NotNull(message = "Loại ca không được để trống")
    StaffShiftType shiftType;
    @NotNull(message = "Giờ bắt đầu không được để trống")
    LocalTime plannedStart;
    @NotNull(message = "Giờ kết thúc không được để trống")
    LocalTime plannedEnd;
    String note;
}
