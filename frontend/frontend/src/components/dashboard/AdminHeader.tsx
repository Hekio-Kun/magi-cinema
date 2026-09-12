import { useState, useEffect } from "react";
import { Search, Bell, Package, UserPlus, AlertTriangle } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { notificationService, type DashboardNotification } from "@/api/notificationApi";
import { DASHBOARD_PAGE_ACCESS, canAccessDashboardPage, normalizeRoles } from "@/utils/dashboardAccess";
import { ChevronRight } from "lucide-react";

const FONT = "'Inter', sans-serif";
const GOLD = "#f59e0b";

function getNotificationStyle(type: string) {
  if (type === "STAFF_IMPORT") {
    return {
      icon: UserPlus,
      color: "#059669",
      bg: "rgba(5,150,105,0.1)",
    };
  }
  if (type === "STOCK") {
    return {
      icon: Package,
      color: "#3b82f6",
      bg: "rgba(59,130,246,0.1)",
    };
  }
  return {
    icon: AlertTriangle,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
  };
}

function formatRelativeTime(value?: string) {
  if (!value) return "Vừa xong";
  const created = new Date(value).getTime();
  if (Number.isNaN(created)) return "Vừa xong";
  const diffMs = Date.now() - created;
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

interface AdminHeaderProps {
  activePage?: string;
  onNavigate?: (page: string) => void;
}

export function AdminHeader({ activePage = "Tổng quan", onNavigate }: AdminHeaderProps) {
  const { username, roles, scopes } = useCurrentUser();
  const [showNotifs, setShowNotifs] = useState(false);
  const [search, setSearch] = useState("");
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchFocused, setSearchFocused] = useState(false);

  const accessiblePages = Object.keys(DASHBOARD_PAGE_ACCESS).filter((page) =>
    canAccessDashboardPage(page, normalizeRoles(username ? roles : []), username ? scopes : [])
  );
  
  const searchResults = search.trim() ? accessiblePages.filter(p => p.toLowerCase().includes(search.toLowerCase())) : [];

  useEffect(() => {
    let active = true;
    const fetchNotifications = () => {
      notificationService.getDashboardNotifications(10)
        .then((data) => {
          if (!active) return;
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        })
        .catch(() => {
          if (!active) return;
          setNotifications([]);
          setUnreadCount(0);
        });
    };

    fetchNotifications();
    const timer = window.setInterval(fetchNotifications, 30000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((item) => ({ ...item, unread: false })));
    } catch {
      // Header notifications should not interrupt dashboard workflows.
    }
  };

  return (
    <header
      style={{
        height: 72,
        background: "#FFFFFF",
        borderBottom: "1px solid #E5E7EB",
        display: "flex",
        alignItems: "center",
        paddingLeft: 24,
        paddingRight: 24,
        gap: 20,
        fontFamily: FONT,
        flexShrink: 0,
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ color: "#1A1A2E", fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>
          {activePage}
        </div>
        <div style={{ fontSize: 11, color: "#6B7280", fontWeight: 500 }}>
          Hệ thống quản lý MagiCinema
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Search */}
      <div
        style={{
          width: 360,
          height: 40,
          borderRadius: 10,
          border: "1px solid #E2E8F0",
          background: "#F8FAFC",
          display: "flex",
          alignItems: "center",
          paddingLeft: 14,
          paddingRight: 14,
          gap: 10,
          transition: "all 0.2s",
        }}
        onFocusCapture={(e) => {
          e.currentTarget.style.borderColor = GOLD;
          e.currentTarget.style.boxShadow = `0 0 0 3px rgba(245,158,11,0.12)`;
          e.currentTarget.style.background = "#fff";
          setSearchFocused(true);
        }}
        onBlurCapture={(e) => {
          e.currentTarget.style.borderColor = "#E2E8F0";
          e.currentTarget.style.boxShadow = "none";
          e.currentTarget.style.background = "#F8FAFC";
          // Delay hiding dropdown so click events can fire
          setTimeout(() => setSearchFocused(false), 200);
        }}
      >
        <Search size={16} color="#94A3B8" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm phim, đặt vé, khách hàng..."
          style={{
            flex: 1,
            border: "none",
            background: "transparent",
            outline: "none",
            fontSize: 13,
            color: "#1E293B",
          }}
        />

        {/* Global Search Dropdown */}
        {searchFocused && search.trim() !== "" && (
          <div style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 8,
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            border: "1px solid #E2E8F0",
            zIndex: 100,
            maxHeight: 300,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "8px 0"
          }}>
            {searchResults.length > 0 ? (
              searchResults.map((page) => (
                <div
                  key={page}
                  onClick={() => {
                    if (onNavigate) onNavigate(page);
                    setSearch("");
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#F8FAFC"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  style={{
                    padding: "10px 16px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    transition: "background 0.2s"
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#1E293B" }}>{page}</span>
                  <ChevronRight size={14} color="#94A3B8" />
                </div>
              ))
            ) : (
              <div style={{ padding: "12px 16px", textAlign: "center", fontSize: 13, color: "#64748B" }}>
                Không tìm thấy kết quả.
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>

        {/* Notifications */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              border: "1px solid #E2E8F0",
              background: showNotifs ? "rgba(245,158,11,0.1)" : "#F8FAFC",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
            }}
          >
            <Bell size={18} color={showNotifs ? GOLD : "#64748B"} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -2,
                  right: -2,
                  width: 18,
                  height: 18,
                  background: "#EF4444",
                  borderRadius: "50%",
                  border: "2px solid #fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 800,
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 50,
                width: 320,
                background: "#fff",
                border: "1px solid #E2E8F0",
                borderRadius: 12,
                boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                zIndex: 100,
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Thông báo</span>
                <button type="button" onClick={handleMarkAllAsRead} style={{ border: "none", background: "transparent", fontSize: 11, color: GOLD, fontWeight: 600, cursor: "pointer" }}>Đánh dấu đã đọc</button>
              </div>
              <div style={{ maxHeight: 300, overflowY: "auto" }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: "28px 16px", textAlign: "center", color: "#64748B", fontSize: 12, fontWeight: 600 }}>
                    Chưa có thông báo mới
                  </div>
                ) : notifications.map(n => {
                  const itemStyle = getNotificationStyle(n.type);
                  const Icon = itemStyle.icon;
                  return (
                  <div key={n.notificationId} style={{ padding: "12px 16px", borderBottom: "1px solid #F8FAFC", background: n.unread ? "#FEFCE8" : "#fff", display: "flex", gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: itemStyle.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                       <Icon size={14} color={itemStyle.color} style={{ margin: "auto" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#1E293B" }}>{n.title}</div>
                      <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{n.description}</div>
                      <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 4 }}>{formatRelativeTime(n.createdAt)}</div>
                    </div>
                  </div>
                )})}
              </div>
              <div style={{ padding: 10, textAlign: "center", background: "#F8FAFC", cursor: "pointer" }}>
                 <span style={{ fontSize: 12, fontWeight: 600, color: GOLD }}>Xem tất cả</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
