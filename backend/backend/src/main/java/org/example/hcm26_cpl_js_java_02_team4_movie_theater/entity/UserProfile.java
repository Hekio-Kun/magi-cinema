package org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.UpdateTimestamp;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.Gender;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProfile {

    @Id
    @Column(name = "user_id", length = 36)
    private String userId;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(name = "phone_number", length = 15)
    private String phoneNumber;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(name = "date_of_birth_updated_at")
    private LocalDateTime dateOfBirthUpdatedAt;

    @Column(name = "member_tier", length = 50)
    private String memberTier;

    @Column(name = "gender", length = 20)
    @Enumerated(EnumType.STRING)
    private Gender gender;

    @Column(name = "address", length = 255)
    private String address;

    @Column(name = "hire_date")
    private LocalDate hireDate;

    @Column(name = "identity_card", length = 20)
    private String identityCard;

    @Column(name = "email", length = 255)
    private String email;

    @Column(name = "avatar_url", length = 255)
    private String avatarUrl;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Builder.Default
    @ColumnDefault("0")
    @Column(name = "loyalty_points", nullable = false)
    private Integer loyaltyPoints = 0;
}
