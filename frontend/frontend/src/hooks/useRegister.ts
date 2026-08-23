import { useState } from 'react';
import { authService } from '@/api/authApi';

interface RegisterData extends Record<string, unknown> {
    username: string;
    email: string;
    password: string;
    fullName?: string;
}

export function useRegister() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const register = async (data: RegisterData) => {
        setLoading(true);
        setError(null);
        try {
            const result = await authService.register(data);
            return result;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Registration failed';
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { register, loading, error };
}
