package org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    Page<Review> findByMovie_MovieId(Long movieId, Pageable pageable);
    List<Review> findByUser_UserId(String userId);
    boolean existsByUser_UserId(String userId);
    boolean existsByUser_UserIdAndMovie_MovieId(String userId, Long movieId);
}
