package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.combo;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ComboRequest {
    @NotBlank(message = "Tên combo không được để trống")
    String name;

    String description;

    @NotNull(message = "Giá combo không được để trống")
    @Min(value = 1, message = "Giá combo phải lớn hơn 0")
    Long price;

    String imageUrl;

    @Valid
    List<ComboItemRequest> items;
}
