package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user.RoleRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user.RoleResponse;
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

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RoleService {
    RoleRepository roleRepository;
    PermissionRepository permissionRepository;
    UserRepository userRepository;
    RoleMapper roleMapper;
    private static final String ADMIN_ROLE_NAME = "ADMIN";
    private static final String STAFF_ROLE_NAME = "STAFF";
    private static final String PERSONAL_ROLE_SUFFIX = "_ACCESS";
    private static final Set<String> NON_EDITABLE_ROLE_NAMES = Set.of("ADMIN", "CUSTOMER", "GUEST");
    private static final Set<String> NON_DELETABLE_ROLE_NAMES = Set.of("ADMIN", "MANAGER", "STAFF", "CUSTOMER", "GUEST");

    @Transactional
    public RoleResponse create(RoleRequest request) {
        String roleName = normalizeRoleName(request.getRoleName());
        if (NON_EDITABLE_ROLE_NAMES.contains(roleName)) {
            throw new AppException(ErrorCode.ACCESS_DENIED, "Không thể chỉnh sửa vai trò hệ thống.");
        }
        request.setRoleName(roleName);
        Role role = roleMapper.toRole(request);

        var permissions = permissionRepository.findAllById(request.getPermissions());
        role.setPermissions(new HashSet<>(permissions));

        role = roleRepository.save(role);
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
        return roleName.trim().toUpperCase();
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

        users.forEach(user -> user.setRoles(new HashSet<>(Set.of(staffRole))));
        userRepository.saveAll(users);
        userRepository.flush();
    }

    private boolean hasAdminRole(User user) {
        return user.getRoles() != null && user.getRoles().stream()
                .anyMatch(userRole -> ADMIN_ROLE_NAME.equalsIgnoreCase(userRole.getRoleName()));
    }
}
