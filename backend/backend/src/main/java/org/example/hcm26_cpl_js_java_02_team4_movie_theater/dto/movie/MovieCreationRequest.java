package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.movie;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieFormat;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.Valid;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimeRequest;

@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MovieCreationRequest {
    @NotBlank(message = "Tên phim tiếng Việt là bắt buộc")
    String movieNameVn;

    @NotBlank(message = "Tên phim tiếng Anh là bắt buộc")
    String movieNameEnglish;

    @NotBlank(message = "Tên diễn viên là bắt buộc")
    String actor;

    @NotBlank(message = "Tên đạo diễn là bắt buộc")
    String director;

    @NotBlank(message = "Nội dung phim là bắt buộc")
    String content;

    @NotNull(message = "Thời lượng phim là bắt buộc")
    @Min(value = 1, message = "Thời lượng phim phải lớn hơn 0")
    Integer duration;

    @NotNull(message = "Ngày khởi chiếu là bắt buộc")
    LocalDate fromDate;

    @NotNull(message = "Ngày kết thúc là bắt buộc")
    LocalDate toDate;

    @NotBlank(message = "Công ty sản xuất là bắt buộc")
    String movieProductionCompany;

    @NotBlank(message = "Ảnh lớn (banner) là bắt buộc")
    String largeImage;

    @NotBlank(message = "Ảnh nhỏ (poster) là bắt buộc")
    String smallImage;

    @NotBlank(message = "Ảnh nền (backdrop) là bắt buộc")
    String backdropImage;

    @Min(value = 0, message = "Đánh giá không được nhỏ hơn 0")
    @Max(value = 10, message = "Đánh giá không được lớn hơn 10")
    Double rating;

    String ageRating;

    Boolean showOnHero;
    Boolean isHot;

    String trailer;

    @NotNull(message = "Trạng thái phim là bắt buộc")
    MovieStatus status;

    List<MovieFormat> formats;

    @NotEmpty(message = "Phải cấu hình ít nhất 1 phiên bản chiếu")
    List<@Valid MoviePresentationRequest> presentations;

    @NotEmpty(message = "Phải chọn ít nhất 1 thể loại")
    Set<Long> genreIds;

    List<ShowtimeRequest> showtimes;
}
