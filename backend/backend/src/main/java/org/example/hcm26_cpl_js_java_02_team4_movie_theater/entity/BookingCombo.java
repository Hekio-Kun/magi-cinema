package org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
@Table(name = "booking_combo")
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BookingCombo {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "booking_combo_id")
    Long bookingComboId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    Booking booking;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "combo_id", nullable = false)
    Combo combo;

    @Column(name = "quantity", nullable = false)
    Integer quantity;

    @Column(name = "price", nullable = false)
    Long price; // price at the time of booking

    @Column(name = "combo_name_snapshot")
    String comboNameSnapshot;

    @Column(name = "unit_price_snapshot")
    Long unitPriceSnapshot;
}
