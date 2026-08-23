package org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
@Table(name = "food_variant")
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FoodVariant {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "food_variant_id")
    Long foodVariantId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "food_item_id", nullable = false)
    FoodItem foodItem;

    @Column(name = "variant_name", nullable = false)
    String variantName;

    @Column(name = "size_label")
    String sizeLabel;

    @Column(name = "flavor")
    String flavor;

    @Column(name = "price", nullable = false)
    Long price;

    @Builder.Default
    @Column(name = "purchase_price")
    Long purchasePrice = 0L;

    @Builder.Default
    @Column(name = "is_active")
    boolean isActive = true;

    @Builder.Default
    @Column(name = "display_order")
    Integer displayOrder = 0;

    @Builder.Default
    @Column(name = "stock_quantity")
    Integer stockQuantity = 0;
}
