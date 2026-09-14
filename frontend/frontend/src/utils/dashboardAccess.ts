import { getTokenRoles } from "@/utils/index";
import { getAuthToken } from "@/utils/authSession";

export type DashboardRole = "ADMIN" | "MANAGER" | "STAFF" | "CUSTOMER" | "GUEST";

const USER_PAGE_SCOPES = ["USER_VIEW", "USER_CREATE", "USER_UPDATE", "USER_DELETE"];

export const DASHBOARD_ENTRY_SCOPES = [
  "ROLE_ADMIN",
  "ROLE_MANAGER",
  "ROLE_STAFF",
  "ROLE_MANAGE",
  ...USER_PAGE_SCOPES,
  "BOOKING_VIEW",
  "BOOKING_MANAGE",
  "SCHEDULE_MANAGE",
  "SHOWTIME_MANAGE",
  "COMBO_MANAGE",
  "PROMOTION_MANAGE",
  "CONTACT_MANAGE",
  "MOVIE_CREATE",
  "MOVIE_UPDATE",
  "MOVIE_DELETE",
];

export const DASHBOARD_PAGE_ACCESS: Record<string, DashboardRole[]> = {
  "Tổng quan": ["ADMIN", "MANAGER"],
  "Báo cáo & thống kê": ["ADMIN", "MANAGER"],
  "Quản lý phim": ["ADMIN", "MANAGER"],
  "Cloudinary Audio Lab": ["ADMIN", "MANAGER"],
  "Thể loại": ["ADMIN", "MANAGER"],
  "Phòng chiếu": ["ADMIN", "MANAGER", "STAFF"],
  "Lịch chiếu & ghế": ["ADMIN", "MANAGER", "STAFF"],
  "Cấu hình giá vé": ["ADMIN", "MANAGER", "STAFF"],
  "Bán vé tại quầy": ["ADMIN", "MANAGER", "STAFF"],
  "Bán bắp nước tại quầy": [],
  "Ca thu ngân & đối soát": [],
  "Lịch ca & chấm công": [],
  "Nhật ký nhân viên": [],
  "Đặt vé online": ["ADMIN", "MANAGER", "STAFF"],
  "Đặt vé tại quầy": ["ADMIN", "MANAGER", "STAFF"],
  "Combo & bắp nước": ["ADMIN", "MANAGER"],
  "Khuyến mãi": ["ADMIN", "MANAGER"],
  "Khách hàng & thành viên": ["ADMIN"],
  "Hội viên": ["ADMIN"],
  "Góp ý & phản hồi": ["ADMIN", "MANAGER"],
  "Nhân viên": ["ADMIN"],
  "Vai trò & quyền hạn": ["ADMIN"],
  "Cài đặt": ["ADMIN"],
};

export const DASHBOARD_PAGE_PERMISSION_ACCESS: Record<string, string[]> = {
  "Quản lý phim": ["MOVIE_CREATE", "MOVIE_UPDATE", "MOVIE_DELETE"],
  "Cloudinary Audio Lab": ["MOVIE_CREATE", "MOVIE_UPDATE"],
  "Thể loại": ["MOVIE_CREATE", "MOVIE_UPDATE", "MOVIE_DELETE"],
  "Phòng chiếu": ["SHOWTIME_MANAGE", "BOOKING_VIEW"],
  "Lịch chiếu & ghế": ["SHOWTIME_MANAGE", "BOOKING_VIEW"],
  "Cấu hình giá vé": ["SHOWTIME_MANAGE"],
  "Bán vé tại quầy": ["BOOKING_MANAGE"],
  "Bán bắp nước tại quầy": ["BOOKING_MANAGE"],
  "Ca thu ngân & đối soát": ["BOOKING_VIEW", "BOOKING_MANAGE"],
  "Lịch ca & chấm công": ["SCHEDULE_MANAGE", "BOOKING_MANAGE"],
  "Nhật ký nhân viên": ["SCHEDULE_MANAGE", "USER_VIEW"],
  "Đặt vé online": ["BOOKING_VIEW", "BOOKING_MANAGE"],
  "Đặt vé tại quầy": ["BOOKING_VIEW", "BOOKING_MANAGE"],
  "Combo & bắp nước": ["COMBO_MANAGE"],
  "Khuyến mãi": ["PROMOTION_MANAGE"],
  "Góp ý & phản hồi": ["CONTACT_MANAGE"],
  "Khách hàng & thành viên": ["USER_VIEW", "USER_UPDATE", "USER_DELETE"],
  "Hội viên": ["ROLE_ADMIN"],
  "Nhân viên": USER_PAGE_SCOPES,
  "Vai trò & quyền hạn": ["ROLE_MANAGE"],
};

export const MANAGE_ROLES: DashboardRole[] = ["ADMIN", "MANAGER"];
export const MANAGE_PERMISSIONS = [
  "SHOWTIME_MANAGE",
  "COMBO_MANAGE",
  "PROMOTION_MANAGE",
  "MOVIE_CREATE",
  "MOVIE_UPDATE",
  "MOVIE_DELETE",
];

export function normalizeRoles(rawRoles: string[]): DashboardRole[] {
  const roles = rawRoles
    .map((role) => role.replace(/^ROLE_/, "").trim().toUpperCase())
    .filter((role): role is DashboardRole =>
      ["ADMIN", "MANAGER", "STAFF", "CUSTOMER", "GUEST"].includes(role)
    );
  return roles.length > 0 ? roles : ["GUEST"];
}

export function getCurrentDashboardRoles(): DashboardRole[] {
  const token = getAuthToken();
  return token ? normalizeRoles(getTokenRoles(token)) : ["GUEST"];
}

export function hasAnyDashboardRole(currentRoles: DashboardRole[], allowedRoles: DashboardRole[]): boolean {
  return currentRoles.some((role) => allowedRoles.includes(role));
}

export function hasAnyScope(currentScopes: string[], allowedScopes: string[]): boolean {
  return currentScopes.some((scope) => allowedScopes.includes(scope));
}

export function canAccessDashboardFromScopes(currentScopes: string[]): boolean {
  return hasAnyScope(currentScopes, DASHBOARD_ENTRY_SCOPES);
}

export function canAccessDashboardPage(
  page: string,
  currentRoles: DashboardRole[],
  currentScopes: string[] = []
): boolean {
  const allowedRoles = DASHBOARD_PAGE_ACCESS[page];
  const allowedPermissions = DASHBOARD_PAGE_PERMISSION_ACCESS[page] || [];
  return (!!allowedRoles && hasAnyDashboardRole(currentRoles, allowedRoles))
    || hasAnyScope(currentScopes, allowedPermissions);
}

export function canManageDashboardData(currentRoles: DashboardRole[], currentScopes: string[] = []): boolean {
  return hasAnyDashboardRole(currentRoles, MANAGE_ROLES)
    || hasAnyScope(currentScopes, MANAGE_PERMISSIONS);
}

export function getFirstAccessibleDashboardPage(
  labels: string[],
  currentRoles: DashboardRole[],
  currentScopes: string[] = []
): string {
  return labels.find((label) => canAccessDashboardPage(label, currentRoles, currentScopes)) || "Đặt vé online";
}
