package org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.MoviePresentation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MoviePresentationRepository extends JpaRepository<MoviePresentation, Long> {
    List<MoviePresentation> findByMovie_MovieIdAndActiveTrueOrderBySortOrderAscPresentationIdAsc(Long movieId);
}
