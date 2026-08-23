package org.example.hcm26_cpl_js_java_02_team4_movie_theater.mapper;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.showtime.ShowtimeResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.CinemaRoom;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Movie;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.MoviePresentation;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.Showtime;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.RoomType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.validation.MoviePresentationCompatibility;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;
import org.mapstruct.NullValuePropertyMappingStrategy;

import java.util.Collections;
import java.util.Comparator;
import java.util.List;

@Mapper(
        componentModel = "spring",
        unmappedTargetPolicy = ReportingPolicy.IGNORE,
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE
)
public interface ShowtimeMapper {

    default ShowtimeResponse toShowtimeResponse(Showtime showtime, Long movieId) {
        if (showtime == null) {
            return null;
        }
        MoviePresentation presentation = resolveDisplayPresentation(showtime);
        return ShowtimeResponse.builder()
                .showtimeId(showtime.getShowtimeId())
                .movieId(movieId)
                .cinemaRoomId(showtime.getCinemaRoom() == null ? null : showtime.getCinemaRoom().getCinemaRoomId())
                .cinemaRoomName(showtime.getCinemaRoom() == null ? null : showtime.getCinemaRoom().getCinemaRoomName())
                .presentationId(presentation == null ? null : presentation.getPresentationId())
                .presentationName(presentation == null ? null : presentation.getDisplayName())
                .presentationFormat(presentation == null ? null : presentation.getFormat())
                .projectionType(presentation == null ? null : presentation.getProjectionType())
                .languageType(presentation == null ? null : presentation.getLanguageType())
                .showDate(showtime.getShowDate())
                .startTime(showtime.getStartTime())
                .endTime(showtime.getEndTime())
                .basePrice(showtime.getBasePrice())
                .status(showtime.getStatus())
                .build();
    }

    default MoviePresentation resolveDisplayPresentation(Showtime showtime) {
        if (showtime == null) {
            return null;
        }
        if (showtime.getPresentation() != null) {
            return showtime.getPresentation();
        }
        Movie movie = showtime.getMovie();
        if (movie == null || movie.getPresentations() == null || movie.getPresentations().isEmpty()) {
            return null;
        }
        CinemaRoom room = showtime.getCinemaRoom();
        return movie.getPresentations().stream()
                .filter(presentation -> Boolean.TRUE.equals(presentation.getActive()))
                .filter(presentation -> room == null || isPresentationSupportedByRoom(room.getType(), presentation))
                .sorted(Comparator
                        .comparing(MoviePresentation::getSortOrder, Comparator.nullsLast(Integer::compareTo))
                        .thenComparing(MoviePresentation::getPresentationId, Comparator.nullsLast(Long::compareTo)))
                .findFirst()
                .orElse(null);
    }

    default boolean isPresentationSupportedByRoom(RoomType roomType, MoviePresentation presentation) {
        return MoviePresentationCompatibility.isSupportedByRoom(presentation, roomType);
    }

    default List<ShowtimeResponse> toShowtimeResponseList(Movie movie) {
        if (movie == null || movie.getShowtimes() == null) {
            return Collections.emptyList();
        }
        return movie.getShowtimes().stream()
                .sorted(Comparator
                        .comparing(Showtime::getShowDate, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(Showtime::getStartTime, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(Showtime::getShowtimeId, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(showtime -> toShowtimeResponse(showtime, movie.getMovieId()))
                .toList();
    }
}
