package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.movie;

import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieFormat;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieLanguageType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieProjectionType;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MoviePresentationRequest {
    Long presentationId;

    @NotNull(message = "Định dạng của phiên bản chiếu là bắt buộc")
    MovieFormat format;

    @NotNull(message = "Kiểu trình chiếu của phiên bản là bắt buộc")
    MovieProjectionType projectionType;

    @NotNull(message = "Loại ngôn ngữ của phiên bản là bắt buộc")
    MovieLanguageType languageType;
    String audioLanguage;
    String subtitleLanguage;
    String label;
    Boolean active;
    Integer sortOrder;
}
