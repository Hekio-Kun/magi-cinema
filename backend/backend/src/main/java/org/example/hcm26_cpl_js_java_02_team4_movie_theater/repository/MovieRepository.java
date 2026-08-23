package org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Movie;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface MovieRepository extends JpaRepository<Movie, Long> {
    @Query("""
            SELECT DISTINCT m
            FROM Movie m
            LEFT JOIN m.formats f
            LEFT JOIN m.genres g
            WHERE (COALESCE(:statuses, NULL) IS NULL OR m.status IN :statuses)
              AND (:genreId IS NULL OR g.genreId = :genreId)
              AND (CAST(:searchDate AS date) IS NULL OR (m.fromDate <= :searchDate AND (m.toDate IS NULL OR m.toDate >= :searchDate)))
              AND (
                    :keyword IS NULL OR :keyword = ''
                    OR LOWER(FUNCTION('unaccent', m.movieNameVn)) LIKE LOWER(FUNCTION('unaccent', CONCAT('%', :keyword, '%')))
                    OR LOWER(FUNCTION('unaccent', COALESCE(m.movieNameEnglish, ''))) LIKE LOWER(FUNCTION('unaccent', CONCAT('%', :keyword, '%')))
                    OR LOWER(FUNCTION('unaccent', COALESCE(m.actor, ''))) LIKE LOWER(FUNCTION('unaccent', CONCAT('%', :keyword, '%')))
                    OR LOWER(FUNCTION('unaccent', COALESCE(m.director, ''))) LIKE LOWER(FUNCTION('unaccent', CONCAT('%', :keyword, '%')))
                    OR LOWER(FUNCTION('unaccent', COALESCE(m.content, ''))) LIKE LOWER(FUNCTION('unaccent', CONCAT('%', :keyword, '%')))
                    OR LOWER(FUNCTION('unaccent', COALESCE(m.movieProductionCompany, ''))) LIKE LOWER(FUNCTION('unaccent', CONCAT('%', :keyword, '%')))
                    OR LOWER(FUNCTION('unaccent', COALESCE(m.ageRating, ''))) LIKE LOWER(FUNCTION('unaccent', CONCAT('%', :keyword, '%')))
                    OR LOWER(FUNCTION('unaccent', COALESCE(CAST(f AS string), ''))) LIKE LOWER(FUNCTION('unaccent', CONCAT('%', :keyword, '%')))
                    OR LOWER(FUNCTION('unaccent', COALESCE(g.name, ''))) LIKE LOWER(FUNCTION('unaccent', CONCAT('%', :keyword, '%')))
                  )
            """)
    Page<Movie> findMovies(
            @Param("keyword") String keyword,
            @Param("statuses") List<MovieStatus> statuses,
            @Param("genreId") Long genreId,
            @Param("searchDate") LocalDate searchDate,
            Pageable pageable);

    List<Movie> findByShowOnHeroTrueAndStatusInOrderByMovieIdDesc(List<MovieStatus> statuses);

    long countByIsHotTrueAndStatusIn(List<MovieStatus> statuses);

    List<Movie> findByStatusOrderByMovieIdDesc(MovieStatus status);

    boolean existsByMovieNameVnIgnoreCase(String movieNameVn);

    boolean existsByMovieNameVnIgnoreCaseAndMovieIdNot(String movieNameVn, Long movieId);
}
