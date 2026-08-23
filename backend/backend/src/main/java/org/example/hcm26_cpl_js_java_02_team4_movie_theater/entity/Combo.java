package org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity;

import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.ComboStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Entity
@Table(name = "combo")
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Combo {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "combo_id")
    Long comboId;

    @Column(name = "name", nullable = false)
    String name;

    @Column(name = "description")
    String description;

    @Column(name = "price", nullable = false)
    Long price;

    @Column(name = "image_url")
    String imageUrl;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "status")
    ComboStatus status = ComboStatus.ACTIVE;

    @OneToMany(mappedBy = "combo", cascade = CascadeType.ALL, orphanRemoval = true)
    List<ComboItem> items;
}
