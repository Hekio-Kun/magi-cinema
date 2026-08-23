import { Package, ChevronRight, TrendingDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const FONT = "'Inter', sans-serif";

const IMPORTS = [
  {
    id: "RCP-3312",
    supplier: "Coca-Cola Dist.",
    supplierIcon: "🥤",
    employee: "Mike Torres",
    date: "Jun 13, 2026",
    items: 240,
    status: "Received",
    amount: "$1,840",
  },
  {
    id: "RCP-3311",
    supplier: "Golden Grain Co.",
    supplierIcon: "🌽",
    employee: "Linda Park",
    date: "Jun 13, 2026",
    items: 80,
    status: "Pending",
    amount: "$620",
  },
  {
    id: "RCP-3310",
    supplier: "FreshBite Foods",
    supplierIcon: "🌭",
    employee: "James Wright",
    date: "Jun 12, 2026",
    items: 150,
    status: "Received",
    amount: "$980",
  },
  {
    id: "RCP-3309",
    supplier: "AquaSpring Water",
    supplierIcon: "💧",
    employee: "Sarah Chen",
    date: "Jun 12, 2026",
    items: 480,
    status: "Low Stock",
    amount: "$340",
  },
  {
    id: "RCP-3308",
    supplier: "Sweet Factory",
    supplierIcon: "🍬",
    employee: "Ryan Cho",
    date: "Jun 11, 2026",
    items: 200,
    status: "Received",
    amount: "$560",
  },
  {
    id: "RCP-3307",
    supplier: "BrewMaster Inc.",
    supplierIcon: "☕",
    employee: "Priya Sharma",
    date: "Jun 11, 2026",
    items: 120,
    status: "Low Stock",
    amount: "$780",
  },
];

const STATUS_MAP: Record<string, { icon: LucideIcon; bg: string; color: string }> = {
  Received: { icon: CheckCircle2, bg: "rgba(16,185,129,0.1)", color: "#059669" },
  Pending: { icon: Package, bg: "rgba(245,158,11,0.1)", color: "#d97706" },
  "Low Stock": { icon: AlertTriangle, bg: "rgba(239,68,68,0.1)", color: "#dc2626" },
};

export function RecentImports() {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "#fff",
        border: "1px solid #e9ecef",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-5"
        style={{ borderBottom: "1px solid #f1f5f9" }}
      >
        <div>
          <div
            style={{
              fontFamily: FONT,
              fontSize: "1rem",
              fontWeight: 700,
              color: "#0f172a",
            }}
          >
            Recent Inventory Imports
          </div>
          <div
            style={{
              fontFamily: FONT,
              fontSize: "0.775rem",
              color: "#94a3b8",
              marginTop: "2px",
            }}
          >
            Latest stock deliveries & receipts
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            <TrendingDown size={12} style={{ color: "#dc2626" }} />
            <span
              style={{
                fontFamily: FONT,
                fontSize: "0.72rem",
                fontWeight: 600,
                color: "#dc2626",
              }}
            >
              2 Low Stock
            </span>
          </div>
          <button
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all duration-200 hover:scale-105"
            style={{
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.2)",
              color: "#d97706",
              fontFamily: FONT,
              fontSize: "0.775rem",
              fontWeight: 600,
            }}
          >
            View All
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* Column headers */}
      <div
        className="grid px-6 py-3"
        style={{
          gridTemplateColumns: "1.2fr 1.8fr 1.3fr 1fr 0.7fr 1fr",
          background: "#f8fafc",
          borderBottom: "1px solid #f1f5f9",
        }}
      >
        {["Receipt ID", "Supplier", "Employee", "Date", "Units", "Status"].map((col) => (
          <span
            key={col}
            style={{
              fontFamily: FONT,
              fontSize: "0.68rem",
              fontWeight: 700,
              color: "#94a3b8",
              letterSpacing: "0.1em",
            }}
          >
            {col}
          </span>
        ))}
      </div>

      {/* Rows */}
      <div>
        {IMPORTS.map((imp, i) => {
          const s = STATUS_MAP[imp.status];
          const SIcon = s.icon;
          return (
            <div
              key={imp.id}
              className="grid px-6 py-3.5 items-center transition-colors duration-150 cursor-pointer"
              style={{
                gridTemplateColumns: "1.2fr 1.8fr 1.3fr 1fr 0.7fr 1fr",
                borderBottom: i < IMPORTS.length - 1 ? "1px solid #f8fafc" : "none",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLDivElement).style.background = "#fafbfc")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLDivElement).style.background = "transparent")
              }
            >
              {/* Receipt ID */}
              <span
                style={{
                  fontFamily: FONT,
                  fontSize: "0.825rem",
                  fontWeight: 600,
                  color: "#0f172a",
                }}
              >
                {imp.id}
              </span>

              {/* Supplier */}
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "#f1f5f9",
                    fontSize: "14px",
                  }}
                >
                  {imp.supplierIcon}
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: FONT,
                      fontSize: "0.825rem",
                      fontWeight: 600,
                      color: "#334155",
                    }}
                  >
                    {imp.supplier}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT,
                      fontSize: "0.7rem",
                      color: "#94a3b8",
                    }}
                  >
                    {imp.amount}
                  </div>
                </div>
              </div>

              {/* Employee */}
              <span
                style={{
                  fontFamily: FONT,
                  fontSize: "0.825rem",
                  color: "#64748b",
                }}
              >
                {imp.employee}
              </span>

              {/* Date */}
              <span
                style={{
                  fontFamily: FONT,
                  fontSize: "0.8rem",
                  color: "#64748b",
                }}
              >
                {imp.date}
              </span>

              {/* Units */}
              <span
                style={{
                  fontFamily: FONT,
                  fontSize: "0.825rem",
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                {imp.items}
              </span>

              {/* Status */}
              <div>
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                  style={{
                    background: s.bg,
                    fontFamily: FONT,
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: s.color,
                  }}
                >
                  <SIcon size={10} />
                  {imp.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
