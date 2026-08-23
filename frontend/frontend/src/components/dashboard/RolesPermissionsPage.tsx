import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import {
  Crown,
  KeyRound,
  Layers,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Save,
  Search,
  Shield,
  ShieldCheck,
  TicketCheck,
  Trash2,
  UserCog,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { userService, type PermissionResponse, type RoleResponse, type UserDetailResponse } from "@/api/userApi";

const FONT = "'Be Vietnam Pro', Inter, sans-serif";
const PRIMARY = "#E63946";
const TEXT = "#0f172a";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";

type PermissionGroup = {
  key: string;
  label: string;
  description: string;
  color: string;
  permissions: PermissionResponse[];
};

const ROLE_META: Record<string, {
  label: string;
  description: string;
  color: string;
  bg: string;
  icon: typeof Shield;
  protected?: boolean;
}> = {
  ADMIN: {
    label: "Quản trị hệ thống",
    description: "Toàn quyền cấu hình, dữ liệu vận hành và phân quyền.",
    color: "#dc2626",
    bg: "rgba(220,38,38,0.08)",
    icon: Crown,
    protected: true,
  },
  MANAGER: {
    label: "Quản lý rạp",
    description: "Điều phối phim, suất chiếu, phòng chiếu, combo và báo cáo.",
    color: "#d97706",
    bg: "rgba(217,119,6,0.10)",
    icon: UserCog,
  },
  STAFF: {
    label: "Nhân viên",
    description: "Hỗ trợ bán vé, kiểm tra đơn đặt và xử lý khách tại rạp.",
    color: "#2563eb",
    bg: "rgba(37,99,235,0.08)",
    icon: TicketCheck,
  },
  CUSTOMER: {
    label: "Khách hàng",
    description: "Tài khoản đặt vé và theo dõi lịch sử cá nhân.",
    color: "#059669",
    bg: "rgba(5,150,105,0.08)",
    icon: UserRound,
    protected: true,
  },
  GUEST: {
    label: "Khách vãng lai",
    description: "Người chưa đăng nhập, chỉ dùng cho quyền xem công khai.",
    color: "#0891b2",
    bg: "rgba(8,145,178,0.08)",
    icon: Users,
    protected: true,
  },
};

const GROUP_META: Record<string, { label: string; description: string; color: string }> = {
  USER: {
    label: "Người dùng",
    description: "Tài khoản khách hàng, nhân viên và trạng thái người dùng.",
    color: "#2563eb",
  },
  ROLE: {
    label: "Vai trò",
    description: "Thiết lập vai trò và tập quyền truy cập.",
    color: "#7c3aed",
  },
  MOVIE: {
    label: "Phim",
    description: "Danh mục phim, nội dung, trạng thái và dữ liệu TMDB.",
    color: "#db2777",
  },
  SHOWTIME: {
    label: "Suất chiếu",
    description: "Lịch chiếu, phòng chiếu và điều phối suất chiếu.",
    color: "#ea580c",
  },
  COMBO: {
    label: "Combo",
    description: "Combo đồ ăn, nước uống và sản phẩm bán kèm.",
    color: "#16a34a",
  },
  PROMOTION: {
    label: "Khuyến mãi",
    description: "Quản lý mã ưu đãi, voucher và thiết lập điều kiện áp dụng.",
    color: "#e11d48",
  },
  CONTACT: {
    label: "Góp ý & Phản hồi",
    description: "Tiếp nhận ý kiến, kiểm duyệt AI và gửi email phản hồi trực tiếp.",
    color: "#0284c7",
  },
  BOOKING: {
    label: "Đặt vé",
    description: "Đơn đặt vé, vé, giữ ghế, hủy vé và giao dịch.",
    color: "#0f766e",
  },
  OTHER: {
    label: "Khác",
    description: "Các quyền chưa được phân nhóm riêng.",
    color: "#475569",
  },
};

const SYSTEM_ROLE_NAMES = new Set(["ADMIN", "MANAGER", "STAFF", "CUSTOMER", "GUEST"]);
const NON_STAFF_ROLE_NAMES = new Set(["CUSTOMER", "GUEST"]);
const PROTECTED_ADMIN_MESSAGE = "Tài khoản quản trị hệ thống không được chỉnh sửa quyền.";

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase("vi-VN")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getRoleMeta(roleName: string) {
  return ROLE_META[roleName] ?? {
    label: "Vai trò tùy chỉnh",
    description: "Vai trò được tạo riêng theo nhu cầu vận hành.",
    color: "#475569",
    bg: "rgba(71,85,105,0.08)",
    icon: Shield,
    protected: false,
  };
}

function isInteractiveRole(role: RoleResponse): boolean {
  return !getRoleMeta(role.roleName).protected;
}

function isProtectedAdminUser(user: UserDetailResponse): boolean {
  return user.username.toLowerCase() === "admin" || user.roleName === "ADMIN";
}

function getPermissionGroupName(permissionName: string): string {
  const prefix = permissionName.split("_")[0] || "OTHER";
  return GROUP_META[prefix] ? prefix : "OTHER";
}

function formatPermissionAction(permissionName: string): string {
  const action = permissionName.split("_").slice(1).join("_");
  const labels: Record<string, string> = {
    VIEW: "Xem",
    CREATE: "Tạo mới",
    UPDATE: "Cập nhật",
    DELETE: "Xóa",
    MANAGE: "Quản lý",
  };
  return labels[action] ?? action.replace(/_/g, " ");
}

function groupPermissions(permissions: PermissionResponse[]): PermissionGroup[] {
  const grouped = new Map<string, PermissionResponse[]>();
  permissions.forEach((permission) => {
    const groupName = getPermissionGroupName(permission.name);
    grouped.set(groupName, [...(grouped.get(groupName) ?? []), permission]);
  });

  return Array.from(grouped.entries())
    .map(([key, items]) => {
      const meta = GROUP_META[key] ?? GROUP_META.OTHER;
      return {
        key,
        label: meta.label,
        description: meta.description,
        color: meta.color,
        permissions: items.sort((a, b) => a.name.localeCompare(b.name)),
      };
    })
    .sort((a, b) => {
      const order = ["USER", "ROLE", "MOVIE", "SHOWTIME", "COMBO", "PROMOTION", "CONTACT", "BOOKING", "OTHER"];
      return order.indexOf(a.key) - order.indexOf(b.key);
    });
}

function roleSort(a: RoleResponse, b: RoleResponse): number {
  const order = ["ADMIN", "MANAGER", "STAFF", "CUSTOMER", "GUEST"];
  const ai = order.indexOf(a.roleName);
  const bi = order.indexOf(b.roleName);
  if (ai !== -1 || bi !== -1) {
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  }
  return a.roleName.localeCompare(b.roleName);
}

function rolePermissionSet(role?: RoleResponse | null): Set<string> {
  return new Set((role?.permissions ?? []).map((permission) => permission.name));
}

function makePersonalRoleName(username: string): string {
  const normalized = username
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  const base = normalized && /^[A-Z]/.test(normalized) ? normalized : `STAFF_${normalized || "CUSTOM"}`;
  return `${base}_ACCESS`.slice(0, 31);
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message === "string"
  ) {
    return (error as { response: { data: { message: string } } }).response.data.message;
  }
  return fallback;
}

