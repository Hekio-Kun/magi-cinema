package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.movie;

import java.util.List;

public record MoviePresentationOptionsResponse(
        List<Option> formats,
        List<Option> projectionTypes,
        List<Option> languageTypes) {

    public record Option(String value, String label) {
    }
}
