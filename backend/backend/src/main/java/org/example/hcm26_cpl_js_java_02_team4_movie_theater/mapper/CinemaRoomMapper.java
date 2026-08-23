package org.example.hcm26_cpl_js_java_02_team4_movie_theater.mapper;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.cinema.CinemaRoomCreationRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.cinema.CinemaRoomUpdateRequest;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.dto.cinema.CinemaRoomResponse;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.CinemaRoom;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(
        componentModel = "spring",
        unmappedTargetPolicy = ReportingPolicy.IGNORE,
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE
)
public interface CinemaRoomMapper {

    CinemaRoom toCinemaRoom(CinemaRoomCreationRequest request);

    CinemaRoomResponse toCinemaRoomResponse(CinemaRoom room);

    List<CinemaRoomResponse> toCinemaRoomResponseList(List<CinemaRoom> rooms);

    void updateCinemaRoom(@MappingTarget CinemaRoom room, CinemaRoomUpdateRequest request);
}
