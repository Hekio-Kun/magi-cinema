package org.example.hcm26_cpl_js_java_02_team4_movie_theater.mapper;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.auth.RegisterRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.user.UserResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Role;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.mapstruct.ReportingPolicy;

import java.util.List;
import java.util.Set;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UserMapper {

    User toUser(RegisterRequest request);

    // Lấy trường roleName từ danh sách roles của User
    @Mapping(target = "roleName", source = "roles", qualifiedByName = "mapRolesToRoleName")
    UserResponse toUserResponse(User user);

    List<UserResponse> toUserResponseList(List<User> users);

    @Named("mapRolesToRoleName")
    default String mapRolesToRoleName(Set<Role> roles) {
        if (roles == null || roles.isEmpty()) {
            return null;
        }
        return roles.iterator().next().getRoleName();
    }
}
