import { useState, useEffect } from "react";
import { Search, Bell, AlertTriangle, Package, X } from "lucide-react";

const FONT = "'Inter', sans-serif";
const GOLD = "#f59e0b";

const NOTIFICATIONS = [
  {
    id: 1,
    icon: AlertTriangle,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    title: "Cảnh báo hết hàng F&B",
    desc: "Bắp rang lớn & nachos dưới ngưỡng tồn kho.",
    time: "12 phút trước",
    unread: true,
  },
  {
    id: 2,
    icon: Package,
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.1)",
    title: "Nhập hàng mới",
    desc: "Giao hàng Coca-Cola xác nhận — 240 sản phẩm.",
    time: "1 giờ trước",
    unread: true,
  },
  {
    id: 3,
    icon: AlertTriangle,
    color: "#dc2626",
    bg: "rgba(220,38,38,0.1)",
    title: "Cảnh báo hết hàng F&B",
    desc: "Combo hotdog & churros sắp hết hàng nghiêm trọng.",
    time: "3 giờ trước",
    unread: false,
  },
];

function useDateTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function TopHeader() {
  const [showNotifs, setShowNotifs] = useState(false);
  const [search, setSearch] = useState("");
  const now = useDateTime();

  const unreadCount = NOTIFICATIONS.filter((n) => n.unread).length;

  const timeStr = now.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const dateStr = now.toLocaleDateString("vi-VN", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header
      className="flex items-center gap-4 px-6 flex-shrink-0"
      style={{
        height: "72px",
        background: "#fff",
        borderBottom: "1px solid #e9ecef",
        position: "sticky",
        top: 0,
        zIndex: 30,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      {/* Search */}
      <div className="flex-1 max-w-xl relative">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "#9ca3af" }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm hóa đơn, phim, hoặc nhân viên..."
          style={{
            width: "100%",
            paddingLeft: "38px",
            paddingRight: "16px",
            paddingTop: "9px",
            paddingBottom: "9px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            fontFamily: FONT,
            fontSize: "0.855rem",
            color: "#1e293b",
            outline: "none",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = GOLD;
            e.currentTarget.style.boxShadow = `0 0 0 3px rgba(245,158,11,0.12)`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#e2e8f0";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
      </div>

      <div className="flex items-center gap-4 ml-auto">
        {/* Datetime */}
        <div className="hidden lg:flex flex-col items-end">
          <span
            style={{
              fontFamily: FONT,
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "#1e293b",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {timeStr}
          </span>
          <span
            style={{
              fontFamily: FONT,
              fontSize: "0.7rem",
              color: "#94a3b8",
              fontWeight: 400,
            }}
          >
            {dateStr}
          </span>
        </div>

        <div className="w-px h-8" style={{ background: "#e2e8f0" }} />

        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200"
            style={{
              background: showNotifs ? "rgba(245,158,11,0.1)" : "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(245,158,11,0.1)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(245,158,11,0.3)";
            }}
            onMouseLeave={(e) => {
              if (!showNotifs) {
                (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#e2e8f0";
              }
            }}
          >
            <Bell size={17} style={{ color: "#475569" }} />
            {unreadCount > 0 && (
              <span
                className="absolute flex items-center justify-center"
                style={{
                  top: "6px",
                  right: "6px",
                  width: "16px",
                  height: "16px",
                  background: "#dc2626",
                  borderRadius: "50%",
                  border: "2px solid #fff",
                  fontFamily: FONT,
                  fontSize: "0.55rem",
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {showNotifs && (
            <div
              className="absolute right-0 top-12 rounded-2xl overflow-hidden"
              style={{
                width: "360px",
                background: "#fff",
                border: "1px solid #e2e8f0",
                boxShadow: "0 16px 48px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)",
                zIndex: 100,
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid #f1f5f9" }}
              >
                <div>
                  <span
                    style={{
                      fontFamily: FONT,
                      fontSize: "0.9rem",
                      fontWeight: 700,
                      color: "#0f172a",
                    }}
                  >
                    Thông báo
                  </span>
                  <span
                    className="ml-2 px-2 py-0.5 rounded-full"
                    style={{
                      background: "rgba(220,38,38,0.1)",
                      color: "#dc2626",
                      fontFamily: FONT,
                      fontSize: "0.7rem",
                      fontWeight: 700,
                    }}
                  >
                    {unreadCount} mới
                  </span>
                </div>
                <button
                  onClick={() => setShowNotifs(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg"
                  style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
                >
                  <X size={13} style={{ color: "#64748b" }} />
                </button>
              </div>

              {/* Items */}
              <div>
                {NOTIFICATIONS.map((n) => {
                  const Icon = n.icon;
                  return (
                    <div
                      key={n.id}
                      className="flex gap-3 px-5 py-4 cursor-pointer transition-colors duration-150"
                      style={{
                        background: n.unread ? "#fefce8" : "#fff",
                        borderBottom: "1px solid #f1f5f9",
                      }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLDivElement).style.background = "#f8fafc")
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLDivElement).style.background = n.unread ? "#fefce8" : "#fff")
                      }
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: n.bg }}
                      >
                        <Icon size={15} style={{ color: n.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          style={{
                            fontFamily: FONT,
                            fontSize: "0.825rem",
                            fontWeight: 600,
                            color: "#0f172a",
                            marginBottom: "2px",
                          }}
                        >
                          {n.title}
                        </div>
                        <div
                          style={{
                            fontFamily: FONT,
                            fontSize: "0.775rem",
                            color: "#64748b",
                            lineHeight: 1.4,
                          }}
                        >
                          {n.desc}
                        </div>
                        <div
                          style={{
                            fontFamily: FONT,
                            fontSize: "0.7rem",
                            color: "#94a3b8",
                            marginTop: "4px",
                          }}
                        >
                          {n.time}
                        </div>
                      </div>
                      {n.unread && (
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0 mt-2"
                          style={{ background: GOLD }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <div
                className="px-5 py-3 text-center"
                style={{ background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}
              >
                <button
                  style={{
                    fontFamily: FONT,
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: GOLD,
                  }}
                >
                  Xem tất cả thông báo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
            style={{
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              fontFamily: FONT,
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "#fff",
              boxShadow: "0 0 16px rgba(245,158,11,0.3)",
            }}
          >
            AD
          </div>
          <div className="hidden md:block">
            <div
              style={{
                fontFamily: FONT,
                fontSize: "0.825rem",
                fontWeight: 600,
                color: "#0f172a",
              }}
            >
              ADMIN
            </div>
            <div
              style={{
                fontFamily: FONT,
                fontSize: "0.7rem",
                color: "#64748b",
              }}
            >
              admin@hekiocinema.com
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
