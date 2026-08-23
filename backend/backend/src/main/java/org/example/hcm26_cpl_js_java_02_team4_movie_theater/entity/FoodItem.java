package org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "food_item")
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FoodItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "food_item_id")
    Long foodItemId;

    @Column(name = "name", nullable = false)
    String name;

    @Column(name = "price", nullable = false)
    Long price;

    @Column(name = "image_url")
    String imageUrl;

    @Column(name = "category")
    String category;

    @Builder.Default
    @Column(name = "is_active")
    boolean isActive = true;

    @Builder.Default
    @OneToMany(mappedBy = "foodItem", cascade = CascadeType.ALL, orphanRemoval = true)
    List<FoodVariant> variants = new ArrayList<>();
}
