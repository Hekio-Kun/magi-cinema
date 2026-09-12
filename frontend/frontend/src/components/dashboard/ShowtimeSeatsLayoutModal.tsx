import { useCallback, useEffect, useMemo, useState } from "react";
import { Armchair, Loader2, X } from "lucide-react";
import { toast } from "react-toastify";
import type { ShowtimeResponse } from "@/api/showtimeApi";
import type { MovieResponse } from "@/api/movieApi";
import type { CinemaRoom } from "@/types/cinemaRoom";
import type { ShowtimeSeat, ShowtimeSeatStatus, SeatType } from "@/types/seat";
import { showtimeSeatService } from "@/api/showtimeSeatApi";
import { getApiErrorMessage } from "@/api/errors";
import { formatPresentationLabelFromFields } from "@/utils/presentation";
import { useLatestRequest } from "@/hooks/useLatestRequest";

const FONT = "'Inter', sans-serif";
const formatTime = (value: string) => value?.slice(0, 5) || "--:--";
const SEAT_STATUS_CONFIG: Record<ShowtimeSeatStatus, { label: string; bg: string; color: string; border: string }> = {
  AVAILABLE: { label: "Trống",    bg: "#ecfdf5", color: "#047857", border: "#10b981" },
  HOLDING:   { label: "Đang giữ", bg: "#fffbeb", color: "#b45309", border: "#f59e0b" },
  BOOKED:    { label: "Đã đặt",   bg: "#fef2f2", color: "#b91c1c", border: "#ef4444" },
};

const SEAT_TYPE_CONFIG: Record<SeatType, { label: string; color: string }> = {
  NORMAL:   { label: "Thường",   color: "#2563eb" },
  VIP:      { label: "VIP",      color: "#7c3aed" },
  COUPLE:   { label: "Đôi",   color: "#db2777" },
  DISABLED: { label: "Hỗ trợ", color: "#0f766e" },
};

// ── Showtime Seats Layout Modal ───────────────────────────────────────────────

function compareSeats(a: ShowtimeSeat, b: ShowtimeSeat) {
  const rowA = a.seatRow ?? "";
  const rowB = b.seatRow ?? "";
  const r = rowA.localeCompare(rowB, undefined, { numeric: true });
  if (r !== 0) return r;
  return (a.seatNumber ?? 0) - (b.seatNumber ?? 0);
}

