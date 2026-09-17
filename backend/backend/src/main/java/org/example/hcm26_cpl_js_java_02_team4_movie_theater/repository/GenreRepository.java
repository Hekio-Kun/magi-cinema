package org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Genre;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GenreRepository extends JpaRepository<Genre, Long> {
    boolean existsByName(String name);
    java.util.Optional<Genre> findByName(String name);
    java.util.Optional<Genre> findByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCaseAndGenreIdNot(String name, Long genreId);
    boolean existsBySlugIgnoreCase(String slug);
    boolean existsBySlugIgnoreCaseAndGenreIdNot(String slug, Long genreId);

    @Query("""
            SELECT g FROM Genre g
            WHERE g.status = org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.GenreStatus.ACTIVE
               OR g.status IS NULL
            ORDER BY COALESCE(g.displayOrder, 0), LOWER(g.name)
            """)
    List<Genre> findAllActive();

    @Query("""
            SELECT g FROM Genre g
            ORDER BY CASE WHEN g.status = org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.GenreStatus.ACTIVE OR g.status IS NULL THEN 0 ELSE 1 END,
                     COALESCE(g.displayOrder, 0), LOWER(g.name)
            """)
    List<Genre> findAllForAdmin();

    @Query("""
            SELECT genre.genreId AS genreId, COUNT(DISTINCT movie.movieId) AS movieCount
            FROM Movie movie JOIN movie.genres genre
            GROUP BY genre.genreId
            """)
    List<GenreUsageSummary> summarizeMovieUsage();

    interface GenreUsageSummary {
        Long getGenreId();
        Long getMovieCount();
    }
}
