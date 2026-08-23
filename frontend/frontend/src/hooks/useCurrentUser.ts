import { useState, useEffect } from 'react';
import { getTokenRoles } from '@/utils/index';
import { normalizeRoles, type DashboardRole } from '@/utils/dashboardAccess';
import { getAuthToken, subscribeAuthChanges } from '@/utils/authSession';

const ROLE_LABELS: Record<string, string> = {
    ROLE_ADMIN:   'Admin',
    ROLE_MANAGER: 'Manager',
    ROLE_STAFF:   'Staff',
    ROLE_CUSTOMER:'Customer',
};

const ROLE_PRIORITY = ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_STAFF', 'ROLE_CUSTOMER'];

function getInitials(username: string): string {
    const parts = username.split(/[_.\s-]+/).filter(Boolean);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return username.slice(0, 2).toUpperCase();
}

function getHighestRole(roles: string[]): string {
    for (const r of ROLE_PRIORITY) {
        if (roles.includes(r)) return ROLE_LABELS[r];
    }
    const customRole = roles.find((role) => role.startsWith('ROLE_') && !ROLE_LABELS[role]);
    if (customRole) {
        return customRole.replace(/^ROLE_/, '').replace(/_/g, ' ');
    }
    return roles.some((role) => role.endsWith('_VIEW') || role.endsWith('_MANAGE')) ? 'Staff' : 'Guest';
}

export interface CurrentUser {
    username: string;
    initials: string;
    roleLabel: string;
    roles: DashboardRole[];
    scopes: string[];
    avatarUrl: string | null;
}

export function useCurrentUser(): CurrentUser {
    const read = (): CurrentUser => {
        const username = localStorage.getItem('username') || 'Unknown';
        const token = getAuthToken();
        const tokenRoles = token ? getTokenRoles(token) : [];
        const roles = normalizeRoles(tokenRoles);
        return {
            username,
            initials: getInitials(username),
            roleLabel: getHighestRole(tokenRoles),
            roles,
            scopes: tokenRoles,
            avatarUrl: localStorage.getItem('user_avatar'),
        };
    };

    const [user, setUser] = useState<CurrentUser>(read);

    useEffect(() => {
        const sync = () => setUser(read());
        return subscribeAuthChanges(sync);
    }, []);

    return user;
}
