import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { BarChart3, CalendarClock, CheckCircle2, Film, Loader2, Percent, WalletCards } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { dashboardService, type DashboardResponse, type FinancialSummaryResponse } from "@/api/dashboardApi";
import { KPICards } from "./KPICards";

const MONEY = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

function localIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatMoney(value?: number | null) {
  return MONEY.format(value || 0);
}

function formatShortMoney(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}tr`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return `${value}đ`;
}

function formatDate(date?: string | null) {
  if (!date) return "--/--/----";
  return new Date(`${date}T00:00:00`).toLocaleDateString("vi-VN");
}

function MetricCard({ icon, label, value, caption, color }: {
  icon: ReactNode;
  label: string;
  value: string;
  caption: string;
  color: string;
}) {
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 12, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#6B7280" }}>{label}</div>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}16`, color, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </div>
      </div>
      <div style={{ marginTop: 12, fontSize: 24, fontWeight: 850, color: "#111827", letterSpacing: "-0.5px" }}>{value}</div>
      <div style={{ marginTop: 5, fontSize: 12, color: "#6B7280", lineHeight: 1.45 }}>{caption}</div>
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return <div style={{ padding: 24, textAlign: "center", color: "#6B7280", fontSize: 13 }}>{children}</div>;
}

function Panel({ title, caption, children }: { title: string; caption: string; children: ReactNode }) {
  return (
    <section style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 12, padding: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>{title}</div>
        <div style={{ marginTop: 3, fontSize: 12, color: "#6B7280" }}>{caption}</div>
      </div>
      {children}
    </section>
  );
}

function FinancialCards({ summary }: { summary?: FinancialSummaryResponse | null }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16 }}>
      <MetricCard icon={<WalletCards size={17} />} label="Doanh thu ghi nhận" value={formatMoney(summary?.netSales)} caption={`${summary?.successfulBookings || 0} booking đã thanh toán`} color="#D97706" />
      <MetricCard icon={<CheckCircle2 size={17} />} label="Tiền đã thu" value={formatMoney(summary?.netSales)} caption="Theo booking SUCCESS và phương thức thanh toán" color="#16A34A" />
      <MetricCard icon={<CalendarClock size={17} />} label="Đang chờ thanh toán" value={formatMoney(summary?.pendingAmount)} caption={`${summary?.pendingBookings || 0} booking PENDING, chưa tính vào doanh thu`} color="#2563EB" />
      <MetricCard icon={<Percent size={17} />} label="Đã hủy" value={formatMoney(summary?.cancelledAmount)} caption={`${summary?.cancelledBookings || 0} booking; hệ thống không hoàn tiền`} color="#DC2626" />
    </div>
  );
}

