import {
  LayoutDashboard,
  Film,
  Clock,
  Ticket,
  Users,
  Tag,
  UserCog,
  BarChart2,
  Settings,
  Shield,
  LogOut,
  Clapperboard,
  MonitorPlay,
  Home,
  Popcorn,
  ShoppingCart,
  BadgeDollarSign,
  Crown,
  Globe2,
  MessageSquare,
  FileText,
  Music2,
} from "lucide-react";
import { clearAuthToken } from "@/utils/authSession";
import { useNavigate } from "react-router-dom";
import { authService } from "@/api/authApi";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { canAccessDashboardPage } from "@/utils/dashboardAccess";
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";

const NAV_GROUPS = [
  {
    group: "Chính",
    items: [
      { icon: LayoutDashboard, label: "Tổng quan" },
      { icon: BarChart2,       label: "Báo cáo & thống kê" },
    ],
  },
  {
    group: "Phim & rạp",
    items: [
      { icon: Film,            label: "Quản lý phim" },
      { icon: Clapperboard,    label: "Thể loại" },
      { icon: MonitorPlay,     label: "Phòng chiếu" },
      { icon: Clock,           label: "Lịch chiếu & ghế" },
      { icon: BadgeDollarSign, label: "Cấu hình giá vé" },
    ],
  },
  {
    group: "Khách hàng & bán hàng",
    items: [
      { icon: ShoppingCart,    label: "Bán vé tại quầy" },
      { icon: Popcorn,         label: "Bán bắp nước tại quầy" },
      { icon: BadgeDollarSign, label: "Ca thu ngân & đối soát" },
      { icon: Globe2,          label: "Đặt vé online" },
      { icon: Ticket,          label: "Đặt vé tại quầy" },
      { icon: Popcorn,         label: "Combo & bắp nước" },
      { icon: Users,           label: "Khách hàng & thành viên" },
      { icon: Crown,           label: "Hội viên" },
      { icon: Tag,             label: "Khuyến mãi" },
      { icon: MessageSquare,   label: "Góp ý & phản hồi" },
    ],
  },
  {
    group: "Hệ thống",
    items: [
      { icon: UserCog,         label: "Nhân viên" },
      { icon: Music2,          label: "Cloudinary Audio Lab" },
      { icon: Clock,           label: "Lịch ca & chấm công" },
      { icon: FileText,        label: "Nhật ký nhân viên" },
      { icon: Shield,          label: "Vai trò & quyền hạn" },
      { icon: Settings,        label: "Cài đặt" },
    ],
  },
];

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const navigate = useNavigate();
  const { username, initials, roleLabel, roles, scopes, avatarUrl } = useCurrentUser();
  const { preferences } = useDashboardPreferences(username);
  const compact = preferences.compactSidebar;
  const accent = preferences.accentColor;
  const visibleGroups = NAV_GROUPS
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessDashboardPage(item.label, roles, scopes)),
    }))
    .filter((group) => group.items.length > 0);

  const handleLogout = async () => {
    try {
      await Promise.race([
        authService.logout(),
        new Promise((resolve) => setTimeout(resolve, 1000)),
      ]);
    } catch {
      // Ignore errors on logout API
    } finally {
      clearAuthToken();
      navigate("/");
    }
  };

  return (
    <aside
      style={{
        width: compact ? 76 : 240,
        minWidth: compact ? 76 : 240,
        background: "#111318",
        fontFamily: "Inter, sans-serif",
        transition: preferences.reduceMotion ? "none" : "width 0.2s ease, min-width 0.2s ease",
      }}
      className="flex flex-col h-full"
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 py-5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", paddingLeft: compact ? 20 : 20, paddingRight: compact ? 20 : 20 }}
      >
        <div
          style={{ width: 36, height: 36, background: "linear-gradient(135deg, #4B5563, #374151)", borderRadius: 12, boxShadow: "0 4px 12px rgba(75,85,99,0.3)" }}
          className="flex items-center justify-center flex-shrink-0"
        >
          <Film size={18} color="#fff" />
        </div>
        {!compact && <div>
          <div style={{ color: "#FFFFFF", fontSize: 16, fontWeight: 800, letterSpacing: "-0.01em" }}>
            Magi <span style={{ color: "#9CA3AF" }}>Cinema</span>
          </div>
          <div style={{ color: "#8A8A9A", fontSize: 11 }}>Hệ thống quản lý</div>
        </div>}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto no-scrollbar" style={{ paddingLeft: compact ? 10 : 12, paddingRight: compact ? 10 : 12 }}>
        {visibleGroups.map((group, groupIdx) => (
          <div key={group.group} style={{ marginBottom: groupIdx === visibleGroups.length - 1 ? 0 : 20 }}>
            {!compact && <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#6B7280",
                letterSpacing: "0.05em",
                marginBottom: 8,
                paddingLeft: 12,
              }}
            >
              {group.group}
            </div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {group.items.map(({ icon: Icon, label }) => {
                const active = activePage === label;
                return (
                  <button
                    key={label}
                    onClick={() => onNavigate(label)}
                    title={compact ? label : undefined}
                    aria-label={label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: compact ? 0 : 12,
                      width: "100%",
                      height: 42,
                      paddingLeft: compact ? 0 : 12,
                      paddingRight: compact ? 0 : 12,
                      justifyContent: compact ? "center" : "flex-start",
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                      background: active ? accent : "transparent",
                      color: active ? "#FFFFFF" : "#8A8A9A",
                      fontSize: 14,
                      fontWeight: active ? 600 : 500,
                      textAlign: "left",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = `${accent}18`;
                        e.currentTarget.style.color = accent;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "#8A8A9A";
                      }
                    }}
                  >
                    <Icon size={18} style={{ flexShrink: 0, opacity: active ? 1 : 0.8 }} />
                    {!compact && <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {label}
                    </span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User + Logout */}
      <div
        className="flex items-center gap-3 py-4"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingLeft: compact ? 14 : 16, paddingRight: compact ? 14 : 16, justifyContent: compact ? "center" : "flex-start" }}
      >
        {!compact && <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${accent}, #b45309)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(245,158,11,0.3)"
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                 onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "https://ui-avatars.com/api/?name=" + (username || "U") + "&background=f59e0b&color=fff";
                 }} />
          ) : (
            initials
          )}
        </div>}
        {!compact && <div className="flex-1 min-w-0">
          <div style={{ color: "#FFFFFF", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {username}
          </div>
          <div style={{ color: "#8A8A9A", fontSize: 11 }}>{roleLabel}</div>
        </div>}
        {!compact && <button
          onClick={() => navigate("/")}
          title="Trang chủ"
          style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 6, color: "#8A8A9A", transition: "color 0.15s" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#8A8A9A")}
        >
          <Home size={16} />
        </button>}
        <button
          onClick={handleLogout}
          title="Đăng xuất"
          style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 6, color: "#8A8A9A", transition: "color 0.15s" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = accent)}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#8A8A9A")}
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
