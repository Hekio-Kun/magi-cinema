import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { CalendarDays, CheckCircle2, Clock3, Loader2, MonitorPlay, ShieldCheck, Ticket, WalletCards } from "lucide-react";
import { KPICards } from "./KPICards";
import { TopMovies } from "./TopMovies";
import { ShowtimeSchedule } from "./ShowtimeSchedule";
import { dashboardService, type DashboardResponse } from "@/api/dashboardApi";

function OperationStatusCard({ icon, title, value, caption, color }: {
  icon: ReactNode;
  title: string;
  value: string;
  caption: string;
  color: string;
}) {
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 12, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}16`, color, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>{title}</div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 850, color: "#111827", letterSpacing: "-0.3px" }}>{value}</div>
      <div style={{ marginTop: 4, fontSize: 12, color: "#6B7280", lineHeight: 1.5 }}>{caption}</div>
    </div>
  );
}

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value || 0);
}

export function DashboardContent() {
  const [stats, setStats] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService.getStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#F4F5F7" }}>
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    );
  }

  const today = new Date();
  const dateString = today.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const recentMoviesCount = stats?.topMovies?.length || 0;
  const recentShowtimesCount = stats?.recentShowtimes?.length || 0;

  return (
    <div
      className="no-scrollbar"
      style={{
        flex: 1,
        overflowY: "auto",
        background: "#F4F5F7",
        padding: "24px 28px 32px",
        fontFamily: "Inter, sans-serif",
        height: "100%",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1A1A2E", letterSpacing: "-0.4px", lineHeight: 1.3 }}>
            Tổng quan vận hành
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6B7280" }}>
            Theo dõi nhanh tình trạng dữ liệu và hoạt động mới nhất trong hệ thống.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            background: "#fff",
            color: "#374151",
            border: "1px solid #E5E7EB",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          <CalendarDays size={15} />
          {dateString}
        </div>
      </div>

      <section style={{ marginBottom: 20 }}>
        <KPICards stats={stats} />
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, marginBottom: 20 }}>
        <OperationStatusCard
          icon={<ShieldCheck size={17} />}
          title="Dữ liệu nền tảng"
          value="Ổn"
          caption="Phim, phòng chiếu, người dùng và suất chiếu đã có API tổng hợp."
          color="#16A34A"
        />
        <OperationStatusCard
          icon={<Clock3 size={17} />}
          title="Suất chiếu gần đây"
          value={recentShowtimesCount.toString()}
          caption="Hiển thị các suất chiếu mới cập nhật từ hệ thống."
          color="#2563EB"
        />
        <OperationStatusCard
          icon={<MonitorPlay size={17} />}
          title="Phim mới cập nhật"
          value={recentMoviesCount.toString()}
          caption="Danh sách phim lấy trực tiếp từ thống kê dashboard."
          color="#D97706"
        />
        <OperationStatusCard
          icon={<CheckCircle2 size={17} />}
          title="Doanh thu 7 ngày"
          value={formatMoney(stats?.financialSummary?.netSales)}
          caption={`${stats?.financialSummary?.successfulBookings || 0} booking thành công · tiền đã thu theo booking SUCCESS`}
          color="#16A34A"
        />
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16, marginBottom: 20 }}>
        <OperationStatusCard
          icon={<WalletCards size={17} />}
          title="Đang chờ thanh toán"
          value={formatMoney(stats?.financialSummary?.pendingAmount)}
          caption={`${stats?.financialSummary?.pendingBookings || 0} booking chưa được tính vào doanh thu`}
          color="#2563EB"
        />
        <OperationStatusCard
          icon={<Ticket size={17} />}
          title="Vé đã bán trong kỳ"
          value={(stats?.financialSummary?.ticketsSold || 0).toLocaleString("vi-VN")}
          caption={`Lấp đầy ${stats?.financialSummary?.occupancyRate?.toFixed(1) || "0.0"}% trên các suất chiếu`}
          color="#D97706"
        />
        <OperationStatusCard
          icon={<CheckCircle2 size={17} />}
          title="Doanh thu đồ ăn/combo"
          value={formatMoney(stats?.financialSummary?.concessionRevenue)}
          caption="Đã tách riêng để theo dõi hiệu quả quầy concession"
          color="#7C3AED"
        />
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 20 }}>
        <div style={{ minHeight: 430 }}>
          <ShowtimeSchedule showtimes={stats?.recentShowtimes || []} />
        </div>
        <div style={{ minHeight: 430 }}>
          <TopMovies movies={stats?.topMovies || []} />
        </div>
      </section>
    </div>
  );
}
