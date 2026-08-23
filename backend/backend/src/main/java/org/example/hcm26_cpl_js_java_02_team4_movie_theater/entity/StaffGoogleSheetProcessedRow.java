package org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "staff_google_sheet_processed_row",
        uniqueConstraints = @UniqueConstraint(name = "uk_staff_google_sheet_row_hash", columnNames = {"spreadsheetId", "rowHash"})
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class StaffGoogleSheetProcessedRow {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long processedRowId;

    @Column(nullable = false, length = 128)
    String spreadsheetId;

    @Column(nullable = false, length = 64)
    String rowHash;

    @Column(nullable = false)
    int sheetRowNumber;

    @Column(length = 80)
    String username;

    @Column(length = 120)
    String email;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    LocalDateTime processedAt;
}
