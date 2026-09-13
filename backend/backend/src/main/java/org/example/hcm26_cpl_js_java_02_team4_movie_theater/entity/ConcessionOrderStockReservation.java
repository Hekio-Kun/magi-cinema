package org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
@Table(name = "concession_order_stock_reservation")
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ConcessionOrderStockReservation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "concession_order_stock_reservation_id")
    Long concessionOrderStockReservationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "concession_order_id", nullable = false)
    ConcessionOrder order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "food_variant_id", nullable = false)
    FoodVariant foodVariant;

    @Column(name = "quantity", nullable = false)
    Integer quantity;
}
