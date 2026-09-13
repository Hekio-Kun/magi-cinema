import { ExternalLink, ChevronRight } from "lucide-react";

const FONT = "'Inter', sans-serif";

const INVOICES = [
  {
    id: "INV-8841",
    customer: "James Morrison",
    customerInitials: "JM",
    customerColor: "#3b82f6",
    employee: "Sarah Chen",
    amount: "$1,240",
    status: "Completed",
    type: "VIP Package",
  },
  {
    id: "INV-8840",
    customer: "Olivia Hartman",
    customerInitials: "OH",
    customerColor: "#8b5cf6",
    employee: "Mike Torres",
    amount: "$890",
    status: "Completed",
    type: "IMAX Bundle",
  },
  {
    id: "INV-8839",
    customer: "Ryan Cho",
    customerInitials: "RC",
    customerColor: "#10b981",
    employee: "Linda Park",
    amount: "$620",
    status: "Pending",
    type: "3D Premiere",
  },
  {
    id: "INV-8838",
    customer: "Elena Vasquez",
    customerInitials: "EV",
    customerColor: "#f59e0b",
    employee: "James Wright",
    amount: "$1,890",
    status: "Completed",
    type: "Corporate Hire",
  },
  {
    id: "INV-8837",
    customer: "David Nakamura",
    customerInitials: "DN",
    customerColor: "#dc2626",
    employee: "Sarah Chen",
    amount: "$540",
    status: "Cancelled",
    type: "2D Standard",
  },
  {
    id: "INV-8836",
    customer: "Priya Sharma",
    customerInitials: "PS",
    customerColor: "#06b6d4",
    employee: "Mike Torres",
    amount: "$760",
    status: "Completed",
    type: "VIP Lounge",
  },
];

const STATUS_STYLES: Record<string, { bg: string; color: string; dot: string }> = {
  Completed: {
    bg: "rgba(16,185,129,0.1)",
    color: "#059669",
    dot: "#10b981",
  },
  Pending: {
    bg: "rgba(245,158,11,0.1)",
    color: "#d97706",
    dot: "#f59e0b",
  },
  Cancelled: {
    bg: "rgba(239,68,68,0.1)",
    color: "#dc2626",
    dot: "#ef4444",
  },
};

export function RecentInvoices() {
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
            Recent High-Value Invoices
          </div>
          <div
            style={{
              fontFamily: FONT,
              fontSize: "0.775rem",
              color: "#94a3b8",
              marginTop: "2px",
            }}
          >
            Top transactions from today
          </div>
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

      {/* Column headers */}
      <div
        className="grid px-6 py-3"
        style={{
          gridTemplateColumns: "1.4fr 1.6fr 1.3fr 0.9fr 1fr",
          background: "#f8fafc",
          borderBottom: "1px solid #f1f5f9",
        }}
      >
        {["Invoice ID", "Customer", "Employee", "Amount", "Status"].map((col) => (
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
        {INVOICES.map((inv, i) => {
          const s = STATUS_STYLES[inv.status];
          return (
            <div
              key={inv.id}
              className="grid px-6 py-3.5 items-center transition-colors duration-150 cursor-pointer"
              style={{
                gridTemplateColumns: "1.4fr 1.6fr 1.3fr 0.9fr 1fr",
                borderBottom: i < INVOICES.length - 1 ? "1px solid #f8fafc" : "none",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLDivElement).style.background = "#fafbfc")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLDivElement).style.background = "transparent")
              }
            >
              {/* Invoice ID */}
              <div className="flex items-center gap-2">
                <span
                  style={{
                    fontFamily: FONT,
                    fontSize: "0.825rem",
                    fontWeight: 600,
                    color: "#0f172a",
                  }}
                >
                  {inv.id}
                </span>
                <ExternalLink size={11} style={{ color: "#cbd5e1" }} />
              </div>

              {/* Customer */}
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `${inv.customerColor}20`,
                    border: `1px solid ${inv.customerColor}40`,
                  }}
                >
                  <span
                    style={{
                      fontFamily: FONT,
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      color: inv.customerColor,
                    }}
                  >
                    {inv.customerInitials}
                  </span>
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
                    {inv.customer}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT,
                      fontSize: "0.7rem",
                      color: "#94a3b8",
                    }}
                  >
                    {inv.type}
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
                {inv.employee}
              </span>

              {/* Amount */}
              <span
                style={{
                  fontFamily: FONT,
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                {inv.amount}
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
                  <span
                    style={{
                      width: "5px",
                      height: "5px",
                      borderRadius: "50%",
                      background: s.dot,
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  />
                  {inv.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
