export interface Genre {
    genreId: number;
    name: string;
    description: string | null;
    slug: string;
    colorCode: string;
    displayOrder: number;
    status: GenreStatus;
    source: GenreSource;
    movieCount: number;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export type GenreStatus = "ACTIVE" | "INACTIVE";
export type GenreSource = "MANUAL" | "TMDB";

export interface GenreRequest {
    name: string;
    description?: string | null;
    colorCode?: string | null;
    displayOrder?: number;
    status?: GenreStatus;
}
