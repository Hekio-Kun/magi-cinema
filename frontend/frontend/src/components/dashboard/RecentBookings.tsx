const BOOKINGS = [
  { id: "BK-8821", customer: "Nguyễn Văn A",  movie: "Dune: Part Three",  seats: "F7, F8",    time: "14:30", status: "Đã xác nhận" },
  { id: "BK-8820", customer: "Trần Thị B",    movie: "Black Panther 3",  seats: "C4",         time: "16:00", status: "Chờ xử lý"   },
  { id: "BK-8819", customer: "Lê Minh C",     movie: "The Witcher",       seats: "A1, A2, A3", time: "18:15", status: "Đã xác nhận" },
  { id: "BK-8818", customer: "Phạm Thị D",    movie: "Ocean's Twelve 2", seats: "G9",         time: "20:00", status: "Đã hủy" },
  { id: "BK-8817", customer: "Hoàng Văn E",   movie: "Parasite II",       seats: "D5, D6",    time: "21:30", status: "Đã xác nhận" },
  { id: "BK-8816", customer: "Đỗ Thị F",      movie: "Dune: Part Three",  seats: "B2",         time: "22:00", status: "Chờ xử lý"   },
];

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  "Đã xác nhận": { bg: "#D1FAE5", color: "#059669" },
  "Chờ xử lý":   { bg: "#FEF3C7", color: "#D97706" },
  "Đã hủy": { bg: "#FEE2E2", color: "#DC2626" },
};

export function RecentBookings() {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E5E7EB",
        borderRadius: 12,
        padding: "20px 0 0",
        fontFamily: "Inter, sans-serif",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ paddingLeft: 20, paddingRight: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#1A1A2E" }}>Đặt vé gần đây</div>
        <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>Giao dịch mới nhất</div>
      </div>

      {/* Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "80px 120px 1fr 80px 56px 76px",
          gap: 8,
          paddingLeft: 20,
          paddingRight: 20,
          paddingBottom: 8,
          borderBottom: "1px solid #F3F4F6",
        }}
      >
        {["Mã đặt vé", "Khách hàng", "Phim", "Ghế", "Giờ", "Trạng thái"].map((h) => (
          <span key={h} style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", letterSpacing: "0.05em" }}>
            {h}
          </span>
        ))}
      </div>

      <div className="no-scrollbar" style={{ flex: 1, overflowY: "auto" }}>
        {BOOKINGS.map((b, i) => {
          const s = STATUS_STYLES[b.status];
          return (
            <div
              key={b.id}
              style={{
                display: "grid",
                gridTemplateColumns: "80px 120px 1fr 80px 56px 76px",
                gap: 8,
                alignItems: "center",
                paddingLeft: 20,
                paddingRight: 20,
                paddingTop: 10,
                paddingBottom: 10,
                background: i % 2 === 1 ? "#F9FAFB" : "#FFFFFF",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: "#f59e0b" }}>{b.id}</span>
              <span style={{ fontSize: 13, color: "#1A1A2E", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.customer}</span>
              <span style={{ fontSize: 12, color: "#6B7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.movie}</span>
              <span style={{ fontSize: 12, color: "#1A1A2E" }}>{b.seats}</span>
              <span style={{ fontSize: 12, color: "#6B7280" }}>{b.time}</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: s.color,
                  background: s.bg,
                  borderRadius: 999,
                  padding: "3px 8px",
                  whiteSpace: "nowrap",
                  display: "inline-block",
                  textAlign: "center",
                }}
              >
                {b.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
