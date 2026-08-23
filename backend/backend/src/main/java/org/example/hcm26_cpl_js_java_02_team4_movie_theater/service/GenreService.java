package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.genre.GenreRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.genre.GenreResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Genre;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.mapper.GenreMapper;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.GenreRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class GenreService {

    GenreRepository genreRepository;
    GenreMapper genreMapper;

    public List<GenreResponse> getAllGenres() {
        return genreMapper.toGenreResponseList(genreRepository.findAll());
    }

    public GenreResponse getGenreById(Long id) {
        Genre genre = genreRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.GENRE_NOT_FOUND));
        return genreMapper.toGenreResponse(genre);
    }

    public GenreResponse createGenre(GenreRequest request) {
        if (genreRepository.existsByName(request.getName().trim())) {
            throw new AppException(ErrorCode.GENRE_NAME_EXISTED);
        }
        Genre genre = genreMapper.toGenre(request);
        genre.setName(request.getName().trim());
        genre = genreRepository.save(genre);
        return genreMapper.toGenreResponse(genre);
    }

    public GenreResponse updateGenre(Long id, GenreRequest request) {
        Genre genre = genreRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.GENRE_NOT_FOUND));

        if (!genre.getName().equalsIgnoreCase(request.getName().trim()) &&
                genreRepository.existsByName(request.getName().trim())) {
            throw new AppException(ErrorCode.GENRE_NAME_EXISTED);
        }

        genreMapper.updateGenre(genre, request);
        genre.setName(request.getName().trim());
        genre = genreRepository.save(genre);
        return genreMapper.toGenreResponse(genre);
    }

    public void deleteGenre(Long id) {
        if (!genreRepository.existsById(id)) {
            throw new AppException(ErrorCode.GENRE_NOT_FOUND);
        }
        genreRepository.deleteById(id);
    }
}
