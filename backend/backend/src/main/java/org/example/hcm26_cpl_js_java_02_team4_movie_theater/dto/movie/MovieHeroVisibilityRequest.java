package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.movie;

import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class MovieHeroVisibilityRequest {
    @NotNull(message = "Trạng thái hiển thị trên Hero là bắt buộc")
    Boolean showOnHero;
}
