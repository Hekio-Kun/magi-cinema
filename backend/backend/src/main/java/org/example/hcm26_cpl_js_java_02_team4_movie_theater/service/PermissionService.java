package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user.PermissionRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user.PermissionResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Permission;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Role;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.mapper.PermissionMapper;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.PermissionRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.RoleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PermissionService {
    PermissionRepository permissionRepository;
    RoleRepository roleRepository;
    PermissionMapper permissionMapper;

    @Transactional
    public PermissionResponse create(PermissionRequest request) {
        if (request == null || request.getName() == null || request.getName().isBlank()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Tên quyền không được để trống.");
        }
        String name = request.getName().trim().toUpperCase(Locale.ROOT);
        if (!name.matches("^[A-Z][A-Z0-9_]{2,49}$")) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Tên quyền không hợp lệ.");
        }
        if (permissionRepository.existsById(name)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Tên quyền đã tồn tại.");
        }
        request.setName(name);
        Permission permission = permissionMapper.toPermission(request);
        permission = permissionRepository.save(permission);
        return permissionMapper.toPermissionResponse(permission);
    }

    public List<PermissionResponse> getAll() {
        var permissions = permissionRepository.findAll();
        return permissionMapper.toPermissionResponseList(permissions);
    }

    @Transactional
    public void delete(String permission) {
        String name = permission == null ? "" : permission.trim().toUpperCase(Locale.ROOT);
        Permission target = permissionRepository.findById(name)
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND, "Quyền không tồn tại."));

        boolean assigned = roleRepository.findAll().stream()
                .map(Role::getPermissions)
                .filter(java.util.Objects::nonNull)
                .anyMatch(permissions -> permissions.stream()
                        .anyMatch(item -> item != null && name.equalsIgnoreCase(item.getName())));
        if (assigned) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Không thể xóa quyền đang được gán cho vai trò. Hãy gỡ quyền khỏi các vai trò trước.");
        }
        permissionRepository.delete(target);
    }
}
