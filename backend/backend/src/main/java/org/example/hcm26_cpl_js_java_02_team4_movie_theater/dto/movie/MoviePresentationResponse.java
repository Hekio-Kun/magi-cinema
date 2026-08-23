package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.movie;

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
public class MoviePresentationResponse {
    Long presentationId;
    MovieFormat format;
    MovieProjectionType projectionType;
    MovieLanguageType languageType;
    String audioLanguage;
    String subtitleLanguage;
    String label;
    String displayName;
    Boolean active;
    Integer sortOrder;
}
