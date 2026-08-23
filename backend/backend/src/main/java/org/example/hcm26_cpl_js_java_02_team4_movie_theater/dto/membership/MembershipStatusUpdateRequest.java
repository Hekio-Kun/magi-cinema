package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.membership;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipStatus;

@Data
public class MembershipStatusUpdateRequest {
    @NotNull
    private MembershipStatus status;
}
