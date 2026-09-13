import apiClient from './api';
import type { AxiosResponse } from 'axios';

// ── Types matching backend responses ────────────────────────────────────────

export interface UserDetailResponse {
    userId:      string;
    username:    string;
    email:       string;
    status:      string;   // 'ACTIVE' | 'INACTIVE' | 'BANNED' | 'DELETED'
    roleName:    string;
    fullName?:   string;
    phoneNumber?: string;
    gender?:     string;
    address?:    string;
    identityCard?: string;
    dateOfBirth?: string;
    hireDate?: string;
    avatarUrl?:  string;
    createdAt?:  string;
    member?:      boolean;
    loyaltyPoints?: number;
    memberTier?: string;
}

export interface UserResponse {
    userId:   string;
    username: string;
    email:    string;
    status:   number;
    roleName: string;
}

export interface StaffCreatePayload {
    username:     string;
    email:        string;
    fullName:     string;
    phoneNumber:  string;
    identityCard: string;
    roleName:     string;
    gender:       string;
    dateOfBirth:  string;
    address:      string;
    hireDate:     string;
}

export interface StaffGoogleSheetImportRequest {
    spreadsheetId?: string;
    range?: string;
    defaultRoleName?: string;
}

export interface StaffImportError {
    row: number;
    username?: string;
    email?: string;
    message: string;
}

export interface StaffImportResponse {
    totalRows: number;
    successCount: number;
    failedCount: number;
    errors: StaffImportError[];
}

export interface StaffImportPreviewRow {
    row: number;
    username?: string;
    email?: string;
    fullName?: string;
    phoneNumber?: string;
    identityCard?: string;
    gender?: string;
    dateOfBirth?: string;
    address?: string;
    hireDate?: string;
    roleName?: string;
    valid: boolean;
    message?: string;
}

export interface StaffImportPreviewResponse {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    rows: StaffImportPreviewRow[];
}

export interface UpdateUserPayload {
    fullName?:    string;
    phoneNumber?: string;
    address?:     string;
    identityCard?: string;
    dateOfBirth?: string;
    gender?:      string;
    roleName?:    string;
    status?:      string;   // 'ACTIVE' | 'INACTIVE' | 'BANNED' | 'DELETED'
    memberTier?:  string;
}

export interface ChangePasswordPayload {
    currentPassword: string;
    newPassword: string;
}

export interface PermissionResponse {
    name: string;
    description: string;
}

export interface RoleResponse {
    roleName: string;
    description: string;
    permissions: PermissionResponse[];
}

