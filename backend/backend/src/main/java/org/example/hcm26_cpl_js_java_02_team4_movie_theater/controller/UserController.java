package org.example.hcm26_cpl_js_java_02_team4_movie_theater.controller;

import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user.StaffCreateRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user.StaffGoogleSheetImportRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user.StaffImportPreviewResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user.StaffImportResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user.ChangePasswordRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user.UpdateUserRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.common.ApiResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user.UserDetailResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user.UserResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.UserStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.service.UserService;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserController {

    UserService userService;

    @GetMapping
    @PreAuthorize("hasAuthority('USER_VIEW')")
    public ApiResponse<List<UserDetailResponse>> getAllUsers(@RequestParam(required = false) List<UserStatus> statuses) {
        return ApiResponse.<List<UserDetailResponse>>builder()
                .result(userService.getAllUsers(statuses))
                .build();
    }

    @GetMapping("/staff")
    @PreAuthorize("hasAnyAuthority('USER_VIEW', 'SCHEDULE_MANAGE')")
    public ApiResponse<List<UserDetailResponse>> getStaffUsers() {
        return ApiResponse.<List<UserDetailResponse>>builder().result(userService.getStaffUsers()).build();
    }

    @GetMapping("/me")
    public ApiResponse<UserDetailResponse> getMyProfile() {
        return ApiResponse.<UserDetailResponse>builder()
                .result(userService.getMyProfile())
                .build();
    }

    @GetMapping("/members/by-phone")
    @PreAuthorize("hasAnyAuthority('BOOKING_MANAGE', 'USER_VIEW')")
    public ApiResponse<UserDetailResponse> findMemberByPhone(@RequestParam String phoneNumber) {
        return ApiResponse.<UserDetailResponse>builder()
                .result(userService.findActiveMemberByPhone(phoneNumber))
                .build();
    }

    @PutMapping("/me")
    public ApiResponse<UserDetailResponse> updateMyProfile(@Valid @RequestBody UpdateUserRequest request) {
        return ApiResponse.<UserDetailResponse>builder()
                .result(userService.updateMyProfile(request))
                .build();
    }

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<String> uploadAvatar(@RequestParam("file") MultipartFile file) {
        return ApiResponse.<String>builder()
                .result(userService.uploadAvatar(file))
                .build();
    }

    @GetMapping("/{userId}")
    @PreAuthorize("hasAuthority('USER_VIEW')")
    public ApiResponse<UserDetailResponse> getUserById(@PathVariable String userId) {
        return ApiResponse.<UserDetailResponse>builder()
                .result(userService.getUserById(userId))
                .build();
    }
    @PostMapping("/staff")
    @PreAuthorize("hasAuthority('USER_CREATE')")
    public ApiResponse<UserResponse> createStaffUser(@Valid @RequestBody StaffCreateRequest request) {
        return ApiResponse.<UserResponse>builder()
                .result(userService.createStaffUser(request))
                .build();
    }

    @PostMapping("/staff/import/google-sheet")
    @PreAuthorize("hasAuthority('USER_CREATE')")
    public ApiResponse<StaffImportResponse> importStaffFromGoogleSheet(
            @RequestBody(required = false) StaffGoogleSheetImportRequest request) {
        return ApiResponse.<StaffImportResponse>builder()
                .message("Import nhân viên từ Google Sheet hoàn tất.")
                .result(userService.importStaffFromGoogleSheet(request))
                .build();
    }

    @PostMapping("/staff/import/google-sheet/preview")
    @PreAuthorize("hasAuthority('USER_CREATE')")
    public ApiResponse<StaffImportPreviewResponse> previewStaffFromGoogleSheet(
            @RequestBody(required = false) StaffGoogleSheetImportRequest request) {
        return ApiResponse.<StaffImportPreviewResponse>builder()
                .message("Đọc trước danh sách nhân viên từ Google Sheet thành công.")
                .result(userService.previewStaffFromGoogleSheet(request))
                .build();
    }

    @PutMapping("/me/password")
    public ApiResponse<Void> changeMyPassword(@Valid @RequestBody ChangePasswordRequest request) {
        userService.changeMyPassword(request);
        return ApiResponse.<Void>builder()
                .message("Đổi mật khẩu thành công!")
                .build();
    }

    @GetMapping("/staff/email-availability")
    @PreAuthorize("hasAnyAuthority('USER_VIEW', 'USER_CREATE')")
    public ApiResponse<Boolean> isStaffEmailAvailable(@RequestParam String email) {
        return ApiResponse.<Boolean>builder()
                .result(userService.isEmailAvailable(email))
                .build();
    }

    @PutMapping("/{userId}")
    @PreAuthorize("hasAuthority('USER_UPDATE')")
    public ApiResponse<UserDetailResponse> updateUser(
            @PathVariable String userId,
            @Valid @RequestBody UpdateUserRequest request) {
        return ApiResponse.<UserDetailResponse>builder()
                .result(userService.updateUser(userId, request))
                .build();
    }

    @PutMapping("/{userId}/status")
    @PreAuthorize("hasAuthority('USER_UPDATE')")
    public ApiResponse<String> updateUserStatus(
            @PathVariable String userId,
            @RequestParam UserStatus status) {
        log.info("Updating user status - ID: {}, status: {}", userId, status);
        userService.updateUserStatus(userId, status);
        return ApiResponse.<String>builder()
                .message("Cập nhật trạng thái thành công!")
                .build();
    }

    @DeleteMapping("/{userId}")
    @PreAuthorize("hasAuthority('USER_DELETE')")
    public ApiResponse<String> deleteUser(@PathVariable String userId) {
        log.info("Soft-deleting user - ID: {}", userId);
        userService.deleteUser(userId);
        return ApiResponse.<String>builder()
                .message("Vô hiệu hoá tài khoản thành công!")
                .build();
    }

    @DeleteMapping("/staff/{userId}/permanent")
    @PreAuthorize("hasAuthority('USER_DELETE')")
    public ApiResponse<String> permanentlyDeleteStaffUser(@PathVariable String userId) {
        log.info("Permanently deleting staff user - ID: {}", userId);
        userService.permanentlyDeleteStaffUser(userId);
        return ApiResponse.<String>builder()
                .message("Đã xóa vĩnh viễn nhân viên!")
                .build();
    }
}
