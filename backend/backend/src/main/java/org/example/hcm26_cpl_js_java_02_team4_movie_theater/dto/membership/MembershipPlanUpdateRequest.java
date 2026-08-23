package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.membership;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipPlanStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipFreeTicketType;

import java.math.BigDecimal;

@Data
public class MembershipPlanUpdateRequest {
    @NotNull @Min(0)
    private Long annualSpendMin;
    @Min(0)
    private Long annualSpendMax;
    @NotNull @DecimalMin("0") @DecimalMax("100")
    private BigDecimal ticketEarnPercent;
    @NotNull @DecimalMin("0") @DecimalMax("100")
    private BigDecimal concessionEarnPercent;
    @NotNull @Min(0)
    private Integer annualFreeTickets;
    @NotNull
    private MembershipFreeTicketType freeTicketType;
    @NotNull
    private MembershipPlanStatus status;
}
