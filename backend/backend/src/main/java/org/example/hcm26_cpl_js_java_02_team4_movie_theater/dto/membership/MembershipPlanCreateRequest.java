package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.membership;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipPlanStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MembershipFreeTicketType;

import java.math.BigDecimal;

@Data
public class MembershipPlanCreateRequest {
    @NotBlank
    @Size(max = 30)
    @Pattern(regexp = "^[A-Za-z0-9_]+$", message = "Mã hạng chỉ được chứa chữ, số và dấu gạch dưới.")
    private String code;

    @NotBlank
    @Size(max = 80)
    private String name;

    @Size(max = 1000)
    private String description;

    @NotNull
    @Min(1)
    private Long annualSpendMin;

    @NotNull
    @DecimalMin("0")
    @DecimalMax("100")
    private BigDecimal ticketEarnPercent;

    @NotNull
    @DecimalMin("0")
    @DecimalMax("100")
    private BigDecimal concessionEarnPercent;

    @NotNull
    @Min(0)
    private Integer annualFreeTickets;

    @NotNull
    private MembershipFreeTicketType freeTicketType;

    @NotNull
    private MembershipPlanStatus status;
}
