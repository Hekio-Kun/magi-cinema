package org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.RoomStatus;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.RoomType;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.RoomTypeConverter;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "cinema_room")
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CinemaRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "cinema_room_id")
    Long cinemaRoomId;

    @Column(name = "cinema_room_name", nullable = false, length = 100)
    String cinemaRoomName;

    @Column(name = "seat_quantity", nullable = false)
    Integer seatQuantity;

    @Column(name = "seats_per_row")
    Integer seatsPerRow;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    RoomStatus status;

    @Convert(converter = RoomTypeConverter.class)
    @Column(name = "type", length = 20)
    RoomType type;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt;
}
