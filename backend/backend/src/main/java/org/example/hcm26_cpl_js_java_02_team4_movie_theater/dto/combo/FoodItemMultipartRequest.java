package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.combo;

import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.web.multipart.MultipartFile;

@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FoodItemMultipartRequest extends FoodItemRequest {
    MultipartFile image;
}
