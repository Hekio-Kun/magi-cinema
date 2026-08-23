package org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum MovieProjectionType {
    TWO_D("2D"),
    THREE_D("3D");

    private final String displayName;

    MovieProjectionType(String displayName) {
        this.displayName = displayName;
    }

    @JsonCreator
    public static MovieProjectionType fromString(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim().toUpperCase()
                .replace("-", "_")
                .replace(" ", "_");
        return switch (normalized) {
            case "2D", "_2D", "TWO_D" -> TWO_D;
            case "3D", "_3D", "THREE_D" -> THREE_D;
            default -> MovieProjectionType.valueOf(normalized);
        };
    }

    @JsonValue
    public String toDisplayString() {
        return displayName;
    }
}
