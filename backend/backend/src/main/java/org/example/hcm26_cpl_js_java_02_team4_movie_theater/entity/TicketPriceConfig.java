package org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "ticket_price_config")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TicketPriceConfig {

    public static final long SINGLETON_ID = 1L;

    @Id
    @Column(name = "config_id")
    Long configId;

    @Column(name = "standard_2d_price", nullable = false)
    Integer standard2dPrice;

    @Column(name = "standard_3d_price", nullable = false)
    Integer standard3dPrice;

    @Column(name = "imax_3d_price", nullable = false)
    Integer imax3dPrice;

    @Column(name = "four_dx_3d_price", nullable = false)
    Integer fourDx3dPrice;

    @Builder.Default
    @Column(name = "vip_seat_surcharge", nullable = false, columnDefinition = "integer default 15000")
    Integer vipSeatSurcharge = 15_000;

    @Builder.Default
    @Column(name = "couple_seat_surcharge", nullable = false, columnDefinition = "integer default 75000")
    Integer coupleSeatSurcharge = 75_000;

    @Builder.Default
    @Column(name = "disabled_seat_surcharge", nullable = false, columnDefinition = "integer default 0")
    Integer disabledSeatSurcharge = 0;

    @Builder.Default
    @Column(name = "u22_base_price", nullable = false, columnDefinition = "integer default 55000")
    Integer u22BasePrice = 55_000;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    LocalDateTime updatedAt;
}
