import { useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import {
  Bell,
  Check,
  Download,
  Eye,
  Keyboard,
  LayoutPanelLeft,
  MonitorCog,
  Palette,
  RotateCcw,
  Search,
  Settings2,
  Upload,
  Volume2,
} from "lucide-react";
import { toast } from "react-toastify";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  DEFAULT_DASHBOARD_PREFERENCES,
  getDashboardSearchHistoryKey,
  useDashboardPreferences,
  type DashboardPreferences,
} from "@/hooks/useDashboardPreferences";
import { DASHBOARD_PAGE_ACCESS, canAccessDashboardPage } from "@/utils/dashboardAccess";

const FONT = "'Inter', sans-serif";
const ACCENTS = ["#f59e0b", "#2563eb", "#7c3aed", "#059669", "#e11d48", "#0f766e"];

function Section({ icon: Icon, title, description, children }: { icon: typeof Settings2; title: string; description: string; children: ReactNode }) {
  return (
    <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 12, padding: "18px 20px", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center", background: "#f8fafc", border: "1px solid #e2e8f0", flexShrink: 0 }}>
          <Icon size={18} color="#475569" />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 15, color: "#0f172a" }}>{title}</h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{description}</p>
        </div>
      </div>
      <div style={{ padding: "4px 20px" }}>{children}</div>
    </section>
  );
}

function SettingRow({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div style={{ minHeight: 76, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, borderBottom: "1px solid #f1f5f9", padding: "12px 0" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{title}</div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, lineHeight: 1.45 }}>{description}</div>
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{ width: 44, height: 24, padding: 2, border: "none", borderRadius: 999, background: checked ? "var(--dashboard-accent, #f59e0b)" : "#cbd5e1", cursor: "pointer", transition: "background .18s" }}
    >
      <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", display: "block", transform: checked ? "translateX(20px)" : "translateX(0)", transition: "transform .18s", boxShadow: "0 1px 4px rgba(15,23,42,.25)" }} />
    </button>
  );
}

const selectStyle = { minWidth: 150, height: 38, borderRadius: 9, border: "1px solid #cbd5e1", background: "#fff", color: "#334155", padding: "0 10px", fontSize: 12, fontWeight: 600, outline: "none" } as const;

