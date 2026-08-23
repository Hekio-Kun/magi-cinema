package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.membership;

import jakarta.validation.constraints.AssertTrue;
import lombok.Data;

@Data
public class MembershipEnrollRequest {
    @AssertTrue(message = "Bạn cần đồng ý điều khoản hội viên.")
    private boolean termsAccepted;
}
