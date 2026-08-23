package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user.PermissionRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user.PermissionResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Permission;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.mapper.PermissionMapper;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.PermissionRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class PermissionService {
    PermissionRepository permissionRepository;
    PermissionMapper permissionMapper;

    public PermissionResponse create(PermissionRequest request) {
        Permission permission = permissionMapper.toPermission(request);
        permission = permissionRepository.save(permission);
        return permissionMapper.toPermissionResponse(permission);
    }

    public List<PermissionResponse> getAll() {
        var permissions = permissionRepository.findAll();
        return permissionMapper.toPermissionResponseList(permissions);
    }

    public void delete(String permission) {
        permissionRepository.deleteById(permission);
    }
}
