package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShowtimePlannerConfirmRequest {
    @Valid
    @NotNull
    ShowtimePlannerPreviewRequest plan;

    @Valid
    @NotEmpty(message = "Lịch xác nhận không được để trống")
    @Builder.Default
    List<ShowtimePlannerPreviewItem> items = new ArrayList<>();
}
