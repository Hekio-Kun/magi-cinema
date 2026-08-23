import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { toast } from "react-toastify";
import {
  Ban,
  CheckCircle2,
  Edit3,
  FileSpreadsheet,
  IdCard,
  Loader2,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserMinus,
  UserRound,
  Users,
  X,
} from "lucide-react";
import {
  userService,
  type StaffCreatePayload,
  type StaffGoogleSheetImportRequest,
  type StaffImportPreviewResponse,
  type StaffImportResponse,
  type UpdateUserPayload,
  type UserDetailResponse,
  type RoleResponse,
} from "@/api/userApi";
import { ConfirmDialog } from "../common/ConfirmDialog";

const FONT = "'Be Vietnam Pro', Inter, sans-serif";
const NON_STAFF_ROLES = new Set(["CUSTOMER", "GUEST"]);
const PROTECTED_ADMIN_MESSAGE = "Tài khoản quản trị hệ thống không được chỉnh sửa tại trang quản lý.";

const getApiErrorMessage = (error: unknown, fallback: string) => {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return typeof message === "string" && message.trim() ? message : fallback;
};

const ROLE_LABELS: Record<string, string> = {
  STAFF: "Nhân viên",
  MANAGER: "Quản lý",
  ADMIN: "Quản trị",
};

const ROLE_OPTIONS = [
  { value: "STAFF", label: "Nhân viên" },
  { value: "MANAGER", label: "Quản lý" },
];

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Hoạt động" },
  { value: "INACTIVE", label: "Tạm khóa" },
  { value: "BANNED", label: "Cấm" },
  { value: "DELETED", label: "Đã vô hiệu hóa" },
];

const isProtectedAdminUser = (user: UserDetailResponse) =>
  user.username.toLowerCase() === "admin" || user.roleName === "ADMIN";

const EMPTY_CREATE: StaffCreatePayload = {
  username: "",
  email: "",
  fullName: "",
  phoneNumber: "",
  identityCard: "",
  roleName: "STAFF",
  gender: "",
  dateOfBirth: "",
  address: "",
  hireDate: "",
};

const DEFAULT_IMPORT_FORM: StaffGoogleSheetImportRequest = {
  spreadsheetId: "",
  range: "",
  defaultRoleName: "STAFF",
};

