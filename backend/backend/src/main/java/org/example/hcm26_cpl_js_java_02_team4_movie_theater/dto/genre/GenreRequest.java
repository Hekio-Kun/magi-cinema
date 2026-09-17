package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.genre;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.GenreStatus;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GenreRequest {

    @NotBlank(message = "Tên thể loại không được để trống")
    @Size(max = 100, message = "Tên thể loại không được vượt quá 100 ký tự")
    String name;

    @Size(max = 1000, message = "Mô tả không được vượt quá 1000 ký tự")
    String description;

    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Màu hiển thị phải có định dạng #RRGGBB")
    String colorCode;

    @Min(value = 0, message = "Thứ tự hiển thị không được âm")
    @Max(value = 9999, message = "Thứ tự hiển thị không được vượt quá 9999")
    Integer displayOrder;

    GenreStatus status;
}