function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onChange}
      style={{
        width: 42,
        height: 24,
        borderRadius: 999,
        border: `1px solid ${checked ? PRIMARY : BORDER}`,
        background: checked ? PRIMARY : "#f8fafc",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        padding: 2,
        display: "flex",
        justifyContent: checked ? "flex-end" : "flex-start",
        alignItems: "center",
        transition: "all 0.18s ease",
      }}
      aria-pressed={checked}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 2px 6px rgba(15,23,42,0.16)",
          display: "block",
        }}
      />
    </button>
  );
}

function CreateRoleModal({
  loading,
  onClose,
  onSubmit,
}: {
  loading: boolean;
  onClose: () => void;
  onSubmit: (roleName: string, description: string) => void;
}) {
  const [roleName, setRoleName] = useState("");
  const [description, setDescription] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(roleName.trim().toUpperCase(), description.trim());
  };

  return (
    <div style={modalBackdropStyle}>
      <div style={modalStyle}>
        <div style={modalHeaderStyle}>
          <div>
            <div style={eyebrowStyle}>Role</div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: TEXT }}>Tạo vai trò mới</h3>
          </div>
          <button type="button" onClick={onClose} style={iconButtonStyle}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} style={{ padding: 22 }}>
          <label style={labelStyle}>Tên vai trò</label>
          <input
            autoFocus
            value={roleName}
            onChange={(event) => setRoleName(event.target.value)}
            placeholder="VD: CASHIER"
            style={inputStyle}
          />
          <div style={{ height: 14 }} />
          <label style={labelStyle}>Mô tả</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Mô tả phạm vi sử dụng của vai trò"
            style={{ ...inputStyle, minHeight: 88, resize: "vertical" }}
          />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
            <button type="button" onClick={onClose} style={secondaryButtonStyle}>Hủy</button>
            <button type="submit" disabled={loading} style={primaryButtonStyle}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Tạo vai trò
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function RolesPermissionsPage() {
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [permissions, setPermissions] = useState<PermissionResponse[]>([]);
  const [staffUsers, setStaffUsers] = useState<UserDetailResponse[]>([]);
  const [selectedRoleName, setSelectedRoleName] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [draftPermissions, setDraftPermissions] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const selectedRole = useMemo(
    () => roles.find((role) => role.roleName === selectedRoleName) ?? null,
    [roles, selectedRoleName]
  );
  const visibleRoles = useMemo(
    () => roles.filter(isInteractiveRole),
    [roles]
  );
  const selectedStaff = useMemo(
    () => staffUsers.find((user) => user.userId === selectedStaffId) ?? null,
    [staffUsers, selectedStaffId]
  );

  const selectedMeta = getRoleMeta(selectedRole?.roleName ?? "");
  const selectedProtected = !!selectedMeta.protected;
  const hasChanges = selectedRole
    ? Array.from(draftPermissions).sort().join("|") !== Array.from(rolePermissionSet(selectedRole)).sort().join("|")
    : false;

  const filteredPermissions = useMemo(() => {
    const keyword = normalizeText(search.trim());
    if (!keyword) return permissions;
    return permissions.filter((permission) => {
      const haystack = normalizeText(`${permission.name} ${permission.description}`);
      return haystack.includes(keyword);
    });
  }, [permissions, search]);

  const permissionGroups = useMemo(
    () => groupPermissions(filteredPermissions),
    [filteredPermissions]
  );

  const totalGranted = draftPermissions.size;
  const totalPermissions = permissions.length;
  const accessPercent = totalPermissions ? Math.round((totalGranted / totalPermissions) * 100) : 0;

  const fetchData = async () => {
    try {
      setLoading(true);
      const [roleData, permissionData, userData] = await Promise.all([
        userService.getAllRoles(),
        userService.getAllPermissions(),
        userService.getAllUsers(["ACTIVE", "INACTIVE", "BANNED"]),
      ]);
      const sortedRoles = [...roleData].sort(roleSort);
      const visibleSortedRoles = sortedRoles.filter(isInteractiveRole);
      const sortedPermissions = [...permissionData].sort((a, b) => a.name.localeCompare(b.name));
      const sortedStaff = userData
        .filter((user) => !NON_STAFF_ROLE_NAMES.has(user.roleName) && !isProtectedAdminUser(user))
        .sort((a, b) => (a.fullName || a.username).localeCompare(b.fullName || b.username));
      const nextSelected = selectedRoleName && visibleSortedRoles.some((role) => role.roleName === selectedRoleName)
        ? selectedRoleName
        : visibleSortedRoles[0]?.roleName ?? "";

      setRoles(sortedRoles);
      setPermissions(sortedPermissions);
      setStaffUsers(sortedStaff);
      setSelectedRoleName(nextSelected);
      setSelectedStaffId((current) => current && sortedStaff.some((user) => user.userId === current) ? current : sortedStaff[0]?.userId ?? "");
      setDraftPermissions(rolePermissionSet(sortedRoles.find((role) => role.roleName === nextSelected)));
    } catch (error) {
      console.error("Failed to fetch roles and permissions:", error);
      toast.error("Không thể tải vai trò và quyền hạn.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchData();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectRole = (role: RoleResponse) => {
    setSelectedRoleName(role.roleName);
    setDraftPermissions(rolePermissionSet(role));
    setSearch("");
  };

  const togglePermission = (permissionName: string) => {
    if (selectedProtected) return;
    setDraftPermissions((current) => {
      const next = new Set(current);
      if (next.has(permissionName)) next.delete(permissionName);
      else next.add(permissionName);
      return next;
    });
  };

  const saveRole = async () => {
    if (!selectedRole || selectedProtected || saving) return;
    try {
      setSaving(true);
      const updatedRole = await userService.createRole({
        roleName: selectedRole.roleName,
        description: selectedRole.description,
        permissions: Array.from(draftPermissions),
      });
      setRoles((current) =>
        current.map((role) => role.roleName === updatedRole.roleName ? updatedRole : role).sort(roleSort)
      );
      setDraftPermissions(rolePermissionSet(updatedRole));
      toast.success("Đã cập nhật quyền hạn.");
    } catch (error: unknown) {
      console.error("Failed to save role:", error);
      toast.error(getApiErrorMessage(error, "Không thể lưu quyền hạn."));
    } finally {
      setSaving(false);
    }
  };

  const createRole = async (roleName: string, description: string) => {
    if (!roleName) {
      toast.error("Tên vai trò không được để trống.");
      return;
    }
    if (!/^[A-Z][A-Z0-9_]{2,30}$/.test(roleName)) {
      toast.error("Tên vai trò chỉ dùng chữ in hoa, số, dấu gạch dưới và tối thiểu 3 ký tự.");
      return;
    }
    if (roles.some((role) => role.roleName === roleName)) {
      toast.error("Vai trò này đã tồn tại.");
      return;
    }

    try {
      setSaving(true);
      const created = await userService.createRole({
        roleName,
        description: description || "Vai trò tùy chỉnh",
        permissions: [],
      });
      setRoles((current) => [...current, created].sort(roleSort));
      setSelectedRoleName(created.roleName);
      setDraftPermissions(new Set());
      setShowCreateModal(false);
      toast.success("Đã tạo vai trò mới.");
    } catch (error: unknown) {
      console.error("Failed to create role:", error);
      toast.error(getApiErrorMessage(error, "Không thể tạo vai trò."));
    } finally {
      setSaving(false);
    }
  };

  const deleteRole = async () => {
    if (!selectedRole || SYSTEM_ROLE_NAMES.has(selectedRole.roleName)) return;
    try {
      setSaving(true);
      await userService.deleteRole(selectedRole.roleName);
      await fetchData();
      toast.success("Đã xóa vai trò.");
    } catch (error: unknown) {
      console.error("Failed to delete role:", error);
      toast.error(getApiErrorMessage(error, "Không thể xóa vai trò này."));
    } finally {
      setSaving(false);
    }
  };

  const assignSelectedRoleToStaff = async () => {
    if (!selectedRole || !selectedStaff || assigning) return;
    if (isProtectedAdminUser(selectedStaff)) {
      toast.info(PROTECTED_ADMIN_MESSAGE);
      return;
    }
    try {
      setAssigning(true);
      const updated = await userService.updateUser(selectedStaff.userId, {
        roleName: selectedRole.roleName,
      });
      setStaffUsers((current) =>
        current.map((user) => user.userId === updated.userId ? updated : user)
      );
      toast.success(`Đã gán ${selectedRole.roleName} cho ${selectedStaff.username}.`);
    } catch (error: unknown) {
      console.error("Failed to assign role to staff:", error);
      toast.error(getApiErrorMessage(error, "Không thể gán vai trò cho nhân viên."));
    } finally {
      setAssigning(false);
    }
  };

  const createPersonalRoleForStaff = async () => {
    if (!selectedStaff || assigning) return;
    if (isProtectedAdminUser(selectedStaff)) {
      toast.info(PROTECTED_ADMIN_MESSAGE);
      return;
    }
    const roleName = makePersonalRoleName(selectedStaff.username);
    try {
      setAssigning(true);
      const personalRole = await userService.createRole({
        roleName,
        description: `Quyền riêng cho nhân viên ${selectedStaff.fullName || selectedStaff.username}`,
        permissions: Array.from(draftPermissions),
      });
      const updatedStaff = await userService.updateUser(selectedStaff.userId, {
        roleName: personalRole.roleName,
      });
      setRoles((current) => {
        const next = current.some((role) => role.roleName === personalRole.roleName)
          ? current.map((role) => role.roleName === personalRole.roleName ? personalRole : role)
          : [...current, personalRole];
        return next.sort(roleSort);
      });
      setStaffUsers((current) =>
        current.map((user) => user.userId === updatedStaff.userId ? updatedStaff : user)
      );
      setSelectedRoleName(personalRole.roleName);
      setDraftPermissions(rolePermissionSet(personalRole));
      toast.success(`Đã tạo role riêng và gán cho ${selectedStaff.username}.`);
    } catch (error: unknown) {
      console.error("Failed to create personal role for staff:", error);
      toast.error(getApiErrorMessage(error, "Không thể tạo role riêng cho nhân viên."));
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div style={loadingWrapStyle}>
        <Loader2 size={30} className="animate-spin" style={{ color: PRIMARY }} />
      </div>
    );
  }

  if (!selectedRole) {
    return (
      <div style={pageStyle}>
        <div style={emptyStateStyle}>Chưa có vai trò có thể chỉnh sửa.</div>
      </div>
    );
  }

  const RoleIcon = selectedMeta.icon;

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <div style={eyebrowStyle}>Access Control</div>
          <h1 style={titleStyle}>Vai trò & quyền hạn</h1>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={fetchData} style={secondaryButtonStyle}>
            <RefreshCw size={16} />
            Làm mới
          </button>
          <button type="button" onClick={() => setShowCreateModal(true)} style={primaryButtonStyle}>
            <Plus size={16} />
            Tạo vai trò
          </button>
        </div>
      </div>

      <div style={layoutStyle}>
        <aside style={sidebarStyle}>
          <div style={sidebarHeaderStyle}>
            <span>Danh sách vai trò</span>
            <strong>{visibleRoles.length}</strong>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visibleRoles.map((role) => {
              const meta = getRoleMeta(role.roleName);
              const Icon = meta.icon;
              const selected = role.roleName === selectedRoleName;
              return (
                <button
                  key={role.roleName}
                  type="button"
                  onClick={() => selectRole(role)}
                  style={roleButtonStyle(selected, meta.color)}
                >
                  <span style={roleIconStyle(meta.bg, meta.color)}>
                    <Icon size={18} />
                  </span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={roleNameStyle}>{role.roleName}</span>
                    <span style={roleDescStyle}>{meta.label}</span>
                  </span>
                  {meta.protected && <Lock size={14} style={{ color: "#94a3b8" }} />}
                </button>
              );
            })}
          </div>
        </aside>

        <main style={{ minWidth: 0, flex: 1 }}>
          <section style={detailHeaderStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
              <span style={largeRoleIconStyle(selectedMeta.bg, selectedMeta.color)}>
                <RoleIcon size={24} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <h2 style={detailTitleStyle}>{selectedRole.roleName}</h2>
                  {selectedProtected && (
                    <span style={protectedBadgeStyle}>
                      <Lock size={11} />
                      Hệ thống
                    </span>
                  )}
                </div>
                <p style={detailDescStyle}>{selectedRole.description || selectedMeta.description}</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {!selectedProtected && (
                <button
                  type="button"
                  onClick={saveRole}
                  disabled={!hasChanges || saving}
                  style={{
                    ...primaryButtonStyle,
                    opacity: !hasChanges || saving ? 0.55 : 1,
                    cursor: !hasChanges || saving ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Lưu quyền
                </button>
              )}
              {!SYSTEM_ROLE_NAMES.has(selectedRole.roleName) && (
                <button type="button" onClick={deleteRole} disabled={saving} style={dangerButtonStyle}>
                  <Trash2 size={16} />
                  Xóa
                </button>
              )}
            </div>
          </section>

          <section style={statsGridStyle}>
            <Stat icon={KeyRound} label="Quyền đang có" value={`${totalGranted}/${totalPermissions}`} color={PRIMARY} />
            <Stat icon={ShieldCheck} label="Mức truy cập" value={`${accessPercent}%`} color="#059669" />
            <Stat icon={Layers} label="Nhóm quyền" value={String(groupPermissions(permissions).length)} color="#7c3aed" />
          </section>

          <section style={staffAssignPanelStyle}>
            <div style={{ minWidth: 0 }}>
              <h3 style={sectionTitleStyle}>Áp dụng cho nhân viên cụ thể</h3>
              <div style={sectionSubtleStyle}>
                Chọn nhân viên rồi gán role đang xem, hoặc tạo role riêng từ bộ quyền hiện tại.
              </div>
            </div>
            <div style={staffAssignControlsStyle}>
              <select
                value={selectedStaffId}
                onChange={(event) => setSelectedStaffId(event.target.value)}
                style={staffSelectStyle}
              >
                {staffUsers.length === 0 ? (
                  <option value="">Chưa có nhân viên</option>
                ) : (
                  staffUsers.map((user) => (
                    <option key={user.userId} value={user.userId}>
                      {(user.fullName || user.username)} · @{user.username} · {user.roleName}
                    </option>
                  ))
                )}
              </select>
              {selectedStaff && (
                <span style={currentRoleBadgeStyle}>
                  Hiện tại: {selectedStaff.roleName}
                </span>
              )}
              <button
                type="button"
                onClick={assignSelectedRoleToStaff}
                disabled={!selectedStaff || assigning}
                style={{ ...secondaryButtonStyle, opacity: !selectedStaff || assigning ? 0.6 : 1 }}
              >
                {assigning ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                Gán role này
              </button>
              <button
                type="button"
                onClick={createPersonalRoleForStaff}
                disabled={!selectedStaff || assigning}
                style={{ ...primaryButtonStyle, opacity: !selectedStaff || assigning ? 0.6 : 1 }}
              >
                {assigning ? <Loader2 size={16} className="animate-spin" /> : <UserCog size={16} />}
                Tạo role riêng
              </button>
            </div>
          </section>

          <section style={permissionPanelStyle}>
            <div style={permissionToolbarStyle}>
              <div>
                <h3 style={sectionTitleStyle}>Bảng quyền</h3>
                <div style={sectionSubtleStyle}>{hasChanges ? "Có thay đổi chưa lưu" : "Đã đồng bộ với hệ thống"}</div>
              </div>
              <div style={searchWrapStyle}>
                <Search size={16} style={{ color: "#94a3b8", flexShrink: 0 }} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm quyền..."
                  style={searchInputStyle}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {permissionGroups.map((group) => {
                const groupGranted = group.permissions.filter((permission) => draftPermissions.has(permission.name)).length;
                return (
                  <div key={group.key} style={groupStyle}>
                    <div style={groupHeaderStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <span style={groupDotStyle(group.color)} />
                        <div style={{ minWidth: 0 }}>
                          <div style={groupTitleStyle}>{group.label}</div>
                          <div style={groupDescStyle}>{group.description}</div>
                        </div>
                      </div>
                      <span style={countBadgeStyle}>{groupGranted}/{group.permissions.length}</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {group.permissions.map((permission) => {
                        const enabled = draftPermissions.has(permission.name);
                        return (
                          <div key={permission.name} style={permissionRowStyle}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={permissionNameStyle}>
                                {permission.name}
                                <span style={actionBadgeStyle}>{formatPermissionAction(permission.name)}</span>
                              </div>
                              <div style={permissionDescStyle}>{permission.description}</div>
                            </div>
                            <Toggle
                              checked={enabled}
                              disabled={selectedProtected}
                              onChange={() => togglePermission(permission.name)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {permissionGroups.length === 0 && (
                <div style={emptyStateStyle}>Không có quyền phù hợp với bộ lọc.</div>
              )}
            </div>
          </section>
        </main>
      </div>

      {showCreateModal && (
        <CreateRoleModal
          loading={saving}
          onClose={() => setShowCreateModal(false)}
          onSubmit={createRole}
        />
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Shield;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div style={statStyle}>
      <span style={{ ...statIconStyle, background: `${color}14`, color }}>
        <Icon size={18} />
      </span>
      <span>
        <span style={statValueStyle}>{value}</span>
        <span style={statLabelStyle}>{label}</span>
      </span>
    </div>
  );
}

const pageStyle: CSSProperties = {
  flex: 1,
  width: "100%",
  minWidth: 980,
  overflow: "auto",
  background: "#F4F5F7",
  padding: "28px 32px 44px",
  fontFamily: FONT,
  boxSizing: "border-box",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 22,
  flexWrap: "wrap",
};

const eyebrowStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  color: PRIMARY,
  letterSpacing: "0.12em",
  marginBottom: 5,
};

const titleStyle: CSSProperties = {
  margin: 0,
  color: TEXT,
  fontSize: 26,
  fontWeight: 850,
  letterSpacing: 0,
};

const layoutStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "300px minmax(0, 1fr)",
  gap: 16,
  alignItems: "start",
  maxWidth: 1480,
};

const sidebarStyle: CSSProperties = {
  background: "#fff",
  border: "1px solid #E5E7EB",
  borderRadius: 8,
  padding: 12,
  boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
};

const sidebarHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "4px 4px 14px",
  color: MUTED,
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.08em",
};

const roleButtonStyle = (selected: boolean, color: string): CSSProperties => ({
  width: "100%",
  border: `1px solid ${selected ? color : "#E5E7EB"}`,
  borderRadius: 8,
  background: selected ? `${color}0D` : "#fff",
  padding: 12,
  display: "flex",
  alignItems: "center",
  gap: 11,
  textAlign: "left",
  cursor: "pointer",
  boxShadow: selected ? `inset 3px 0 0 ${color}` : "none",
});

const roleIconStyle = (bg: string, color: string): CSSProperties => ({
  width: 36,
  height: 36,
  borderRadius: 8,
  background: bg,
  color,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

const largeRoleIconStyle = (bg: string, color: string): CSSProperties => ({
  ...roleIconStyle(bg, color),
  width: 48,
  height: 48,
  borderRadius: 8,
});

const roleNameStyle: CSSProperties = {
  display: "block",
  color: TEXT,
  fontSize: 14,
  fontWeight: 800,
  lineHeight: 1.2,
};

const roleDescStyle: CSSProperties = {
  display: "block",
  color: MUTED,
  fontSize: 12,
  marginTop: 3,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const detailHeaderStyle: CSSProperties = {
  background: "#fff",
  border: "1px solid #E5E7EB",
  borderRadius: 8,
  padding: 18,
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "center",
  boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
};

const detailTitleStyle: CSSProperties = {
  margin: 0,
  color: TEXT,
  fontSize: 22,
  fontWeight: 850,
  lineHeight: 1.2,
};

const detailDescStyle: CSSProperties = {
  margin: "4px 0 0",
  color: MUTED,
  fontSize: 13,
  lineHeight: 1.5,
};

const protectedBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  height: 24,
  padding: "0 9px",
  borderRadius: 999,
  background: "rgba(220,38,38,0.08)",
  color: "#dc2626",
  fontSize: 11,
  fontWeight: 800,
};

const statsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12,
  margin: "14px 0",
};

const statStyle: CSSProperties = {
  background: "#fff",
  border: "1px solid #E5E7EB",
  borderRadius: 8,
  padding: 14,
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const statIconStyle: CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const statValueStyle: CSSProperties = {
  display: "block",
  color: TEXT,
  fontSize: 18,
  fontWeight: 850,
  lineHeight: 1.1,
};

const statLabelStyle: CSSProperties = {
  display: "block",
  color: MUTED,
  fontSize: 12,
  marginTop: 3,
};

const staffAssignPanelStyle: CSSProperties = {
  background: "#fff",
  border: "1px solid #E5E7EB",
  borderRadius: 8,
  padding: 16,
  marginBottom: 14,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  flexWrap: "wrap",
  boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
};

const staffAssignControlsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 10,
  flexWrap: "wrap",
};

const staffSelectStyle: CSSProperties = {
  height: 42,
  minWidth: 330,
  maxWidth: 460,
  border: "1px solid #D1D5DB",
  borderRadius: 8,
  background: "#fff",
  color: TEXT,
  padding: "0 12px",
  outline: "none",
  fontFamily: FONT,
  fontSize: 13,
  fontWeight: 650,
};

const currentRoleBadgeStyle: CSSProperties = {
  minHeight: 32,
  padding: "0 10px",
  borderRadius: 999,
  background: "#F9FAFB",
  border: "1px solid #E5E7EB",
  color: MUTED,
  display: "inline-flex",
  alignItems: "center",
  fontSize: 12,
  fontWeight: 800,
};

const permissionPanelStyle: CSSProperties = {
  background: "#fff",
  border: "1px solid #E5E7EB",
  borderRadius: 8,
  padding: 16,
  boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
};

const permissionToolbarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  marginBottom: 15,
  flexWrap: "wrap",
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  color: TEXT,
  fontSize: 16,
  fontWeight: 850,
};

const sectionSubtleStyle: CSSProperties = {
  marginTop: 3,
  color: MUTED,
  fontSize: 12,
};

const searchWrapStyle: CSSProperties = {
  height: 42,
  minWidth: 270,
  border: "1px solid #D1D5DB",
  borderRadius: 8,
  padding: "0 12px",
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: "#fff",
};

const searchInputStyle: CSSProperties = {
  border: "none",
  outline: "none",
  flex: 1,
  minWidth: 0,
  fontFamily: FONT,
  fontSize: 13,
  color: TEXT,
};

const groupStyle: CSSProperties = {
  border: "1px solid #E5E7EB",
  borderRadius: 8,
  overflow: "hidden",
};

const groupHeaderStyle: CSSProperties = {
  minHeight: 64,
  padding: "12px 14px",
  background: "#F9FAFB",
  borderBottom: "1px solid #E5E7EB",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
};

const groupDotStyle = (color: string): CSSProperties => ({
  width: 10,
  height: 36,
  borderRadius: 999,
  background: color,
  flexShrink: 0,
});

const groupTitleStyle: CSSProperties = {
  color: TEXT,
  fontSize: 14,
  fontWeight: 850,
};

const groupDescStyle: CSSProperties = {
  color: MUTED,
  fontSize: 12,
  marginTop: 3,
};

const countBadgeStyle: CSSProperties = {
  height: 28,
  minWidth: 54,
  padding: "0 10px",
  borderRadius: 999,
  background: "#fff",
  border: "1px solid #E5E7EB",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: TEXT,
  fontSize: 12,
  fontWeight: 800,
};

const permissionRowStyle: CSSProperties = {
  minHeight: 64,
  padding: "12px 14px",
  display: "flex",
  alignItems: "center",
  gap: 14,
  borderBottom: "1px solid #f1f5f9",
};

const permissionNameStyle: CSSProperties = {
  color: TEXT,
  fontSize: 13,
  fontWeight: 850,
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const actionBadgeStyle: CSSProperties = {
  height: 22,
  padding: "0 8px",
  borderRadius: 999,
  background: "rgba(230,57,70,0.08)",
  color: PRIMARY,
  display: "inline-flex",
  alignItems: "center",
  fontSize: 11,
  fontWeight: 800,
};

const permissionDescStyle: CSSProperties = {
  color: MUTED,
  fontSize: 12,
  marginTop: 4,
  lineHeight: 1.45,
};

const primaryButtonStyle: CSSProperties = {
  minHeight: 42,
  padding: "0 15px",
  borderRadius: 8,
  border: "none",
  background: PRIMARY,
  color: "#fff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  cursor: "pointer",
  fontFamily: FONT,
  fontSize: 13,
  fontWeight: 800,
};

const secondaryButtonStyle: CSSProperties = {
  minHeight: 42,
  padding: "0 14px",
  borderRadius: 8,
  border: "1px solid #D1D5DB",
  background: "#fff",
  color: TEXT,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  cursor: "pointer",
  fontFamily: FONT,
  fontSize: 13,
  fontWeight: 800,
};

const dangerButtonStyle: CSSProperties = {
  ...secondaryButtonStyle,
  color: "#dc2626",
  background: "rgba(220,38,38,0.05)",
};

const iconButtonStyle: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 8,
  border: "1px solid #D1D5DB",
  background: "#fff",
  color: TEXT,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: 7,
  color: TEXT,
  fontSize: 13,
  fontWeight: 800,
};

const inputStyle: CSSProperties = {
  width: "100%",
  minHeight: 42,
  border: "1px solid #D1D5DB",
  borderRadius: 8,
  outline: "none",
  padding: "0 12px",
  fontFamily: FONT,
  fontSize: 13,
  color: TEXT,
  boxSizing: "border-box",
};

const modalBackdropStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 100,
  background: "rgba(15,23,42,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const modalStyle: CSSProperties = {
  width: "100%",
  maxWidth: 520,
  background: "#fff",
  borderRadius: 8,
  boxShadow: "0 24px 70px rgba(15,23,42,0.26)",
  overflow: "hidden",
  fontFamily: FONT,
};

const modalHeaderStyle: CSSProperties = {
  padding: "18px 22px",
  borderBottom: `1px solid ${BORDER}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const loadingWrapStyle: CSSProperties = {
  minHeight: 420,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const emptyStateStyle: CSSProperties = {
  border: "1px dashed #D1D5DB",
  borderRadius: 8,
  padding: 28,
  textAlign: "center",
  color: MUTED,
  fontSize: 13,
  background: "#fff",
};