export function DashboardSettingsPage() {
  const { username, roles, scopes } = useCurrentUser();
  const { preferences, updatePreferences, replacePreferences, resetPreferences } = useDashboardPreferences(username);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );
  const accessiblePages = useMemo(() => Object.keys(DASHBOARD_PAGE_ACCESS).filter((page) => canAccessDashboardPage(page, roles, scopes)), [roles, scopes]);

  const update = <K extends keyof DashboardPreferences>(key: K, value: DashboardPreferences[K]) => {
    updatePreferences({ [key]: value });
  };

  const toggleDesktopNotifications = async (enabled: boolean) => {
    if (!enabled) {
      update("desktopNotifications", false);
      return;
    }
    if (typeof Notification === "undefined") {
      setBrowserPermission("unsupported");
      toast.error("Trình duyệt này không hỗ trợ thông báo hệ thống.");
      return;
    }
    const permission = await Notification.requestPermission();
    setBrowserPermission(permission);
    if (permission === "granted") update("desktopNotifications", true);
    else {
      update("desktopNotifications", false);
      toast.info("Hãy cấp quyền thông báo trong cài đặt trình duyệt nếu muốn bật chức năng này.");
    }
  };

  const exportSettings = () => {
    const blob = new Blob([JSON.stringify({ version: 1, preferences }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `magi-dashboard-settings-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Đã xuất cấu hình dashboard.");
  };

  const importSettings = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as { preferences?: Partial<DashboardPreferences> } | Partial<DashboardPreferences>;
      const imported = "preferences" in parsed ? parsed.preferences : parsed;
      if (!imported || typeof imported !== "object") throw new Error("invalid");
      replacePreferences({ ...DEFAULT_DASHBOARD_PREFERENCES, ...imported });
      toast.success("Đã nhập và áp dụng cấu hình.");
    } catch {
      toast.error("Tệp cấu hình không hợp lệ.");
    }
  };

  return (
    <main style={{ flex: 1, overflowY: "auto", background: "#f6f7f9", padding: "28px 32px 44px", fontFamily: FONT }}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, marginBottom: 22 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Settings2 size={22} color={preferences.accentColor} />
              <h1 style={{ margin: 0, color: "#0f172a", fontSize: 24, letterSpacing: "-.02em" }}>Cài đặt dashboard</h1>
            </div>
            <p style={{ margin: "7px 0 0", color: "#64748b", fontSize: 13 }}>Tùy chỉnh được lưu riêng trên trình duyệt cho tài khoản <strong>{username}</strong> và áp dụng ngay.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#047857", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: 999, padding: "7px 11px", fontSize: 11, fontWeight: 700 }}>
            <Check size={14} /> Tự động lưu
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 18 }}>
          <Section icon={Palette} title="Giao diện" description="Điều chỉnh cách dashboard hiển thị trên máy đang dùng.">
            <SettingRow title="Màu nhấn" description="Áp dụng cho menu, nút trạng thái và các thành phần chính.">
              <div style={{ display: "flex", gap: 7 }}>
                {ACCENTS.map((color) => <button key={color} type="button" aria-label={`Chọn màu ${color}`} onClick={() => update("accentColor", color)} style={{ width: 27, height: 27, borderRadius: "50%", background: color, border: preferences.accentColor === color ? "3px solid #fff" : "2px solid #fff", outline: preferences.accentColor === color ? `2px solid ${color}` : "1px solid #cbd5e1", cursor: "pointer" }} />)}
              </div>
            </SettingRow>
            <SettingRow title="Thu gọn thanh menu" description="Chỉ hiển thị biểu tượng để dành thêm diện tích cho dữ liệu."><Toggle label="Thu gọn thanh menu" checked={preferences.compactSidebar} onChange={(value) => update("compactSidebar", value)} /></SettingRow>
            <SettingRow title="Header gọn" description="Giảm chiều cao thanh công cụ từ 72px xuống 60px."><Toggle label="Header gọn" checked={preferences.compactHeader} onChange={(value) => update("compactHeader", value)} /></SettingRow>
            <SettingRow title="Giảm hiệu ứng chuyển động" description="Phù hợp máy cấu hình thấp hoặc người nhạy cảm với chuyển động."><Toggle label="Giảm hiệu ứng" checked={preferences.reduceMotion} onChange={(value) => update("reduceMotion", value)} /></SettingRow>
          </Section>

          <Section icon={LayoutPanelLeft} title="Điều hướng" description="Chọn trang bắt đầu và cách truy cập nhanh chức năng.">
            <SettingRow title="Trang mở mặc định" description="Được sử dụng ở lần tiếp theo khi mở dashboard.">
              <select value={preferences.defaultPage} onChange={(event) => update("defaultPage", event.target.value)} style={selectStyle}>
                {accessiblePages.map((page) => <option key={page}>{page}</option>)}
              </select>
            </SettingRow>
            <SettingRow title="Phím tắt tìm kiếm" description="Nhấn Ctrl + K hoặc Command + K để tìm từ mọi trang."><Toggle label="Phím tắt tìm kiếm" checked={preferences.enableSearchShortcut} onChange={(value) => update("enableSearchShortcut", value)} /></SettingRow>
            <SettingRow title="Lịch sử tìm kiếm" description="Hiển thị tối đa 5 thao tác vừa mở khi ô tìm kiếm trống."><Toggle label="Lịch sử tìm kiếm" checked={preferences.showSearchHistory} onChange={(value) => update("showSearchHistory", value)} /></SettingRow>
            <SettingRow title="Số kết quả" description="Giới hạn số mục xuất hiện trong bảng tìm kiếm.">
              <select value={preferences.maxSearchResults} onChange={(event) => update("maxSearchResults", Number(event.target.value))} style={selectStyle}>
                <option value={5}>5 kết quả</option><option value={8}>8 kết quả</option><option value={12}>12 kết quả</option>
              </select>
            </SettingRow>
          </Section>

          <Section icon={Bell} title="Thông báo" description="Kiểm soát tần suất đồng bộ và cách nhận cảnh báo vận hành.">
            <SettingRow title="Tự động làm mới" description="Chu kỳ kiểm tra thông báo mới từ máy chủ.">
              <select value={preferences.notificationRefreshSeconds} onChange={(event) => update("notificationRefreshSeconds", Number(event.target.value))} style={selectStyle}>
                <option value={0}>Tắt tự động</option><option value={15}>Mỗi 15 giây</option><option value={30}>Mỗi 30 giây</option><option value={60}>Mỗi 1 phút</option><option value={300}>Mỗi 5 phút</option>
              </select>
            </SettingRow>
            <SettingRow title="Mặc định chỉ hiện chưa đọc" description="Mở trung tâm thông báo ở bộ lọc chưa đọc."><Toggle label="Chỉ hiện chưa đọc" checked={preferences.notificationUnreadOnly} onChange={(value) => update("notificationUnreadOnly", value)} /></SettingRow>
            <SettingRow title="Âm báo" description="Phát âm thanh ngắn khi máy chủ trả về thông báo mới."><Toggle label="Âm báo" checked={preferences.notificationSound} onChange={(value) => update("notificationSound", value)} /></SettingRow>
            <SettingRow title="Thông báo trình duyệt" description={browserPermission === "denied" ? "Trình duyệt đang chặn quyền này." : "Hiện cảnh báo hệ thống khi dashboard đang mở nền."}><Toggle label="Thông báo trình duyệt" checked={preferences.desktopNotifications && browserPermission === "granted"} onChange={toggleDesktopNotifications} /></SettingRow>
            <SettingRow title="Định dạng thời gian" description="Hiển thị thời điểm tuyệt đối hoặc dạng “5 phút trước”.">
              <select value={preferences.notificationTimeFormat} onChange={(event) => update("notificationTimeFormat", event.target.value as "relative" | "absolute")} style={selectStyle}>
                <option value="relative">Thời gian tương đối</option><option value="absolute">Ngày giờ đầy đủ</option>
              </select>
            </SettingRow>
          </Section>

          <Section icon={MonitorCog} title="Dữ liệu cấu hình" description="Sao lưu, chuyển sang máy khác hoặc khôi phục thiết lập ban đầu.">
            <SettingRow title="Xóa lịch sử tìm kiếm" description="Không ảnh hưởng dữ liệu nghiệp vụ hoặc lịch sử nhân viên.">
              <button type="button" onClick={() => { localStorage.removeItem(getDashboardSearchHistoryKey(username)); toast.success("Đã xóa lịch sử tìm kiếm."); }} style={{ ...selectStyle, minWidth: 120, cursor: "pointer" }}><Search size={14} style={{ display: "inline", marginRight: 6 }} />Xóa lịch sử</button>
            </SettingRow>
            <SettingRow title="Xuất cấu hình" description="Tải tệp JSON để sao lưu các lựa chọn cá nhân.">
              <button type="button" onClick={exportSettings} style={{ ...selectStyle, minWidth: 120, cursor: "pointer" }}><Download size={14} style={{ display: "inline", marginRight: 6 }} />Xuất tệp</button>
            </SettingRow>
            <SettingRow title="Nhập cấu hình" description="Áp dụng cấu hình dashboard từ một tệp đã xuất.">
              <><input ref={importInputRef} type="file" accept="application/json,.json" onChange={importSettings} hidden /><button type="button" onClick={() => importInputRef.current?.click()} style={{ ...selectStyle, minWidth: 120, cursor: "pointer" }}><Upload size={14} style={{ display: "inline", marginRight: 6 }} />Nhập tệp</button></>
            </SettingRow>
            <SettingRow title="Khôi phục mặc định" description="Đưa toàn bộ tùy chỉnh dashboard về trạng thái ban đầu.">
              <button type="button" onClick={() => { resetPreferences(); toast.success("Đã khôi phục cài đặt mặc định."); }} style={{ ...selectStyle, minWidth: 120, cursor: "pointer", color: "#b91c1c", borderColor: "#fecaca", background: "#fff7f7" }}><RotateCcw size={14} style={{ display: "inline", marginRight: 6 }} />Khôi phục</button>
            </SettingRow>
          </Section>
        </div>

        <div style={{ marginTop: 18, padding: "14px 18px", borderRadius: 12, border: "1px solid #dbeafe", background: "#eff6ff", display: "flex", alignItems: "center", gap: 12, color: "#1e40af", fontSize: 12 }}>
          <Eye size={17} /><span>Thay đổi giao diện, phím tắt và thông báo có hiệu lực ngay. Trang mở mặc định được áp dụng ở lần mở dashboard kế tiếp.</span>
          <Keyboard size={17} style={{ marginLeft: "auto" }} /><Volume2 size={17} />
        </div>
      </div>
    </main>
  );
}
