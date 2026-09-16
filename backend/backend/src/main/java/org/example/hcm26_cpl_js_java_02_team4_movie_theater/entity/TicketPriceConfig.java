package org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.time.LocalTime;

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

    @Builder.Default
    @Column(name = "u22_enabled", nullable = false, columnDefinition = "boolean default true")
    Boolean u22Enabled = true;

    @Builder.Default
    @Column(name = "weekend_surcharge", nullable = false, columnDefinition = "integer default 10000")
    Integer weekendSurcharge = 10_000;

    @Builder.Default
    @Column(name = "early_bird_end", nullable = false, columnDefinition = "time default '12:00:00'")
    LocalTime earlyBirdEnd = LocalTime.of(12, 0);

    @Builder.Default
    @Column(name = "early_bird_discount", nullable = false, columnDefinition = "integer default 10000")
    Integer earlyBirdDiscount = 10_000;

    @Builder.Default
    @Column(name = "prime_time_start", nullable = false, columnDefinition = "time default '18:00:00'")
    LocalTime primeTimeStart = LocalTime.of(18, 0);

    @Builder.Default
    @Column(name = "prime_time_end", nullable = false, columnDefinition = "time default '22:00:00'")
    LocalTime primeTimeEnd = LocalTime.of(22, 0);

    @Builder.Default
    @Column(name = "prime_time_surcharge", nullable = false, columnDefinition = "integer default 10000")
    Integer primeTimeSurcharge = 10_000;

    @Builder.Default
    @Column(name = "late_show_start", nullable = false, columnDefinition = "time default '22:00:00'")
    LocalTime lateShowStart = LocalTime.of(22, 0);

    @Builder.Default
    @Column(name = "late_show_surcharge", nullable = false, columnDefinition = "integer default 5000")
    Integer lateShowSurcharge = 5_000;

    @Builder.Default
    @Column(name = "price_rounding_unit", nullable = false, columnDefinition = "integer default 1000")
    Integer priceRoundingUnit = 1_000;

    @Column(name = "updated_by", length = 100)
    String updatedBy;

    @Version
    @Builder.Default
    @Column(name = "config_version", nullable = false, columnDefinition = "bigint default 0")
    Long version = 0L;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    LocalDateTime updatedAt;
}
