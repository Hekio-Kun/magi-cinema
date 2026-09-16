import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { AlertTriangle, Bell, Check, CheckCheck, ChevronRight, Circle, Clock3, Command, History, Layers3, Package, RefreshCw, Search, Settings2, UserPlus, X } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { notificationService, type DashboardNotification } from "@/api/notificationApi";
import { DASHBOARD_PAGE_ACCESS, canAccessDashboardPage, normalizeRoles } from "@/utils/dashboardAccess";
import { useOnlineCount } from "@/hooks/useOnlineTracker";
import { getDashboardSearchHistoryKey, useDashboardPreferences } from "@/hooks/useDashboardPreferences";
import { buildDashboardSearchIndex, searchDashboard, type DashboardSearchResult } from "@/utils/dashboardSearch";

const FONT = "'Inter', sans-serif";

function getNotificationStyle(type: string) {
  if (type === "STAFF_IMPORT") return { icon: UserPlus, color: "#059669", bg: "#ecfdf5", label: "Nhân viên" };
  if (type === "STOCK") return { icon: Package, color: "#2563eb", bg: "#eff6ff", label: "Kho hàng" };
  return { icon: AlertTriangle, color: "#d97706", bg: "#fffbeb", label: type || "Hệ thống" };
}

function formatNotificationTime(value: string | undefined, absolute: boolean) {
  if (!value) return "Vừa xong";
  const created = new Date(value);
  if (Number.isNaN(created.getTime())) return "Vừa xong";
  if (absolute) return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }).format(created);
  const minutes = Math.max(0, Math.floor((Date.now() - created.getTime()) / 60000));
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours} giờ trước` : `${Math.floor(hours / 24)} ngày trước`;
}

function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 740;
    gain.gain.setValueAtTime(0.06, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.16);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(); oscillator.stop(context.currentTime + 0.16);
  } catch { /* Optional audio may be blocked before a browser gesture. */ }
}

interface AdminHeaderProps { activePage?: string; onNavigate?: (page: string) => void; }

export function AdminHeader({ activePage = "Tổng quan", onNavigate }: AdminHeaderProps) {
  const { username, roles, scopes } = useCurrentUser();
  const { preferences } = useDashboardPreferences(username);
  const accent = preferences.accentColor;
  const onlineCount = useOnlineCount(1);
  const normalizedRoles = useMemo(() => normalizeRoles(username ? roles : []), [roles, username]);
  const canReadNotifications = canAccessDashboardPage("Tổng quan", normalizedRoles, username ? scopes : []);
  const accessiblePages = useMemo(() => Object.keys(DASHBOARD_PAGE_ACCESS).filter((page) => canAccessDashboardPage(page, normalizedRoles, username ? scopes : [])), [normalizedRoles, scopes, username]);
  const searchIndex = useMemo(() => buildDashboardSearchIndex(accessiblePages), [accessiblePages]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const notificationBoxRef = useRef<HTMLDivElement>(null);
  const initializedNotifications = useRef(false);
  const previousUnreadIds = useRef<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<DashboardSearchResult[]>(() => {
    try { const raw = localStorage.getItem(getDashboardSearchHistoryKey(username)); return raw ? JSON.parse(raw) : []; }
    catch { return []; }
  });
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationFilter, setNotificationFilter] = useState<"all" | "unread">(preferences.notificationUnreadOnly ? "unread" : "all");
  const [notificationType, setNotificationType] = useState("ALL");
  const [notificationSearch, setNotificationSearch] = useState("");
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState("");

  const searchResults = useMemo(() => searchDashboard(searchIndex, search, preferences.maxSearchResults), [preferences.maxSearchResults, search, searchIndex]);
  const visibleSearchResults = search.trim() ? searchResults : preferences.showSearchHistory ? recentSearches.slice(0, 5) : [];
  const notificationTypes = useMemo(() => Array.from(new Set(notifications.map((item) => item.type).filter(Boolean))), [notifications]);
  const filteredNotifications = useMemo(() => {
    const query = notificationSearch.trim().toLocaleLowerCase("vi");
    return notifications.filter((item) => {
      if (notificationFilter === "unread" && !item.unread) return false;
      if (notificationType !== "ALL" && item.type !== notificationType) return false;
      return !query || `${item.title} ${item.description}`.toLocaleLowerCase("vi").includes(query);
    });
  }, [notificationFilter, notificationSearch, notificationType, notifications]);

  useEffect(() => {
    const closePanels = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!searchBoxRef.current?.contains(target)) setSearchFocused(false);
      if (!notificationBoxRef.current?.contains(target)) setShowNotifs(false);
    };
    document.addEventListener("mousedown", closePanels);
    return () => document.removeEventListener("mousedown", closePanels);
  }, []);

  useEffect(() => {
    if (!preferences.enableSearchShortcut) return;
    const focusSearch = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault(); searchInputRef.current?.focus(); setSearchFocused(true);
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, [preferences.enableSearchShortcut]);

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!canReadNotifications) return;
    if (!silent) setNotificationLoading(true);
    try {
      const data = await notificationService.getDashboardNotifications(50);
      const nextNotifications = data.notifications || [];
      const nextUnread = nextNotifications.filter((item) => item.unread);
      if (initializedNotifications.current) {
        const newItems = nextUnread.filter((item) => !previousUnreadIds.current.has(item.notificationId));
        if (newItems.length) {
          if (preferences.notificationSound) playNotificationSound();
          if (preferences.desktopNotifications && typeof Notification !== "undefined" && Notification.permission === "granted") new Notification(newItems[0].title, { body: newItems[0].description, tag: `magi-${newItems[0].notificationId}` });
        }
      }
      previousUnreadIds.current = new Set(nextUnread.map((item) => item.notificationId));
      initializedNotifications.current = true;
      setNotifications(nextNotifications); setUnreadCount(data.unreadCount || 0); setNotificationError("");
    } catch { setNotificationError("Không thể đồng bộ thông báo lúc này."); }
    finally { if (!silent) setNotificationLoading(false); }
  }, [canReadNotifications, preferences.desktopNotifications, preferences.notificationSound]);

  useEffect(() => {
    if (!canReadNotifications) return;
    const initialTimer = window.setTimeout(() => void fetchNotifications(true), 0);
    if (preferences.notificationRefreshSeconds <= 0) return () => window.clearTimeout(initialTimer);
    const timer = window.setInterval(() => void fetchNotifications(true), preferences.notificationRefreshSeconds * 1000);
    return () => { window.clearTimeout(initialTimer); window.clearInterval(timer); };
  }, [canReadNotifications, fetchNotifications, preferences.notificationRefreshSeconds]);

  const selectSearchResult = (result: DashboardSearchResult) => {
    onNavigate?.(result.page);
    const next = [result, ...recentSearches.filter((item) => item.id !== result.id)].slice(0, 5);
    setRecentSearches(next); localStorage.setItem(getDashboardSearchHistoryKey(username), JSON.stringify(next));
    setSearch(""); setSearchFocused(false);
  };
  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") { setSearchFocused(false); searchInputRef.current?.blur(); return; }
    if (!visibleSearchResults.length) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setActiveSearchIndex((value) => (value + 1) % visibleSearchResults.length); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActiveSearchIndex((value) => (value - 1 + visibleSearchResults.length) % visibleSearchResults.length); }
    else if (event.key === "Enter") { event.preventDefault(); selectSearchResult(visibleSearchResults[activeSearchIndex] || visibleSearchResults[0]); }
  };
  const handleMarkAllAsRead = async () => {
    if (!canReadNotifications || !unreadCount) return;
    try { await notificationService.markAllAsRead(); setUnreadCount(0); setNotifications((previous) => previous.map((item) => ({ ...item, unread: false }))); previousUnreadIds.current = new Set(); }
    catch { setNotificationError("Không thể cập nhật trạng thái thông báo."); }
  };
  const toggleNotificationRead = async (notification: DashboardNotification) => {
    const nextUnread = !notification.unread;
    setNotifications((previous) => previous.map((item) => item.notificationId === notification.notificationId ? { ...item, unread: nextUnread } : item));
    setUnreadCount((value) => Math.max(0, value + (nextUnread ? 1 : -1)));
    try { if (notification.unread) await notificationService.markAsRead(notification.notificationId); else await notificationService.markAsUnread(notification.notificationId); }
    catch {
      setNotifications((previous) => previous.map((item) => item.notificationId === notification.notificationId ? notification : item));
      setUnreadCount((value) => Math.max(0, value + (nextUnread ? -1 : 1))); setNotificationError("Không thể cập nhật trạng thái thông báo.");
    }
  };
  const panelShadow = "0 18px 45px rgba(15,23,42,.16)";

  return (
    <header style={{ height: preferences.compactHeader ? 60 : 72, background: "#fff", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", padding: "0 24px", gap: 20, fontFamily: FONT, flexShrink: 0, position: "sticky", top: 0, zIndex: 30, transition: preferences.reduceMotion ? "none" : "height .2s" }}>
      <div style={{ display: "flex", flexDirection: "column", minWidth: 170 }}><div style={{ color: "#0f172a", fontSize: 16, fontWeight: 750, letterSpacing: "-.01em" }}>{activePage}</div>{!preferences.compactHeader && <div style={{ fontSize: 11, color: "#64748b", fontWeight: 500, marginTop: 2 }}>Hệ thống quản lý Magi Cinema</div>}</div>

      <div ref={searchBoxRef} style={{ width: 430, height: 40, borderRadius: 10, border: `1px solid ${searchFocused ? accent : "#e2e8f0"}`, background: searchFocused ? "#fff" : "#f8fafc", display: "flex", alignItems: "center", padding: "0 12px", gap: 9, boxShadow: searchFocused ? `0 0 0 3px ${accent}1f` : "none", position: "relative", transition: "all .18s" }}>
        <Search size={16} color={searchFocused ? accent : "#94a3b8"} />
        <input ref={searchInputRef} value={search} onChange={(event) => { setSearch(event.target.value); setActiveSearchIndex(0); }} onFocus={() => setSearchFocused(true)} onKeyDown={handleSearchKeyDown} placeholder="Tìm chức năng hoặc nghiệp vụ..." aria-label="Tìm kiếm trong dashboard" style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", outline: "none", fontSize: 13, color: "#1e293b" }} />
        {search ? <button type="button" aria-label="Xóa từ khóa" onClick={() => { setSearch(""); searchInputRef.current?.focus(); }} style={{ border: 0, background: "none", padding: 2, cursor: "pointer", color: "#94a3b8" }}><X size={14} /></button> : preferences.enableSearchShortcut && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", borderRadius: 6, padding: "3px 6px", fontSize: 10, fontWeight: 700 }}><Command size={10} />K</span>}
        {searchFocused && (search.trim() || (preferences.showSearchHistory && recentSearches.length > 0)) && <div style={{ position: "absolute", top: "calc(100% + 9px)", left: 0, right: 0, background: "#fff", borderRadius: 13, boxShadow: panelShadow, border: "1px solid #e2e8f0", zIndex: 100, overflow: "hidden" }}>
          <div style={{ padding: "10px 13px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", color: "#64748b", fontSize: 10, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase" }}><span style={{ display: "flex", alignItems: "center", gap: 6 }}>{search.trim() ? <Layers3 size={13} /> : <History size={13} />}{search.trim() ? `${searchResults.length} kết quả` : "Mở gần đây"}</span><span>↑↓ chọn · Enter mở</span></div>
          <div style={{ maxHeight: 370, overflowY: "auto", padding: 6 }}>
            {visibleSearchResults.length ? visibleSearchResults.map((result, index) => <button key={result.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selectSearchResult(result)} onMouseEnter={() => setActiveSearchIndex(index)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, border: 0, borderRadius: 9, padding: "10px 9px", textAlign: "left", cursor: "pointer", background: index === activeSearchIndex ? `${accent}12` : "transparent" }}><div style={{ width: 33, height: 33, borderRadius: 9, background: result.type === "action" ? `${accent}18` : "#f1f5f9", color: result.type === "action" ? accent : "#64748b", display: "grid", placeItems: "center", flexShrink: 0 }}>{result.type === "action" ? <Command size={15} /> : <Layers3 size={15} />}</div><div style={{ minWidth: 0, flex: 1 }}><div style={{ color: "#1e293b", fontSize: 12, fontWeight: 700 }}>{result.title}</div><div style={{ color: "#64748b", fontSize: 10.5, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{result.description}</div></div><span style={{ color: "#94a3b8", fontSize: 10, whiteSpace: "nowrap" }}>{result.type === "action" ? result.page : "Trang"}</span><ChevronRight size={14} color="#94a3b8" /></button>) : <div style={{ padding: "28px 16px", textAlign: "center", color: "#64748b", fontSize: 12 }}>Không tìm thấy. Thử “bán vé”, “dòng tiền” hoặc “phân quyền”.</div>}
          </div>
        </div>}
      </div>

      <div style={{ flex: 1 }} />
      <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 11px", borderRadius: 20, background: "#ecfdf5", border: "1px solid #a7f3d0", fontSize: 11, fontWeight: 700, color: "#047857" }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 0 4px #d1fae5" }} />{onlineCount} trực tuyến</div>
      <div ref={notificationBoxRef} style={{ position: "relative" }}>
        <button type="button" aria-label={`Thông báo, ${unreadCount} chưa đọc`} onClick={() => { setShowNotifs((value) => !value); setNotificationFilter(preferences.notificationUnreadOnly ? "unread" : "all"); }} style={{ width: 40, height: 40, borderRadius: 10, border: `1px solid ${showNotifs ? `${accent}55` : "#e2e8f0"}`, background: showNotifs ? `${accent}12` : "#f8fafc", cursor: "pointer", display: "grid", placeItems: "center", position: "relative" }}><Bell size={18} color={showNotifs ? accent : "#64748b"} />{unreadCount > 0 && <span style={{ position: "absolute", top: -5, right: -5, minWidth: 19, height: 19, padding: "0 4px", background: "#ef4444", borderRadius: 10, border: "2px solid #fff", display: "grid", placeItems: "center", color: "#fff", fontSize: 9, fontWeight: 800 }}>{unreadCount > 99 ? "99+" : unreadCount}</span>}</button>
        {showNotifs && <div style={{ position: "absolute", right: 0, top: 50, width: 430, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, boxShadow: panelShadow, zIndex: 100, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px 11px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>Trung tâm thông báo</div><div style={{ fontSize: 10.5, color: "#64748b", marginTop: 2 }}>{unreadCount} mục chưa đọc · 50 mục gần nhất</div></div><div style={{ display: "flex", gap: 4 }}><button type="button" title="Làm mới" onClick={() => void fetchNotifications()} disabled={notificationLoading} style={{ border: 0, background: "#f8fafc", color: "#64748b", borderRadius: 8, width: 32, height: 32, cursor: "pointer" }}><RefreshCw size={15} style={{ margin: "auto", animation: notificationLoading ? "spin 1s linear infinite" : "none" }} /></button><button type="button" title="Cài đặt thông báo" onClick={() => { onNavigate?.("Cài đặt"); setShowNotifs(false); }} style={{ border: 0, background: "#f8fafc", color: "#64748b", borderRadius: 8, width: 32, height: 32, cursor: "pointer" }}><Settings2 size={15} style={{ margin: "auto" }} /></button></div></div>
            <div style={{ display: "flex", gap: 7, marginTop: 12 }}>{(["all", "unread"] as const).map((filter) => <button key={filter} type="button" onClick={() => setNotificationFilter(filter)} style={{ border: notificationFilter === filter ? `1px solid ${accent}66` : "1px solid #e2e8f0", color: notificationFilter === filter ? accent : "#64748b", background: notificationFilter === filter ? `${accent}12` : "#fff", borderRadius: 8, height: 30, padding: "0 10px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>{filter === "all" ? "Tất cả" : `Chưa đọc (${unreadCount})`}</button>)}<button type="button" onClick={handleMarkAllAsRead} disabled={!unreadCount} style={{ marginLeft: "auto", border: 0, background: "transparent", color: unreadCount ? accent : "#cbd5e1", cursor: unreadCount ? "pointer" : "default", fontSize: 10.5, fontWeight: 700, display: "flex", gap: 5, alignItems: "center" }}><CheckCheck size={14} />Đọc tất cả</button></div>
            <div style={{ display: "flex", gap: 7, marginTop: 9 }}><div style={{ flex: 1, height: 32, border: "1px solid #e2e8f0", background: "#f8fafc", borderRadius: 8, display: "flex", alignItems: "center", gap: 6, padding: "0 9px" }}><Search size={13} color="#94a3b8" /><input value={notificationSearch} onChange={(event) => setNotificationSearch(event.target.value)} placeholder="Tìm trong thông báo" style={{ minWidth: 0, flex: 1, border: 0, outline: 0, background: "transparent", fontSize: 11, color: "#334155" }} /></div><select value={notificationType} onChange={(event) => setNotificationType(event.target.value)} style={{ width: 112, height: 32, border: "1px solid #e2e8f0", borderRadius: 8, color: "#475569", background: "#fff", fontSize: 10.5, padding: "0 6px" }}><option value="ALL">Mọi loại</option>{notificationTypes.map((type) => <option key={type} value={type}>{getNotificationStyle(type).label}</option>)}</select></div>
            {notificationError && <div style={{ color: "#b91c1c", background: "#fef2f2", borderRadius: 7, padding: "7px 9px", fontSize: 10.5, marginTop: 8 }}>{notificationError}</div>}
          </div>
          <div style={{ maxHeight: 390, overflowY: "auto" }}>{!filteredNotifications.length ? <div style={{ padding: "38px 20px", textAlign: "center", color: "#64748b" }}><Bell size={24} color="#cbd5e1" style={{ margin: "0 auto 8px" }} /><div style={{ fontSize: 12, fontWeight: 700 }}>{notificationLoading ? "Đang đồng bộ..." : "Không có thông báo phù hợp"}</div></div> : filteredNotifications.map((notification) => {
            const itemStyle = getNotificationStyle(notification.type); const Icon = itemStyle.icon;
            return <div key={notification.notificationId} style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9", background: notification.unread ? `${accent}09` : "#fff", display: "flex", gap: 11 }}><div style={{ width: 34, height: 34, borderRadius: 9, background: itemStyle.bg, display: "grid", placeItems: "center", flexShrink: 0 }}><Icon size={15} color={itemStyle.color} /></div><div style={{ minWidth: 0, flex: 1 }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ fontSize: 12, fontWeight: notification.unread ? 800 : 650, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{notification.title}</div>{notification.unread && <Circle size={7} fill={accent} color={accent} />}</div><div style={{ fontSize: 10.5, color: "#64748b", marginTop: 3, lineHeight: 1.45 }}>{notification.description}</div><div style={{ fontSize: 9.5, color: "#94a3b8", marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}><Clock3 size={10} />{formatNotificationTime(notification.createdAt, preferences.notificationTimeFormat === "absolute")}</div></div><button type="button" title={notification.unread ? "Đánh dấu đã đọc" : "Đánh dấu chưa đọc"} onClick={() => void toggleNotificationRead(notification)} style={{ width: 28, height: 28, flexShrink: 0, border: 0, borderRadius: 7, background: "transparent", color: notification.unread ? accent : "#94a3b8", cursor: "pointer" }}>{notification.unread ? <Check size={14} style={{ margin: "auto" }} /> : <Circle size={13} style={{ margin: "auto" }} />}</button></div>;
          })}</div>
          <button type="button" onClick={() => { onNavigate?.("Cài đặt"); setShowNotifs(false); }} style={{ width: "100%", height: 40, border: 0, borderTop: "1px solid #e2e8f0", background: "#f8fafc", color: accent, cursor: "pointer", fontSize: 11, fontWeight: 800 }}>Tùy chỉnh thông báo</button>
        </div>}
      </div>
    </header>
  );
}
