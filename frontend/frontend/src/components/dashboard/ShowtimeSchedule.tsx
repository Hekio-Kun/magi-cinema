import { CalendarClock, Film } from "lucide-react";

import { type DashboardShowtimeResponse } from "@/api/dashboardApi";
import { formatPresentationLabelFromFields } from "@/utils/presentation";

function formatDate(date?: string | null) {
  if (!date) return "Chưa cập nhật";
  return new Date(`${date}T00:00:00`).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(time?: string | null) {
  if (!time) return "--:--";
  return time.slice(0, 5);
}

export function ShowtimeSchedule({ showtimes }: { showtimes: DashboardShowtimeResponse[] }) {
  const displayShowtimes = showtimes.length > 0 ? showtimes : [];

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E5E7EB",
        borderRadius: 12,
        padding: "20px",
        fontFamily: "Inter, sans-serif",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#1A1A2E" }}>Suất chiếu mới cập nhật</div>
        <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>Dữ liệu lấy từ lịch chiếu đã tạo</div>
      </div>

      <div className="no-scrollbar" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        {displayShowtimes.length === 0 && (
          <div style={{ padding: 20, textAlign: "center", color: "#6B7280", fontSize: 13 }}>
            Chưa có lịch chiếu nào.
          </div>
        )}

        {displayShowtimes.map((showtime, index) => {
          const posterColor = ["#E63946", "#2563EB", "#7C3AED", "#059669"][index % 4];
          const presentationLabel = formatPresentationLabelFromFields(showtime);

          return (
            <div
              key={showtime.showtimeId || index}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                padding: "12px",
                border: "1px solid #E5E7EB",
                borderRadius: 10,
                background: "#FAFAFA",
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 46,
                  borderRadius: 6,
                  background: posterColor,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                }}
              >
                <Film size={16} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1A1A2E", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {showtime.movieName || "Phim chưa cập nhật"}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#111827", whiteSpace: "nowrap" }}>
                    {formatTime(showtime.startTime)}
                  </span>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 11, color: "#6B7280" }}>
                  <span>{showtime.cinemaRoomName || "Phòng chiếu"}</span>
                  <span>·</span>
                  <span>{showtime.cinemaRoomType || "Chưa rõ loại phòng"}</span>
                  {presentationLabel && (
                    <>
                      <span>·</span>
                      <span style={{ fontWeight: 700, color: "#4F46E5" }}>{presentationLabel}</span>
                    </>
                  )}
                </div>

                <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, background: "#F3F4F6", padding: "4px 9px", color: "#4B5563", fontSize: 11, fontWeight: 700 }}>
                  <CalendarClock size={12} />
                  {formatDate(showtime.showDate)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