function DailyRevenueChart({ summary }: { summary?: FinancialSummaryResponse | null }) {
  const data = (summary?.daily || []).map((item) => ({
    ...item,
    label: new Date(`${item.date}T00:00:00`).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
  }));

  return (
    <Panel title="Dòng tiền theo ngày" caption="Doanh thu vé và đồ ăn/combo của booking đã thanh toán">
      {data.length === 0 ? <EmptyState>Chưa có dữ liệu trong khoảng thời gian này.</EmptyState> : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatShortMoney} tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={48} />
            <Tooltip formatter={(value) => formatMoney(Number(value))} labelFormatter={(label) => `Ngày ${label}`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="ticketRevenue" name="Vé" stackId="revenue" fill="#F59E0B" radius={[5, 5, 0, 0]} />
            <Bar dataKey="concessionRevenue" name="Đồ ăn / combo" stackId="revenue" fill="#10B981" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Panel>
  );
}

function PaymentBreakdown({ summary }: { summary?: FinancialSummaryResponse | null }) {
  const rows = summary?.paymentMethods || [];
  const total = summary?.netSales || 0;
  return (
    <Panel title="Đối soát theo phương thức" caption="Số tiền ghi nhận từ booking SUCCESS trong kỳ">
      {rows.length === 0 ? <EmptyState>Chưa có giao dịch thành công.</EmptyState> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {rows.map((row) => {
            const percentage = total === 0 ? 0 : (row.amount / total) * 100;
            const labels: Record<string, string> = { CASH: "Tiền mặt", BANK_TRANSFER: "Chuyển khoản", MOMO: "MoMo", ZALOPAY: "ZaloPay", UNKNOWN: "Chưa xác định" };
            return (
              <div key={row.paymentMethod}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
                  <span style={{ fontWeight: 750, color: "#111827" }}>{labels[row.paymentMethod] || row.paymentMethod}</span>
                  <span style={{ color: "#374151", fontWeight: 750 }}>{formatMoney(row.amount)}</span>
                </div>
                <div style={{ marginTop: 7, height: 8, borderRadius: 999, background: "#F1F5F9", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, percentage)}%`, background: "#4F46E5", borderRadius: 999 }} />
                </div>
                <div style={{ marginTop: 4, fontSize: 11, color: "#6B7280" }}>{row.bookings} booking · {percentage.toFixed(1)}%</div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function TopMoviesTable({ summary }: { summary?: FinancialSummaryResponse | null }) {
  const rows = summary?.topMovies || [];
  return (
    <Panel title="Phim tạo doanh thu" caption="Xếp theo doanh thu thuần của booking SUCCESS">
      {rows.length === 0 ? <EmptyState>Chưa có booking thành công.</EmptyState> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr style={{ color: "#64748B", textAlign: "left" }}>
              <th style={{ padding: "0 8px 10px 0" }}>Phim</th><th style={{ padding: "0 8px 10px" }}>Vé</th><th style={{ padding: "0 0 10px 8px", textAlign: "right" }}>Doanh thu</th>
            </tr></thead>
            <tbody>{rows.map((row) => <tr key={row.movieId} style={{ borderTop: "1px solid #F1F5F9" }}>
              <td style={{ padding: "11px 8px 11px 0", color: "#111827", fontWeight: 750 }}>{row.movieName}</td>
              <td style={{ padding: "11px 8px", color: "#475569" }}>{row.tickets.toLocaleString("vi-VN")}</td>
              <td style={{ padding: "11px 0 11px 8px", textAlign: "right", color: "#111827", fontWeight: 800 }}>{formatMoney(row.netSales)}</td>
            </tr>)}</tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function OccupancyTable({ summary }: { summary?: FinancialSummaryResponse | null }) {
  const rows = summary?.roomOccupancy || [];
  return (
    <Panel title="Lấp đầy theo phòng" caption="Ghế đã bán trên tổng ghế của các suất trong kỳ">
      {rows.length === 0 ? <EmptyState>Chưa có dữ liệu sơ đồ ghế.</EmptyState> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {rows.map((row) => <div key={row.roomId}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "#111827", fontWeight: 750 }}>{row.roomName}</span>
              <span style={{ color: "#475569" }}>{row.bookedSeats}/{row.seatCapacity} · {row.occupancyRate.toFixed(1)}%</span>
            </div>
            <div style={{ marginTop: 6, height: 8, borderRadius: 999, background: "#F1F5F9", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(100, row.occupancyRate)}%`, background: row.occupancyRate >= 70 ? "#EF4444" : "#2563EB", borderRadius: 999 }} />
            </div>
          </div>)}
        </div>
      )}
    </Panel>
  );
}

