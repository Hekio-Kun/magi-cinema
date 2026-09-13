package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user.RoleRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user.RoleResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Permission;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Role;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.User;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.mapper.RoleMapper;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.PermissionRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.RoleRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RoleService {
    RoleRepository roleRepository;
    PermissionRepository permissionRepository;
    UserRepository userRepository;
    RoleMapper roleMapper;
    TokenBlacklistService tokenBlacklistService;
    private static final String ADMIN_ROLE_NAME = "ADMIN";
    private static final String STAFF_ROLE_NAME = "STAFF";
    private static final String PERSONAL_ROLE_SUFFIX = "_ACCESS";
    private static final Set<String> NON_EDITABLE_ROLE_NAMES = Set.of("ADMIN", "CUSTOMER", "GUEST");
    private static final Set<String> NON_DELETABLE_ROLE_NAMES = Set.of("ADMIN", "MANAGER", "STAFF", "CUSTOMER", "GUEST");

    @Transactional
    public RoleResponse create(RoleRequest request) {
        if (request == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Thông tin vai trò không được để trống.");
        }
        String roleName = normalizeRoleName(request.getRoleName());
        if (NON_EDITABLE_ROLE_NAMES.contains(roleName)) {
            throw new AppException(ErrorCode.ACCESS_DENIED, "Không thể chỉnh sửa vai trò hệ thống.");
        }
        if (roleRepository.existsById(roleName)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Tên vai trò đã tồn tại.");
        }

        Set<String> requestedPermissionNames = normalizePermissionNames(request.getPermissions());
        List<Permission> permissions = resolvePermissions(requestedPermissionNames);

        request.setRoleName(roleName);
        request.setPermissions(requestedPermissionNames);
        Role role = roleMapper.toRole(request);

        role.setPermissions(new HashSet<>(permissions));

        role = roleRepository.save(role);
        return roleMapper.toRoleResponse(role);
    }

    @Transactional
    public RoleResponse update(String roleName, RoleRequest request) {
        String normalizedRoleName = normalizeRoleName(roleName);
        if (request == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Thông tin vai trò không được để trống.");
        }
        String requestedRoleName = normalizeRoleName(request.getRoleName());
        if (!normalizedRoleName.equals(requestedRoleName)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Tên vai trò trong URL và dữ liệu không khớp.");
        }
        if (NON_EDITABLE_ROLE_NAMES.contains(normalizedRoleName)) {
            throw new AppException(ErrorCode.ACCESS_DENIED, "Không thể chỉnh sửa vai trò hệ thống.");
        }

        Role role = roleRepository.findById(normalizedRoleName)
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));
        Set<String> requestedPermissionNames = normalizePermissionNames(request.getPermissions());
        role.setPermissions(new HashSet<>(resolvePermissions(requestedPermissionNames)));
        if (request.getDescription() != null) {
            role.setDescription(request.getDescription().trim());
        }
        role = roleRepository.save(role);
        revokeTokensForRoleUsers(normalizedRoleName);
        return roleMapper.toRoleResponse(role);
    }

    public List<RoleResponse> getAll() {
        return roleMapper.toRoleResponseList(roleRepository.findAll());
    }

    @Transactional
    public void delete(String role) {
        String roleName = normalizeRoleName(role);
        if (NON_DELETABLE_ROLE_NAMES.contains(roleName)) {
            throw new AppException(ErrorCode.ACCESS_DENIED, "Không thể xóa vai trò hệ thống.");
        }

        Role targetRole = roleRepository.findById(roleName)
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND));

        List<User> assignedUsers = userRepository.findAllByRoles_RoleName(roleName);
        if (!assignedUsers.isEmpty()) {
            if (!isPersonalRole(roleName)) {
                throw new AppException(
                        ErrorCode.VALIDATION_ERROR,
                        "Vai trò này đang được gán cho " + assignedUsers.size()
                                + " tài khoản. Hãy chuyển các tài khoản đó sang vai trò khác trước khi xóa."
                );
            }
            reassignPersonalRoleUsersToStaff(assignedUsers);
        }

        if (targetRole.getPermissions() != null) {
            targetRole.getPermissions().clear();
        }
        roleRepository.delete(targetRole);
    }

    private String normalizeRoleName(String roleName) {
        if (roleName == null || roleName.isBlank()) {
            throw new AppException(ErrorCode.ROLE_NOT_FOUND);
        }
        String normalized = roleName.trim().toUpperCase(Locale.ROOT);
        if (!normalized.matches("^[A-Z][A-Z0-9_]{2,49}$") || normalized.startsWith("ROLE_")) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Tên vai trò phải dài 3-50 ký tự, chỉ gồm chữ in hoa, số và gạch dưới; không thêm tiền tố ROLE_.");
        }
        return normalized;
    }

    private Set<String> normalizePermissionNames(Set<String> permissionNames) {
        if (permissionNames == null || permissionNames.isEmpty()) {
            return Set.of();
        }
        Set<String> normalized = new java.util.LinkedHashSet<>();
        for (String permissionName : permissionNames) {
            if (permissionName == null || permissionName.isBlank()) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Tên quyền không được để trống.");
            }
            String value = permissionName.trim().toUpperCase(Locale.ROOT);
            if (!value.matches("^[A-Z][A-Z0-9_]{2,49}$")) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Tên quyền không hợp lệ: " + permissionName);
            }
            normalized.add(value);
        }
        return Set.copyOf(normalized);
    }

    private List<Permission> resolvePermissions(Set<String> permissionNames) {
        List<Permission> permissions = permissionRepository.findAllById(permissionNames);
        if (permissions.size() != permissionNames.size()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Danh sách quyền của vai trò chứa quyền không tồn tại.");
        }
        return permissions;
    }

    private boolean isPersonalRole(String roleName) {
        return roleName.endsWith(PERSONAL_ROLE_SUFFIX);
    }

    private void reassignPersonalRoleUsersToStaff(List<User> users) {
        if (users.stream().anyMatch(this::hasAdminRole)) {
            throw new AppException(ErrorCode.ACCESS_DENIED, "Không thể xóa vai trò đang gán cho tài khoản quản trị.");
        }

        Role staffRole = roleRepository.findById(STAFF_ROLE_NAME)
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND, "Không tìm thấy vai trò STAFF để hoàn tác role riêng."));

        LocalDateTime cutoff = LocalDateTime.now();
        users.forEach(user -> {
            user.setRoles(new HashSet<>(Set.of(staffRole)));
            // Persist the cutoff as well as blacklisting in memory so old JWTs
            // stay invalid after a service restart.
            user.setPasswordChangedAt(cutoff);
            if (tokenBlacklistService != null) {
                tokenBlacklistService.revokeAllTokensForUser(user.getUsername());
            }
        });
        userRepository.saveAll(users);
        userRepository.flush();
    }

    private void revokeTokensForRoleUsers(String roleName) {
        List<User> users = userRepository.findAllByRoles_RoleName(roleName);
        if (users.isEmpty()) {
            return;
        }
        LocalDateTime cutoff = LocalDateTime.now();
        users.forEach(user -> {
            user.setPasswordChangedAt(cutoff);
            if (tokenBlacklistService != null) {
                tokenBlacklistService.revokeAllTokensForUser(user.getUsername());
            }
        });
        userRepository.saveAll(users);
        userRepository.flush();
    }

    private boolean hasAdminRole(User user) {
        return user.getRoles() != null && user.getRoles().stream()
                .anyMatch(userRole -> ADMIN_ROLE_NAME.equalsIgnoreCase(userRole.getRoleName()));
    }
}
