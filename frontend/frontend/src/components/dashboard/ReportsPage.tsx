import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { BarChart3, CalendarClock, CheckCircle2, CircleDashed, Film, Loader2, MonitorPlay, Users } from "lucide-react";
import { KPICards } from "./KPICards";
import { ShowtimeSchedule } from "./ShowtimeSchedule";
import { TopMovies } from "./TopMovies";
import { dashboardService, type DashboardResponse } from "@/api/dashboardApi";

type ReportAvailability = {
  title: string;
  status: "ready" | "pending";
  description: string;
};

const REPORT_AVAILABILITY: ReportAvailability[] = [
  {
    title: "Tổng số phim, người dùng, phòng và suất chiếu",
    status: "ready",
    description: "Đã có từ API /dashboard/stats và có thể hiển thị ổn định.",
  },
  {
    title: "Phim mới cập nhật",
    status: "ready",
    description: "Đang lấy 5 phim mới nhất từ hệ thống.",
  },
  {
    title: "Suất chiếu mới cập nhật",
    status: "ready",
    description: "Đang lấy 5 suất chiếu mới nhất từ hệ thống.",
  },
  {
    title: "Doanh thu theo ngày/tháng",
    status: "pending",
    description: "Cần API tổng hợp đơn đặt vé đã thanh toán thành công theo thời gian.",
  },
  {
    title: "Tỷ lệ lấp đầy ghế",
    status: "pending",
    description: "Cần API đếm ghế đã bán/tổng ghế theo suất chiếu hoặc phòng.",
  },
  {
    title: "Combo bán chạy",
    status: "pending",
    description: "Cần API thống kê booking_combo theo số lượng và doanh thu.",
  },
];

function ReportMetricCard({ icon, label, value, caption, color }: {
  icon: ReactNode;
  label: string;
  value: string;
  caption: string;
  color: string;
}) {
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 12, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>{label}</div>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}16`, color, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: 25, fontWeight: 850, color: "#111827" }}>{value}</div>
      <div style={{ marginTop: 5, fontSize: 12, color: "#6B7280", lineHeight: 1.5 }}>{caption}</div>
    </div>
  );
}

function AvailabilityList() {
  return (
    <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>Tình trạng dữ liệu báo cáo</div>
        <div style={{ marginTop: 3, fontSize: 12, color: "#6B7280" }}>Chỉ những phần đã có dữ liệu thật mới được hiển thị như báo cáo chính.</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {REPORT_AVAILABILITY.map((item) => {
          const ready = item.status === "ready";
          return (
            <div
              key={item.title}
              style={{
                display: "grid",
                gridTemplateColumns: "24px minmax(0, 1fr) 92px",
                gap: 10,
                alignItems: "start",
                padding: "12px",
                border: "1px solid #F1F5F9",
                borderRadius: 10,
                background: ready ? "#F8FFFB" : "#FAFAFA",
              }}
            >
              {ready ? <CheckCircle2 size={18} color="#16A34A" /> : <CircleDashed size={18} color="#94A3B8" />}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>{item.title}</div>
                <div style={{ marginTop: 3, fontSize: 12, color: "#6B7280", lineHeight: 1.45 }}>{item.description}</div>
              </div>
              <span
                style={{
                  justifySelf: "end",
                  fontSize: 11,
                  fontWeight: 800,
                  color: ready ? "#15803D" : "#64748B",
                  background: ready ? "#DCFCE7" : "#F1F5F9",
                  borderRadius: 999,
                  padding: "4px 8px",
                  whiteSpace: "nowrap",
                }}
              >
                {ready ? "Đã có" : "Chờ API"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ReportsPage() {
  const [stats, setStats] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService.getStats()
      .then(setStats)
      .catch((err) => console.error("Failed to fetch dashboard stats:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#F4F5F7" }}>
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        padding: "24px 28px 32px",
        background: "#F4F5F7",
        overflowY: "auto",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 850, color: "#1A1A2E", margin: 0, letterSpacing: "-0.4px" }}>
            Báo cáo & thống kê
          </h1>
          <p style={{ fontSize: 14, color: "#6B7280", marginTop: 4, maxWidth: 720, lineHeight: 1.55 }}>
            Trang này tập trung vào phân tích dữ liệu. Những biểu đồ doanh thu, lấp đầy ghế và combo sẽ chỉ bật khi backend có API thống kê thật.
          </p>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 13px", borderRadius: 999, background: "#fff", border: "1px solid #E5E7EB", color: "#374151", fontSize: 12, fontWeight: 800 }}>
          <BarChart3 size={15} />
          Dữ liệu thật từ dashboard API
        </div>
      </div>

      <section style={{ marginBottom: 20 }}>
        <KPICards stats={stats} />
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, marginBottom: 20 }}>
        <ReportMetricCard
          icon={<Film size={17} />}
          label="Nguồn phim"
          value={(stats?.topMovies?.length || 0).toString()}
          caption="Phim mới cập nhật có thể đưa vào báo cáo."
          color="#2563EB"
        />
        <ReportMetricCard
          icon={<CalendarClock size={17} />}
          label="Nguồn lịch chiếu"
          value={(stats?.recentShowtimes?.length || 0).toString()}
          caption="Suất chiếu mới cập nhật có thể kiểm tra."
          color="#D97706"
        />
        <ReportMetricCard
          icon={<Users size={17} />}
          label="Tài khoản"
          value={(stats?.totalUsers || 0).toLocaleString("vi-VN")}
          caption="Tổng tài khoản đang có trong hệ thống."
          color="#16A34A"
        />
        <ReportMetricCard
          icon={<MonitorPlay size={17} />}
          label="Phòng chiếu"
          value={(stats?.totalCinemaRooms || 0).toLocaleString("vi-VN")}
          caption="Tổng phòng chiếu có thể đưa vào phân tích."
          color="#DB2777"
        />
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 20, marginBottom: 20 }}>
        <AvailabilityList />
        <div style={{ minHeight: 430 }}>
          <ShowtimeSchedule showtimes={stats?.recentShowtimes || []} />
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 20 }}>
        <div style={{ minHeight: 430 }}>
          <TopMovies movies={stats?.topMovies || []} />
        </div>
        <div style={{ background: "#fff", border: "1px dashed #CBD5E1", borderRadius: 12, padding: 24, minHeight: 430, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
          <BarChart3 size={42} color="#94A3B8" />
          <div style={{ marginTop: 14, fontSize: 18, fontWeight: 850, color: "#111827" }}>
            Khu vực biểu đồ chuyên sâu
          </div>
          <div style={{ marginTop: 8, maxWidth: 420, fontSize: 13, lineHeight: 1.65, color: "#6B7280" }}>
            Khi có API doanh thu, booking, tỷ lệ lấp đầy ghế và combo bán chạy, khu vực này sẽ hiển thị biểu đồ lọc theo ngày, tháng, phim và phòng chiếu.
          </div>
        </div>
      </section>
    </div>
  );
}
