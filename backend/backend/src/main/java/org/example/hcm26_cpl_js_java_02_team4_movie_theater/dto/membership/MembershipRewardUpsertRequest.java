package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.membership;

import jakarta.validation.constraints.*;
import lombok.*;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MembershipRewardUpsertRequest {
    @NotBlank
    @Size(max = 40)
    private String code;

    @NotBlank
    @Size(max = 120)
    private String name;

    @Size(max = 500)
    private String description;

    @Size(max = 500)
    private String terms;

    @NotNull
    @Min(1)
    private Integer pointCost;

    @NotNull
    @Min(0)
    private Integer stockQuantity;

    @NotNull
    @Min(1)
    @Max(365)
    private Integer validityDays;

    @NotNull
    @Min(0)
    private Integer maxRedemptionsPerCycle;

    @NotNull
    @Min(0)
    private Integer displayOrder;

    @NotNull
    private MembershipRewardStatus status;
}
