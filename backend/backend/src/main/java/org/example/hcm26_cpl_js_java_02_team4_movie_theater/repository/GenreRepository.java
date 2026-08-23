package org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Genre;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GenreRepository extends JpaRepository<Genre, Long> {
    boolean existsByName(String name);
    java.util.Optional<Genre> findByName(String name);
    java.util.Optional<Genre> findByNameIgnoreCase(String name);
}
