package org.example.hcm26_cpl_js_java_02_team4_movie_theater.validation;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.MoviePresentation;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieFormat;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieLanguageType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieProjectionType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.RoomType;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MoviePresentationCompatibilityTest {

    @Test
    void standardRoomSupportsBothStandardTwoDAndThreeD() {
        assertTrue(MoviePresentationCompatibility.isSupportedByRoom(
                presentation(MovieFormat.STANDARD, MovieProjectionType.TWO_D), RoomType.STANDARD));
        assertTrue(MoviePresentationCompatibility.isSupportedByRoom(
                presentation(MovieFormat.STANDARD, MovieProjectionType.THREE_D), RoomType.STANDARD));
    }

    @Test
    void specialFormatsMustBeThreeDimensionalAndUseMatchingRooms() {
        assertFalse(MoviePresentationCompatibility.isSupportedByRoom(
                presentation(MovieFormat.IMAX, MovieProjectionType.TWO_D), RoomType.IMAX));
        assertTrue(MoviePresentationCompatibility.isSupportedByRoom(
                presentation(MovieFormat.IMAX, MovieProjectionType.THREE_D), RoomType.IMAX));
        assertFalse(MoviePresentationCompatibility.isSupportedByRoom(
                presentation(MovieFormat.IMAX, MovieProjectionType.THREE_D), RoomType.STANDARD));
    }

    @Test
    void displayNameIgnoresStaleGeneratedLabelAfterProjectionChanges() {
        MoviePresentation presentation = presentation(MovieFormat.IMAX, MovieProjectionType.THREE_D);
        presentation.setLanguageType(MovieLanguageType.SUBTITLE);
        presentation.setLabel("IMAX - 2D Phụ đề");

        assertEquals("IMAX · 3D · Phụ đề", presentation.getDisplayName());
    }

    private MoviePresentation presentation(MovieFormat format, MovieProjectionType projectionType) {
        return MoviePresentation.builder()
                .format(format)
                .projectionType(projectionType)
                .build();
    }
}
