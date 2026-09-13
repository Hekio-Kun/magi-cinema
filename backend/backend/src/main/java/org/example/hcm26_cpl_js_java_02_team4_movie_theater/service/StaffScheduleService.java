package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.schedule.AttendanceUpdateRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.schedule.CreateStaffScheduleRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.schedule.StaffScheduleResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.schedule.UpdateStaffScheduleRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.StaffAttendance;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.StaffShiftAssignment;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.User;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.AttendanceStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.StaffScheduleStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.StaffAttendanceRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.StaffShiftAssignmentRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.UserProfileRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.UserRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class StaffScheduleService {
    StaffShiftAssignmentRepository assignmentRepository;
    StaffAttendanceRepository attendanceRepository;
    UserRepository userRepository;
    UserProfileRepository userProfileRepository;
    ComboAuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<StaffScheduleResponse> list(LocalDate from, LocalDate to, String staffUserId) {
        LocalDate safeFrom = from == null ? LocalDate.now() : from;
        LocalDate safeTo = to == null ? safeFrom.plusDays(14) : to;
        if (safeTo.isBefore(safeFrom) || Duration.between(safeFrom.atStartOfDay(), safeTo.plusDays(1).atStartOfDay()).toDays() > 92) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Khoảng thời gian lịch ca phải từ 1 đến 92 ngày.");
        }
        String requestedUser = normalize(staffUserId);
        if (!canManageSchedules()) {
            requestedUser = currentUser().getUserId();
        }
        List<StaffShiftAssignment> assignments = requestedUser == null
                ? assignmentRepository.findByWorkDateBetweenOrderByWorkDateAscPlannedStartAsc(safeFrom, safeTo)
                : assignmentRepository.findByStaff_UserIdAndWorkDateBetweenOrderByWorkDateAscPlannedStartAsc(requestedUser, safeFrom, safeTo);
        return assignments.stream().map(this::toResponse).toList();
    }

    @Transactional
    @PreAuthorize("hasAuthority('SCHEDULE_MANAGE')")
    public StaffScheduleResponse create(CreateStaffScheduleRequest request) {
        validateTime(request.getPlannedStart(), request.getPlannedEnd());
        User staff = findStaff(request.getStaffUserId());
        ensureNoOverlap(staff.getUserId(), request.getWorkDate(), request.getPlannedStart(), request.getPlannedEnd(), null);
        StaffShiftAssignment assignment = StaffShiftAssignment.builder()
                .staff(staff)
                .workDate(request.getWorkDate())
                .shiftType(request.getShiftType())
                .plannedStart(request.getPlannedStart())
                .plannedEnd(request.getPlannedEnd())
                .status(StaffScheduleStatus.SCHEDULED)
                .note(trim(request.getNote()))
                .createdBy(currentUser())
                .build();
        assignment = assignmentRepository.save(assignment);
        auditLogService.record("STAFF_SCHEDULE", assignment.getAssignmentId(), staff.getUsername(), "CREATE",
                "Tạo lịch ca " + request.getWorkDate(), null, snapshot(assignment), null);
        return toResponse(assignment);
    }

    @Transactional
    @PreAuthorize("hasAuthority('SCHEDULE_MANAGE')")
    public StaffScheduleResponse update(Long assignmentId, UpdateStaffScheduleRequest request) {
        StaffShiftAssignment assignment = getAssignment(assignmentId);
        validateTime(request.getPlannedStart(), request.getPlannedEnd());
        ensureNoOverlap(assignment.getStaff().getUserId(), assignment.getWorkDate(), request.getPlannedStart(), request.getPlannedEnd(), assignmentId);
        String before = snapshot(assignment);
        assignment.setShiftType(request.getShiftType());
        assignment.setPlannedStart(request.getPlannedStart());
        assignment.setPlannedEnd(request.getPlannedEnd());
        assignment.setNote(trim(request.getNote()));
        assignment = assignmentRepository.save(assignment);
        auditLogService.record("STAFF_SCHEDULE", assignmentId, assignment.getStaff().getUsername(), "UPDATE",
                "Cập nhật lịch ca", before, snapshot(assignment), null);
        return toResponse(assignment);
    }

    @Transactional
    @PreAuthorize("hasAuthority('SCHEDULE_MANAGE')")
    public StaffScheduleResponse cancel(Long assignmentId, String reason) {
        StaffShiftAssignment assignment = getAssignment(assignmentId);
        if (assignment.getStatus() == StaffScheduleStatus.CANCELLED) return toResponse(assignment);
        String before = snapshot(assignment);
        assignment.setStatus(StaffScheduleStatus.CANCELLED);
        assignment.setNote(trim(reason));
        assignment = assignmentRepository.save(assignment);
        attendanceRepository.findByAssignment_AssignmentId(assignmentId).ifPresent(attendance -> {
            if (attendance.getCheckIn() == null) {
                attendance.setStatus(AttendanceStatus.ABSENT);
                attendanceRepository.save(attendance);
            }
        });
        auditLogService.record("STAFF_SCHEDULE", assignmentId, assignment.getStaff().getUsername(), "CANCEL",
                "Hủy lịch ca", before, snapshot(assignment), reason);
        return toResponse(assignment);
    }

    @Transactional
    public StaffScheduleResponse checkIn(Long assignmentId) {
        StaffShiftAssignment assignment = getAssignment(assignmentId);
        ensureOwnAssignment(assignment);
        if (assignment.getStatus() != StaffScheduleStatus.SCHEDULED) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Ca làm này đã bị hủy.");
        }
        LocalDateTime now = LocalDateTime.now();
        StaffAttendance attendance = attendanceRepository.findByAssignment_AssignmentId(assignmentId)
                .orElseGet(() -> StaffAttendance.builder().assignment(assignment).build());
        if (attendance.getCheckIn() != null) return toResponse(assignment);
        attendance.setCheckIn(now);
        attendance.setStatus(now.toLocalTime().isAfter(assignment.getPlannedStart().plusMinutes(15))
                ? AttendanceStatus.LATE : AttendanceStatus.PRESENT);
        attendance.setRecordedBy(currentUser());
        attendanceRepository.save(attendance);
        auditLogService.record("STAFF_ATTENDANCE", assignmentId, assignment.getStaff().getUsername(), "CHECK_IN",
                "Nhân viên vào ca", null, snapshot(attendance), null);
        return toResponse(assignment);
    }

    @Transactional
    public StaffScheduleResponse checkOut(Long assignmentId) {
        StaffShiftAssignment assignment = getAssignment(assignmentId);
        ensureOwnAssignment(assignment);
        StaffAttendance attendance = attendanceRepository.findByAssignment_AssignmentId(assignmentId)
                .orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR, "Chưa ghi nhận giờ vào ca."));
        if (attendance.getCheckIn() == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Bạn cần vào ca trước khi ra ca.");
        }
        if (attendance.getCheckOut() != null) return toResponse(assignment);
        LocalDateTime now = LocalDateTime.now();
        attendance.setCheckOut(now);
        attendance.setWorkedMinutes((int) Math.max(0, Duration.between(attendance.getCheckIn(), now).toMinutes()));
        attendanceRepository.save(attendance);
        auditLogService.record("STAFF_ATTENDANCE", assignmentId, assignment.getStaff().getUsername(), "CHECK_OUT",
                "Nhân viên ra ca", null, snapshot(attendance), null);
        return toResponse(assignment);
    }

    @Transactional
    @PreAuthorize("hasAuthority('SCHEDULE_MANAGE')")
    public StaffScheduleResponse updateAttendance(Long assignmentId, AttendanceUpdateRequest request) {
        StaffShiftAssignment assignment = getAssignment(assignmentId);
        StaffAttendance attendance = attendanceRepository.findByAssignment_AssignmentId(assignmentId)
                .orElseGet(() -> StaffAttendance.builder().assignment(assignment).build());
        attendance.setStatus(request.getStatus());
        attendance.setNote(trim(request.getNote()));
        attendance.setRecordedBy(currentUser());
        if (request.getStatus() == AttendanceStatus.ABSENT || request.getStatus() == AttendanceStatus.LEAVE) {
            attendance.setCheckIn(null);
            attendance.setCheckOut(null);
            attendance.setWorkedMinutes(0);
        }
        attendanceRepository.save(attendance);
        auditLogService.record("STAFF_ATTENDANCE", assignmentId, assignment.getStaff().getUsername(), "UPDATE",
                "Cập nhật trạng thái chấm công", null, snapshot(attendance), request.getNote());
        return toResponse(assignment);
    }

    private StaffShiftAssignment getAssignment(Long id) {
        return assignmentRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.VALIDATION_ERROR, "Không tìm thấy lịch ca."));
    }

    private User findStaff(String userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        boolean staff = user.getRoles() != null && user.getRoles().stream().anyMatch(role -> "STAFF".equals(role.getRoleName()) || "MANAGER".equals(role.getRoleName()));
        if (!staff) throw new AppException(ErrorCode.VALIDATION_ERROR, "Chỉ có thể xếp lịch cho tài khoản nhân viên hoặc quản lý.");
        return user;
    }

    private void ensureNoOverlap(String userId, LocalDate date, LocalTime start, LocalTime end, Long id) {
        if (assignmentRepository.existsOverlapping(userId, date, start, end, id)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Ca làm bị trùng với lịch đã có của nhân viên.");
        }
    }

    private void validateTime(LocalTime start, LocalTime end) {
        if (start == null || end == null || !end.isAfter(start)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Giờ kết thúc phải sau giờ bắt đầu.");
        }
        if (Duration.between(start, end).toMinutes() > 16 * 60) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Một ca làm không được dài quá 16 giờ.");
        }
    }

    private void ensureOwnAssignment(StaffShiftAssignment assignment) {
        if (!assignment.getStaff().getUserId().equals(currentUser().getUserId())) {
            throw new AppException(ErrorCode.ACCESS_DENIED, "Bạn chỉ được chấm công cho ca của mình.");
        }
    }

    private User currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null) throw new AppException(ErrorCode.UNAUTHORIZED);
        return userRepository.findByUsername(authentication.getName()).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    private boolean canManageSchedules() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.getAuthorities().stream().anyMatch(a -> "SCHEDULE_MANAGE".equals(a.getAuthority()));
    }

    private StaffScheduleResponse toResponse(StaffShiftAssignment assignment) {
        StaffAttendance attendance = attendanceRepository.findByAssignment_AssignmentId(assignment.getAssignmentId()).orElse(null);
        String fullName = userProfileRepository.findById(assignment.getStaff().getUserId()).map(p -> p.getFullName()).orElse(assignment.getStaff().getUsername());
        return StaffScheduleResponse.builder()
                .assignmentId(assignment.getAssignmentId())
                .staffUserId(assignment.getStaff().getUserId())
                .staffUsername(assignment.getStaff().getUsername())
                .staffFullName(fullName)
                .workDate(assignment.getWorkDate())
                .shiftType(assignment.getShiftType())
                .plannedStart(assignment.getPlannedStart())
                .plannedEnd(assignment.getPlannedEnd())
                .status(assignment.getStatus())
                .note(assignment.getNote())
                .attendanceId(attendance == null ? null : attendance.getAttendanceId())
                .checkIn(attendance == null ? null : attendance.getCheckIn())
                .checkOut(attendance == null ? null : attendance.getCheckOut())
                .attendanceStatus(attendance == null ? null : attendance.getStatus())
                .workedMinutes(attendance == null ? null : attendance.getWorkedMinutes())
                .build();
    }

    private String snapshot(Object value) {
        if (value instanceof StaffShiftAssignment a) return a.getWorkDate() + " " + a.getShiftType() + " " + a.getPlannedStart() + "-" + a.getPlannedEnd() + " [" + a.getStatus() + "]";
        if (value instanceof StaffAttendance a) return a.getStatus() + " in=" + a.getCheckIn() + " out=" + a.getCheckOut() + " minutes=" + a.getWorkedMinutes();
        return String.valueOf(value);
    }

    private String trim(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private String normalize(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}
