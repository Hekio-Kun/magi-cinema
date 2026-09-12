package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import jakarta.transaction.Transactional;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user.ChangePasswordRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user.StaffGoogleSheetImportRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user.StaffImportError;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user.StaffImportPreviewResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user.StaffImportPreviewRow;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user.StaffImportResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user.StaffCreateRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user.UpdateUserRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user.UserDetailResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user.UserResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Role;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.StaffGoogleSheetProcessedRow;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.User;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.UserProfile;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.Gender;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.UserStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.mapper.UserMapper;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.RoleRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.BookingRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.PasswordResetTokenRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.ReviewRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.StaffGoogleSheetProcessedRowRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.UserProfileRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import jakarta.mail.internet.AddressException;
import jakarta.mail.internet.InternetAddress;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserService {

    UserRepository userRepository;
    UserProfileRepository userProfileRepository;
    RoleRepository roleRepository;
    PasswordEncoder passwordEncoder;
    UserMapper userMapper;
    CloudinaryService cloudinaryService;
    EmailService emailService;
    StaffGoogleSheetProcessedRowRepository processedRowRepository;
    DashboardNotificationService notificationService;
    BookingRepository bookingRepository;
    ReviewRepository reviewRepository;
    PasswordResetTokenRepository passwordResetTokenRepository;
    TokenBlacklistService tokenBlacklistService;

    private static final String ADMIN_USERNAME = "admin";
    private static final String ADMIN_ROLE = "ADMIN";
    private static final String STAFF_ROLE = "STAFF";
    private static final Set<String> CUSTOMER_ROLE_NAMES = Set.of("CUSTOMER", "GUEST");
    private static final String ROLE_MANAGE = "ROLE_MANAGE";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final String UPPERCASE = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final String LOWERCASE = "abcdefghijkmnopqrstuvwxyz";
    private static final String DIGITS = "23456789";
    private static final String SYMBOLS = "!@#$%";
    private static final String PASSWORD_CHARS = UPPERCASE + LOWERCASE + DIGITS + SYMBOLS;
    private static final String GOOGLE_SHEETS_VALUES_URL = "https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{range}";
    private static final String GOOGLE_SHEETS_METADATA_URL = "https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}";
    private static final DateTimeFormatter VI_DATE_FORMAT = DateTimeFormatter.ofPattern("d/M/yyyy");
    private static final Pattern GOOGLE_ERROR_MESSAGE_PATTERN = Pattern.compile("\"message\"\\s*:\\s*\"([^\"]+)\"");

    @NonFinal
    @Value("${app.google-sheets.api-key:}")
    String googleSheetsApiKey;

    @NonFinal
    @Value("${app.google-sheets.staff-import.spreadsheet-id:}")
    String staffImportSpreadsheetId;

    @NonFinal
    @Value("${app.google-sheets.staff-import.range:Câu trả lời biểu mẫu 1!A:K}")
    String staffImportRange;

    @PreAuthorize("hasAuthority('USER_VIEW')")
    public List<UserDetailResponse> getAllUsers(List<UserStatus> statuses) {
        List<User> users;
        if (statuses != null && !statuses.isEmpty()) {
            users = userRepository.findAll().stream()
                    .filter(user -> statuses.contains(user.getStatus()))
                    .toList();
        } else {
            users = userRepository.findAll().stream()
                    .filter(user -> user.getStatus() != UserStatus.DELETED)
                    .toList();
        }
        Map<String, UserProfile> profileMap = userProfileRepository.findAll().stream()
                .collect(Collectors.toMap(UserProfile::getUserId, p -> p));
        return users.stream()
                .map(user -> toDetailResponse(user, profileMap.get(user.getUserId())))
                .toList();
    }

    @PreAuthorize("hasAuthority('USER_VIEW')")
    public UserDetailResponse getUserById(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        UserProfile profile = userProfileRepository.findById(userId).orElse(null);
        return toDetailResponse(user, profile);
    }

    public UserDetailResponse getMyProfile() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        UserProfile profile = userProfileRepository.findById(user.getUserId()).orElse(null);
        return toDetailResponse(user, profile);
    }

    @Transactional
    @PreAuthorize("hasAnyAuthority('BOOKING_MANAGE', 'USER_VIEW')")
    public UserDetailResponse findActiveMemberByPhone(String phoneNumber) {
        String normalizedPhone = phoneNumber == null ? "" : phoneNumber.trim();
        if (!normalizedPhone.matches("^0\\d{9}$")) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Số điện thoại thành viên không hợp lệ.");
        }

        UserProfile profile = userProfileRepository.findByPhoneNumber(normalizedPhone)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        User user = userRepository.findById(profile.getUserId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        if (user.getStatus() != UserStatus.ACTIVE || !isCustomerAccount(user)) {
            throw new AppException(ErrorCode.USER_NOT_FOUND);
        }
        return toDetailResponse(user, profile);
    }

    @PreAuthorize("hasAnyAuthority('USER_VIEW', 'USER_CREATE')")
    public boolean isEmailAvailable(String email) {
        if (email == null || email.isBlank()) {
            return false;
        }
        return !userRepository.existsByEmail(email.trim().toLowerCase());
    }

    @Transactional
    @PreAuthorize("hasAuthority('USER_CREATE')")
    public UserResponse createStaffUser(StaffCreateRequest request) {
        String usernameKey = request.getUsername().trim();
        String phoneNumber = request.getPhoneNumber().trim();
        if (userRepository.existsByUsername(usernameKey)) {
            throw new AppException(ErrorCode.USER_EXISTED);
        }
        String emailKey = request.getEmail().trim().toLowerCase();
        validateEmailAddress(emailKey);
        if (userRepository.existsByEmail(emailKey)) {
            throw new AppException(ErrorCode.EMAIL_EXISTED);
        }
        if (userProfileRepository.existsByPhoneNumber(phoneNumber)) {
            throw new AppException(ErrorCode.PHONE_EXISTED);
        }
        String identityCard = normalizeOptional(request.getIdentityCard());
        if (identityCard != null && userProfileRepository.existsByIdentityCard(identityCard)) {
            throw new AppException(ErrorCode.IDENTITY_CARD_EXISTED);
        }

        Role role = resolveAssignableRole(request.getRoleName());

        String temporaryPassword = generateTemporaryPassword();
        User user = User.builder()
                .username(usernameKey)
                .email(emailKey)
                .passwordHash(passwordEncoder.encode(temporaryPassword))
                .roles(new HashSet<>(Set.of(role)))
                .status(UserStatus.ACTIVE)
                .build();

        user = userRepository.saveAndFlush(user);

        UserProfile profile = UserProfile.builder()
                .userId(user.getUserId())
                .fullName(request.getFullName().trim())
                .phoneNumber(phoneNumber)
                .identityCard(identityCard)
                .gender(request.getGender())
                .dateOfBirth(request.getDateOfBirth())
                .dateOfBirthUpdatedAt(request.getDateOfBirth() == null ? null : LocalDateTime.now())
                .address(request.getAddress().trim())
                .hireDate(request.getHireDate())
                .email(emailKey)
                .isActive(true)
                .build();

        userProfileRepository.saveAndFlush(profile);
        emailService.sendStaffAccountEmail(
                emailKey,
                request.getFullName().trim(),
                user.getUsername(),
                temporaryPassword);
        log.info("Staff user created - username: {}, role: {}", request.getUsername(), request.getRoleName());
        return userMapper.toUserResponse(user);
    }

    private void validateEmailAddress(String email) {
        try {
            InternetAddress address = new InternetAddress(email, true);
            address.validate();
            if (!email.contains("@") || email.endsWith("@")) {
                throw new AddressException("Email must contain a domain");
            }
        } catch (AddressException ex) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Email không đúng định dạng (ví dụ: ten@gmail.com).");
        }
    }

    @PreAuthorize("hasAuthority('USER_CREATE')")
    public StaffImportPreviewResponse previewStaffFromGoogleSheet(StaffGoogleSheetImportRequest request) {
        SheetImportData importData = readStaffImportData(request);
        List<StaffImportPreviewRow> rows = new ArrayList<>();

        for (int index = 1; index < importData.values.size(); index++) {
            List<String> row = importData.values.get(index);
            if (isBlankRow(row)) {
                continue;
            }
            if (isProcessedImportRow(importData.spreadsheetId, row)) {
                continue;
            }

            int sheetRowNumber = index + 1;
            try {
                StaffCreateRequest staffRequest = buildStaffRequest(row, importData.headerIndexes, importData.defaultRoleName);
                resolveAssignableRole(staffRequest.getRoleName());
                rows.add(StaffImportPreviewRow.builder()
                        .row(sheetRowNumber)
                        .username(staffRequest.getUsername())
                        .email(staffRequest.getEmail())
                        .fullName(staffRequest.getFullName())
                        .phoneNumber(staffRequest.getPhoneNumber())
                        .identityCard(staffRequest.getIdentityCard())
                        .gender(staffRequest.getGender().name())
                        .dateOfBirth(staffRequest.getDateOfBirth().toString())
                        .address(staffRequest.getAddress())
                        .hireDate(staffRequest.getHireDate().toString())
                        .roleName(staffRequest.getRoleName())
                        .valid(true)
                        .message("Hợp lệ")
                        .build());
            } catch (Exception ex) {
                rows.add(StaffImportPreviewRow.builder()
                        .row(sheetRowNumber)
                        .username(getCell(row, importData.headerIndexes, "username"))
                        .email(getCell(row, importData.headerIndexes, "email"))
                        .fullName(getCell(row, importData.headerIndexes, "fullname"))
                        .phoneNumber(getCell(row, importData.headerIndexes, "phonenumber"))
                        .identityCard(getCell(row, importData.headerIndexes, "identitycard"))
                        .gender(getCell(row, importData.headerIndexes, "gender"))
                        .dateOfBirth(getCell(row, importData.headerIndexes, "dateofbirth"))
                        .address(getCell(row, importData.headerIndexes, "address"))
                        .hireDate(getCell(row, importData.headerIndexes, "hiredate"))
                        .roleName(firstNonBlank(getCell(row, importData.headerIndexes, "rolename"), importData.defaultRoleName))
                        .valid(false)
                        .message(resolveImportErrorMessage(ex))
                        .build());
            }
        }

        int validRows = (int) rows.stream().filter(StaffImportPreviewRow::isValid).count();
        return StaffImportPreviewResponse.builder()
                .totalRows(rows.size())
                .validRows(validRows)
                .invalidRows(rows.size() - validRows)
                .rows(rows)
                .build();
    }

    @PreAuthorize("hasAuthority('USER_CREATE')")
    public StaffImportResponse importStaffFromGoogleSheet(StaffGoogleSheetImportRequest request) {
        SheetImportData importData = readStaffImportData(request);
        if (importData.values.size() <= 1) {
            return StaffImportResponse.builder()
                    .totalRows(0)
                    .successCount(0)
                    .failedCount(0)
                    .errors(List.of())
                    .build();
        }

        List<StaffImportError> errors = new ArrayList<>();
        int successCount = 0;
        int totalRows = 0;

        for (int index = 1; index < importData.values.size(); index++) {
            List<String> row = importData.values.get(index);
            if (isBlankRow(row)) {
                continue;
            }
            if (isProcessedImportRow(importData.spreadsheetId, row)) {
                continue;
            }
            totalRows++;
            int sheetRowNumber = index + 1;
            String username = getCell(row, importData.headerIndexes, "username");
            String email = getCell(row, importData.headerIndexes, "email");

            try {
                StaffCreateRequest staffRequest = buildStaffRequest(row, importData.headerIndexes, importData.defaultRoleName);
                createStaffUser(staffRequest);
                markImportRowProcessed(importData.spreadsheetId, row, sheetRowNumber, staffRequest);
                successCount++;
            } catch (Exception ex) {
                errors.add(StaffImportError.builder()
                        .row(sheetRowNumber)
                        .username(username)
                        .email(email)
                        .message(resolveImportErrorMessage(ex))
                        .build());
            }
        }

        if (successCount > 0) {
            notificationService.createNotification(
                    "Import nhân viên mới",
                    "Đã import " + successCount + " nhân viên từ Google Form. Các form đã xử lý sẽ không hiển thị lại trong lần import sau.",
                    "STAFF_IMPORT");
        }

        return StaffImportResponse.builder()
                .totalRows(totalRows)
                .successCount(successCount)
                .failedCount(errors.size())
                .errors(errors)
                .build();
    }

    @Transactional
    public UserDetailResponse updateMyProfile(UpdateUserRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        
        String userId = user.getUserId();

        UserProfile profile = userProfileRepository.findById(userId).orElse(new UserProfile());
        profile.setUserId(userId);

        if (request.getFullName() != null)    profile.setFullName(request.getFullName());
        if (request.getPhoneNumber() != null) {
            String phoneNumber = request.getPhoneNumber().trim();
            if (userProfileRepository.existsByPhoneNumberAndUserIdNot(phoneNumber, userId)) {
                throw new AppException(ErrorCode.PHONE_EXISTED);
            }
            profile.setPhoneNumber(phoneNumber);
        }
        if (request.getAddress() != null)     profile.setAddress(request.getAddress());
        if (request.getGender() != null)      profile.setGender(request.getGender());
        if (request.getDateOfBirth() != null
                && !java.util.Objects.equals(profile.getDateOfBirth(), request.getDateOfBirth())) {
            profile.setDateOfBirth(request.getDateOfBirth());
            profile.setDateOfBirthUpdatedAt(LocalDateTime.now());
        }
        if (request.getIdentityCard() != null) profile.setIdentityCard(request.getIdentityCard());

        userProfileRepository.save(profile);
        log.info("User self-updated profile - ID: {}", userId);
        return toDetailResponse(user, profile);
    }

    @Transactional
    public void changeMyPassword(ChangePasswordRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new AppException(ErrorCode.CURRENT_PASSWORD_INVALID);
        }
        if (passwordEncoder.matches(request.getNewPassword(), user.getPasswordHash())) {
            throw new AppException(ErrorCode.NEW_PASSWORD_SAME_AS_CURRENT);
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordChangedAt(LocalDateTime.now());
        userRepository.save(user);
        if (tokenBlacklistService != null) {
            tokenBlacklistService.revokeAllTokensForUser(user.getUsername());
        }
        log.info("User changed password and revoked prior tokens - ID: {}", user.getUserId());
    }

    @Transactional
    public String uploadAvatar(MultipartFile file) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        String userId = user.getUserId();

        UserProfile profile = userProfileRepository.findById(userId).orElse(new UserProfile());
        profile.setUserId(userId);

        // Upload new image to cloudinary
        String newAvatarUrl = cloudinaryService.uploadImage(file);

        // Delete old image if exists
        if (profile.getAvatarUrl() != null && !profile.getAvatarUrl().isBlank()) {
            cloudinaryService.deleteImage(profile.getAvatarUrl());
        }

        profile.setAvatarUrl(newAvatarUrl);
        userProfileRepository.save(profile);

        log.info("User uploaded new avatar - ID: {}", userId);
        return newAvatarUrl;
    }

    @Transactional
    @PreAuthorize("hasAuthority('USER_UPDATE')")
    public UserDetailResponse updateUser(String userId, UpdateUserRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        guardProtectedAdminAccount(user, "Không thể chỉnh sửa tài khoản quản trị hệ thống.");

        if (request.getStatus() != null) {
            user.setStatus(request.getStatus());
        }

        if (request.getRoleName() != null && !request.getRoleName().isBlank()) {
            Role role = resolveAssignableRole(request.getRoleName());
            user.setRoles(new HashSet<>(Set.of(role)));
        }

        userRepository.save(user);

        UserProfile profile = userProfileRepository.findById(userId).orElse(null);
        if (profile != null) {
            if (request.getFullName() != null)    profile.setFullName(request.getFullName());
            if (request.getPhoneNumber() != null) {
                String phoneNumber = request.getPhoneNumber().trim();
                if (userProfileRepository.existsByPhoneNumberAndUserIdNot(phoneNumber, userId)) {
                    throw new AppException(ErrorCode.PHONE_EXISTED);
                }
                profile.setPhoneNumber(phoneNumber);
            }
            if (request.getAddress() != null)     profile.setAddress(request.getAddress());
            if (request.getGender() != null)      profile.setGender(request.getGender());
            if (request.getAvatarUrl() != null)   profile.setAvatarUrl(request.getAvatarUrl());
            if (request.getDateOfBirth() != null
                    && !java.util.Objects.equals(profile.getDateOfBirth(), request.getDateOfBirth())) {
                profile.setDateOfBirth(request.getDateOfBirth());
                profile.setDateOfBirthUpdatedAt(LocalDateTime.now());
            }
            if (request.getMemberTier() != null) {
                String memberTier = request.getMemberTier().trim().toUpperCase(java.util.Locale.ROOT);
                if (!memberTier.isBlank() && !memberTier.matches("^[A-Z0-9_-]{2,50}$")) {
                    throw new AppException(
                            ErrorCode.VALIDATION_ERROR,
                            "Mã hạng thành viên chỉ gồm chữ, số, gạch ngang hoặc gạch dưới và dài tối đa 50 ký tự.");
                }
                profile.setMemberTier(memberTier.isBlank() ? null : memberTier);
            }
            if (request.getIdentityCard() != null) {
                String identityCard = normalizeOptional(request.getIdentityCard());
                if (identityCard != null && userProfileRepository.existsByIdentityCardAndUserIdNot(identityCard, userId)) {
                    throw new AppException(ErrorCode.IDENTITY_CARD_EXISTED);
                }
                profile.setIdentityCard(identityCard);
            }
            userProfileRepository.save(profile);
        }

        log.info("User updated - ID: {}", userId);
        return toDetailResponse(user, profile);
    }

    @Transactional
    @PreAuthorize("hasAuthority('USER_UPDATE')")
    public void updateUserStatus(String userId, UserStatus newStatus) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        guardProtectedAdminAccount(user, "Không thể thay đổi trạng thái tài khoản quản trị hệ thống.");
        user.setStatus(newStatus);
        userRepository.save(user);
        log.info("User status updated - ID: {}, new status: {}", userId, newStatus);
    }

    @Transactional
    @PreAuthorize("hasAuthority('USER_DELETE')")
    public void deleteUser(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        guardProtectedAdminAccount(user, "Không thể vô hiệu hóa tài khoản quản trị hệ thống.");
        user.setStatus(UserStatus.DELETED);
        userRepository.save(user);
        log.info("User soft-deleted - ID: {}", userId);
    }

    @Transactional
    @PreAuthorize("hasAuthority('USER_DELETE')")
    public void permanentlyDeleteStaffUser(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        guardProtectedAdminAccount(user, "Không thể xóa tài khoản quản trị hệ thống.");

        if (!isStaffAccount(user)) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Chỉ có thể xóa vĩnh viễn tài khoản nhân viên tại chức năng này.");
        }
        if (user.getStatus() != UserStatus.DELETED) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Nhân viên phải được vô hiệu hóa trước khi xóa vĩnh viễn.");
        }
        if (bookingRepository.existsByUser_UserId(userId)
                || reviewRepository.existsByUser_UserId(userId)) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Không thể xóa vĩnh viễn nhân viên vì tài khoản còn lịch sử đặt vé hoặc đánh giá cần được lưu.");
        }

        try {
            passwordResetTokenRepository.findByUser(user)
                    .ifPresent(passwordResetTokenRepository::delete);
            passwordResetTokenRepository.flush();

            userProfileRepository.findById(userId)
                    .ifPresent(userProfileRepository::delete);
            userProfileRepository.flush();

            userRepository.delete(user);
            userRepository.flush();
            log.info("Staff user permanently deleted - ID: {}", userId);
        } catch (DataIntegrityViolationException exception) {
            log.warn("Cannot permanently delete staff user because related data still exists - ID: {}", userId);
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Không thể xóa vĩnh viễn nhân viên vì tài khoản vẫn còn dữ liệu liên quan trong hệ thống.");
        }
    }

    private boolean isStaffAccount(User user) {
        return user.getRoles() != null
                && !user.getRoles().isEmpty()
                && user.getRoles().stream()
                .map(Role::getRoleName)
                .noneMatch(CUSTOMER_ROLE_NAMES::contains);
    }

    private void guardProtectedAdminAccount(User user, String message) {
        if (isProtectedAdminAccount(user)) {
            log.warn("Attempt to modify protected admin account - username: {}", user.getUsername());
            throw new AppException(ErrorCode.CANNOT_LOCK_SUPERADMIN, message);
        }
    }

    private boolean isProtectedAdminAccount(User user) {
        return ADMIN_USERNAME.equalsIgnoreCase(user.getUsername())
                || hasAdminRole(user);
    }

    private boolean hasAdminRole(User user) {
        return user.getRoles() != null && user.getRoles().stream()
                .anyMatch(role -> ADMIN_ROLE.equalsIgnoreCase(role.getRoleName()));
    }

    private Role resolveAssignableRole(String roleName) {
        String normalizedRoleName = roleName == null ? "" : roleName.trim().toUpperCase();
        if (normalizedRoleName.isBlank()) {
            throw new AppException(ErrorCode.ROLE_NOT_FOUND);
        }
        if (ADMIN_ROLE.equals(normalizedRoleName)) {
            throw new AppException(ErrorCode.ACCESS_DENIED, "Không được gán vai trò quản trị hệ thống cho nhân viên.");
        }
        if (!STAFF_ROLE.equals(normalizedRoleName) && !hasRoleManageAuthority()) {
            throw new AppException(ErrorCode.ACCESS_DENIED, "Cần quyền quản lý vai trò để gán vai trò này.");
        }
        return roleRepository.findByRoleName(normalizedRoleName)
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));
    }

    private boolean hasRoleManageAuthority() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(grantedAuthority -> ROLE_MANAGE.equals(grantedAuthority.getAuthority()));
    }

    private String firstRoleName(Set<Role> roles) {
        if (roles == null || roles.isEmpty()) return null;
        return roles.iterator().next().getRoleName();
    }

    private UserDetailResponse toDetailResponse(User user, UserProfile profile) {
        boolean member = isCustomerAccount(user);
        UserDetailResponse.UserDetailResponseBuilder builder = UserDetailResponse.builder()
                .userId(user.getUserId())
                .username(user.getUsername())
                .email(user.getEmail())
                .status(user.getStatus())
                .roleName(firstRoleName(user.getRoles()))
                .member(member)
                .loyaltyPoints(profile == null || profile.getLoyaltyPoints() == null
                        ? 0
                        : profile.getLoyaltyPoints())
                .memberTier(profile == null ? null : profile.getMemberTier())
                .createdAt(user.getCreatedAt());

        if (profile != null) {
            builder.fullName(profile.getFullName())
                   .phoneNumber(profile.getPhoneNumber())
                   .gender(profile.getGender())
                   .address(profile.getAddress())
                   .identityCard(profile.getIdentityCard())
                   .dateOfBirth(profile.getDateOfBirth())
                   .hireDate(profile.getHireDate())
                   .avatarUrl(profile.getAvatarUrl());
        }

        return builder.build();
    }

    private boolean isCustomerAccount(User user) {
        return user != null
                && user.getRoles() != null
                && user.getRoles().stream()
                        .anyMatch(role -> "CUSTOMER".equalsIgnoreCase(role.getRoleName()));
    }

    private String normalizeOptional(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String generateTemporaryPassword() {
        char[] password = new char[12];
        password[0] = randomChar(UPPERCASE);
        password[1] = randomChar(LOWERCASE);
        password[2] = randomChar(DIGITS);
        password[3] = randomChar(SYMBOLS);
        for (int i = 4; i < password.length; i++) {
            password[i] = randomChar(PASSWORD_CHARS);
        }
        for (int i = password.length - 1; i > 0; i--) {
            int swapIndex = SECURE_RANDOM.nextInt(i + 1);
            char temp = password[i];
            password[i] = password[swapIndex];
            password[swapIndex] = temp;
        }
        return new String(password);
    }

    private char randomChar(String source) {
        return source.charAt(SECURE_RANDOM.nextInt(source.length()));
    }

    private SheetImportData readStaffImportData(StaffGoogleSheetImportRequest request) {
        String spreadsheetId = firstNonBlank(
                request == null ? null : request.getSpreadsheetId(),
                staffImportSpreadsheetId);
        String range = firstNonBlank(
                request == null ? null : request.getRange(),
                staffImportRange);
        String defaultRoleName = firstNonBlank(
                request == null ? null : request.getDefaultRoleName(),
                "STAFF");

        if (googleSheetsApiKey == null || googleSheetsApiKey.isBlank()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Chưa cấu hình app.google-sheets.api-key.");
        }
        if (spreadsheetId == null || spreadsheetId.isBlank()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Thiếu spreadsheetId để import nhân viên.");
        }

        GoogleSheetValuesResponse sheet = fetchSheetValues(spreadsheetId, range);
        List<List<String>> values = sheet.values == null ? List.of() : sheet.values;
        Map<String, Integer> headerIndexes = values.isEmpty() ? Map.of() : buildHeaderIndexes(values.getFirst());
        return new SheetImportData(spreadsheetId, values, headerIndexes, defaultRoleName);
    }

    private StaffCreateRequest buildStaffRequest(
            List<String> row,
            Map<String, Integer> headerIndexes,
            String defaultRoleName
    ) {
        return StaffCreateRequest.builder()
                .username(requiredCell(row, headerIndexes, "username"))
                .email(requiredCell(row, headerIndexes, "email"))
                .fullName(requiredCell(row, headerIndexes, "fullname"))
                .phoneNumber(requiredCell(row, headerIndexes, "phonenumber"))
                .identityCard(getCell(row, headerIndexes, "identitycard"))
                .gender(parseGender(requiredCell(row, headerIndexes, "gender")))
                .dateOfBirth(parseDate(requiredCell(row, headerIndexes, "dateofbirth")))
                .address(requiredCell(row, headerIndexes, "address"))
                .hireDate(parseDate(requiredCell(row, headerIndexes, "hiredate")))
                .roleName(firstNonBlank(getCell(row, headerIndexes, "rolename"), defaultRoleName))
                .build();
    }

    private boolean isProcessedImportRow(String spreadsheetId, List<String> row) {
        return processedRowRepository.existsBySpreadsheetIdAndRowHash(spreadsheetId, hashImportRow(row));
    }

    private void markImportRowProcessed(
            String spreadsheetId,
            List<String> row,
            int sheetRowNumber,
            StaffCreateRequest staffRequest
    ) {
        String rowHash = hashImportRow(row);
        if (processedRowRepository.existsBySpreadsheetIdAndRowHash(spreadsheetId, rowHash)) {
            return;
        }
        processedRowRepository.save(StaffGoogleSheetProcessedRow.builder()
                .spreadsheetId(spreadsheetId)
                .rowHash(rowHash)
                .sheetRowNumber(sheetRowNumber)
                .username(staffRequest.getUsername())
                .email(staffRequest.getEmail())
                .build());
    }

    private String hashImportRow(List<String> row) {
        String normalized = row.stream()
                .map(value -> value == null ? "" : value.trim())
                .collect(Collectors.joining("\u001F"));
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(normalized.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder(bytes.length * 2);
            for (byte item : bytes) {
                builder.append(String.format("%02x", item));
            }
            return builder.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is not available", ex);
        }
    }

    private GoogleSheetValuesResponse fetchSheetValues(String spreadsheetId, String range) {
        return fetchSheetValues(spreadsheetId, range, true);
    }

    private GoogleSheetValuesResponse fetchSheetValues(String spreadsheetId, String range, boolean allowRangeFallback) {
        URI uri = UriComponentsBuilder
                .fromUriString(GOOGLE_SHEETS_VALUES_URL)
                .queryParam("key", googleSheetsApiKey)
                .buildAndExpand(spreadsheetId, range)
                .encode()
                .toUri();
        try {
            GoogleSheetValuesResponse response = new RestTemplate().getForObject(uri, GoogleSheetValuesResponse.class);
            if (response == null) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Google Sheet không trả về dữ liệu.");
            }
            return response;
        } catch (RestClientResponseException ex) {
            String googleMessage = extractGoogleErrorMessage(ex.getResponseBodyAsString());
            if (allowRangeFallback && googleMessage.toLowerCase().contains("unable to parse range")) {
                String fallbackRange = resolveFirstSheetRange(spreadsheetId);
                if (!fallbackRange.equals(range)) {
                    return fetchSheetValues(spreadsheetId, fallbackRange, false);
                }
            }
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Không thể đọc Google Sheet: " + googleMessage);
        } catch (RestClientException ex) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Không thể đọc Google Sheet. Kiểm tra API key, spreadsheetId, range và quyền chia sẻ sheet.");
        }
    }

    private String resolveFirstSheetRange(String spreadsheetId) {
        URI uri = UriComponentsBuilder
                .fromUriString(GOOGLE_SHEETS_METADATA_URL)
                .queryParam("fields", "sheets.properties.title")
                .queryParam("key", googleSheetsApiKey)
                .buildAndExpand(spreadsheetId)
                .encode()
                .toUri();
        try {
            GoogleSpreadsheetMetadata metadata = new RestTemplate().getForObject(uri, GoogleSpreadsheetMetadata.class);
            if (metadata == null || metadata.sheets == null || metadata.sheets.isEmpty()) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Không tìm thấy tab nào trong Google Sheet.");
            }
            GoogleSheetMetadata firstSheet = metadata.sheets.getFirst();
            if (firstSheet.properties == null
                    || firstSheet.properties.title == null
                    || firstSheet.properties.title.isBlank()) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Không tìm thấy tab nào trong Google Sheet.");
            }
            return firstSheet.properties.title + "!A:K";
        } catch (RestClientResponseException ex) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Không thể đọc thông tin Google Sheet: " + extractGoogleErrorMessage(ex.getResponseBodyAsString()));
        } catch (RestClientException ex) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Không thể đọc thông tin Google Sheet.");
        }
    }

    private String extractGoogleErrorMessage(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) {
            return "Google Sheets API không trả về chi tiết lỗi.";
        }
        Matcher matcher = GOOGLE_ERROR_MESSAGE_PATTERN.matcher(responseBody);
        if (matcher.find()) {
            return matcher.group(1).replace("\\u0027", "'");
        }
        return responseBody;
    }

    private Map<String, Integer> buildHeaderIndexes(List<String> headerRow) {
        Map<String, Integer> indexes = new HashMap<>();
        for (int i = 0; i < headerRow.size(); i++) {
            indexes.put(normalizeHeader(headerRow.get(i)), i);
        }
        return indexes;
    }

    private String normalizeHeader(String value) {
        if (value == null) {
            return "";
        }
        String normalized = value.trim().toLowerCase()
                .replace(" ", "")
                .replace("_", "")
                .replace("-", "");
        return switch (normalized) {
            case "emailaddress", "mail", "email" -> "email";
            case "hoten", "fullname", "name" -> "fullname";
            case "sodienthoai", "phone", "phonenumber" -> "phonenumber";
            case "cccd", "cmnd", "identity", "identitycard", "identitycardnumber" -> "identitycard";
            case "gioitinh", "gender" -> "gender";
            case "ngaysinh", "dateofbirth", "birthdate" -> "dateofbirth";
            case "diachi", "address" -> "address";
            case "ngayvaolam", "hiredate", "startdate" -> "hiredate";
            case "vaitro", "role", "rolename" -> "rolename";
            default -> normalized;
        };
    }

    private String getCell(List<String> row, Map<String, Integer> headerIndexes, String key) {
        Integer index = headerIndexes.get(key);
        if (index == null || index < 0 || index >= row.size()) {
            return "";
        }
        return row.get(index) == null ? "" : row.get(index).trim();
    }

    private String requiredCell(List<String> row, Map<String, Integer> headerIndexes, String key) {
        String value = getCell(row, headerIndexes, key);
        if (value.isBlank()) {
            throw new IllegalArgumentException("Thiếu cột hoặc giá trị bắt buộc: " + key);
        }
        return value;
    }

    private Gender parseGender(String value) {
        String normalized = value.trim().toUpperCase();
        return switch (normalized) {
            case "NAM", "MALE", "M" -> Gender.MALE;
            case "NU", "NỮ", "FEMALE", "F" -> Gender.FEMALE;
            case "KHAC", "KHÁC", "OTHER", "O" -> Gender.OTHER;
            default -> throw new IllegalArgumentException("Giới tính không hợp lệ: " + value);
        };
    }

    private LocalDate parseDate(String value) {
        String trimmed = value.trim();
        try {
            return LocalDate.parse(trimmed);
        } catch (DateTimeParseException ignored) {
            try {
                return LocalDate.parse(trimmed, VI_DATE_FORMAT);
            } catch (DateTimeParseException ex) {
                throw new IllegalArgumentException("Ngày không hợp lệ: " + value + ". Dùng yyyy-MM-dd hoặc dd/MM/yyyy.");
            }
        }
    }

    private boolean isBlankRow(List<String> row) {
        return row == null || row.stream().allMatch(value -> value == null || value.isBlank());
    }

    private String firstNonBlank(String first, String fallback) {
        return first != null && !first.isBlank() ? first.trim() : fallback;
    }

    private String resolveImportErrorMessage(Exception ex) {
        if (ex instanceof AppException appException) {
            return appException.getCustomMessage() != null
                    ? appException.getCustomMessage()
                    : appException.getErrorCode().getMessage();
        }
        return ex.getMessage() == null ? "Dòng dữ liệu không hợp lệ." : ex.getMessage();
    }

    @lombok.Data
    private static class GoogleSheetValuesResponse {
        List<List<String>> values;
    }

    @lombok.Data
    private static class GoogleSpreadsheetMetadata {
        List<GoogleSheetMetadata> sheets;
    }

    @lombok.Data
    private static class GoogleSheetMetadata {
        GoogleSheetProperties properties;
    }

    @lombok.Data
    private static class GoogleSheetProperties {
        String title;
    }

    private record SheetImportData(
            String spreadsheetId,
            List<List<String>> values,
            Map<String, Integer> headerIndexes,
            String defaultRoleName
    ) {
    }
}
