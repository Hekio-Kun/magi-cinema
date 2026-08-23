package org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum RoomType {
    STANDARD,
    IMAX,
    _4DX,
    BED,
    VIP;

    @JsonCreator
    public static RoomType fromString(String type) {
        if (type == null) return null;
        type = type.toUpperCase().trim();
        if (type.equals("4DX")) return _4DX;
        if (type.equals("SCREENX") || type.equals("DOLBY")) return STANDARD;
        return RoomType.valueOf(type);
    }
    
    @JsonValue
    public String toDisplayString() {
        if (this == _4DX) return "4DX";
        return this.name();
    }
}
