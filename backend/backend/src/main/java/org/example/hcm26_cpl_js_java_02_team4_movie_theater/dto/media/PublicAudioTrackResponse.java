package org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.media;

/**
 * Public metadata needed by the landing-page music player.
 * Cloudinary credentials and management fields are intentionally excluded.
 */
public record PublicAudioTrackResponse(
        String title,
        String artist,
        String url
) {
}
