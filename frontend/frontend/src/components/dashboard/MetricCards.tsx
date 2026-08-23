import { useState } from "react";
import { DollarSign, Ticket, ShoppingBag, Percent, TrendingUp, TrendingDown } from "lucide-react";

const FONT = "'Inter', sans-serif";

const CARDS = [
  {
    label: "Total Revenue (Today)",
    value: "$48,392",
    sub: "vs. yesterday",
    change: "+12.4%",
    up: true,
    icon: DollarSign,
    accent: "#f59e0b",
    accentBg: "rgba(245,158,11,0.1)",
    sparkline: [30, 42, 38, 55, 48, 62, 70, 68, 80, 75, 88, 95],
  },
  {
    label: "Total Tickets Sold",
    value: "3,841",
    sub: "across all rooms",
    change: "+8.7%",
    up: true,
    icon: Ticket,
    accent: "#3b82f6",
    accentBg: "rgba(59,130,246,0.1)",
    sparkline: [22, 35, 28, 45, 40, 52, 48, 60, 58, 65, 70, 72],
  },
  {
    label: "F&B & Combo Sales",
    value: "$11,280",
    sub: "vs. yesterday",
    change: "-3.2%",
    up: false,
    icon: ShoppingBag,
    accent: "#10b981",
    accentBg: "rgba(16,185,129,0.1)",
    sparkline: [55, 60, 58, 50, 48, 45, 50, 42, 44, 40, 38, 36],
  },
  {
    label: "Active Promotions",
    value: "14",
    sub: "6 expiring soon",
    change: "+2 new",
    up: true,
    icon: Percent,
    accent: "#8b5cf6",
    accentBg: "rgba(139,92,246,0.1)",
    sparkline: [8, 9, 9, 10, 11, 10, 12, 12, 13, 13, 14, 14],
  },
];

let _sparklineCounter = 0;

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const [gradId] = useState(() => `spk-grad-${_sparklineCounter++}`);
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");
  const area = `0,${h} ` + pts + ` ${w},${h}`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradId})`} />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MetricCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
      {CARDS.map((card) => {
        const Icon = card.icon;
        const TrendIcon = card.up ? TrendingUp : TrendingDown;
        return (
          <div
            key={card.label}
            className="rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
            style={{
              background: "#fff",
              border: "1px solid #e9ecef",
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}
          >
            {/* Top row */}
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: card.accentBg }}
              >
                <Icon size={20} style={{ color: card.accent }} />
              </div>
              <div
                className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                style={{
                  background: card.up ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                  border: `1px solid ${card.up ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
                }}
              >
                <TrendIcon
                  size={11}
                  style={{ color: card.up ? "#10b981" : "#ef4444" }}
                />
                <span
                  style={{
                    fontFamily: FONT,
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    color: card.up ? "#10b981" : "#ef4444",
                  }}
                >
                  {card.change}
                </span>
              </div>
            </div>

            {/* Value */}
            <div
              style={{
                fontFamily: FONT,
                fontSize: "1.7rem",
                fontWeight: 800,
                color: "#0f172a",
                letterSpacing: "-0.03em",
                lineHeight: 1,
                marginBottom: "4px",
              }}
            >
              {card.value}
            </div>
            <div
              style={{
                fontFamily: FONT,
                fontSize: "0.78rem",
                color: "#94a3b8",
                fontWeight: 400,
                marginBottom: "14px",
              }}
            >
              <span
                style={{
                  fontWeight: 600,
                  color: "#64748b",
                }}
              >
                {card.label}
              </span>
              {" · "}
              {card.sub}
            </div>

            {/* Sparkline */}
            <MiniSparkline data={card.sparkline} color={card.accent} />
          </div>
        );
      })}
    </div>
  );
}
