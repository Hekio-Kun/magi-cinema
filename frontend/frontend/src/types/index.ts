export interface User {
    id: number;
    username: string;
    email: string;
    fullName?: string;
    role: string;
    status: string;
}

export interface Movie {
    id: number;
    title: string;
    description?: string;
    duration?: number;
    releaseDate?: string;
    posterUrl?: string;
}

export interface JwtPayload {
    sub: string;
    scope: string;
    exp: number;
    iat: number;
}
