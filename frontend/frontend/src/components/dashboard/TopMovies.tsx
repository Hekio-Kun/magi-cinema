import { Film } from "lucide-react";

import { type MovieResponse } from "@/api/movieApi";

const STATUS_LABEL: Record<string, { label: string; bg: string; color: string }> = {
  NOW_SHOWING: { label: "Đang chiếu", bg: "#DCFCE7", color: "#15803D" },
  COMING_SOON: { label: "Sắp chiếu", bg: "#DBEAFE", color: "#1D4ED8" },
  ENDED: { label: "Đã kết thúc", bg: "#F3F4F6", color: "#4B5563" },
  INACTIVE: { label: "Vô hiệu", bg: "#FEE2E2", color: "#B91C1C" },
};

function formatDate(date?: string | null) {
  if (!date) return "Chưa cập nhật";
  return new Date(`${date}T00:00:00`).toLocaleDateString("vi-VN");
}

export function TopMovies({ movies = [] }: { movies?: MovieResponse[] }) {
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
        <div style={{ fontSize: 15, fontWeight: 700, color: "#1A1A2E" }}>Phim mới cập nhật</div>
        <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>Lấy từ dữ liệu quản lý phim</div>
      </div>

      <div className="no-scrollbar" style={{ flex: 1, overflowY: "auto" }}>
        {movies.length === 0 && (
          <div style={{ padding: 20, textAlign: "center", color: "#6B7280", fontSize: 13 }}>
            Chưa có phim nào.
          </div>
        )}

        {movies.map((movie, i) => {
          const status = STATUS_LABEL[movie.status || ""] || { label: "Chưa rõ", bg: "#F3F4F6", color: "#4B5563" };

          return (
            <div
              key={movie.movieId}
              style={{
                display: "grid",
                gridTemplateColumns: "42px minmax(0, 1fr)",
                gap: 12,
                alignItems: "center",
                padding: "12px 20px",
                borderTop: i === 0 ? "1px solid #F3F4F6" : "none",
                borderBottom: "1px solid #F3F4F6",
                background: i % 2 === 1 ? "#F9FAFB" : "#FFFFFF",
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 52,
                  borderRadius: 6,
                  background: movie.smallImage || movie.largeImage ? "#E5E7EB" : "#111827",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                }}
              >
                {movie.smallImage || movie.largeImage ? (
                  <img
                    src={movie.smallImage || movie.largeImage || ""}
                    alt={movie.movieNameVn}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <Film size={16} />
                )}
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {movie.movieNameVn}
                  </div>
                  <span
                    style={{
                      flexShrink: 0,
                      fontSize: 10,
                      fontWeight: 800,
                      color: status.color,
                      background: status.bg,
                      borderRadius: 999,
                      padding: "3px 7px",
                    }}
                  >
                    {status.label}
                  </span>
                </div>
                <div style={{ marginTop: 5, fontSize: 12, color: "#6B7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {movie.duration ? `${movie.duration} phút` : "Chưa có thời lượng"} · Khởi chiếu {formatDate(movie.fromDate)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