export function ShowtimeSeatsLayoutModal({ showtime, movies, rooms, onClose }: {
  showtime: ShowtimeResponse;
  movies: MovieResponse[];
  rooms: CinemaRoom[];
  onClose: () => void;
}) {
  const { startRequest, invalidateRequests } = useLatestRequest();
  const [seats, setSeats] = useState<ShowtimeSeat[]>([]);
  const [loading, setLoading] = useState(true);

  const mName = movies.find(m => m.movieId === showtime.movieId)?.movieNameVn || `#${showtime.movieId}`;
  const room = rooms.find(r => r.cinemaRoomId === showtime.cinemaRoomId);
  const rName = room?.cinemaRoomName || `#${showtime.cinemaRoomId}`;
  const presentationName = formatPresentationLabelFromFields(showtime);

  const fetchSeats = useCallback(async () => {
    const isCurrent = startRequest();
    setLoading(true);
    try {
      const stData = await showtimeSeatService.getShowtimeSeats({
        showtimeId: showtime.showtimeId,
        page: 0,
        size: 1000,
      });
      const sorted = (stData.content || []).sort(compareSeats);
      if (isCurrent()) setSeats(sorted);
    } catch (err) {
      if (!isCurrent()) return;
      console.error("Failed to fetch showtime seats", err);
      toast.error(getApiErrorMessage(err, "Không thể tải sơ đồ ghế."));
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [showtime.showtimeId, startRequest]);

  useEffect(() => {
    const requestTimer = window.setTimeout(fetchSeats, 0);
    return () => {
      window.clearTimeout(requestTimer);
      invalidateRequests();
    };
  }, [fetchSeats, invalidateRequests]);

  const rows = useMemo(() => {
    const grouped = new Map<string, ShowtimeSeat[]>();
    seats.forEach(s => {
      const row = s.seatRow || "A";
      if (!grouped.has(row)) grouped.set(row, []);
      grouped.get(row)!.push(s);
    });
    return Array.from(grouped.entries()).sort((a,b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
  }, [seats]);

  // Seat stats
  const bookedSeats = seats.filter(s => s.status === "BOOKED").length;
  const holdingSeats = seats.filter(s => s.status === "HOLDING").length;
  const availableSeats = seats.filter(s => s.status === "AVAILABLE").length;

  const getSeatStyle = (seat: ShowtimeSeat, isSelected: boolean) => {
    if (isSelected) return { bg: "rgba(244,63,94,0.15)", border: "#f43f5e", color: "#f43f5e", shadow: "0 0 15px rgba(244,63,94,0.4)" };
    if (seat.status === "BOOKED") return { bg: "rgba(239,68,68,0.12)", border: "#ef4444", color: "#dc2626", shadow: "0 0 10px rgba(239,68,68,0.2)" };
    if (seat.status === "HOLDING") return { bg: "rgba(245,158,11,0.12)", border: "#f59e0b", color: "#d97706", shadow: "0 0 10px rgba(245,158,11,0.2)" };
    
    const seatType = seat.seatType;
    switch (seatType) {
      case "VIP": return { bg: "rgba(139,92,246,0.15)", border: "#8b5cf6", color: "#ddd6fe", shadow: "0 0 12px rgba(139,92,246,0.3)" };
      case "COUPLE": return { bg: "rgba(236,72,153,0.15)", border: "#ec4899", color: "#fbcfe8", shadow: "0 0 12px rgba(236,72,153,0.3)" };
      case "DISABLED": return { bg: "rgba(14,116,144,0.15)", border: "#06b6d4", color: "#67e8f9", shadow: "0 0 12px rgba(14,116,144,0.3)" };
      default: return { bg: "rgba(59,130,246,0.1)", border: "#3b82f6", color: "#bfdbfe", shadow: "0 0 10px rgba(59,130,246,0.2)" };
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 110, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
      <div style={{ background: "#0f172a", borderRadius: 20, width: "100%", maxWidth: 1280, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,0.4)", fontFamily: FONT, overflow: "hidden", border: "1px solid #1e293b" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(56,189,248,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Armchair size={15} color="#38bdf8" />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.15em" }}>Sơ đồ ghế suất chiếu</span>
            </div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#f8fafc" }}>{mName}</h3>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>
              {rName}{presentationName ? ` · ${presentationName}` : ""} · {showtime.showDate} · {formatTime(showtime.startTime)} ~ {formatTime(showtime.endTime)} ·{" "}
              <span style={{ color: "#10b981" }}>{availableSeats} trống</span> ·{" "}
              <span style={{ color: "#f59e0b" }}>{holdingSeats} giữ</span> ·{" "}
              <span style={{ color: "#ef4444" }}>{bookedSeats} đã đặt</span>
            </p>
          </div>
          <button onClick={onClose} style={{ background: "#1e293b", border: "none", cursor: "pointer", color: "#94a3b8", width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1, userSelect: "none" }}>
          <div style={{ padding: "32px 12px", overflow: "auto", background: "#0b0f19", display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
            {/* Glowing Screen */}
            <div style={{
              height: 48, width: "100%", maxWidth: 640, margin: "0 auto 64px",
              background: "linear-gradient(to bottom, rgba(56,189,248,0.2), transparent)",
              boxShadow: "0 10px 40px rgba(56,189,248,0.1)",
              borderRadius: "50% 50% 0 0 / 100% 100% 0 0",
              borderTop: "3px solid rgba(56,189,248,0.6)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <span style={{ color: "rgba(56,189,248,0.5)", fontSize: 12, letterSpacing: "0.5em", fontWeight: 800 }}>Màn hình</span>
            </div>

            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, color: "#64748b" }}>
                <Loader2 size={32} style={{ color: "#38bdf8", marginBottom: 16 }} className="animate-spin" />
                <span style={{ fontSize: 14, letterSpacing: "0.05em" }}>Đang khởi tạo sơ đồ ghế...</span>
              </div>
            ) : seats.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0", color: "#64748b", fontSize: 14 }}>Chưa có ghế nào cho suất chiếu này.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center", width: "100%", maxWidth: 1000 }}>
                {rows.map(([rowLabel, rowSeats]) => {
                  return (
                    <div key={rowLabel} style={{ display: "flex", alignItems: "center", position: "relative", paddingLeft: 46, minHeight: 42, width: "100%" }}>
                      <div 
                        style={{ 
                          position: "absolute", left: 0,
                          width: 38, height: 42, flexShrink: 0, fontWeight: 900, fontSize: 15, 
                          color: "#475569", background: "transparent", border: "none",
                          display: "flex", alignItems: "center", justifyContent: "center"
                        }}
                      >
                        {rowLabel}
                      </div>
                      <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", flex: 1 }}>
                        {[...rowSeats].sort((a, b) => (a.seatNumber ?? 0) - (b.seatNumber ?? 0)).map(seat => {
                          const sStyle = getSeatStyle(seat, false);
                          const seatStatus = seat.status as ShowtimeSeatStatus;
                          
                          return (
                            <div
                              key={seat.showtimeSeatId}
                              title={`${seat.seatCode} · ${SEAT_TYPE_CONFIG[seat.seatType as SeatType]?.label || 'Normal'} · ${SEAT_STATUS_CONFIG[seatStatus]?.label || seat.status}`}
                              style={{
                                width: 38, height: 38,
                                borderRadius: "8px 8px 4px 4px",
                                border: `1px solid ${sStyle.border}`,
                                borderBottom: `4px solid ${sStyle.border}`,
                                background: sStyle.bg,
                                color: sStyle.color,
                                cursor: "default",
                                fontSize: 11, fontWeight: 800,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                                boxShadow: sStyle.shadow,
                                outline: "none", position: "relative",
                                opacity: 1
                              }}
                            >
                              {seat.seatCode}
                              {seat.seatType === "VIP" && seat.status !== "BOOKED" && (
                                <div style={{ position: "absolute", top: -5, right: -5, width: 12, height: 12, borderRadius: "50%", background: "#8b5cf6", border: "2px solid #0f172a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  <span style={{ fontSize: 7, color: "#fff" }}>★</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Legend */}
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center", marginTop: 60, padding: "16px 28px", background: "rgba(30,41,59,0.7)", borderRadius: 16, border: "1px solid #1e293b", backdropFilter: "blur(4px)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>
                <span style={{ width: 14, height: 14, borderRadius: 4, background: "rgba(16,185,129,0.12)", border: "1px solid #10b981", borderBottom: "3px solid #10b981" }} />
                Trống
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>
                <span style={{ width: 14, height: 14, borderRadius: 4, background: "rgba(245,158,11,0.12)", border: "1px solid #f59e0b", borderBottom: "3px solid #f59e0b" }} />
                Đang giữ
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>
                <span style={{ width: 14, height: 14, borderRadius: 4, background: "rgba(239,68,68,0.12)", border: "1px solid #ef4444", borderBottom: "3px solid #ef4444" }} />
                Đã đặt
              </div>
              <div style={{ width: 1, height: 18, background: "#334155", margin: "0 4px" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>
                <span style={{ width: 14, height: 14, borderRadius: 4, background: "rgba(139,92,246,0.12)", border: "1px solid #8b5cf6", borderBottom: "3px solid #8b5cf6" }} />
                VIP
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
