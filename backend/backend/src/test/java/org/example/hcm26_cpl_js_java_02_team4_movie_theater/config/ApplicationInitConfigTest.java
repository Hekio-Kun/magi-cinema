package org.example.hcm26_cpl_js_java_02_team4_movie_theater.config;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Permission;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Role;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.PermissionRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.RoleRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.UserProfileRepository;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ApplicationInitConfigTest {

    private final RoleRepository roles = mock(RoleRepository.class);
    private final PermissionRepository permissions = mock(PermissionRepository.class);
    private final ApplicationInitConfig config = new ApplicationInitConfig(
            mock(PasswordEncoder.class), mock(JdbcTemplate.class), mock(Environment.class));

    @Test
    void restartPreservesCustomizedStaffAndManagerPermissions() throws Exception {
        Permission viewMovie = Permission.builder().name("MOVIE_VIEW").build();
        Role staff = Role.builder().roleName("STAFF").description("Chỉ xem phim")
                .permissions(new HashSet<>(Set.of(viewMovie))).build();
        Role manager = Role.builder().roleName("MANAGER").description("Tạm thu hồi mọi quyền")
                .permissions(new HashSet<>()).build();
        when(roles.findById("STAFF")).thenReturn(Optional.of(staff));
        when(roles.findById("MANAGER")).thenReturn(Optional.of(manager));
        when(permissions.save(any(Permission.class))).thenAnswer(invocation -> invocation.getArgument(0));

        runInitialization();

        assertEquals(Set.of(viewMovie), staff.getPermissions());
        assertEquals("Chỉ xem phim", staff.getDescription());
        assertEquals(Set.of(), manager.getPermissions());
        assertEquals("Tạm thu hồi mọi quyền", manager.getDescription());
        verify(roles, never()).save(staff);
        verify(roles, never()).save(manager);
    }

    @Test
    void firstStartupStillCreatesDefaultStaffPermissions() throws Exception {
        when(permissions.save(any(Permission.class))).thenAnswer(invocation -> invocation.getArgument(0));

        runInitialization();

        verify(roles).save(argThat(role -> "STAFF".equals(role.getRoleName())
                && role.getPermissions().stream().map(Permission::getName).collect(Collectors.toSet())
                .equals(Set.of("MOVIE_VIEW", "BOOKING_VIEW", "BOOKING_MANAGE"))));
    }

    private void runInitialization() throws Exception {
        config.applicationRunner(mock(UserRepository.class), mock(UserProfileRepository.class), roles, permissions)
                .run(null);
    }
}