export function UserManagementPage({ type }: { type: "staff" | "customers" }) {
  const isStaffPage = type === "staff";
  const [users, setUsers] = useState<UserDetailResponse[]>([]);
  const [roleOptions, setRoleOptions] = useState(ROLE_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDetailResponse | null>(null);
  const [createForm, setCreateForm] = useState<StaffCreatePayload>(EMPTY_CREATE);
  const [editForm, setEditForm] = useState<UpdateUserPayload>({});
  const [deletingUser, setDeletingUser] = useState<UserDetailResponse | null>(null);
  const [permanentlyDeletingUser, setPermanentlyDeletingUser] = useState<UserDetailResponse | null>(null);
  const [restoringUser, setRestoringUser] = useState<UserDetailResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPermanentlyDeleting, setIsPermanentlyDeleting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewingImport, setPreviewingImport] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importForm, setImportForm] = useState<StaffGoogleSheetImportRequest>(DEFAULT_IMPORT_FORM);
  const [importPreview, setImportPreview] = useState<StaffImportPreviewResponse | null>(null);
  const [importResult, setImportResult] = useState<StaffImportResponse | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await userService.getAllUsers([statusFilter]);
      setUsers(
        data.filter((user) =>
          isStaffPage ? !NON_STAFF_ROLES.has(user.roleName) : NON_STAFF_ROLES.has(user.roleName)
        )
      );
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Không thể tải danh sách tài khoản"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchUsers();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, statusFilter]);

  useEffect(() => {
    if (!isStaffPage) return;
    let mounted = true;
    userService.getAllRoles()
      .then((roles: RoleResponse[]) => {
        if (!mounted) return;
        const nextOptions = roles
          .filter((role) => !NON_STAFF_ROLES.has(role.roleName) && role.roleName !== "ADMIN")
          .map((role) => ({
            value: role.roleName,
            label: ROLE_LABELS[role.roleName] || role.roleName,
          }));
        setRoleOptions(nextOptions.length > 0 ? nextOptions : ROLE_OPTIONS);
      })
      .catch(() => setRoleOptions(ROLE_OPTIONS));
    return () => {
      mounted = false;
    };
  }, [isStaffPage]);

  const filteredUsers = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    return users.filter((user) => {
      const matchText =
        !text ||
        [user.username, user.email, user.fullName, user.phoneNumber, user.identityCard]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(text));
      const matchRole = roleFilter === "ALL" || user.roleName === roleFilter;
      const matchStatus = user.status === statusFilter;
      return matchText && matchRole && matchStatus;
    });
  }, [users, keyword, roleFilter, statusFilter]);

  const stats = useMemo(() => {
    const active = users.filter((user) => user.status === "ACTIVE").length;
    const managers = users.filter((user) => user.roleName === "MANAGER").length;
    const admins = users.filter((user) => user.roleName === "ADMIN").length;
    return {
      total: users.length,
      active,
      inactive: users.length - active,
      managers,
      admins,
    };
  }, [users]);

  const openCreate = () => {
    setCreateForm(EMPTY_CREATE);
    setCreateOpen(true);
  };

  const openEdit = (user: UserDetailResponse) => {
    if (isProtectedAdminUser(user)) {
      toast.info(PROTECTED_ADMIN_MESSAGE);
      return;
    }
    setEditingUser(user);
    setEditForm({
      fullName: user.fullName || "",
      phoneNumber: user.phoneNumber || "",
      address: user.address || "",
      identityCard: user.identityCard || "",
      dateOfBirth: user.dateOfBirth || "",
      gender: user.gender || "",
      roleName: user.roleName || "STAFF",
      status: user.status || "ACTIVE",
      memberTier: user.memberTier || "",
    });
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    const username = createForm.username.trim();
    const email = createForm.email.trim().toLowerCase();

    if (users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
      toast.error("Tên đăng nhập đã tồn tại.");
      return;
    }

    setCreating(true);
    try {
      const emailAvailable = await userService.isEmailAvailable(email);
      if (!emailAvailable) {
        toast.error("Email đã tồn tại trong hệ thống.");
        return;
      }

      await userService.createStaff({
        ...createForm,
        username,
        email,
        fullName: createForm.fullName.trim(),
        phoneNumber: createForm.phoneNumber.trim(),
        identityCard: createForm.identityCard.trim(),
        address: createForm.address.trim(),
      });
      toast.success("Đã tạo tài khoản nhân viên.");
      setCreateOpen(false);
      setCreateForm(EMPTY_CREATE);
      fetchUsers();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Tạo nhân viên thất bại"));
    } finally {
      setCreating(false);
    }
  };

  const openImport = () => {
    setImportForm(DEFAULT_IMPORT_FORM);
    setImportPreview(null);
    setImportOpen(true);
  };

  const buildImportPayload = (): StaffGoogleSheetImportRequest => ({
    spreadsheetId: normalizeSpreadsheetId(importForm.spreadsheetId),
    range: importForm.range?.trim() || undefined,
    defaultRoleName: importForm.defaultRoleName || "STAFF",
  });

  const handlePreviewImport = async () => {
    if (!isStaffPage || previewingImport || importing) return;

    setPreviewingImport(true);
    try {
      const preview = await userService.previewStaffFromGoogleSheet(buildImportPayload());
      setImportPreview(preview);
      if (preview.totalRows === 0) {
        toast.info("Google Sheet chưa có dòng nhân viên để import.");
      } else if (preview.invalidRows > 0) {
        toast.info(`Xem trước xong: ${preview.validRows} hợp lệ, ${preview.invalidRows} lỗi.`);
      } else {
        toast.success(`Xem trước xong: ${preview.validRows} dòng hợp lệ.`);
      }
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Không thể xem trước dữ liệu import"));
    } finally {
      setPreviewingImport(false);
    }
  };

  const handleImportGoogleSheet = async (event: FormEvent) => {
    event.preventDefault();
    if (!isStaffPage || importing) return;

    setImporting(true);
    try {
      const result = await userService.importStaffFromGoogleSheet(buildImportPayload());
      setImportResult(result);
      setImportOpen(false);
      setImportPreview(null);

      if (result.failedCount > 0) {
        toast.info(`Import xong: ${result.successCount} thành công, ${result.failedCount} lỗi.`);
      } else {
        toast.success(`Đã import ${result.successCount} nhân viên.`);
      }

      fetchUsers();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Nhập nhân viên từ Google Sheet thất bại"));
    } finally {
      setImporting(false);
    }
  };

  const handleUpdate = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingUser) return;

    setSaving(true);
    try {
      const payload: UpdateUserPayload = {
        ...editForm,
        fullName: editForm.fullName?.trim(),
        phoneNumber: editForm.phoneNumber?.trim(),
        address: editForm.address?.trim(),
        identityCard: editForm.identityCard?.trim(),
      };
      const updated = await userService.updateUser(editingUser.userId, payload);
      setUsers((prev) =>
        prev.map((user) => (user.userId === editingUser.userId ? { ...user, ...updated } : user))
      );
      toast.success("Đã cập nhật tài khoản.");
      setEditingUser(null);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Cập nhật tài khoản thất bại"));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user: UserDetailResponse) => {
    if (isProtectedAdminUser(user)) {
      toast.info("Không thể thay đổi trạng thái tài khoản quản trị hệ thống.");
      return;
    }
    const nextStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await userService.updateStatus(user.userId, nextStatus);
      setUsers((prev) =>
        prev.map((item) => (item.userId === user.userId ? { ...item, status: nextStatus } : item))
      );
      toast.success(nextStatus === "ACTIVE" ? "Đã mở lại tài khoản." : "Đã tạm khóa tài khoản.");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Không thể cập nhật trạng thái"));
    }
  };

  const handleDelete = (user: UserDetailResponse) => {
    if (isProtectedAdminUser(user)) {
      toast.info("Không thể vô hiệu hóa tài khoản quản trị hệ thống.");
      return;
    }
    setDeletingUser(user);
  };

  const confirmDelete = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    try {
      await userService.deleteUser(deletingUser.userId);
      setUsers((prev) => prev.filter((item) => item.userId !== deletingUser.userId));
      toast.success("Đã vô hiệu hóa tài khoản thành công.");
      setDeletingUser(null);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Không thể vô hiệu hóa tài khoản"));
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmPermanentDelete = async () => {
    if (!permanentlyDeletingUser || !isStaffPage) return;
    setIsPermanentlyDeleting(true);
    try {
      await userService.permanentlyDeleteStaff(permanentlyDeletingUser.userId);
      setUsers((prev) =>
        prev.filter((item) => item.userId !== permanentlyDeletingUser.userId)
      );
      toast.success("Đã xóa vĩnh viễn nhân viên.");
      setPermanentlyDeletingUser(null);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Không thể xóa vĩnh viễn nhân viên"));
    } finally {
      setIsPermanentlyDeleting(false);
    }
  };

  const confirmRestore = async () => {
    if (!restoringUser) return;
    if (isProtectedAdminUser(restoringUser)) {
      toast.info(PROTECTED_ADMIN_MESSAGE);
      setRestoringUser(null);
      return;
    }
    setIsDeleting(true);
    try {
      await userService.updateStatus(restoringUser.userId, "ACTIVE");
      setUsers((prev) =>
        statusFilter === "DELETED"
          ? prev.filter((item) => item.userId !== restoringUser.userId)
          : prev.map((item) =>
              item.userId === restoringUser.userId ? { ...item, status: "ACTIVE" } : item
            )
      );
      toast.success("Đã khôi phục tài khoản về trạng thái hoạt động.");
      setRestoringUser(null);
      fetchUsers();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Không thể khôi phục tài khoản"));
    } finally {
      setIsDeleting(false);
    }
  };

  const pageTitle = isStaffPage ? "Quản lý nhân viên" : "Khách hàng & thành viên";
  const pageSubtitle = isStaffPage
    ? "Theo dõi tài khoản nội bộ, vai trò vận hành và trạng thái đăng nhập."
    : "Theo dõi hồ sơ khách hàng, trạng thái tài khoản và thông tin liên hệ.";

  return (
    <div style={{ flex: 1, overflow: "auto", background: "#F4F5F7", fontFamily: FONT }}>
      <div style={{ padding: "28px 32px 44px", minWidth: 980 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 20, marginBottom: 22 }}>
          <div>
            <div style={eyebrowStyle}>{isStaffPage ? "Workforce" : "Members"}</div>
            <h1 style={{ margin: 0, color: "#111827", fontSize: 28, fontWeight: 850, letterSpacing: "-0.03em" }}>
              {pageTitle}
            </h1>
            <p style={{ margin: "8px 0 0", color: "#6B7280", fontSize: 14 }}>{pageSubtitle}</p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button title="Làm mới" onClick={fetchUsers} disabled={loading} style={iconButtonStyle}>
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            </button>
            {isStaffPage && (
              <>
                <button
                  type="button"
                  onClick={openImport}
                  disabled={importing}
                  style={{
                    ...secondaryButtonStyle,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    opacity: importing ? 0.75 : 1,
                    cursor: importing ? "not-allowed" : "pointer",
                  }}
                >
                  {importing ? <Loader2 size={17} className="animate-spin" /> : <FileSpreadsheet size={17} />}
                  Nhập từ Google Sheet
                </button>
                <button onClick={openCreate} style={primaryButtonStyle}>
                  <Plus size={17} /> Thêm nhân viên
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14, marginBottom: 18 }}>
          <Metric icon={<Users size={18} />} label={isStaffPage ? "Tổng nhân sự" : "Tổng khách hàng"} value={stats.total} />
          <Metric icon={<CheckCircle2 size={18} />} label="Đang hoạt động" value={stats.active} tone="green" />
          <Metric icon={<Ban size={18} />} label="Bị khóa" value={stats.inactive} tone="gray" />
          <Metric icon={<ShieldCheck size={18} />} label={isStaffPage ? "Quản lý/Admin" : "Tài khoản thường"} value={isStaffPage ? stats.managers + stats.admins : stats.total} tone="blue" />
        </div>

        <div style={toolbarStyle}>
          <div style={{ position: "relative", flex: "1 1 340px" }}>
            <Search size={17} style={{ position: "absolute", left: 13, top: 12, color: "#9CA3AF" }} />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={isStaffPage ? "Tìm tên, email, số điện thoại, CCCD..." : "Tìm khách hàng..."}
              style={{ ...inputStyle, paddingLeft: 40 }}
            />
          </div>
          
          {isStaffPage && (
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} style={selectStyle}>
              <option value="ALL">Tất cả vai trò</option>
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          )}
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={selectStyle}>
            {STATUS_OPTIONS.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </div>

        <div style={tableWrapStyle}>
          <div style={{ ...tableGridStyle, background: "#F9FAFB", color: "#6B7280", fontSize: 12, fontWeight: 800, letterSpacing: "0.04em" }}>
            <div style={thStyle}>Tài khoản</div>
            <div style={thStyle}>Liên hệ</div>
            <div style={thStyle}>Vai trò</div>
            <div style={thStyle}>Trạng thái</div>
            <div style={thStyle}>Ngày tạo</div>
            <div style={{ ...thStyle, textAlign: "right" }}>Thao tác</div>
          </div>

          {loading ? (
            <EmptyState icon={<Loader2 size={24} className="animate-spin" />} title="Đang tải danh sách..." />
          ) : filteredUsers.length === 0 ? (
            <EmptyState icon={<UserRound size={28} />} title="Không có tài khoản phù hợp" />
          ) : (
            filteredUsers.map((user) => {
              const protectedAdmin = isProtectedAdminUser(user);
              const protectedTitle = "Tài khoản quản trị hệ thống được bảo vệ";
              return (
                <div key={user.userId} style={tableGridStyle}>
                  <div style={tdStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                      <Avatar user={user} />
                      <div style={{ minWidth: 0 }}>
                        <div style={nameStyle}>{user.fullName || user.username}</div>
                        <div style={mutedTextStyle}>@{user.username}</div>
                      </div>
                    </div>
                  </div>
                  <div style={tdStyle}>
                    <InfoLine icon={<Mail size={14} />} value={user.email || "Chưa có email"} />
                    <InfoLine icon={<Phone size={14} />} value={user.phoneNumber || "Chưa có số điện thoại"} />
                  </div>
                  <div style={tdStyle}>
                    <RoleBadge role={user.roleName} />
                  </div>
                  <div style={tdStyle}>
                    <StatusBadge status={user.status} />
                  </div>
                  <div style={tdStyle}>
                    <div style={{ color: "#111827", fontSize: 13, fontWeight: 700 }}>
                      {formatDate(user.createdAt)}
                    </div>
                    {user.hireDate && <div style={mutedTextStyle}>Vào làm {formatDate(user.hireDate)}</div>}
                  </div>
                  <div style={{ ...tdStyle, justifyContent: "flex-end", gap: 8 }}>
                    <ActionButton title={protectedAdmin ? protectedTitle : "Sửa"} onClick={() => openEdit(user)} color="#2563EB" disabled={protectedAdmin}>
                      <Edit3 size={16} />
                    </ActionButton>
                    {user.status !== "DELETED" && (
                      <ActionButton
                        title={protectedAdmin ? protectedTitle : user.status === "ACTIVE" ? "Tạm khóa" : "Mở khóa"}
                        onClick={() => handleToggleStatus(user)}
                        color="#D97706"
                        disabled={protectedAdmin}
                      >
                        {user.status === "ACTIVE" ? <Ban size={16} /> : <CheckCircle2 size={16} />}
                      </ActionButton>
                    )}
                    {user.status === "DELETED" ? (
                      <>
                        <ActionButton title={protectedAdmin ? protectedTitle : "Khôi phục tài khoản"} onClick={() => setRestoringUser(user)} color="#059669" disabled={protectedAdmin}>
                          <CheckCircle2 size={16} />
                        </ActionButton>
                        {isStaffPage && (
                          <ActionButton
                            title={protectedAdmin ? protectedTitle : "Xóa vĩnh viễn nhân viên"}
                            onClick={() => setPermanentlyDeletingUser(user)}
                            color="#B91C1C"
                            disabled={protectedAdmin}
                          >
                            <Trash2 size={16} />
                          </ActionButton>
                        )}
                      </>
                    ) : (
                      <ActionButton title={protectedAdmin ? protectedTitle : "Vô hiệu hóa tài khoản"} onClick={() => handleDelete(user)} color="#DC2626" disabled={protectedAdmin}>
                        <UserMinus size={16} />
                      </ActionButton>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {createOpen && isStaffPage && (
        <Drawer title="Thêm nhân viên" onClose={() => setCreateOpen(false)}>
          <form onSubmit={handleCreate} style={drawerFormStyle}>
            <SectionTitle icon={<UserRound size={16} />} title="Thông tin đăng nhập" />
            <Field label="Tên đăng nhập" required>
              <input required value={createForm.username} onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Email" required>
              <input required type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} style={inputStyle} />
            </Field>
            <div style={{ gridColumn: "span 2", color: "#6B7280", fontSize: 13, lineHeight: 1.5 }}>
              Hệ thống sẽ tự tạo mật khẩu tạm và gửi đến email nhân viên sau khi tạo tài khoản.
            </div>

            <SectionTitle icon={<IdCard size={16} />} title="Hồ sơ nhân viên" />
            <Field label="Họ tên" required>
              <input required value={createForm.fullName} onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Số điện thoại" required>
              <input required value={createForm.phoneNumber} onChange={(e) => setCreateForm({ ...createForm, phoneNumber: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="CCCD/CMND">
              <input value={createForm.identityCard} onChange={(e) => setCreateForm({ ...createForm, identityCard: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Giới tính">
              <select value={createForm.gender} onChange={(e) => setCreateForm({ ...createForm, gender: e.target.value })} style={selectFullStyle}>
                <option value="">Chưa chọn</option>
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </select>
            </Field>
            <Field label="Ngày sinh">
              <input type="date" value={createForm.dateOfBirth} onChange={(e) => setCreateForm({ ...createForm, dateOfBirth: e.target.value })} style={inputStyle} />
            </Field>
            {!isStaffPage && (
              <Field label="Mã hạng thành viên">
                <input
                  value={editForm.memberTier || ""}
                  onChange={(e) => setEditForm({ ...editForm, memberTier: e.target.value.toUpperCase() })}
                  style={inputStyle}
                  placeholder="Ví dụ: CLASSIC"
                />
              </Field>
            )}
            <Field label="Ngày vào làm" required>
              <input required type="date" value={createForm.hireDate} onChange={(e) => setCreateForm({ ...createForm, hireDate: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Địa chỉ" span={2}>
              <input value={createForm.address} onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Vai trò" span={2} required>
              <Segmented options={roleOptions} value={createForm.roleName} onChange={(roleName) => setCreateForm({ ...createForm, roleName })} />
            </Field>
            <DrawerActions loading={creating} submitLabel="Tạo nhân viên" onCancel={() => setCreateOpen(false)} />
          </form>
        </Drawer>
      )}

      {importOpen && isStaffPage && (
        <Drawer title="Nhập nhân viên từ Google Sheet" onClose={() => !importing && setImportOpen(false)}>
          <form onSubmit={handleImportGoogleSheet} style={drawerFormStyle}>
            <SectionTitle icon={<FileSpreadsheet size={16} />} title="Nguồn dữ liệu" />
            <div style={{ gridColumn: "span 2", ...importPanelStyle }}>
              <div style={{ width: 42, height: 42, borderRadius: 8, background: "#ECFDF5", color: "#059669", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <div style={{ color: "#111827", fontSize: 14, fontWeight: 850 }}>Google Form liên kết Google Sheet</div>
                <div style={{ color: "#6B7280", fontSize: 13, lineHeight: 1.5, marginTop: 4 }}>
                  Nếu để trống mã bảng tính và phạm vi, hệ thống sẽ dùng cấu hình mặc định.
                </div>
              </div>
            </div>

            <Field label="URL hoặc mã Google Sheet" span={2}>
              <input
                value={importForm.spreadsheetId || ""}
                onChange={(e) => {
                  setImportForm({ ...importForm, spreadsheetId: e.target.value });
                  setImportPreview(null);
                }}
                placeholder="Dán link Google Sheet hoặc để trống để dùng cấu hình mặc định"
                style={inputStyle}
              />
            </Field>
            <Field label="Range dữ liệu" span={2}>
              <input
                value={importForm.range || ""}
                onChange={(e) => {
                  setImportForm({ ...importForm, range: e.target.value });
                  setImportPreview(null);
                }}
                placeholder="Ví dụ: Câu trả lời biểu mẫu 1!A:K"
                style={inputStyle}
              />
            </Field>

            <SectionTitle icon={<ShieldCheck size={16} />} title="Đối tượng import" />
            <Field label="Vai trò mặc định" span={2} required>
              <Segmented
                options={roleOptions}
                value={importForm.defaultRoleName || "STAFF"}
                onChange={(defaultRoleName) => {
                  setImportForm({ ...importForm, defaultRoleName });
                  setImportPreview(null);
                }}
              />
            </Field>
            <div style={{ gridColumn: "span 2", color: "#6B7280", fontSize: 13, lineHeight: 1.5 }}>
              Vai trò này áp dụng cho các dòng không có cột Vai trò/Tên vai trò. Nếu bảng tính có cột vai trò, giá trị trong từng dòng sẽ được ưu tiên.
            </div>

            <div style={{ gridColumn: "span 2", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, paddingTop: 4 }}>
              <button type="button" onClick={handlePreviewImport} disabled={previewingImport || importing} style={{ ...secondaryButtonStyle, display: "inline-flex", alignItems: "center", gap: 8, opacity: previewingImport ? 0.75 : 1 }}>
                {previewingImport ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                Xem trước dữ liệu
              </button>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setImportOpen(false)} disabled={importing} style={secondaryButtonStyle}>Hủy</button>
                <button type="submit" disabled={importing || !importPreview || importPreview.validRows === 0} style={{ ...primaryButtonStyle, opacity: importing || !importPreview || importPreview.validRows === 0 ? 0.65 : 1, cursor: importing || !importPreview || importPreview.validRows === 0 ? "not-allowed" : "pointer" }}>
                  {importing && <Loader2 size={16} className="animate-spin" />} Import {importPreview?.validRows ? `${importPreview.validRows} dòng` : ""}
                </button>
              </div>
            </div>

            {importPreview && (
              <div style={{ gridColumn: "span 2", display: "grid", gap: 12 }}>
                <div style={importSummaryStyle}>
                  <div>
                    <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 850 }}>Danh sách xem trước</div>
                    <div style={{ color: "#111827", fontSize: 20, fontWeight: 900, marginTop: 4 }}>
                      {importPreview.validRows}/{importPreview.totalRows} dòng hợp lệ
                    </div>
                  </div>
                  <StatusBadge status={importPreview.invalidRows > 0 ? "INACTIVE" : "ACTIVE"} />
                </div>

                <div style={previewTableStyle}>
                  <div style={previewHeaderStyle}>
                    <div style={thStyle}>Dòng</div>
                    <div style={thStyle}>Nhân viên</div>
                    <div style={thStyle}>Liên hệ</div>
                    <div style={thStyle}>Vai trò</div>
                    <div style={thStyle}>Trạng thái</div>
                  </div>
                  {importPreview.rows.length === 0 ? (
                    <EmptyState icon={<FileSpreadsheet size={28} />} title="Chưa có dữ liệu nhân viên trong Sheet" />
                  ) : (
                    importPreview.rows.map((row) => (
                      <div key={row.row} style={previewRowStyle}>
                        <div style={tdStyle}>{row.row}</div>
                        <div style={tdStyle}>
                          <div style={nameStyle}>{row.fullName || row.username || "-"}</div>
                          <div style={mutedTextStyle}>@{row.username || "-"}</div>
                        </div>
                        <div style={tdStyle}>
                          <InfoLine icon={<Mail size={14} />} value={row.email || "Chưa có email"} />
                          <InfoLine icon={<Phone size={14} />} value={row.phoneNumber || "Chưa có số điện thoại"} />
                        </div>
                        <div style={tdStyle}>
                          <RoleBadge role={row.roleName || importForm.defaultRoleName || "STAFF"} />
                        </div>
                        <div style={tdStyle}>
                          {row.valid ? (
                            <StatusBadge status="ACTIVE" />
                          ) : (
                            <div style={{ color: "#B91C1C", fontSize: 12, fontWeight: 800, lineHeight: 1.4 }}>
                              {row.message || "Dòng không hợp lệ"}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </form>
        </Drawer>
      )}

      {importResult && isStaffPage && (
        <Drawer title="Kết quả nhập từ Google Sheet" onClose={() => setImportResult(null)}>
          <div style={{ display: "grid", gap: 18 }}>
            <div style={importSummaryStyle}>
              <div>
                <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 850 }}>Kết quả xử lý</div>
                <div style={{ color: "#111827", fontSize: 22, fontWeight: 900, marginTop: 4 }}>
                  {importResult.successCount}/{importResult.totalRows} dòng thành công
                </div>
              </div>
              <StatusBadge status={importResult.failedCount > 0 ? "INACTIVE" : "ACTIVE"} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
              <ImportStat label="Tổng dòng" value={importResult.totalRows} color="#2563EB" />
              <ImportStat label="Thành công" value={importResult.successCount} color="#059669" />
              <ImportStat label="Lỗi" value={importResult.failedCount} color="#DC2626" />
            </div>

            {importResult.errors.length > 0 ? (
              <div style={{ border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr 2fr", background: "#F9FAFB", color: "#6B7280", fontSize: 12, fontWeight: 850 }}>
                  <div style={thStyle}>Dòng</div>
                  <div style={thStyle}>Username</div>
                  <div style={thStyle}>Email</div>
                  <div style={thStyle}>Lỗi</div>
                </div>
                {importResult.errors.map((item, index) => (
                  <div key={`${item.row}-${index}`} style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr 2fr", borderTop: "1px solid #EEF2F7", fontSize: 13, color: "#374151" }}>
                    <div style={tdStyle}>{item.row}</div>
                    <div style={tdStyle}>{item.username || "-"}</div>
                    <div style={tdStyle}>{item.email || "-"}</div>
                    <div style={{ ...tdStyle, color: "#B91C1C", fontWeight: 700 }}>{item.message}</div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={<CheckCircle2 size={28} />} title="Không có dòng lỗi trong lần import này" />
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setImportResult(null)} style={primaryButtonStyle}>
                Đóng
              </button>
            </div>
          </div>
        </Drawer>
      )}

      {editingUser && (
        <Drawer title={`Cập nhật ${editingUser.username}`} onClose={() => setEditingUser(null)}>
          <form onSubmit={handleUpdate} style={drawerFormStyle}>
            <SectionTitle icon={<UserRound size={16} />} title="Hồ sơ" />
            <Field label="Họ tên">
              <input value={editForm.fullName || ""} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Số điện thoại">
              <input value={editForm.phoneNumber || ""} onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="CCCD/CMND">
              <input value={editForm.identityCard || ""} onChange={(e) => setEditForm({ ...editForm, identityCard: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Ngày sinh">
              <input type="date" value={editForm.dateOfBirth || ""} onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Giới tính">
              <select value={editForm.gender || ""} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })} style={selectFullStyle}>
                <option value="">Chưa chọn</option>
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </select>
            </Field>
            <Field label="Địa chỉ" span={2}>
              <input value={editForm.address || ""} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} style={inputStyle} />
            </Field>

            <SectionTitle icon={<ShieldCheck size={16} />} title="Tài khoản" />
            {isStaffPage && (
              <Field label="Vai trò" span={2}>
                <Segmented options={roleOptions} value={editForm.roleName || "STAFF"} onChange={(roleName) => setEditForm({ ...editForm, roleName })} />
              </Field>
            )}
            <Field label="Trạng thái" span={2}>
              <Segmented options={STATUS_OPTIONS} value={editForm.status || "ACTIVE"} onChange={(status) => setEditForm({ ...editForm, status })} />
            </Field>
            <DrawerActions loading={saving} submitLabel="Lưu thay đổi" onCancel={() => setEditingUser(null)} />
          </form>
        </Drawer>
      )}

      <ConfirmDialog
        open={!!deletingUser}
        title={`Vô hiệu hóa ${isStaffPage ? "nhân viên" : "khách hàng"}`}
        message={`Bạn có chắc chắn muốn vô hiệu hóa tài khoản "${deletingUser?.username}"? Tài khoản này sẽ không còn xuất hiện trong danh sách quản lý.`}
        confirmLabel="Vô hiệu hóa"
        cancelLabel="Hủy"
        loading={isDeleting}
        onConfirm={confirmDelete}
        onClose={() => setDeletingUser(null)}
      />

      <ConfirmDialog
        open={!!restoringUser}
        title={`Khôi phục ${isStaffPage ? "nhân viên" : "khách hàng"}`}
        message={`Bạn có muốn khôi phục tài khoản "${restoringUser?.username}" về trạng thái hoạt động không?`}
        confirmLabel="Khôi phục"
        cancelLabel="Hủy"
        loading={isDeleting}
        onConfirm={confirmRestore}
        onClose={() => setRestoringUser(null)}
      />

      <ConfirmDialog
        open={!!permanentlyDeletingUser}
        title="Xóa vĩnh viễn nhân viên"
        message={`Bạn có chắc chắn muốn xóa vĩnh viễn nhân viên "${permanentlyDeletingUser?.username}"? Hành động này không thể hoàn tác. Nếu tài khoản còn lịch sử đặt vé hoặc đánh giá, hệ thống sẽ từ chối để bảo toàn dữ liệu.`}
        confirmLabel="Xóa vĩnh viễn"
        cancelLabel="Hủy"
        loading={isPermanentlyDeleting}
        onConfirm={confirmPermanentDelete}
        onClose={() => setPermanentlyDeletingUser(null)}
      />
    </div>
  );
}

function normalizeSpreadsheetId(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const match = trimmed.match(/\/spreadsheets\/d\/([^/]+)/);
  return match?.[1] || trimmed;
}

function Metric({ icon, label, value, tone = "red" }: { icon: ReactNode; label: string; value: number; tone?: "red" | "green" | "gray" | "blue" }) {
  const color = { red: "#E63946", green: "#059669", gray: "#64748B", blue: "#2563EB" }[tone];
  return (
    <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color, fontSize: 12, fontWeight: 800, letterSpacing: "0.04em" }}>
        {icon} {label}
      </div>
      <div style={{ color: "#111827", fontSize: 26, fontWeight: 850, marginTop: 8 }}>{value}</div>
    </div>
  );
}

function ImportStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ border: "1px solid #E5E7EB", borderRadius: 8, background: "#fff", padding: "14px 16px" }}>
      <div style={{ color: "#6B7280", fontSize: 12, fontWeight: 850 }}>{label}</div>
      <div style={{ color, fontSize: 24, fontWeight: 900, marginTop: 6 }}>{value}</div>
    </div>
  );
}

function Avatar({ user }: { user: UserDetailResponse }) {
  const initial = (user.fullName || user.username || "?").trim().charAt(0).toUpperCase();
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt="" style={avatarStyle} />;
  }
  return <div style={avatarStyle}>{initial}</div>;
}

function InfoLine({ icon, value }: { icon: ReactNode; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#6B7280", fontSize: 13, lineHeight: 1.6, minWidth: 0 }}>
      <span style={{ color: "#9CA3AF", flexShrink: 0 }}>{icon}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { label: string; bg: string; color: string }> = {
    ADMIN: { label: "Quản trị", bg: "#FEF2F2", color: "#DC2626" },
    MANAGER: { label: "Quản lý", bg: "#EFF6FF", color: "#2563EB" },
    STAFF: { label: "Nhân viên", bg: "#F5F3FF", color: "#7C3AED" },
    CUSTOMER: { label: "Khách hàng", bg: "#ECFDF5", color: "#059669" },
    GUEST: { label: "Khách vãng lai", bg: "#F3F4F6", color: "#6B7280" },
  };
  const item = config[role] || { label: role, bg: "#F3F4F6", color: "#374151" };
  return <span style={{ ...badgeBaseStyle, background: item.bg, color: item.color }}>{item.label}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; bg: string; color: string }> = {
    ACTIVE: { label: "Hoạt động", bg: "#ECFDF5", color: "#059669" },
    INACTIVE: { label: "Tạm khóa", bg: "#F3F4F6", color: "#6B7280" },
    BANNED: { label: "Cấm", bg: "#FEF2F2", color: "#DC2626" },
    DELETED: { label: "Đã vô hiệu hóa", bg: "#FFF1F2", color: "#BE123C" },
  };
  const item = config[status] || config.INACTIVE;
  return <span style={{ ...badgeBaseStyle, background: item.bg, color: item.color }}>{item.label}</span>;
}

function ActionButton({ title, color, disabled, onClick, children }: { title: string; color: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button title={title} onClick={onClick} disabled={disabled} style={{ ...actionButtonStyle, color: disabled ? "#9CA3AF" : color, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1 }}>
      {children}
    </button>
  );
}

function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(17,24,39,0.45)", zIndex: 60, display: "flex", justifyContent: "flex-end" }} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div style={{ width: "min(720px, 100%)", background: "#fff", height: "100%", boxShadow: "-20px 0 50px rgba(15,23,42,0.18)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 850, color: "#111827" }}>{title}</h2>
          <button title="Đóng" type="button" onClick={onClose} style={iconButtonStyle}><X size={18} /></button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, required, span = 1, children }: { label: string; required?: boolean; span?: 1 | 2; children: ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 7, gridColumn: span === 2 ? "span 2" : undefined }}>
      <span style={{ color: "#374151", fontSize: 13, fontWeight: 800 }}>
        {label} {required && <span style={{ color: "#E63946" }}>*</span>}
      </span>
      {children}
    </label>
  );
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div style={{ gridColumn: "span 2", display: "flex", alignItems: "center", gap: 8, color: "#111827", fontSize: 14, fontWeight: 850, paddingTop: 4 }}>
      <span style={{ color: "#E63946" }}>{icon}</span> {title}
    </div>
  );
}

function Segmented({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (value: string) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`, gap: 8 }}>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button key={option.value} type="button" onClick={() => onChange(option.value)} style={{ height: 38, borderRadius: 8, border: selected ? "1px solid #E63946" : "1px solid #D1D5DB", background: selected ? "#FEF2F2" : "#fff", color: selected ? "#C1121F" : "#374151", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function DrawerActions({ loading, submitLabel, onCancel }: { loading: boolean; submitLabel: string; onCancel: () => void }) {
  return (
    <div style={{ gridColumn: "span 2", display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 8 }}>
      <button type="button" onClick={onCancel} disabled={loading} style={secondaryButtonStyle}>Hủy</button>
      <button type="submit" disabled={loading} style={{ ...primaryButtonStyle, opacity: loading ? 0.75 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
        {loading && <Loader2 size={16} className="animate-spin" />} {submitLabel}
      </button>
    </div>
  );
}

function EmptyState({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div style={{ padding: 52, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#6B7280", gap: 10 }}>
      <div style={{ color: "#9CA3AF" }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 800 }}>{title}</div>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("vi-VN");
}

const eyebrowStyle: CSSProperties = {
  color: "#E63946",
  fontSize: 12,
  fontWeight: 850,
  letterSpacing: "0.06em",
  marginBottom: 8,
};

const toolbarStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  marginBottom: 18,
  alignItems: "center",
  flexWrap: "wrap",
};

const inputStyle: CSSProperties = {
  width: "100%",
  height: 42,
  borderRadius: 8,
  border: "1px solid #D1D5DB",
  background: "#fff",
  padding: "0 12px",
  outline: "none",
  fontSize: 14,
  color: "#111827",
  boxSizing: "border-box",
  fontFamily: FONT,
};

const selectStyle: CSSProperties = {
  ...inputStyle,
  width: 190,
  cursor: "pointer",
};

const selectFullStyle: CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
};

const tableWrapStyle: CSSProperties = {
  background: "#fff",
  border: "1px solid #E5E7EB",
  borderRadius: 8,
  overflow: "hidden",
};

const tableGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(240px, 1.25fr) minmax(220px, 1.05fr) 130px 130px 130px 138px",
  alignItems: "center",
  borderBottom: "1px solid #F1F5F9",
};

const thStyle: CSSProperties = {
  padding: "12px 16px",
};

const tdStyle: CSSProperties = {
  padding: "14px 16px",
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
};

const avatarStyle: CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 8,
  background: "#111827",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 850,
  objectFit: "cover",
  flexShrink: 0,
};

const nameStyle: CSSProperties = {
  color: "#111827",
  fontSize: 14,
  fontWeight: 850,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const mutedTextStyle: CSSProperties = {
  color: "#6B7280",
  fontSize: 12,
  marginTop: 3,
};

const badgeBaseStyle: CSSProperties = {
  height: 26,
  padding: "0 10px",
  borderRadius: 999,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  fontWeight: 850,
  width: "fit-content",
};

const primaryButtonStyle: CSSProperties = {
  height: 42,
  padding: "0 16px",
  borderRadius: 8,
  border: "none",
  background: "#E63946",
  color: "#fff",
  fontSize: 14,
  fontWeight: 850,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  fontFamily: FONT,
};

const secondaryButtonStyle: CSSProperties = {
  height: 42,
  padding: "0 16px",
  borderRadius: 8,
  border: "1px solid #D1D5DB",
  background: "#fff",
  color: "#374151",
  fontSize: 14,
  fontWeight: 850,
  cursor: "pointer",
  fontFamily: FONT,
};

const importPanelStyle: CSSProperties = {
  border: "1px solid #D1FAE5",
  borderRadius: 8,
  background: "#F0FDF4",
  padding: 16,
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
};

const importSummaryStyle: CSSProperties = {
  border: "1px solid #E5E7EB",
  borderRadius: 8,
  background: "#F9FAFB",
  padding: "16px 18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
};

const previewTableStyle: CSSProperties = {
  border: "1px solid #E5E7EB",
  borderRadius: 8,
  overflow: "hidden",
  background: "#fff",
};

const previewHeaderStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "70px 1.25fr 1.35fr 110px 1fr",
  background: "#F9FAFB",
  color: "#6B7280",
  fontSize: 12,
  fontWeight: 850,
};

const previewRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "70px 1.25fr 1.35fr 110px 1fr",
  borderTop: "1px solid #EEF2F7",
  minHeight: 74,
};

const iconButtonStyle: CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 8,
  border: "1px solid #D1D5DB",
  background: "#fff",
  color: "#374151",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const actionButtonStyle: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 8,
  border: "1px solid #E5E7EB",
  background: "#fff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const drawerFormStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 16,
};
