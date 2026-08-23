import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Rectangle,
} from "recharts";

const DATA = [
  { day: "17/06", revenue: 38.2 },
  { day: "18/06", revenue: 52.1 },
  { day: "19/06", revenue: 44.7 },
  { day: "20/06", revenue: 61.3 },
  { day: "21/06", revenue: 48.9 },
  { day: "22/06", revenue: 55.6 },
  { day: "23/06", revenue: 72.4 },
];

const TODAY_INDEX = 6;

type RevenueTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ value?: number | string }>;
  label?: number | string;
};

function CustomTooltip({ active, payload, label }: RevenueTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "#1A1A2E",
          border: "none",
          borderRadius: 8,
          padding: "8px 12px",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div style={{ color: "#8A8A9A", fontSize: 11, marginBottom: 2 }}>{label}</div>
        <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>
          ₫{payload[0].value}M
        </div>
      </div>
    );
  }
  return null;
}

export function RevenueChart() {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E5E7EB",
        borderRadius: 12,
        padding: "20px 20px 16px",
        fontFamily: "Inter, sans-serif",
        height: "100%",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A2E" }}>Doanh thu tuần này</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>June 17 – June 23, 2026</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: "#f59e0b" }} />
            <span style={{ fontSize: 12, color: "#6B7280" }}>Hôm nay</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: "#FEF3C7" }} />
            <span style={{ fontSize: 12, color: "#6B7280" }}>Những ngày trước</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={DATA} barSize={32} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 12, fill: "#6B7280", fontFamily: "Inter, sans-serif" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `₫${v}M`}
            tick={{ fontSize: 11, fill: "#6B7280", fontFamily: "Inter, sans-serif" }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={<Rectangle fill="rgba(0,0,0,0.03)" radius={4} />}
          />
          <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
            {DATA.map((_, index) => (
              <Cell key={index} fill={index === TODAY_INDEX ? "#f59e0b" : "#FEF3C7"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
