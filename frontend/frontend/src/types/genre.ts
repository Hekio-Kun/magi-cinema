export interface Genre {
    genreId: number;
    name: string;
    description: string | null;
}

export interface GenreRequest {
    name: string;
    description?: string | null;
}
