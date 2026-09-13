package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.cashier;

import lombok.*;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.CashierReconciliationStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.CashierShiftStatus;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CashierShiftResponse {
    Long shiftId;
    String shiftCode;
    String cashierUserId;
    String cashierUsername;
    CashierShiftStatus status;
    CashierReconciliationStatus reconciliationStatus;
    Long openingCash;
    Long expectedCash;
    Long actualCash;
    Long variance;
    Long cashSales;
    Long transferSales;
    Long ticketSales;
    Long concessionSales;
    Long totalSales;
    String openedNote;
    String closingNote;
    String approvalNote;
    String approvedByUsername;
    LocalDateTime openedAt;
    LocalDateTime closedAt;
    LocalDateTime approvedAt;
}