export function ReportsPage() {
  const today = useMemo(() => new Date(), []);
  const [fromDate, setFromDate] = useState(localIsoDate(addDays(today, -6)));
  const [toDate, setToDate] = useState(localIsoDate(today));
  const [stats, setStats] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const initialLoad = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setStats(await dashboardService.getStats(fromDate, toDate));
    } catch (err) {
      console.error("Failed to fetch dashboard stats:", err);
      setError("Không thể tải số liệu. Kiểm tra kết nối backend và quyền quản trị.");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    if (!initialLoad.current) {
      initialLoad.current = true;
      void load();
    }
  }, [load]);

  if (loading && !stats) {
    return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#F4F5F7" }}><Loader2 className="animate-spin text-amber-500" size={32} /></div>;
  }

  const summary = stats?.financialSummary;
  return (
    <div style={{ flex: 1, padding: "24px 28px 32px", background: "#F4F5F7", overflowY: "auto", fontFamily: "Inter, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 850, color: "#1A1A2E", margin: 0, letterSpacing: "-0.4px" }}>Báo cáo & thống kê</h1>
          <p style={{ fontSize: 14, color: "#6B7280", marginTop: 4, maxWidth: 720, lineHeight: 1.55 }}>Theo dõi tiền đã thu, doanh thu vé và đồ ăn, booking cần xử lý, phương thức thanh toán và tỷ lệ lấp đầy ghế.</p>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 13px", borderRadius: 999, background: "#fff", border: "1px solid #E5E7EB", color: "#374151", fontSize: 12, fontWeight: 800 }}><BarChart3 size={15} /> Số liệu theo ngày tạo booking</div>
      </div>

      <div style={{ display: "flex", alignItems: "end", gap: 10, flexWrap: "wrap", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 14, marginBottom: 20 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11, fontWeight: 800, color: "#475569" }}>Từ ngày<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} style={{ height: 36, border: "1px solid #CBD5E1", borderRadius: 8, padding: "0 9px", color: "#111827" }} /></label>
        <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11, fontWeight: 800, color: "#475569" }}>Đến ngày<input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} style={{ height: 36, border: "1px solid #CBD5E1", borderRadius: 8, padding: "0 9px", color: "#111827" }} /></label>
        <button type="button" onClick={() => void load()} disabled={loading || !fromDate || !toDate} style={{ height: 36, padding: "0 16px", border: 0, borderRadius: 8, background: "#1A1A2E", color: "#fff", fontWeight: 800, cursor: loading ? "wait" : "pointer" }}>{loading ? "Đang tải..." : "Cập nhật báo cáo"}</button>
        <span style={{ fontSize: 11, color: "#64748B", marginLeft: "auto" }}>Kỳ báo cáo: {formatDate(summary?.fromDate || fromDate)} – {formatDate(summary?.toDate || toDate)}</span>
      </div>

      {error && <div style={{ marginBottom: 16, padding: "11px 14px", borderRadius: 9, background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", fontSize: 13 }}>{error}</div>}

      <section style={{ marginBottom: 20 }}><FinancialCards summary={summary} /></section>
      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(300px, 0.65fr)", gap: 20, marginBottom: 20 }}><DailyRevenueChart summary={summary} /><PaymentBreakdown summary={summary} /></section>
      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 20, marginBottom: 20 }}><TopMoviesTable summary={summary} /><OccupancyTable summary={summary} /></section>

      <section style={{ marginBottom: 20 }}><KPICards stats={stats} /></section>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16 }}>
        <MetricCard icon={<Film size={17} />} label="Phim trong hệ thống" value={(stats?.totalMovies || 0).toLocaleString("vi-VN")} caption="Nguồn dữ liệu quản lý phim" color="#2563EB" />
        <MetricCard icon={<CalendarClock size={17} />} label="Suất chiếu" value={(stats?.totalShowtimes || 0).toLocaleString("vi-VN")} caption="Tổng lịch chiếu đã tạo" color="#D97706" />
        <MetricCard icon={<CheckCircle2 size={17} />} label="Vé đã bán" value={(summary?.ticketsSold || 0).toLocaleString("vi-VN")} caption={`Lấp đầy ${summary?.occupancyRate?.toFixed(1) || "0.0"}% trong kỳ`} color="#16A34A" />
        <MetricCard icon={<WalletCards size={17} />} label="Giá trị đơn trung bình" value={formatMoney(summary?.averageOrderValue)} caption="Doanh thu thuần / booking thành công" color="#7C3AED" />
      </section>
    </div>
  );
}
