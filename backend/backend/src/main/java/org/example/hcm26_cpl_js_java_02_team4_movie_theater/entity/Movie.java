package org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieFormat;
import org.example.hcm26_cpl_js_java_02_team4_movie_theater.entity.enums.MovieStatus;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "movie")
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Movie {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "movie_id")
    Long movieId;

    @Column(name = "movie_name_vn", nullable = false, length = 255)
    String movieNameVn;

    @Column(name = "movie_name_english", length = 255)
    String movieNameEnglish;

    @Column(name = "actor", length = 255)
    String actor;

    @Column(name = "director", length = 255)
    String director;

    @Column(name = "content", columnDefinition = "text")
    String content;

    @Column(name = "duration")
    Integer duration;

    @Column(name = "from_date")
    LocalDate fromDate;

    @Column(name = "to_date")
    LocalDate toDate;

    @Column(name = "movie_production_company", length = 255)
    String movieProductionCompany;

    @Column(name = "large_image", length = 255)
    String largeImage;

    @Column(name = "small_image", length = 255)
    String smallImage;

    @Column(name = "backdrop_image", length = 255)
    String backdropImage;

    @Column(name = "rating")
    Double rating;

    @Column(name = "age_rating", length = 20)
    String ageRating;

    @Column(name = "show_on_hero")
    @Builder.Default
    Boolean showOnHero = false;

    @Column(name = "is_hot")
    @Builder.Default
    Boolean isHot = false;

    @Column(name = "trailer", length = 255)
    String trailer;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    MovieStatus status;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    LocalDateTime updatedAt;

    @ElementCollection(fetch = FetchType.EAGER)
    @Enumerated(EnumType.STRING)
    @CollectionTable(name = "movie_type_enum", joinColumns = @JoinColumn(name = "movie_id"))
    @Column(name = "type_name", length = 50)
    @Builder.Default
    Set<MovieFormat> formats = new HashSet<>();

    @OneToMany(mappedBy = "movie", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    List<Showtime> showtimes = new ArrayList<>();

    @OneToMany(mappedBy = "movie", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @Builder.Default
    List<MoviePresentation> presentations = new ArrayList<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "movie_genre",
        joinColumns = @JoinColumn(name = "movie_id"),
        inverseJoinColumns = @JoinColumn(name = "genre_id")
    )
    @Builder.Default
    Set<Genre> genres = new HashSet<>();
}
