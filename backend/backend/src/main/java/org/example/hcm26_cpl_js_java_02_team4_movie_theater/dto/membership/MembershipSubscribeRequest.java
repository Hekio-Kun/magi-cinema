package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.membership;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipEffectiveMode;

@Getter
@Setter
public class MembershipSubscribeRequest {
    @NotBlank
    private String planCode;
    private MembershipEffectiveMode effectiveMode;
}
