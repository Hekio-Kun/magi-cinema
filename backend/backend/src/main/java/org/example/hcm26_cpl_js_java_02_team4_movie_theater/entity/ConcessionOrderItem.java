package org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ConcessionOrderItemType;

@Entity
@Table(name = "concession_order_item")
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ConcessionOrderItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "concession_order_item_id")
    Long concessionOrderItemId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "concession_order_id", nullable = false)
    ConcessionOrder order;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_type", nullable = false, length = 20)
    ConcessionOrderItemType itemType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "combo_id")
    Combo combo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "food_variant_id")
    FoodVariant foodVariant;

    @Column(name = "name_snapshot", nullable = false, length = 250)
    String nameSnapshot;

    @Column(name = "unit_price_snapshot", nullable = false)
    Long unitPriceSnapshot;

    @Column(name = "unit_cost_snapshot", nullable = false)
    @Builder.Default
    Long unitCostSnapshot = 0L;

    @Column(name = "quantity", nullable = false)
    Integer quantity;

    @Column(name = "line_total", nullable = false)
    Long lineTotal;

    @Column(name = "line_cost_total", nullable = false)
    Long lineCostTotal;
}
