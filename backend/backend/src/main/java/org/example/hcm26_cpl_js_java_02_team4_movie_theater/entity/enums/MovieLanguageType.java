package org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum MovieLanguageType {
    SUBTITLE("Phụ đề"),
    DUBBED("Lồng tiếng"),
    ORIGINAL("Nguyên bản");

    private final String displayName;

    MovieLanguageType(String displayName) {
        this.displayName = displayName;
    }

    @JsonCreator
    public static MovieLanguageType fromString(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim().toUpperCase()
                .replace("-", "_")
                .replace(" ", "_");
        return switch (normalized) {
            case "SUB", "SUBTITLE", "PHU_DE", "PHỤ_ĐỀ" -> SUBTITLE;
            case "DUB", "DUBBED", "LONG_TIENG", "LỒNG_TIẾNG" -> DUBBED;
            case "ORIGINAL", "ORIGIN", "GOC", "GỐC", "NGUYEN_BAN", "NGUYÊN_BẢN" -> ORIGINAL;
            default -> MovieLanguageType.valueOf(normalized);
        };
    }

    @JsonValue
    public String toDisplayString() {
        return displayName;
    }
}
