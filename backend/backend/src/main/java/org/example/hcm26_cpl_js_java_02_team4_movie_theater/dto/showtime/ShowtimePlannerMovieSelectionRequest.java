package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime;

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
public class ShowtimePlannerMovieSelectionRequest {
    @NotNull(message = "Phim không được để trống")
    Long movieId;

    @NotEmpty(message = "Mỗi phim phải chọn ít nhất một phiên bản")
    @Builder.Default
    List<Long> presentationIds = new ArrayList<>();
}
