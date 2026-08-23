package org.example.hcm26_cpl_js_java_02_team4_movie_theater.validation;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.MoviePresentation;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieFormat;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieProjectionType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.RoomType;

import java.util.EnumSet;
import java.util.Set;

/**
 * Nguồn rule duy nhất cho định dạng phim, kiểu trình chiếu và loại phòng.
 * Standard có hai phiên bản độc lập 2D/3D; IMAX và 4DX được chuẩn hóa thành 3D.
 */
public final class MoviePresentationCompatibility {

    private MoviePresentationCompatibility() {
    }

    public static boolean isProjectionAllowed(MovieFormat format, MovieProjectionType projectionType) {
        if (format == null || projectionType == null) {
            return false;
        }
        return format == MovieFormat.STANDARD || projectionType == MovieProjectionType.THREE_D;
    }

    public static Set<MovieProjectionType> allowedProjectionTypes(MovieFormat format) {
        if (format == MovieFormat.STANDARD) {
            return EnumSet.of(MovieProjectionType.TWO_D, MovieProjectionType.THREE_D);
        }
        return EnumSet.of(MovieProjectionType.THREE_D);
    }

    public static Set<MovieFormat> supportedFormats(RoomType roomType) {
        if (roomType == null) {
            return EnumSet.of(MovieFormat.STANDARD);
        }
        return switch (roomType) {
            case STANDARD, VIP, BED -> EnumSet.of(MovieFormat.STANDARD);
            case IMAX -> EnumSet.of(MovieFormat.IMAX);
            case _4DX -> EnumSet.of(MovieFormat._4DX);
        };
    }

    public static boolean isSupportedByRoom(MoviePresentation presentation, RoomType roomType) {
        return presentation != null
                && isProjectionAllowed(presentation.getFormat(), presentation.getProjectionType())
                && supportedFormats(roomType).contains(presentation.getFormat());
    }
}
