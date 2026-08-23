import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const FONT = "'Inter', sans-serif";

const DATA = [
  { name: "2D Standard", value: 35, color: "#3b82f6" },
  { name: "3D Premium", value: 28, color: "#f59e0b" },
  { name: "IMAX", value: 22, color: "#dc2626" },
  { name: "VIP Lounge", value: 15, color: "#8b5cf6" },
];

type RoomDistribution = (typeof DATA)[number];

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: RoomDistribution }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  if (!d) return null;
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        padding: "10px 14px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
        fontFamily: FONT,
      }}
    >
      <div className="flex items-center gap-2">
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} />
        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#0f172a" }}>{d.name}</span>
      </div>
      <div style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a", marginTop: "4px" }}>
        {d.value}%
        <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "#94a3b8", marginLeft: "4px" }}>
          of sales
        </span>
      </div>
    </div>
  );
}

export function RoomDonutChart() {
  return (
    <div
      className="rounded-2xl p-6 h-full"
      style={{
        background: "#fff",
        border: "1px solid #e9ecef",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      {/* Header */}
      <div className="mb-4">
        <div
          style={{
            fontFamily: FONT,
            fontSize: "0.7rem",
            fontWeight: 600,
            color: "#94a3b8",
            letterSpacing: "0.12em",
            marginBottom: "4px",
          }}
        >
          Ticket Distribution
        </div>
        <div
          style={{
            fontFamily: FONT,
            fontSize: "1.15rem",
            fontWeight: 700,
            color: "#0f172a",
          }}
        >
          Sales by Room Type
        </div>
        <div
          style={{
            fontFamily: FONT,
            fontSize: "0.78rem",
            color: "#94a3b8",
            marginTop: "2px",
          }}
        >
          Last 7 days · All locations
        </div>
      </div>

      {/* Chart + center label */}
      <div className="relative flex items-center justify-center" style={{ height: "180px" }}>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              key="room-pie"
              data={DATA}
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={82}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {DATA.map((entry, i) => (
                <Cell key={`cell-${i}-${entry.name}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip key="pie-tooltip" content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center text */}
        <div
          className="absolute flex flex-col items-center justify-center pointer-events-none"
          style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
        >
          <div
            style={{
              fontFamily: FONT,
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "#0f172a",
              lineHeight: 1,
            }}
          >
            3,841
          </div>
          <div
            style={{
              fontFamily: FONT,
              fontSize: "0.65rem",
              color: "#94a3b8",
              fontWeight: 500,
              textAlign: "center",
              marginTop: "3px",
            }}
          >
            total tickets
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2.5 mt-4">
        {DATA.map((d) => (
          <div key={d.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "3px",
                  background: d.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: FONT,
                  fontSize: "0.8rem",
                  color: "#475569",
                  fontWeight: 500,
                }}
              >
                {d.name}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ width: "60px", background: "#f1f5f9" }}
              >
                <div
                  style={{
                    width: `${d.value}%`,
                    height: "100%",
                    background: d.color,
                    borderRadius: "inherit",
                  }}
                />
              </div>
              <span
                style={{
                  fontFamily: FONT,
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: "#0f172a",
                  minWidth: "32px",
                  textAlign: "right",
                }}
              >
                {d.value}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
