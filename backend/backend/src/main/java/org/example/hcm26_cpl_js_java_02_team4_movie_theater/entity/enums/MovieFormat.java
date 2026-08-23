package org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum MovieFormat {
    STANDARD,
    IMAX,
    _4DX;

    @JsonCreator
    public static MovieFormat fromString(String type) {
        if (type == null) return null;
        type = type.toUpperCase().trim();
        if (type.equals("2D") || type.equals("3D")
                || type.equals("_2D") || type.equals("_3D")
                || type.equals("SCREENX")) return STANDARD;
        if (type.equals("4DX")) return _4DX;
        if (type.equals("DOLBY")) return STANDARD;
        return MovieFormat.valueOf(type);
    }
    
    @JsonValue
    public String toDisplayString() {
        if (this == STANDARD) return "Standard";
        if (this == _4DX) return "4DX";
        return this.name();
    }
}
