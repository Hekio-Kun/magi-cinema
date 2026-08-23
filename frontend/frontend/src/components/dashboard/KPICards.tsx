import { CalendarClock, Film, MonitorPlay, Users } from "lucide-react";
import type { ReactNode } from "react";

import { type DashboardResponse } from "@/api/dashboardApi";

type KpiCard = {
  label: string;
  value: string;
  caption: string;
  iconBg: string;
  iconColor: string;
  icon: ReactNode;
};

export function KPICards({ stats }: { stats: DashboardResponse | null }) {
  const cards: KpiCard[] = [
    {
      label: "Tổng phim",
      value: stats ? stats.totalMovies.toLocaleString("vi-VN") : "0",
      caption: "Dữ liệu từ quản lý phim",
      iconBg: "#DBEAFE",
      iconColor: "#2563EB",
      icon: <Film size={18} />,
    },
    {
      label: "Tài khoản người dùng",
      value: stats ? stats.totalUsers.toLocaleString("vi-VN") : "0",
      caption: "Khách hàng, nhân viên và quản trị",
      iconBg: "#DCFCE7",
      iconColor: "#16A34A",
      icon: <Users size={18} />,
    },
    {
      label: "Phòng chiếu",
      value: stats ? stats.totalCinemaRooms.toLocaleString("vi-VN") : "0",
      caption: "Tất cả phòng trong hệ thống",
      iconBg: "#FEF3C7",
      iconColor: "#D97706",
      icon: <MonitorPlay size={18} />,
    },
    {
      label: "Suất chiếu",
      value: stats ? stats.totalShowtimes.toLocaleString("vi-VN") : "0",
      caption: "Tổng suất chiếu đã tạo",
      iconBg: "#FCE7F3",
      iconColor: "#DB2777",
      icon: <CalendarClock size={18} />,
    },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16 }}>
      {cards.map((card) => (
        <div
          key={card.label}
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: 12,
            padding: "18px 18px 16px",
            fontFamily: "Inter, sans-serif",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 700, letterSpacing: "0.02em" }}>
                {card.label}
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#111827", marginTop: 8, letterSpacing: "-0.4px" }}>
                {card.value}
              </div>
            </div>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: card.iconBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: card.iconColor,
                flexShrink: 0,
              }}
            >
              {card.icon}
            </div>
          </div>

          <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.5 }}>
            {card.caption}
          </div>
        </div>
      ))}
    </div>
  );
}
