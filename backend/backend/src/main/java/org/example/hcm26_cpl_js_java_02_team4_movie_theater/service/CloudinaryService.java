package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CloudinaryService {

    private final Cloudinary cloudinary;

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
