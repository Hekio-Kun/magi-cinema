package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
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
public class ShowtimePlannerMovieRequest {
    @NotNull(message = "Phim không được để trống")
    Long movieId;

    @Min(value = 1, message = "Số suất phải ít nhất là 1")
    Integer requestedShowtimes;

    @Positive(message = "Giá vé gốc phải lớn hơn 0")
    Integer basePrice;

    @NotNull(message = "Cách chia phiên bản không được để trống")
    ShowtimePlannerPresentationMode presentationMode;

    @Valid
    @NotEmpty(message = "Mỗi phim phải chọn ít nhất một phiên bản chiếu")
    @Builder.Default
    List<ShowtimePlannerPresentationRequest> presentations = new ArrayList<>();
}
