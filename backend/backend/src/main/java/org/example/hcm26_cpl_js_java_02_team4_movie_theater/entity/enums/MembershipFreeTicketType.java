package org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums;

public enum MembershipFreeTicketType {
    STANDARD_2D,
    STANDARD_3D,
    IMAX,
    FOUR_DX,
    DOLBY,
    ANY;

    public boolean supports(MovieFormat format, MovieProjectionType projection) {
        return switch (this) {
            case STANDARD_2D -> format == MovieFormat.STANDARD && projection == MovieProjectionType.TWO_D;
            case STANDARD_3D -> format == MovieFormat.STANDARD && projection == MovieProjectionType.THREE_D;
            case IMAX -> format == MovieFormat.IMAX;
            case FOUR_DX -> format == MovieFormat._4DX;
            case DOLBY -> format == MovieFormat.STANDARD;
            case ANY -> true;
        };
    }
}
