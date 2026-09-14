package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.media.PublicAudioTrackResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CloudinaryService {

    private final Cloudinary cloudinary;

    @Value("${cloudinary.audio-folder:magi-cinema/audio}")
    private String audioFolder;

    private static final long AUDIO_CACHE_TTL_MILLIS = 30_000L;
    private volatile List<PublicAudioTrackResponse> cachedPublicAudio = List.of();
    private volatile long audioCacheExpiresAt;

    public String uploadImage(MultipartFile file) {
        try {
            if (file.isEmpty()) {
                throw new IllegalArgumentException("Cannot upload empty file");
            }
            

            Map uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "public_id", UUID.randomUUID().toString()
            ));
            
            return uploadResult.get("secure_url").toString();
        } catch (IOException e) {
            log.error("Failed to upload image to Cloudinary", e);
            throw new RuntimeException("Failed to upload image", e);
        }
    }

    /**
     * Upload an audio track to Cloudinary. Cloudinary delivers audio through
     * its video resource type, which supports HTTP range requests for seeking
     * and progressive playback in the browser.
     */
    public String uploadAudio(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new AppException(ErrorCode.MEDIA_FILE_INVALID);
        }
        if (file.getSize() > 50L * 1024 * 1024) {
            throw new AppException(ErrorCode.MEDIA_FILE_TOO_LARGE);
        }
        String contentType = file.getContentType();
        if (contentType != null && !contentType.toLowerCase().startsWith("audio/")) {
            throw new AppException(ErrorCode.MEDIA_FILE_INVALID);
        }

        try {
            Map uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "resource_type", "video",
                    "folder", audioFolder,
                    "public_id", UUID.randomUUID().toString()
            ));
            String secureUrl = valueOf(uploadResult.get("secure_url"));
            if (secureUrl.isBlank()) {
                throw new IOException("Cloudinary did not return a secure URL");
            }
            audioCacheExpiresAt = 0L;
            return secureUrl;
        } catch (IOException | RuntimeException e) {
            log.error("Failed to upload audio to Cloudinary", e);
            throw new AppException(ErrorCode.MEDIA_UPLOAD_FAILED);
        }
    }

    /**
     * Lists only the public audio resources uploaded under the application's
     * audio folder. The API call stays on the backend so the Cloudinary secret
     * never reaches a browser. Results are cached briefly to avoid calling the
     * rate-limited Cloudinary Admin API on every landing-page visit.
     */
    public List<PublicAudioTrackResponse> listPublicAudio() {
        long now = System.currentTimeMillis();
        if (now < audioCacheExpiresAt) {
            return cachedPublicAudio;
        }

        synchronized (this) {
            now = System.currentTimeMillis();
            if (now < audioCacheExpiresAt) {
                return cachedPublicAudio;
            }
            try {
                List<PublicAudioTrackResponse> tracks = fetchPublicAudio();
                cachedPublicAudio = List.copyOf(tracks);
                audioCacheExpiresAt = now + AUDIO_CACHE_TTL_MILLIS;
                return cachedPublicAudio;
            } catch (Exception e) {
                log.error("Failed to list audio resources from Cloudinary", e);
                throw new AppException(ErrorCode.MEDIA_LIBRARY_UNAVAILABLE);
            }
        }
    }

    private List<PublicAudioTrackResponse> fetchPublicAudio() throws Exception {
        List<PublicAudioTrackResponse> tracks = new ArrayList<>();
        String nextCursor = null;
        Set<String> seenCursors = new HashSet<>();

        do {
            Map<String, Object> params = new HashMap<>();
            params.put("resource_type", "video");
            params.put("type", "upload");
            params.put("prefix", audioFolder);
            params.put("max_results", 500);
            if (nextCursor != null && !nextCursor.isBlank()) {
                params.put("next_cursor", nextCursor);
            }

            Map<?, ?> response = cloudinary.api().resources(params);
            Object resources = response.get("resources");
            if (resources instanceof Iterable<?> resourceList) {
                for (Object resource : resourceList) {
                    if (resource instanceof Map<?, ?> resourceMap) {
                        PublicAudioTrackResponse track = toPublicAudioTrack(resourceMap);
                        if (track != null) {
                            tracks.add(track);
                        }
                    }
                }
            }

            Object cursor = response.get("next_cursor");
            nextCursor = cursor == null ? null : String.valueOf(cursor).trim();
        } while (nextCursor != null && !nextCursor.isBlank() && seenCursors.add(nextCursor));

        return tracks;
    }

    private PublicAudioTrackResponse toPublicAudioTrack(Map<?, ?> resource) {
        String publicId = valueOf(resource.get("public_id"));
        String url = valueOf(resource.get("secure_url"));
        if (url.isBlank() && !publicId.isBlank()) {
            var builder = cloudinary.url()
                    .resourceType("video")
                    .type("upload")
                    .secure(true);
            String version = valueOf(resource.get("version"));
            String format = valueOf(resource.get("format"));
            if (!version.isBlank()) {
                builder.version(version);
            }
            if (!format.isBlank()) {
                builder.format(format);
            }
            url = builder.generate(publicId);
        }
        if (url.isBlank() || !isPublicDeliveryUrl(url)) {
            return null;
        }

        String title = cleanTitle(valueOf(resource.get("display_name")));
        if (title.isBlank()) {
            title = cleanTitle(valueOf(resource.get("original_filename")));
        }
        if (title.isBlank()) {
            title = cleanTitle(publicId.substring(publicId.lastIndexOf('/') + 1));
        }
        if (title.isBlank()) {
            title = "Audio Magi Cinema";
        }
        return new PublicAudioTrackResponse(title, "Magi Cinema", url);
    }

    private static String valueOf(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private static String cleanTitle(String value) {
        if (value.isBlank()) {
            return "";
        }
        return value
                .replaceFirst("(?i)\\.[a-z0-9]{2,5}$", "")
                .replaceAll("[_-]+", " ")
                .trim();
    }

    private static boolean isPublicDeliveryUrl(String value) {
        return value.startsWith("https://res.cloudinary.com/")
                && value.contains("/video/upload/");
    }

    public void deleteImage(String imageUrl) {
        if (imageUrl == null || imageUrl.trim().isEmpty()) {
            return;
        }
        try {
            // Extract publicId from URL (e.g. .../v1234567/public_id.jpg -> public_id)
            int lastSlashIndex = imageUrl.lastIndexOf('/');
            int lastDotIndex = imageUrl.lastIndexOf('.');
            if (lastSlashIndex != -1 && lastDotIndex != -1 && lastDotIndex > lastSlashIndex) {
                String publicId = imageUrl.substring(lastSlashIndex + 1, lastDotIndex);
                cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
                log.info("Deleted image from Cloudinary: {}", publicId);
            }
        } catch (Exception e) {
            log.warn("Failed to delete image from Cloudinary for URL: {}", imageUrl, e);
        }
    }
}
