package org.example.hcm26_cpl_js_java_02_team4_movie_theater.service;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.genre.GenreRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.genre.GenreResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Genre;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.GenreSource;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.GenreStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.AppException;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.exception.ErrorCode;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.mapper.GenreMapper;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.repository.GenreRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GenreServiceTest {
    private final GenreRepository repository = mock(GenreRepository.class);
    private final GenreMapper mapper = mock(GenreMapper.class);
    private final GenreService service = new GenreService(repository, mapper);

    @BeforeEach
    void setUp() {
        when(mapper.toGenre(any())).thenReturn(new Genre());
        when(mapper.toGenreResponse(any())).thenAnswer(invocation -> {
            Genre genre = invocation.getArgument(0);
            return GenreResponse.builder()
                    .genreId(genre.getGenreId())
                    .name(genre.getName())
                    .description(genre.getDescription())
                    .slug(genre.getSlug())
                    .colorCode(genre.getColorCode())
                    .displayOrder(genre.getDisplayOrder())
                    .status(genre.getStatus())
                    .source(genre.getSource())
                    .build();
        });
        when(repository.findAll()).thenReturn(List.of());
        when(repository.save(any())).thenAnswer(invocation -> {
            Genre genre = invocation.getArgument(0);
            if (genre.getGenreId() == null) genre.setGenreId(10L);
            return genre;
        });
        when(repository.summarizeMovieUsage()).thenReturn(List.of());
    }

    @Test
    void createNormalizesContentAndBuildsOperationalMetadata() {
        GenreRequest request = GenreRequest.builder()
                .name("  Khoa   học viễn tưởng  ")
                .description("  Phim về tương lai  ")
                .colorCode("#aabbcc")
                .displayOrder(4)
                .build();

        GenreResponse response = service.createGenre(request);

        assertThat(response.getName()).isEqualTo("Khoa học viễn tưởng");
        assertThat(response.getDescription()).isEqualTo("Phim về tương lai");
        assertThat(response.getSlug()).isEqualTo("khoa-hoc-vien-tuong");
        assertThat(response.getColorCode()).isEqualTo("#AABBCC");
        assertThat(response.getDisplayOrder()).isEqualTo(4);
        assertThat(response.getStatus()).isEqualTo(GenreStatus.ACTIVE);
        assertThat(response.getSource()).isEqualTo(GenreSource.MANUAL);
    }

    @Test
    void createRejectsAnAccentInsensitiveDuplicate() {
        when(repository.findAll()).thenReturn(List.of(Genre.builder().genreId(2L).name("Hanh dong").build()));
        GenreRequest request = GenreRequest.builder().name("Hành động").build();

        assertThatThrownBy(() -> service.createGenre(request))
                .isInstanceOfSatisfying(AppException.class,
                        exception -> assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.GENRE_NAME_EXISTED));
    }

    @Test
    void deleteArchivesAndKeepsMovieRelationsIntact() {
        Genre genre = Genre.builder().genreId(5L).name("Tâm lý").status(GenreStatus.ACTIVE).build();
        when(repository.findById(5L)).thenReturn(Optional.of(genre));

        service.deleteGenre(5L);

        assertThat(genre.getStatus()).isEqualTo(GenreStatus.INACTIVE);
        verify(repository).save(genre);
        verify(repository, never()).deleteById(5L);
    }

    @Test
    void adminListContainsArchivedGenresAndMovieUsage() {
        Genre active = Genre.builder().genreId(1L).name("Hài").status(GenreStatus.ACTIVE).build();
        Genre inactive = Genre.builder().genreId(2L).name("Kinh dị").status(GenreStatus.INACTIVE).build();
        GenreRepository.GenreUsageSummary usage = mock(GenreRepository.GenreUsageSummary.class);
        when(usage.getGenreId()).thenReturn(2L);
        when(usage.getMovieCount()).thenReturn(7L);
        when(repository.findAllForAdmin()).thenReturn(List.of(active, inactive));
        when(repository.summarizeMovieUsage()).thenReturn(List.of(usage));

        List<GenreResponse> responses = service.getAllGenresForAdmin();

        assertThat(responses).hasSize(2);
        assertThat(responses.get(0).getMovieCount()).isZero();
        assertThat(responses.get(1).getMovieCount()).isEqualTo(7L);
        assertThat(responses.get(1).getStatus()).isEqualTo(GenreStatus.INACTIVE);
    }
}
