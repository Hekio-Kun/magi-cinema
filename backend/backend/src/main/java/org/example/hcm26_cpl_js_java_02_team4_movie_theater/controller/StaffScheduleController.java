package org.example.hcm26_cpl_js_java_02_team4_movie_theater.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.ApiResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.schedule.AttendanceUpdateRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.schedule.CreateStaffScheduleRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.schedule.StaffScheduleResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.schedule.UpdateStaffScheduleRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.StaffScheduleService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/staff-schedules")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class StaffScheduleController {
    StaffScheduleService scheduleService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('SCHEDULE_MANAGE', 'BOOKING_MANAGE', 'USER_VIEW')")
    public ApiResponse<List<StaffScheduleResponse>> list(
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            @RequestParam(required = false) String staffUserId) {
        return ApiResponse.<List<StaffScheduleResponse>>builder().result(scheduleService.list(from, to, staffUserId)).build();
    }

    @PostMapping
    public ApiResponse<StaffScheduleResponse> create(@Valid @RequestBody CreateStaffScheduleRequest request) {
        return ApiResponse.<StaffScheduleResponse>builder().result(scheduleService.create(request)).build();
    }

    @PutMapping("/{assignmentId}")
    public ApiResponse<StaffScheduleResponse> update(@PathVariable Long assignmentId, @Valid @RequestBody UpdateStaffScheduleRequest request) {
        return ApiResponse.<StaffScheduleResponse>builder().result(scheduleService.update(assignmentId, request)).build();
    }

    @DeleteMapping("/{assignmentId}")
    public ApiResponse<StaffScheduleResponse> cancel(@PathVariable Long assignmentId, @RequestParam(required = false) String reason) {
        return ApiResponse.<StaffScheduleResponse>builder().result(scheduleService.cancel(assignmentId, reason)).build();
    }

    @PostMapping("/{assignmentId}/check-in")
    @PreAuthorize("hasAnyAuthority('SCHEDULE_MANAGE', 'BOOKING_MANAGE')")
    public ApiResponse<StaffScheduleResponse> checkIn(@PathVariable Long assignmentId) {
        return ApiResponse.<StaffScheduleResponse>builder().result(scheduleService.checkIn(assignmentId)).build();
    }

    @PostMapping("/{assignmentId}/check-out")
    @PreAuthorize("hasAnyAuthority('SCHEDULE_MANAGE', 'BOOKING_MANAGE')")
    public ApiResponse<StaffScheduleResponse> checkOut(@PathVariable Long assignmentId) {
        return ApiResponse.<StaffScheduleResponse>builder().result(scheduleService.checkOut(assignmentId)).build();
    }

    @PostMapping("/{assignmentId}/attendance")
    public ApiResponse<StaffScheduleResponse> updateAttendance(@PathVariable Long assignmentId, @Valid @RequestBody AttendanceUpdateRequest request) {
        return ApiResponse.<StaffScheduleResponse>builder().result(scheduleService.updateAttendance(assignmentId, request)).build();
    }
}