export interface RoleRequest {
    roleName: string;
    description: string;
    permissions: string[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const unwrap = <T>(response: AxiosResponse<unknown>): T => {
    const data = response.data;
    if (typeof data === 'object' && data !== null && 'result' in data) {
        const result = (data as { result?: unknown }).result;
        if (result !== null && result !== undefined) return result as T;
    }
    return data as T;
};

// ── Service ──────────────────────────────────────────────────────────────────

export const userService = {

    /** GET /users — danh sách tất cả user (kèm profile) */
    getAllUsers: async (statuses?: string[]): Promise<UserDetailResponse[]> => {
        const res = await apiClient.get('/users', { 
            params: { statuses },
            paramsSerializer: {
                indexes: null // or whatever serializer you use for arrays
            }
        });
        return unwrap<UserDetailResponse[]>(res);
    },

    getStaffUsers: async (): Promise<UserDetailResponse[]> => {
        const res = await apiClient.get('/users/staff');
        return unwrap<UserDetailResponse[]>(res);
    },

    // Roles and Permissions
    getAllRoles: async (): Promise<RoleResponse[]> => {
        const res = await apiClient.get('/roles');
        return unwrap<RoleResponse[]>(res);
    },

    getAllPermissions: async (): Promise<PermissionResponse[]> => {
        const res = await apiClient.get('/permissions');
        return unwrap<PermissionResponse[]>(res);
    },

    createRole: async (data: RoleRequest): Promise<RoleResponse> => {
        const res = await apiClient.post('/roles', data);
        return unwrap<RoleResponse>(res);
    },

    updateRole: async (roleName: string, data: RoleRequest): Promise<RoleResponse> => {
        const res = await apiClient.put(`/roles/${encodeURIComponent(roleName)}`, data);
        return unwrap<RoleResponse>(res);
    },

    deleteRole: async (roleName: string): Promise<void> => {
        await apiClient.delete(`/roles/${roleName}`);
    },

    /** GET /users/me — profile người đang đăng nhập */
    getMyProfile: async (): Promise<UserDetailResponse> => {
        const res = await apiClient.get('/users/me');
        return unwrap<UserDetailResponse>(res);
    },

    findMemberByPhone: async (phoneNumber: string): Promise<UserDetailResponse> => {
        const res = await apiClient.get('/users/members/by-phone', { params: { phoneNumber } });
        return unwrap(res);
    },

    /** PUT /users/me - cập nhật profile của người đang đăng nhập */
    updateMyProfile: async (data: UpdateUserPayload): Promise<UserDetailResponse> => {
        const res = await apiClient.put('/users/me', data);
        return unwrap<UserDetailResponse>(res);
    },

    /** POST /users/me/avatar - upload ảnh đại diện */
    uploadMyAvatar: async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append("file", file);
        const res = await apiClient.post('/users/me/avatar', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return unwrap<string>(res);
    },

    /** GET /users/:id */
    getUserById: async (userId: string): Promise<UserDetailResponse> => {
        const res = await apiClient.get(`/users/${userId}`);
        return unwrap<UserDetailResponse>(res);
    },

    /** POST /users/staff */
    createStaff: async (data: StaffCreatePayload): Promise<UserResponse> => {
        const res = await apiClient.post('/users/staff', data);
        return unwrap<UserResponse>(res);
    },

    /** POST /users/staff/import/google-sheet */
    importStaffFromGoogleSheet: async (data?: StaffGoogleSheetImportRequest): Promise<StaffImportResponse> => {
        const res = await apiClient.post('/users/staff/import/google-sheet', data ?? {});
        return unwrap<StaffImportResponse>(res);
    },

    /** POST /users/staff/import/google-sheet/preview */
    previewStaffFromGoogleSheet: async (data?: StaffGoogleSheetImportRequest): Promise<StaffImportPreviewResponse> => {
        const res = await apiClient.post('/users/staff/import/google-sheet/preview', data ?? {});
        return unwrap<StaffImportPreviewResponse>(res);
    },

    /** PUT /users/me/password - đổi mật khẩu người đang đăng nhập */
    changeMyPassword: async (data: ChangePasswordPayload): Promise<void> => {
        await apiClient.put('/users/me/password', data);
    },

    /** GET /users/staff/email-availability?email=... */
    isEmailAvailable: async (email: string): Promise<boolean> => {
        const res = await apiClient.get('/users/staff/email-availability', {
            params: { email },
        });
        return Boolean(unwrap<unknown>(res));
    },

    /** PUT /users/:id */
    updateUser: async (userId: string, data: UpdateUserPayload): Promise<UserDetailResponse> => {
        const res = await apiClient.put(`/users/${userId}`, data);
        return unwrap<UserDetailResponse>(res);
    },

    /** PUT /users/:id/status?status=ACTIVE|INACTIVE */
    updateStatus: async (userId: string, status: string): Promise<void> => {
        await apiClient.put(`/users/${userId}/status?status=${status}`);
    },

    /** DELETE /users/:id — soft delete */
    deleteUser: async (userId: string): Promise<void> => {
        await apiClient.delete(`/users/${userId}`);
    },

    /** DELETE /users/staff/:id/permanent — hard delete an already deactivated staff account */
    permanentlyDeleteStaff: async (userId: string): Promise<void> => {
        await apiClient.delete(`/users/staff/${userId}/permanent`);
    },
};

/** @deprecated — use userService directly */
export const superAdminService = userService;
