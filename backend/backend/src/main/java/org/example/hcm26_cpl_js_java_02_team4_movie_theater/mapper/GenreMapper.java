package org.example.hcm26_cpl_js_java_02_team4_movie_theater.mapper;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.genre.GenreRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.genre.GenreResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Genre;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;

import java.util.List;
import java.util.Set;

@Mapper(
        componentModel = "spring",
        unmappedTargetPolicy = ReportingPolicy.IGNORE,
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE
)
public interface GenreMapper {

    Genre toGenre(GenreRequest request);

    GenreResponse toGenreResponse(Genre genre);

    List<GenreResponse> toGenreResponseList(List<Genre> genres);
    Set<GenreResponse> toGenreResponseSet(Set<Genre> genres);

    void updateGenre(@MappingTarget Genre genre, GenreRequest request);
}
