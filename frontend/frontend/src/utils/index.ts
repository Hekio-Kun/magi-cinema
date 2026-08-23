export function decodeJwtPayload(token: string): Record<string, unknown> {
    try {
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(base64));
    } catch {
        return {};
    }
}

export function isTokenExpired(token: string): boolean {
    const payload = decodeJwtPayload(token);
    const exp = payload.exp as number | undefined;
    return !exp || exp * 1000 < Date.now();
}

export function getTokenRoles(token: string): string[] {
    const payload = decodeJwtPayload(token);
    const scope = payload.scope as string | undefined;
    return scope ? scope.split(' ') : [];
}
