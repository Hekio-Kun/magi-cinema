package org.example.hcm26_cpl_js_java_02_team4_movie_theater.mapper;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user.PermissionRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user.PermissionResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Permission;
import org.mapstruct.Mapper;

import java.util.List;

@Mapper(componentModel = "spring")
public interface PermissionMapper {
    Permission toPermission(PermissionRequest request);
    PermissionResponse toPermissionResponse(Permission permission);
    List<PermissionResponse> toPermissionResponseList(List<Permission> permissions);
}
