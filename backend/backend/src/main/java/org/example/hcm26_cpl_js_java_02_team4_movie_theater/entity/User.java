package org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.UserStatus;

import java.time.LocalDateTime;
import java.util.Set;

@Entity
@Table(name = "users")
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Getter
@Setter
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "user_id", updatable = false, nullable = false, length = 36)
    String userId;

    @Column(name = "username", nullable = false, unique = true, length = 50)
    String username;

    @Column(name = "email", nullable = false, unique = true, length = 100)
    String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    String passwordHash;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "user_roles",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_name")
    )
    Set<Role> roles;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    UserStatus status;

    @Column(name = "last_login_at")
    LocalDateTime lastLoginAt;

    @Column(name = "password_changed_at")
    LocalDateTime passwordChangedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", insertable = false)
    LocalDateTime updatedAt;
}
