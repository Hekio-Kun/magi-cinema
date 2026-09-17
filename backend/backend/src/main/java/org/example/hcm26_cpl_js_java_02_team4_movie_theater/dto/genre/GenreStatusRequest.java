package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.genre;

import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.GenreStatus;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GenreStatusRequest {
    @NotNull(message = "Trạng thái thể loại là bắt buộc")
    GenreStatus status;
}
